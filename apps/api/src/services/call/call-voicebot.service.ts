import type { IncomingMessage, Server as HttpServer } from "http";
import WebSocket, { RawData, WebSocketServer } from "ws";
import { connectToDatabase } from "@/config/database.config";
import CallAssistantWorkspace, {
  ICallAssistantWorkspace,
} from "@/models/call/CallAssistantWorkspace.model";
import {
  objectToAppointmentAlert,
  sendAppointmentNotifications,
} from "@/services/appointment-notification.service";
import {
  findAssignedDedicatedNumberByPhone,
  normalizeCallNumber,
} from "@/services/call/call-number-pool.service";

type VoicebotCloseReason =
  | "completed"
  | "caller_disconnected"
  | "silence_timeout"
  | "max_duration"
  | "minutes_limit"
  | "openai_error"
  | "server_error";

type ConversationLine = {
  role: "caller" | "assistant";
  text: string;
  at: Date;
};

const OPENAI_PCM_SAMPLE_RATE = 24000;
const DEFAULT_VOICEBOT_PATH = "/api/call/voicebot-stream";
const DEFAULT_REALTIME_URL = "wss://api.openai.com/v1/realtime";

let attachedVoicebotServer = false;

const cleanString = (value: unknown) =>
  typeof value === "string" ? value.trim() : "";

