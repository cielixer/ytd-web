# AGENTS.md — YTD-Web

**Generated:** 2026-02-10 | **Commit:** dbf9f0b | **Branch:** main

## OVERVIEW

YouTube music downloader. Paste URL → get MP3. React+Vite frontend, Express backend, yt-dlp+ffmpeg processing. PIN-gated, Dockerized.

## STRUCTURE

```
ytd-web/
├── frontend/src/          # React SPA — see frontend/src/AGENTS.md
│   ├── components/        # PinPad, DownloadForm, ProgressIndicator
│   ├── App.tsx            # Auth gate (PIN → download form)
│   ├── api.ts             # fetch wrappers for /api/*
│   └── index.css          # All styles (dark theme, mobile-first)
├── backend/src/           # Express API — see backend/src/AGENTS.md
│   ├── middleware/         # auth (PIN session + lockout), rateLimiter
│   ├── routes/            # auth (verify/status), download (POST → stream MP3)
│   ├── services/          # ytdlp.ts (execFile yt-dlp, progress parsing, cleanup)
│   ├── utils/             # validation.ts (YouTube URL whitelist)
│   ├── config.ts          # Env loader (PIN, PORT, RATE_LIMIT_MAX, etc.)
│   └── index.ts           # Express app entry (helmet, session, routing, SPA fallback)
├── docker-entrypoint.sh    # Auto-update logic + privilege drop
├── Dockerfile             # 4-stage: deps → frontend build → backend build → prod
├── docker-compose.yml     # Single service, 512MB/1CPU limit, port 7893
└── .env                   # PIN, PORT, RATE_LIMIT_MAX, SESSION_SECRET, TMP_DIR
```

Frontend builds into `backend/dist/public/` — Express serves it as static files.

## WHERE TO LOOK

| Task | Location | Notes |
|------|----------|-------|
| Add API endpoint | `backend/src/routes/` → mount in `backend/src/index.ts` | Follow factory pattern: `createXRouter(config)` |
| Add React component | `frontend/src/components/` | Named function export |
| Change auth logic | `backend/src/middleware/auth.ts` | Session augmentation via `declare module` |
| Change URL validation | `backend/src/utils/validation.ts` | ALLOWED_HOSTS whitelist |
| Change yt-dlp behavior | `backend/src/services/ytdlp.ts` | Security flags are CRITICAL here |
| Change styling | `frontend/src/index.css` | Single CSS file, no preprocessor |
| Change env config | `backend/src/config.ts` + `.env` + `.env.example` | Update all three |
| Change auto-update behavior | `docker-entrypoint.sh` | Cron schedule, toggle via YTDLP_AUTO_UPDATE |
| Docker/deploy | `Dockerfile` + `docker-compose.yml` | Rebuild image for yt-dlp updates |

## CODE MAP

| Symbol | Type | Location | Role |
|--------|------|----------|------|
| `loadConfig` | function | `backend/src/config.ts` | Env → typed Config object |
| `requireAuth` | middleware factory | `backend/src/middleware/auth.ts` | Session check, skips /api/auth + /api/health |
| `createRateLimiter` | middleware factory | `backend/src/middleware/rateLimiter.ts` | express-rate-limit wrapper |
| `createAuthRouter` | router factory | `backend/src/routes/auth.ts` | PIN verify + status check |
| `createDownloadRouter` | router factory | `backend/src/routes/download.ts` | URL validate → download → stream MP3 |
| `downloadAudio` | async function | `backend/src/services/ytdlp.ts` | Spawns yt-dlp, returns {filePath, title} |
| `validateYouTubeUrl` | function | `backend/src/utils/validation.ts` | URL parse + hostname whitelist |
| `App` | component | `frontend/src/App.tsx` | Auth gate: PinPad or DownloadForm |
| `PinPad` | component | `frontend/src/components/PinPad.tsx` | 4-digit PIN entry with lockout UI |
| `DownloadForm` | component | `frontend/src/components/DownloadForm.tsx` | URL input → fetch /api/download → blob download |
| `ProgressIndicator` | component | `frontend/src/components/ProgressIndicator.tsx` | Status display (downloading/converting/error/complete) |

## CONVENTIONS

- **No shared types package** — duplicate types between frontend/backend
- **Factory pattern** — all routers/middleware take `Config` param: `createXRouter(config)`
- **No ESLint/Prettier** — type checking only via `tsc --noEmit`
- **Named exports everywhere** — except `App.tsx` (default export for Vite)
- **`interface`** for object shapes, **`type`** for unions
- Import order: node builtins → external packages → relative imports
- Use `type` keyword for type-only imports
- File naming: camelCase (`.ts`), PascalCase (`.tsx`)

## ANTI-PATTERNS (CRITICAL)

| Never Do | Why | Correct Alternative |
|----------|-----|---------------------|
| `exec()` or `execSync()` for yt-dlp | Shell injection | `execFile()` only |
| Omit `--no-exec` or `--ignore-config` from yt-dlp | yt-dlp can run arbitrary commands | Always include both flags |
| Interpolate user input into shell strings | Command injection | Pass as array args to `execFile` |
| Accept non-YouTube URLs | Scope + security | `validateYouTubeUrl()` whitelist |
| Expose internal error details to client | Information leak | Generic user-facing messages |
| Use `any` type | Type safety | `unknown` + type narrowing |
| `@ts-ignore` / `@ts-expect-error` | Masks real issues | Fix the type error |
| Skip `err instanceof Error` check | Runtime safety | Narrow before `.message` |

## COMMANDS

```sh
npm install                      # Install all workspaces
npm run dev:backend              # tsx watch (port 3000)
npm run dev:frontend             # Vite dev server (port 5173, proxies /api → :3000)
npm run build                    # Production build (frontend then backend)
npm run lint                     # tsc --noEmit on both workspaces
npm run start                    # Run production server
npm run docker:build && npm run docker:up   # Build + run container
```

## ENV

Copy `.env.example` → `.env`. Required for local dev:

| Variable | Default | Notes |
|----------|---------|-------|
| `PIN` | `1234` | Must be exactly 4 digits |
| `PORT` | `3000` | |
| `RATE_LIMIT_MAX` | `5` | Requests per minute per IP |
| `SESSION_SECRET` | auto-generated | Set in production |
| `TMP_DIR` | `/tmp/ytd-web` | Temp download storage |
| `YTDLP_AUTO_UPDATE` | `true` | Toggle yt-dlp auto-updates (Docker only) |
| `YTDLP_UPDATE_INTERVAL` | `6h` | 1h, 6h, 12h, or 24h (Docker only) |

## GOTCHAS

- Frontend Vite dev server proxies `/api` → `localhost:3000` — must run both dev servers
- `docker-compose.yml` maps port **7893**:7893, not 3000 — set `PORT=7893` in `.env`
- Session cookie `secure: false` — set to `true` behind HTTPS reverse proxy
- Helmet disables HSTS (`strictTransportSecurity: false`) — HTTP-only deployment assumed
- yt-dlp progress is parsed from **stderr**, not stdout
- `--print-to-file` writes title to sidecar `.title` file (avoids `--print` skip-download bug)
- Lockout after 3 failed PIN attempts: 30s cooldown, tracked in-memory by IP
- yt-dlp auto-updates via cron inside Docker. If cron fires mid-download, Linux inode semantics keep the old binary running safely.
- `docker-compose.yml` uses `init: true` for tini — handles signals and zombie reaping
- No tests exist — add vitest for frontend, jest for backend when needed
- `trust proxy` is set to `1` — required for correct IP detection behind Docker/nginx
