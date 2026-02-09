import { config as dotenvConfig } from "dotenv";
import { resolve, join } from "path";

// Load .env from project root (one level up from backend/src or backend/dist)
dotenvConfig({ path: resolve(__dirname, "../../.env"), quiet: true });

import express from "express";
import session from "express-session";
import helmet from "helmet";
import { loadConfig } from "./config";
import { requireAuth } from "./middleware/auth";
import { createRateLimiter } from "./middleware/rateLimiter";
import { createAuthRouter } from "./routes/auth";
import { createDownloadRouter } from "./routes/download";

const config = loadConfig();
const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

// Trust proxy (for Docker/reverse proxy setups)
app.set("trust proxy", 1);

// Body parsing
app.use(express.json({ limit: "1kb" }));

// Session management
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: false, // Set to true if behind HTTPS reverse proxy
    sameSite: "strict",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
  },
}));

// Rate limiting on API routes
app.use("/api/", createRateLimiter(config));

// Auth middleware (checks session for /api/* routes, skips /api/auth/*)
app.use(requireAuth(config));

// API routes
app.use("/api/auth", createAuthRouter(config));
app.use("/api/download", createDownloadRouter(config));

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Serve frontend static files in production
const publicDir = join(__dirname, "public");
app.use(express.static(publicDir));

// SPA fallback: serve index.html for any non-API route
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/")) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.sendFile(join(publicDir, "index.html"));
});

app.listen(config.port, "0.0.0.0", () => {
  console.log(`YTD-Web server running on http://0.0.0.0:${config.port}`);
  console.log(`PIN authentication enabled (${config.pin.length}-digit PIN)`);
});