const envNumber = (key: string, fallback: number) => {
  const parsed = Number(process.env[key]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const getVoicebotPath = () =>
  process.env.EXOTEL_VOICEBOT_PATH || DEFAULT_VOICEBOT_PATH;

const getOpenAiApiKey = () =>
  process.env.OPENAI_REALTIME_API_KEY || process.env.OPENAI_API_KEY || "";

const getRealtimeModel = () =>
  process.env.OPENAI_REALTIME_MODEL || "gpt-realtime";

const getRealtimeVoice = () =>
  process.env.OPENAI_REALTIME_VOICE || "marin";

const getTranscriptionModel = () =>
  process.env.OPENAI_REALTIME_TRANSCRIPTION_MODEL || "gpt-4o-mini-transcribe";

const getDefaultExotelSampleRate = () =>
  envNumber("EXOTEL_VOICEBOT_SAMPLE_RATE", OPENAI_PCM_SAMPLE_RATE);

const getSilenceTimeoutMs = () =>
  clamp(envNumber("CALL_VOICEBOT_SILENCE_TIMEOUT_SEC", 20), 5, 120) * 1000;

const getMaxDurationMs = () =>
  clamp(envNumber("CALL_VOICEBOT_MAX_DURATION_SEC", 300), 30, 300) * 1000;

const getSpeechRmsThreshold = () =>
  envNumber("CALL_VOICEBOT_SPEECH_RMS_THRESHOLD", 450);

const openAiAudioFormat = () => ({
  type: "audio/pcm",
  rate: OPENAI_PCM_SAMPLE_RATE,
});

const parseBasicAuth = (header = "") => {
  if (!header.toLowerCase().startsWith("basic ")) return null;
  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  const separator = decoded.indexOf(":");
  if (separator === -1) return null;
  return {
    username: decoded.slice(0, separator),
    password: decoded.slice(separator + 1),
  };
};

const verifyVoicebotRequest = (url: URL, req: IncomingMessage) => {
  const expectedSecret =
    process.env.EXOTEL_VOICEBOT_SECRET || process.env.EXOTEL_WEBHOOK_SECRET;
  const expectedBasicUser = process.env.EXOTEL_VOICEBOT_BASIC_USER;
  const expectedBasicPass = process.env.EXOTEL_VOICEBOT_BASIC_PASS;

  if (expectedSecret && url.searchParams.get("secret") === expectedSecret) {
    return true;
  }

  if (expectedBasicUser && expectedBasicPass) {
    const credentials = parseBasicAuth(String(req.headers.authorization || ""));
    return (
      credentials?.username === expectedBasicUser &&
      credentials?.password === expectedBasicPass
    );
  }

  return process.env.NODE_ENV !== "production";
};

const phoneLookupCandidates = (phoneNumber = "") => {
  const normalized = normalizeCallNumber(phoneNumber);
  const withoutPlus = normalized.replace(/^\+/, "");
  const withoutLeadingZero =
    withoutPlus.length === 11 && withoutPlus.startsWith("0")
      ? withoutPlus.slice(1)
      : withoutPlus;
  const withoutIndiaCode = withoutPlus.startsWith("91")
    ? withoutPlus.slice(2)
    : withoutPlus;
  const withIndiaCode =
    withoutLeadingZero.length === 10 ? `91${withoutLeadingZero}` : "";
  const withPlusIndiaCode = withIndiaCode ? `+${withIndiaCode}` : "";

  return Array.from(
    new Set(
      [
        normalized,
        withoutPlus,
        withoutLeadingZero,
        withoutIndiaCode,
        withIndiaCode,
        withPlusIndiaCode,
      ]
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
};

const findWorkspaceByIncomingNumber = async (phoneNumber = "") => {
  const candidates = phoneLookupCandidates(phoneNumber);
  if (!candidates.length) return null;

  const assignedNumber = await findAssignedDedicatedNumberByPhone(phoneNumber);
  if (assignedNumber?.assignedClerkId) {
    const workspace = await CallAssistantWorkspace.findOne({
      clerkId: assignedNumber.assignedClerkId,
    });
    if (workspace) return workspace;
  }

  return CallAssistantWorkspace.findOne({
    "numbers.phoneNumber": { $in: candidates },
    "numbers.status": "active",
    "numbers.provider": "exotel",
    "numbers.assignment": "dedicated",
  });
};

const activeFlowForWorkspace = (workspace?: ICallAssistantWorkspace | null) =>
  workspace?.flows?.find((flow) => flow.isActive) || workspace?.flows?.[0];

const sanitizeGreeting = (
  greeting: string | undefined,
  businessName: string,
) => {
  const fallback = `Hello, thanks for calling ${businessName}. How can I help you today?`;
  return (cleanString(greeting) || fallback)
    .replace(/\bAI receptionist\b/gi, "phone assistant")
    .replace(/\bAI assistant\b/gi, "phone assistant")
    .replace(/\bAI\b/gi, "")
    .replace(/\s+/g, " ")
    .trim();
};

const buildSystemInstructions = (workspace?: ICallAssistantWorkspace | null) => {
  const businessName = workspace?.organization?.name || "the business";
  const industry = workspace?.organization?.industry || "Services";
  const businessPhone = workspace?.organization?.phone || "";
  const businessEmail = workspace?.organization?.email || "";
  const address = workspace?.organization?.address || "";
  const flow = activeFlowForWorkspace(workspace);
  const questions = (flow?.questions || [])
    .filter(Boolean)
    .map((question, index) => `${index + 1}. ${question}`)
    .join("\n");
  const collectFields = (flow?.collectFields || [])
    .filter(Boolean)
    .join(", ");
  const behaviorPrompt = flow?.behaviorPrompt || "";

  return [
    `You are the inbound phone assistant for ${businessName}.`,
    "Sound natural, warm, and fast. Keep answers to one or two short sentences unless the caller asks for details.",
    "Do not say phrases like 'as an AI' or repeatedly mention automation. If asked directly, say you are the phone assistant for the business.",
    "Do not pretend to be a specific human employee. Do not invent prices, promises, inventory, medical/legal advice, or business details not provided here.",
    "Avoid dead air. If you do not know an answer, say you will share the message with the owner and they will follow up.",
    "Ask one question at a time. Collect the caller's name, phone number, requirement, and preferred callback time if possible.",
    "If the caller is silent or muted, the system will end the call. If all useful details are captured, briefly confirm them, say the owner will follow up, and say goodbye.",
    `Business: ${businessName}`,
    `Industry: ${industry}`,
    businessPhone ? `Business phone: ${businessPhone}` : "",
    businessEmail ? `Business email: ${businessEmail}` : "",
    address ? `Address: ${address}` : "",
    collectFields ? `Important fields to collect: ${collectFields}` : "",
    questions ? `Suggested question order:\n${questions}` : "",
    behaviorPrompt ? `Business-specific instructions:\n${behaviorPrompt}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const rawDataToBuffer = (data: RawData) => {
  if (Buffer.isBuffer(data)) return data;
  if (Array.isArray(data)) return Buffer.concat(data);
  if (data instanceof ArrayBuffer) return Buffer.from(data);
  return Buffer.from(data as any);
};

const tryParseJson = (buffer: Buffer) => {
  const text = buffer.toString("utf8").trim();
  if (!text.startsWith("{") && !text.startsWith("[")) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const parseSampleRate = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if ([8000, 16000, 24000].includes(parsed)) return parsed;
  return fallback;
};

const resamplePcm16 = (
  input: Buffer,
  sourceRate: number,
  targetRate: number,
) => {
  if (!input.length || sourceRate === targetRate) return input;

  const sourceSamples = Math.floor(input.length / 2);
  if (!sourceSamples) return Buffer.alloc(0);

  const targetSamples = Math.max(
    1,
    Math.round((sourceSamples * targetRate) / sourceRate),
  );
  const output = Buffer.alloc(targetSamples * 2);

  for (let index = 0; index < targetSamples; index += 1) {
    const sourcePosition = (index * sourceRate) / targetRate;
    const leftIndex = Math.floor(sourcePosition);
    const rightIndex = Math.min(leftIndex + 1, sourceSamples - 1);
    const fraction = sourcePosition - leftIndex;
    const left = input.readInt16LE(leftIndex * 2);
    const right = input.readInt16LE(rightIndex * 2);
    const sample = Math.round(left + (right - left) * fraction);
    output.writeInt16LE(clamp(sample, -32768, 32767), index * 2);
  }

  return output;
};

const pcmRms = (buffer: Buffer) => {
  const samples = Math.floor(buffer.length / 2);
  if (!samples) return 0;
  let sumSquares = 0;
  for (let index = 0; index < samples; index += 1) {
    const sample = buffer.readInt16LE(index * 2);
    sumSquares += sample * sample;
  }
  return Math.sqrt(sumSquares / samples);
};

const truncate = (value: string, max = 1200) =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

const buildTranscriptText = (lines: ConversationLine[]) =>
  lines
    .map(
      (line) =>
        `${line.role === "caller" ? "Caller" : "Assistant"}: ${line.text}`,
    )
    .join("\n");

const buildSummary = (lines: ConversationLine[], closeReason: string) => {
  const callerLines = lines
    .filter((line) => line.role === "caller")
    .map((line) => line.text)
    .filter(Boolean);

  if (!callerLines.length) {
    return closeReason === "silence_timeout"
      ? "Caller was silent or muted. The voicebot ended the call after the no-audio timeout."
      : "Voicebot call ended without captured caller details.";
  }

  return truncate(`Caller said: ${callerLines.slice(0, 4).join(" | ")}`, 500);
};

const extractCallerName = (transcript: string) => {
  const match = transcript.match(
    /\b(?:my name is|i am|i'm|this is)\s+([a-z][a-z\s.'-]{1,40})/i,
  );
  if (!match?.[1]) return "Unknown caller";
  return match[1].replace(/\s+/g, " ").trim();
};

const shouldAutoEndAfterAssistant = (text: string) => {
  if (process.env.CALL_VOICEBOT_AUTO_END_AFTER_GOODBYE === "false") {
    return false;
  }

  return /\b(goodbye|bye for now|thank you for calling|have a good day|have a nice day)\b/i.test(
    text,
  );
};

const openAiRealtimeUrl = () => {
  const baseUrl = process.env.OPENAI_REALTIME_WS_URL || DEFAULT_REALTIME_URL;
  const url = new URL(baseUrl);
  if (!url.searchParams.get("model")) {
    url.searchParams.set("model", getRealtimeModel());
  }
  return url.toString();
};

export const attachCallVoicebotServer = (server: HttpServer) => {
  if (attachedVoicebotServer) return;
  attachedVoicebotServer = true;

  const wss = new WebSocketServer({ noServer: true });
  const path = getVoicebotPath();

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(
      req.url || "/",
      `http://${req.headers.host || "localhost"}`,
    );
    if (url.pathname !== path) return;

    if (!verifyVoicebotRequest(url, req)) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      handleVoicebotConnection(ws, req, url).catch((error) => {
        console.error("Voicebot connection error:", error);
        try {
          ws.close(1011, "server_error");
        } catch {
          // no-op
        }
      });
    });
  });

  wss.on("error", (error) => {
    console.error("Call voicebot WebSocket server error:", error);
  });

  console.log(`Call voicebot WebSocket ready at ${path}`);
};

