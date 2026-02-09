import { Router } from "express";
import type { Config } from "../config";
import {
  getLockoutRemaining,
  recordFailedAttempt,
  clearFailedAttempts,
} from "../middleware/auth";

export function createAuthRouter(config: Config): Router {
  const router = Router();

  /**
   * GET /api/auth/status
   * Check if the current session is authenticated.
   */
  router.get("/status", (req, res) => {
    res.json({
      authenticated: req.session?.authenticated === true,
    });
  });

  /**
   * POST /api/auth/verify
   * Verify the PIN and set session as authenticated.
   * Body: { pin: "1234" }
   */
  router.post("/verify", (req, res) => {
    const ip = req.ip ?? req.socket.remoteAddress ?? "unknown";

    // Check if IP is locked out
    const lockoutRemaining = getLockoutRemaining(ip);
    if (lockoutRemaining > 0) {
      res.status(429).json({
        error: "Too many failed attempts",
        lockoutSeconds: lockoutRemaining,
      });
      return;
    }

    const { pin } = req.body as { pin?: string };

    if (!pin || typeof pin !== "string") {
      res.status(400).json({ error: "PIN is required" });
      return;
    }

    if (pin === config.pin) {
      // Success — set session and clear failed attempts
      req.session.authenticated = true;
      clearFailedAttempts(ip);
      res.json({ authenticated: true });
      return;
    }

    // Wrong PIN
    const lockout = recordFailedAttempt(ip);
    if (lockout > 0) {
      res.status(429).json({
        error: "Too many failed attempts",
        lockoutSeconds: lockout,
      });
      return;
    }

    res.status(401).json({ error: "Invalid PIN" });
  });

  return router;
}
