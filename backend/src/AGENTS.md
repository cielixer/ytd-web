# AGENTS.md — backend/src

Express API server. PIN auth → session → rate limit → route handlers → yt-dlp.

## STRUCTURE

```
src/
├── index.ts           # App entry: helmet, session, middleware chain, SPA fallback
├── config.ts          # loadConfig() — env → typed Config, validates PIN format
├── middleware/
│   ├── auth.ts        # requireAuth + lockout logic (3 attempts → 30s, in-memory by IP)
│   └── rateLimiter.ts # express-rate-limit wrapper (configurable per-minute cap)
├── routes/
│   ├── auth.ts        # GET /status, POST /verify (PIN check with lockout)
│   └── download.ts    # POST / — validate URL → downloadAudio → stream MP3 → cleanup
├── services/
│   └── ytdlp.ts       # downloadAudio() — spawns yt-dlp via execFile, parses stderr progress
└── utils/
    └── validation.ts  # validateYouTubeUrl() — URL parse + ALLOWED_HOSTS whitelist
```

## REQUEST FLOW

```
Request → helmet → body parser (1KB limit) → session → rate limiter → requireAuth
  ├── /api/auth/*     → skips requireAuth → createAuthRouter
  ├── /api/download   → requires session → createDownloadRouter → downloadAudio → stream MP3
  ├── /api/health     → skips requireAuth → calls `yt-dlp --version`
  └── /*              → static files or SPA fallback (index.html)
```

## WHERE TO LOOK

| Task | File | Notes |
|------|------|-------|
| Add new route | `routes/` + mount in `index.ts` | `createXRouter(config)` factory pattern |
| Change auth behavior | `middleware/auth.ts` | `declare module "express-session"` for session fields |
| Change lockout params | `middleware/auth.ts` | `MAX_ATTEMPTS`, `LOCKOUT_DURATION_MS` constants |
| Add yt-dlp flags | `services/ytdlp.ts` | Add to `args` array, NEVER use string interpolation |
| Add allowed domain | `utils/validation.ts` | Append to `ALLOWED_HOSTS` array |
| Add env variable | `config.ts` + `.env` + `.env.example` | Update `Config` interface + `loadConfig()` |

## SECURITY-CRITICAL PATTERNS

- `execFile` only — never `exec`/`execSync` (shell injection)
- yt-dlp args MUST include `--no-exec` + `--ignore-config` (prevents yt-dlp running commands)
- URL goes as last positional arg in array — never interpolated into strings
- `err instanceof Error` before accessing `.message`
- Client errors are generic — `console.error` logs detail, response hides it
- Body parser capped at 1KB — prevents payload abuse

## CONVENTIONS

- All routers/middleware are factory functions taking `Config` param
- Session augmentation via `declare module "express-session"` in `auth.ts`
- Lockout state is in-memory `Map<string, FailedAttempt>` — resets on restart
- File cleanup uses best-effort try/catch (no thrown errors on cleanup failure)
- yt-dlp title read from sidecar `.title` file, not `--print` (skip-download bug)
- UUID-based temp filenames prevent path collisions
- Health endpoint imports `execFile` from `child_process` for version checking
