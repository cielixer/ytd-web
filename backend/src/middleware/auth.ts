import type { Request, Response, NextFunction } from "express";
import type { Config } from "../config";

// Extend express-session to include our custom fields
declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

interface FailedAttempt {
  count: number;
  lockedUntil: number | null;
}

const MAX_ATTEMPTS = 3;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds

// Track failed attempts by IP
const failedAttempts = new Map<string, FailedAttempt>();

/**
 * Returns remaining lockout time in seconds, or 0 if not locked.
 */
export function getLockoutRemaining(ip: string): number {
  const attempt = failedAttempts.get(ip);
  if (!attempt?.lockedUntil) return 0;

  const remaining = attempt.lockedUntil - Date.now();
  if (remaining <= 0) {
    failedAttempts.delete(ip);
    return 0;
  }
  return Math.ceil(remaining / 1000);
}

/**
 * Record a failed PIN attempt. Returns lockout seconds if now locked, 0 otherwise.
 */
export function recordFailedAttempt(ip: string): number {
  const attempt = failedAttempts.get(ip) ?? { count: 0, lockedUntil: null };
  attempt.count += 1;

  if (attempt.count >= MAX_ATTEMPTS) {
    attempt.lockedUntil = Date.now() + LOCKOUT_DURATION_MS;
    attempt.count = 0;
    failedAttempts.set(ip, attempt);
    return Math.ceil(LOCKOUT_DURATION_MS / 1000);
  }

  failedAttempts.set(ip, attempt);
  return 0;
}

/**
 * Clear failed attempts for an IP (on successful auth).
 */
export function clearFailedAttempts(ip: string): void {
  failedAttempts.delete(ip);
}

/**
 * Middleware that checks if the request is authenticated via session.
 * Auth routes are excluded.
 */
export function requireAuth(_config: Config) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Allow auth and health routes through
    if (req.path.startsWith("/api/auth") || req.path === "/api/health") {
      next();
      return;
    }

    // Allow non-API routes through (static files)
    if (!req.path.startsWith("/api/")) {
      next();
      return;
    }

    if (req.session?.authenticated) {
      next();
      return;
    }

    res.status(401).json({ error: "Authentication required" });
  };
}
