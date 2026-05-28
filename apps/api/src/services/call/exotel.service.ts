export type ExotelWebhookPayload = Record<string, any>;

export interface NormalizedExotelCall {
  callSid: string;
  fromNumber: string;
  toNumber: string;
  virtualNumber: string;
  direction: "inbound" | "outbound";
  status: "answered" | "missed" | "transferred" | "voicemail";
  callState: string;
  durationSec: number;
  recordingUrl: string;
  transcriptText: string;
  summary: string;
  callerName: string;
  callerEmail: string;
  interest: string;
  notes: string;
  rawPayload: ExotelWebhookPayload;
}

const getValue = (
  payload: ExotelWebhookPayload,
  keys: string[],
  fallback = "",
) => {
  for (const key of keys) {
    const value = payload[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return fallback;
};

const normalizePhone = (value: string) => value.replace(/\s+/g, "");

const asNumber = (value: unknown) => {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

const resolveStatus = (payload: ExotelWebhookPayload) => {
  const raw = getValue(payload, [
    "CallStatus",
    "Status",
    "CallState",
    "call_status",
    "status",
  ]).toLowerCase();

  if (["missed", "no-answer", "no_answer", "busy", "failed"].includes(raw)) {
    return "missed";
  }
  if (["voicemail", "machine"].includes(raw)) return "voicemail";
  if (["transferred", "completed-transfer"].includes(raw)) return "transferred";
  return "answered";
};

const buildSummary = (
  status: NormalizedExotelCall["status"],
  interest: string,
  notes: string,
) => {
  if (notes) return notes;
  if (interest) return `Caller is interested in ${interest}.`;
  if (status === "missed") return "Missed call received on Exotel.";
  return "Call event received from Exotel.";
};

export const mergeExotelPayload = (
  query: ExotelWebhookPayload,
  body: ExotelWebhookPayload,
) => ({
  ...(query || {}),
  ...(body || {}),
});

export const normalizeExotelWebhook = (
  payload: ExotelWebhookPayload,
): NormalizedExotelCall => {
  const callSid =
    getValue(payload, ["CallSid", "Sid", "call_sid", "callSid"]) ||
    `exotel_${Date.now()}`;
  const fromNumber = normalizePhone(
    getValue(payload, [
      "FromNumber",
      "CallFrom",
      "From",
      "from",
      "caller",
      "Caller",
    ]),
  );
  const toNumber = normalizePhone(
    getValue(payload, ["ToNumber", "CallTo", "To", "to", "Called"]),
  );
  const virtualNumber = normalizePhone(
    getValue(payload, [
      "VirtualNumber",
      "DialWhomNumber",
      "Exophone",
      "CallerId",
      "virtual_number",
    ]) || toNumber,
  );
  const status = resolveStatus(payload);
  const interest = getValue(payload, [
    "Interest",
    "LeadInterest",
    "intent",
    "Intent",
    "Service",
  ]);
  const notes = getValue(payload, [
    "Notes",
    "CallNotes",
    "Comment",
    "CallSummary",
    "Summary",
    "SpeechResult",
  ]);

  return {
    callSid,
    fromNumber,
    toNumber,
    virtualNumber,
    direction:
      getValue(payload, ["Direction", "direction"]).toLowerCase() === "outbound"
        ? "outbound"
        : "inbound",
    status,
    callState: getValue(payload, ["CallState", "State", "Status"]),
    durationSec: asNumber(
      getValue(payload, [
        "TotalDuration",
        "ConversationDuration",
        "DialCallDuration",
        "Duration",
        "duration",
      ]),
    ),
    recordingUrl: getValue(payload, [
      "CallRecordings",
      "RecordingUrl",
      "RecordingURL",
      "Recording",
      "recording_url",
    ]),
    transcriptText: getValue(payload, [
      "Transcript",
      "TranscriptText",
      "transcript",
      "SpeechResult",
    ]),
    summary: buildSummary(status, interest, notes),
    callerName: getValue(payload, ["CallerName", "Name", "name"]),
    callerEmail: getValue(payload, ["CallerEmail", "Email", "email"]),
    interest,
    notes,
    rawPayload: payload,
  };
};

export const verifyExotelWebhookSecret = (payload: ExotelWebhookPayload) => {
  const expected = process.env.EXOTEL_WEBHOOK_SECRET;
  if (!expected) return true;

  const provided = getValue(payload, [
    "secret",
    "webhookSecret",
    "x-exotel-webhook-secret",
  ]);

  return provided === expected;
};

const getExotelConfig = () => {
  const apiKey = process.env.EXOTEL_API_KEY;
  const apiToken = process.env.EXOTEL_API_TOKEN;
  const accountSid = process.env.EXOTEL_ACCOUNT_SID;
  const subdomain = process.env.EXOTEL_SUBDOMAIN || "api.exotel.com";

  return { apiKey, apiToken, accountSid, subdomain };
};

export const getExotelConfigStatus = () => {
  const config = getExotelConfig();
  return {
    configured: Boolean(config.apiKey && config.apiToken && config.accountSid),
    hasApiKey: Boolean(config.apiKey),
    hasApiToken: Boolean(config.apiToken),
    hasAccountSid: Boolean(config.accountSid),
    subdomain: config.subdomain,
    smsSender: process.env.EXOTEL_SMS_SENDER || "",
    webhookSecretConfigured: Boolean(process.env.EXOTEL_WEBHOOK_SECRET),
  };
};

const exotelFetch = async (
  path: string,
  options: {
    method?: "GET" | "POST";
    body?: URLSearchParams;
  } = {},
) => {
  const { apiKey, apiToken, accountSid, subdomain } = getExotelConfig();
  if (!apiKey || !apiToken || !accountSid) {
    throw new Error(
      "EXOTEL_API_KEY, EXOTEL_API_TOKEN, and EXOTEL_ACCOUNT_SID are required",
    );
  }

  const url = `https://${subdomain}/v1/Accounts/${accountSid}${path}`;
  const auth = Buffer.from(`${apiKey}:${apiToken}`).toString("base64");

  const response = await fetch(url, {
    method: options.method || "GET",
    headers: {
      Authorization: `Basic ${auth}`,
      ...(options.body
        ? { "Content-Type": "application/x-www-form-urlencoded" }
        : {}),
    },
    body: options.body,
  });

  const text = await response.text();
  let data: any = text;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    throw new Error(
      `Exotel API failed (${response.status}): ${
        typeof data === "string" ? data : JSON.stringify(data)
      }`,
    );
  }

  return data;
};

export const sendExotelSms = async ({
  to,
  body,
  from,
}: {
  to: string;
  body: string;
  from?: string;
}) => {
  const sender = from || process.env.EXOTEL_SMS_SENDER;
  if (!sender) {
    throw new Error("EXOTEL_SMS_SENDER is required to send SMS");
  }

  const form = new URLSearchParams();
  form.set("From", sender);
  form.set("To", to);
  form.set("Body", body);

  if (process.env.EXOTEL_DLT_ENTITY_ID) {
    form.set("DltEntityId", process.env.EXOTEL_DLT_ENTITY_ID);
  }
  if (process.env.EXOTEL_DLT_TEMPLATE_ID) {
    form.set("DltTemplateId", process.env.EXOTEL_DLT_TEMPLATE_ID);
  }

  return exotelFetch("/Sms/send.json", { method: "POST", body: form });
};

export const connectExotelCall = async ({
  from,
  to,
  callerId,
  url,
}: {
  from: string;
  to: string;
  callerId?: string;
  url?: string;
}) => {
  const form = new URLSearchParams();
  form.set("From", from);
  form.set("To", to);
  if (callerId || process.env.EXOTEL_CALLER_ID) {
    form.set("CallerId", callerId || process.env.EXOTEL_CALLER_ID || "");
  }
  if (url || process.env.EXOTEL_CALL_FLOW_URL) {
    form.set("Url", url || process.env.EXOTEL_CALL_FLOW_URL || "");
  }

  return exotelFetch("/Calls/connect.json", { method: "POST", body: form });
};
