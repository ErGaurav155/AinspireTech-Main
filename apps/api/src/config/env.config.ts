import dotenv from "dotenv";
import path from "path";

export function loadEnvironment() {
  // Load .env.local first, then .env
  const envPath = path.resolve(process.cwd(), ".env.local");
  const defaultEnvPath = path.resolve(process.cwd(), ".env");

  // Try .env.local first
  const localResult = dotenv.config({ path: envPath });

  // If .env.local doesn't exist, try .env
  if (localResult.error) {
    const defaultResult = dotenv.config({ path: defaultEnvPath });
    if (defaultResult.error) {
      console.warn(
        "⚠️ No .env file found. Using system environment variables.",
      );
    } else {
      console.log("✅ Loaded environment from .env");
    }
  } else {
    console.log("✅ Loaded environment from .env.local");
  }
}

export function getEnv(key: string, defaultValue?: string): string {
  return process.env[key] || defaultValue || "";
}

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development" || !process.env.NODE_ENV;
}
