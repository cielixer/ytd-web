import { randomBytes } from "crypto";

export interface Config {
  pin: string;
  port: number;
  rateLimitMax: number;
  sessionSecret: string;
  tmpDir: string;
}

export function loadConfig(): Config {
  const pin = process.env.PIN ?? "1234";

  if (!/^\d{4}$/.test(pin)) {
    throw new Error("PIN must be exactly 4 digits");
  }

  return {
    pin,
    port: parseInt(process.env.PORT ?? "3000", 10),
    rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX ?? "5", 10),
    sessionSecret:
      process.env.SESSION_SECRET && process.env.SESSION_SECRET !== "change-me-to-a-random-string"
        ? process.env.SESSION_SECRET
        : randomBytes(32).toString("hex"),
    tmpDir: process.env.TMP_DIR ?? "/tmp/ytd-web",
  };
}
