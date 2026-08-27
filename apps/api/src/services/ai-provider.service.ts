import OpenAI from "openai";

export type AiProviderName = "deepseek" | "openai";

export interface AiProvider {
  name: AiProviderName;
  client: OpenAI;
  model: string;
}

const DEFAULT_DEEPSEEK_MODEL = "deepseek-chat";
const DEFAULT_OPENAI_FALLBACK_MODEL = "gpt-3.5-turbo";
const DEFAULT_PROVIDER_TIMEOUT_MS = 30_000;
const DEFAULT_PROVIDER_MAX_RETRIES = 0;

interface CachedClient {
  signature: string;
  client: OpenAI;
}

let deepSeekClient: CachedClient | null = null;
let openAiFallbackClient: CachedClient | null = null;

const envInteger = (key: string, fallback: number, minimum: number) => {
  const value = Number(process.env[key]);
  return Number.isInteger(value) && value >= minimum ? value : fallback;
};

const providerClientOptions = () => ({
  timeout: envInteger(
    "AI_PROVIDER_TIMEOUT_MS",
    DEFAULT_PROVIDER_TIMEOUT_MS,
    1_000,
  ),
  maxRetries: envInteger(
    "AI_PROVIDER_MAX_RETRIES",
    DEFAULT_PROVIDER_MAX_RETRIES,
    0,
  ),
});

const getCachedClient = (
  cached: CachedClient | null,
  apiKey: string,
  baseURL?: string,
): CachedClient => {
  const options = providerClientOptions();
  const signature = [
    apiKey,
    baseURL || "https://api.openai.com/v1",
    options.timeout,
    options.maxRetries,
  ].join(":");

  if (cached?.signature === signature) return cached;

  return {
    signature,
    client: new OpenAI({
      apiKey,
      ...(baseURL ? { baseURL } : {}),
      ...options,
    }),
  };
};

const getDeepSeekProvider = (): AiProvider | null => {
  const apiKey = process.env.DEEPSEEK_API_KEY?.trim();
  if (!apiKey) return null;

  deepSeekClient = getCachedClient(
    deepSeekClient,
    apiKey,
    "https://api.deepseek.com",
  );

  return {
    name: "deepseek",
    client: deepSeekClient.client,
    model: process.env.DEEPSEEK_MODEL?.trim() || DEFAULT_DEEPSEEK_MODEL,
  };
};

const getOpenAiFallbackProvider = (): AiProvider | null => {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  openAiFallbackClient = getCachedClient(openAiFallbackClient, apiKey);

  return {
    name: "openai",
    client: openAiFallbackClient.client,
    model:
      process.env.OPENAI_FALLBACK_MODEL?.trim() ||
      DEFAULT_OPENAI_FALLBACK_MODEL,
  };
};

const errorMessage = (error: unknown) => {
  let message = error instanceof Error ? error.message : String(error);

  for (const rawSecret of [
    process.env.DEEPSEEK_API_KEY,
    process.env.OPENAI_API_KEY,
  ]) {
    const secret = rawSecret?.trim();
    if (secret && secret.length >= 8) {
      message = message.replaceAll(secret, "[redacted]");
    }
  }

  return message.slice(0, 500);
};

const errorMetadata = (error: unknown) => {
  const details = error as {
    code?: unknown;
    name?: unknown;
    request_id?: unknown;
    status?: unknown;
  };

  return {
    name: typeof details?.name === "string" ? details.name : "UnknownError",
    message: errorMessage(error),
    ...(typeof details?.status === "number" ? { status: details.status } : {}),
    ...(typeof details?.code === "string" ? { code: details.code } : {}),
    ...(typeof details?.request_id === "string"
      ? { requestId: details.request_id }
      : {}),
  };
};

const sanitizedError = (error: unknown) => {
  const metadata = errorMetadata(error);
  const safeError = new Error(metadata.message);
  safeError.name = metadata.name;
  return Object.assign(safeError, {
    ...("status" in metadata ? { status: metadata.status } : {}),
    ...("code" in metadata ? { code: metadata.code } : {}),
    ...("requestId" in metadata ? { requestId: metadata.requestId } : {}),
  });
};

const shouldSkipFallback = (error: unknown) => {
  const details = error as { code?: unknown; name?: unknown };
  return (
    details?.name === "APIUserAbortError" ||
    details?.code === "content_filter" ||
    details?.code === "content_policy_violation"
  );
};

/**
 * Runs DeepSeek first and switches to OpenAI only when the complete provider
 * operation throws. Keeping validation inside `operation` also makes empty or
 * otherwise unusable model output eligible for failover.
 */
export const runWithAiFallback = async <T>(
  operationName: string,
  operation: (provider: AiProvider) => Promise<T>,
): Promise<T> => {
  const deepSeek = getDeepSeekProvider();
  const openAi = getOpenAiFallbackProvider();

  if (!deepSeek && !openAi) {
    throw new Error(
      "No AI provider is configured. Set at least one of DEEPSEEK_API_KEY or OPENAI_API_KEY.",
    );
  }

  if (!deepSeek && openAi) {
    console.warn("[ai:provider] DeepSeek is not configured; using OpenAI", {
      operation: operationName,
      fallbackModel: openAi.model,
    });

    try {
      return await operation(openAi);
    } catch (openAiError) {
      throw new Error(
        `OpenAI failed while generating ${operationName}: ${errorMessage(openAiError)}`,
        { cause: sanitizedError(openAiError) },
      );
    }
  }

  try {
    return await operation(deepSeek!);
  } catch (deepSeekError) {
    if (shouldSkipFallback(deepSeekError)) {
      console.warn(
        "[ai:provider] DeepSeek response is not eligible for fallback",
        {
          operation: operationName,
          error: errorMetadata(deepSeekError),
        },
      );
      throw sanitizedError(deepSeekError);
    }

    if (!openAi) {
      console.error(
        "[ai:provider] DeepSeek failed and OpenAI is not configured",
        {
          operation: operationName,
          error: errorMetadata(deepSeekError),
        },
      );
      throw new Error(
        `DeepSeek failed while generating ${operationName}, and OPENAI_API_KEY is not configured: ${errorMessage(deepSeekError)}`,
        { cause: sanitizedError(deepSeekError) },
      );
    }

    console.warn("[ai:provider] DeepSeek failed; switching to OpenAI", {
      operation: operationName,
      primaryModel: deepSeek!.model,
      fallbackModel: openAi.model,
      error: errorMetadata(deepSeekError),
    });

    try {
      const result = await operation(openAi);
      console.info("[ai:provider] OpenAI fallback succeeded", {
        operation: operationName,
        fallbackModel: openAi.model,
      });
      return result;
    } catch (openAiError) {
      console.error("[ai:provider] Both AI providers failed", {
        operation: operationName,
        deepSeekError: errorMetadata(deepSeekError),
        openAiError: errorMetadata(openAiError),
      });
      throw new AggregateError(
        [sanitizedError(deepSeekError), sanitizedError(openAiError)],
        `DeepSeek and OpenAI both failed while generating ${operationName}`,
      );
    }
  }
};