const handleVoicebotConnection = async (
  client: WebSocket,
  _req: IncomingMessage,
  url: URL,
) => {
  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    client.close(1011, "OPENAI_API_KEY missing");
    return;
  }

  const callStartedAt = Date.now();
  const silenceTimeoutMs = getSilenceTimeoutMs();
  const maxDurationMs = getMaxDurationMs();
  const speechThreshold = getSpeechRmsThreshold();
  const voice = getRealtimeVoice();
  const audioFormat = openAiAudioFormat();

  let workspace: ICallAssistantWorkspace | null = null;
  let workspaceLookupDone = false;
  let streamSid = cleanString(url.searchParams.get("stream_sid"));
  let callSid =
    cleanString(url.searchParams.get("call_sid")) ||
    `exotel_voicebot_${Date.now()}`;
  let callerNumber = cleanString(url.searchParams.get("from"));
  let virtualNumber =
    cleanString(url.searchParams.get("to")) ||
    cleanString(url.searchParams.get("did")) ||
    cleanString(url.searchParams.get("virtualNumber"));
  let exotelSampleRate = parseSampleRate(
    url.searchParams.get("sample-rate") || url.searchParams.get("sampleRate"),
    getDefaultExotelSampleRate(),
  );
  let exotelStartPayload: Record<string, any> = {};
  let exotelStopPayload: Record<string, any> = {};
  let closed = false;
  let closeReason: VoicebotCloseReason = "completed";
  let realtimeOpen = false;
  let assistantSpeaking = false;
  let greetingSent = false;
  let lastCallerSpeechAt = callStartedAt;
  let lastAssistantFinishedAt = callStartedAt;
  let hasCallerSpeech = false;
  let assistantTranscriptBuffer = "";
  let pendingRealtimeEvents: Record<string, any>[] = [];
  let outboundAudioBuffer = Buffer.alloc(0);
  let outboundSequence = 1;
  let outboundChunk = 0;
  const transcriptLines: ConversationLine[] = [];

  const realtime = new WebSocket(openAiRealtimeUrl(), {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "OpenAI-Beta": "realtime=v1",
    },
  });

  const sendRealtime = (event: Record<string, any>) => {
    if (closed) return;
    if (realtimeOpen && realtime.readyState === WebSocket.OPEN) {
      realtime.send(JSON.stringify(event));
      return;
    }
    pendingRealtimeEvents.push(event);
  };

  const sendExotelJson = (payload: Record<string, any>) => {
    if (client.readyState !== WebSocket.OPEN) return;
    client.send(JSON.stringify(payload));
  };

  const sendClearToExotel = () => {
    if (!streamSid) return;
    outboundAudioBuffer = Buffer.alloc(0);
    sendExotelJson({
      event: "clear",
      stream_sid: streamSid,
    });
  };

  const sendExotelMedia = (pcmAudio: Buffer) => {
    if (!pcmAudio.length) return;
    outboundSequence += 1;
    outboundChunk += 1;
    sendExotelJson({
      event: "media",
      sequence_number: outboundSequence,
      stream_sid: streamSid,
      media: {
        chunk: outboundChunk,
        timestamp: String(Date.now() - callStartedAt),
        payload: pcmAudio.toString("base64"),
      },
    });
  };

  const flushOutboundAudio = (force = false) => {
    const chunkMs = envNumber("EXOTEL_VOICEBOT_OUTBOUND_CHUNK_MS", 100);
    const chunkBytes = Math.max(
      320,
      Math.round((exotelSampleRate * 2 * chunkMs) / 1000 / 320) * 320,
    );

    while (outboundAudioBuffer.length >= chunkBytes) {
      const chunk = outboundAudioBuffer.subarray(0, chunkBytes);
      outboundAudioBuffer = outboundAudioBuffer.subarray(chunkBytes);
      sendExotelMedia(chunk);
    }

    if (force && outboundAudioBuffer.length >= 320) {
      const remainderLength =
        Math.ceil(outboundAudioBuffer.length / 320) * 320;
      const padded = Buffer.alloc(remainderLength);
      outboundAudioBuffer.copy(padded);
      outboundAudioBuffer = Buffer.alloc(0);
      sendExotelMedia(padded);
    }
  };

  const createSessionUpdate = () => ({
    type: "session.update",
    session: {
      type: "realtime",
      model: getRealtimeModel(),
      instructions: buildSystemInstructions(workspace),
      output_modalities: ["audio"],
      max_output_tokens: envNumber(
        "OPENAI_REALTIME_MAX_OUTPUT_TOKENS",
        700,
      ),
      audio: {
        input: {
          format: audioFormat,
          noise_reduction: { type: "near_field" },
          transcription: {
            model: getTranscriptionModel(),
            language: process.env.OPENAI_REALTIME_TRANSCRIPTION_LANGUAGE || "en",
          },
          turn_detection: {
            type: "server_vad",
            threshold: Number(process.env.OPENAI_REALTIME_VAD_THRESHOLD || 0.45),
            prefix_padding_ms: envNumber(
              "OPENAI_REALTIME_VAD_PREFIX_PADDING_MS",
              250,
            ),
            silence_duration_ms: envNumber(
              "OPENAI_REALTIME_VAD_SILENCE_DURATION_MS",
              450,
            ),
            create_response: true,
            interrupt_response: true,
            idle_timeout_ms: clamp(silenceTimeoutMs, 5000, 30000),
          },
        },
        output: {
          format: audioFormat,
          voice,
          speed: Number(process.env.OPENAI_REALTIME_VOICE_SPEED || 1.03),
        },
      },
    },
  });

  const sendSessionUpdate = () => sendRealtime(createSessionUpdate());

  const sendGreeting = () => {
    if (greetingSent || closed) return;
    greetingSent = true;
    const businessName = workspace?.organization?.name || "the business";
    const flow = activeFlowForWorkspace(workspace);
    const greeting = sanitizeGreeting(flow?.greeting, businessName);
    assistantSpeaking = true;
    sendRealtime({
      type: "response.create",
      response: {
        instructions: `Start the call now. Say this greeting naturally and briefly, then pause for the caller: "${greeting}"`,
        output_modalities: ["audio"],
        audio: {
          output: {
            format: audioFormat,
            voice,
          },
        },
      },
    });
  };

  const finish = async (reason: VoicebotCloseReason) => {
    if (closed) return;
    closed = true;
    closeReason = reason;
    clearInterval(silenceTimer);
    clearTimeout(maxDurationTimer);
    flushOutboundAudio(true);

    try {
      if (realtime.readyState === WebSocket.OPEN) {
        realtime.close(1000, reason);
      }
    } catch {
      // no-op
    }

    try {
      if (client.readyState === WebSocket.OPEN) {
        client.close(1000, reason);
      }
    } catch {
      // no-op
    }

    await persistVoicebotCall();
  };

  const maybeCloseForSilence = () => {
    if (closed || assistantSpeaking) return;
    const anchor = Math.max(lastCallerSpeechAt, lastAssistantFinishedAt);
    if (Date.now() - anchor >= silenceTimeoutMs) {
      finish("silence_timeout").catch((error) => {
        console.error("Voicebot silence finish error:", error);
      });
    }
  };

  const silenceTimer = setInterval(maybeCloseForSilence, 1000);
  const maxDurationTimer = setTimeout(() => {
    finish("max_duration").catch((error) => {
      console.error("Voicebot max duration finish error:", error);
    });
  }, maxDurationMs);

  const resolveWorkspace = async (startPayload?: Record<string, any>) => {
    if (workspaceLookupDone && workspace) return workspace;

    const start = startPayload?.start || {};
    const custom =
      start.custom_parameters || start.customParameters || start.custom || {};
    const ownerId =
      cleanString(url.searchParams.get("clerkId")) ||
      cleanString(url.searchParams.get("userId")) ||
      cleanString(url.searchParams.get("ownerId")) ||
      cleanString(custom.clerkId) ||
      cleanString(custom.userId) ||
      cleanString(custom.ownerId);

    callSid =
      cleanString(start.call_sid) ||
      cleanString(start.callSid) ||
      cleanString(startPayload?.call_sid) ||
      cleanString(startPayload?.callSid) ||
      callSid;
    streamSid =
      cleanString(start.stream_sid) ||
      cleanString(startPayload?.stream_sid) ||
      streamSid;
    callerNumber =
      normalizeCallNumber(cleanString(start.from) || callerNumber) ||
      callerNumber;
    virtualNumber =
      normalizeCallNumber(
        cleanString(start.to) ||
          cleanString(custom.did) ||
          cleanString(custom.to) ||
          cleanString(custom.virtualNumber) ||
          virtualNumber,
      ) || virtualNumber;
    exotelSampleRate = parseSampleRate(
      start.media_format?.sample_rate ||
        start.mediaFormat?.sampleRate ||
        custom["sample-rate"] ||
        custom.sampleRate,
      exotelSampleRate,
    );

    await connectToDatabase();
    workspace = ownerId
      ? await CallAssistantWorkspace.findOne({ clerkId: ownerId })
      : await findWorkspaceByIncomingNumber(virtualNumber);
    workspaceLookupDone = true;

    if (!workspace) return null;

    const minutesUsed = workspace.subscription?.minutesUsed || 0;
    const minutesLimit = workspace.subscription?.minutesLimit || 0;
    if (minutesLimit > 0 && minutesUsed >= minutesLimit) {
      await finish("minutes_limit");
      return workspace;
    }

    sendSessionUpdate();
    sendGreeting();
    return workspace;
  };

  const appendCallerAudio = (exotelPcmAudio: Buffer) => {
    if (closed || !exotelPcmAudio.length) return;

    const rms = pcmRms(exotelPcmAudio);
    if (rms >= speechThreshold) {
      hasCallerSpeech = true;
      lastCallerSpeechAt = Date.now();
      if (assistantSpeaking) {
        sendClearToExotel();
        sendRealtime({ type: "response.cancel" });
        assistantSpeaking = false;
      }
    }

    const openAiPcm = resamplePcm16(
      exotelPcmAudio,
      exotelSampleRate,
      OPENAI_PCM_SAMPLE_RATE,
    );
    sendRealtime({
      type: "input_audio_buffer.append",
      audio: openAiPcm.toString("base64"),
    });
  };

  const handleExotelJson = async (message: Record<string, any>) => {
    const event = cleanString(message.event).toLowerCase();
    if (event === "connected") return;

    if (event === "start") {
      exotelStartPayload = message;
      await resolveWorkspace(message);
      return;
    }

    if (event === "media") {
      if (!workspaceLookupDone) {
        await resolveWorkspace(message);
      }
      const payload = cleanString(message.media?.payload || message.payload);
      if (!payload) return;
      appendCallerAudio(Buffer.from(payload, "base64"));
      return;
    }

    if (event === "dtmf") {
      transcriptLines.push({
        role: "caller",
        text: `Pressed ${message.dtmf?.digit || message.digit}`,
        at: new Date(),
      });
      return;
    }

    if (event === "stop") {
      exotelStopPayload = message;
      await finish("caller_disconnected");
    }
  };

  const handleRealtimeEvent = (event: Record<string, any>) => {
    const type = cleanString(event.type);

    if (type === "response.output_audio.delta" && event.delta) {
      assistantSpeaking = true;
      const openAiAudio = Buffer.from(String(event.delta), "base64");
      const exotelAudio = resamplePcm16(
        openAiAudio,
        OPENAI_PCM_SAMPLE_RATE,
        exotelSampleRate,
      );
      outboundAudioBuffer = Buffer.concat([outboundAudioBuffer, exotelAudio]);
      flushOutboundAudio();
      return;
    }

    if (type === "response.output_audio.done") {
      flushOutboundAudio(true);
      assistantSpeaking = false;
      lastAssistantFinishedAt = Date.now();
      return;
    }

    if (type === "response.output_audio_transcript.delta") {
      assistantTranscriptBuffer += cleanString(event.delta);
      return;
    }

    if (type === "response.output_audio_transcript.done") {
      const transcript =
        cleanString(event.transcript) || cleanString(assistantTranscriptBuffer);
      assistantTranscriptBuffer = "";
      if (transcript) {
        transcriptLines.push({
          role: "assistant",
          text: transcript,
          at: new Date(),
        });
        if (hasCallerSpeech && shouldAutoEndAfterAssistant(transcript)) {
          setTimeout(() => {
            finish("completed").catch((error) => {
              console.error("Voicebot auto finish error:", error);
            });
          }, 1500);
        }
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.completed") {
      const transcript = cleanString(event.transcript);
      if (transcript) {
        transcriptLines.push({
          role: "caller",
          text: transcript,
          at: new Date(),
        });
      }
      return;
    }

    if (type === "conversation.item.input_audio_transcription.delta") {
      if (event.delta) {
        lastCallerSpeechAt = Date.now();
      }
      return;
    }

    if (type === "input_audio_buffer.speech_started") {
      hasCallerSpeech = true;
      lastCallerSpeechAt = Date.now();
      sendClearToExotel();
      return;
    }

    if (type === "input_audio_buffer.timeout_triggered") {
      finish("silence_timeout").catch((error) => {
        console.error("Voicebot idle timeout finish error:", error);
      });
      return;
    }

    if (type === "response.done") {
      assistantSpeaking = false;
      lastAssistantFinishedAt = Date.now();
      flushOutboundAudio(true);
      return;
    }

    if (type === "error") {
      console.error("OpenAI realtime voicebot error:", event.error || event);
    }
  };

  const persistVoicebotCall = async () => {
    if (!workspace && !workspaceLookupDone) {
      await resolveWorkspace(exotelStartPayload).catch(() => null);
    }
    if (!workspace) return;

    const durationSec = Math.max(
      1,
      Math.ceil((Date.now() - callStartedAt) / 1000),
    );
    const transcriptText = buildTranscriptText(transcriptLines);
    const summary = buildSummary(transcriptLines, closeReason);
    const status = hasCallerSpeech || transcriptText ? "answered" : "missed";
    const existingCall = workspace.calls.find(
      (call) => call.callSid === callSid,
    );
    const callPayload = {
      callSid,
      fromNumber: callerNumber,
      toNumber: virtualNumber,
      direction: "inbound",
      status,
      callState: closeReason,
      durationSec,
      transcriptText,
      summary,
      providerPayload: {
        provider: "exotel_voicebot",
        closeReason,
        streamSid,
        sampleRate: exotelSampleRate,
        start: exotelStartPayload,
        stop: exotelStopPayload,
        model: getRealtimeModel(),
      },
      createdAt: new Date(callStartedAt),
    };

    if (existingCall) {
      Object.assign(existingCall, {
        ...callPayload,
        recordingUrl: existingCall.recordingUrl,
        createdAt: existingCall.createdAt || callPayload.createdAt,
      });
    } else {
      workspace.calls.push(callPayload as any);
    }

    let createdLead: Record<string, any> | null = null;
    if (
      (hasCallerSpeech || transcriptText) &&
      callerNumber &&
      !workspace.leads.some((lead) => lead.callSid === callSid)
    ) {
      createdLead = {
        callerName: extractCallerName(transcriptText),
        callerPhone: callerNumber,
        interest: "Call inquiry",
        notes: summary,
        status: "new",
        callSid,
        createdAt: new Date(),
      };
      workspace.leads.push(createdLead as any);
    }

    workspace.subscription.minutesUsed = Math.ceil(
      workspace.calls.reduce((sum, call) => sum + (call.durationSec || 0), 0) /
        60,
    );
    workspace.subscription.callsUsed = workspace.calls.length;
    await workspace.save();

    if (createdLead) {
      sendAppointmentNotifications({
        userId: workspace.clerkId,
        source: "call",
        sourceRef: callSid,
        appointment: objectToAppointmentAlert({
          ...createdLead,
          service: createdLead.interest,
          summary,
        }),
        ownerEmail: workspace.owner?.email,
        ownerWhatsAppNumber: workspace.owner?.whatsappNumber,
        dashboardPath: "/call/calls",
      }).catch((error) => {
        console.error("Voicebot call notification error:", error);
      });
    }
  };

  realtime.on("open", () => {
    realtimeOpen = true;
    sendSessionUpdate();
    const events = pendingRealtimeEvents;
    pendingRealtimeEvents = [];
    events.forEach((event) => sendRealtime(event));
  });

  realtime.on("message", (data) => {
    const parsed = tryParseJson(rawDataToBuffer(data));
    if (parsed) handleRealtimeEvent(parsed);
  });

  realtime.on("error", (error) => {
    console.error("OpenAI realtime socket error:", error);
    finish("openai_error").catch((finishError) => {
      console.error("Voicebot finish after OpenAI error failed:", finishError);
    });
  });

  realtime.on("close", () => {
    if (!closed && client.readyState === WebSocket.OPEN) {
      finish("openai_error").catch((error) => {
        console.error("Voicebot finish after OpenAI close failed:", error);
      });
    }
  });

  client.on("message", (data) => {
    const buffer = rawDataToBuffer(data);
    const parsed = tryParseJson(buffer);
    if (parsed) {
      handleExotelJson(parsed).catch((error) => {
        console.error("Exotel voicebot message error:", error);
        finish("server_error").catch((finishError) => {
          console.error("Voicebot finish after message error failed:", finishError);
        });
      });
      return;
    }
    appendCallerAudio(buffer);
  });

  client.on("close", () => {
    finish("caller_disconnected").catch((error) => {
      console.error("Voicebot finish after client close failed:", error);
    });
  });

  client.on("error", (error) => {
    console.error("Exotel voicebot socket error:", error);
    finish("server_error").catch((finishError) => {
      console.error("Voicebot finish after client error failed:", finishError);
    });
  });

  resolveWorkspace().catch((error) => {
    console.error("Initial voicebot workspace lookup failed:", error);
  });
};
