import rateLimit from "express-rate-limit";
import type { Config } from "../config";

export function createRateLimiter(config: Config) {
  return rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: config.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      error: "Too many requests. Please wait a minute before trying again.",
    },
  });
}
