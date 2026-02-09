# AGENTS.md — YTD-Web

## Project Overview

YouTube music downloader web app. Users enter a YouTube URL and download audio as MP3.
Frontend: React + TypeScript + Vite. Backend: Node.js + Express + TypeScript.
Downloads powered by yt-dlp + ffmpeg. Dockerized for deployment. PIN-based auth.

## Architecture

```
ytd-web/
├── frontend/          # React SPA (Vite)
│   └── src/
│       ├── components/  # PinPad, DownloadForm, ProgressIndicator
│       ├── App.tsx      # Root component (auth routing)
│       ├── api.ts       # Fetch wrappers for /api/*
│       ├── main.tsx     # Entry point
│       └── index.css    # Global styles
├── backend/           # Express API server
│   └── src/
│       ├── middleware/  # auth.ts (PIN session), rateLimiter.ts
│       ├── routes/      # auth.ts (POST /verify, GET /status), download.ts (POST /)
│       ├── services/    # ytdlp.ts (spawns yt-dlp via execFile)
│       ├── utils/       # validation.ts (YouTube URL whitelist)
│       ├── config.ts    # Environment config loader
│       └── index.ts     # Express app entry point
├── Dockerfile         # Multi-stage build (frontend build, backend build, production)
├── docker-compose.yml # Single service with resource limits
└── .env.example       # PIN, PORT, RATE_LIMIT_MAX, SESSION_SECRET
```

Frontend is built by Vite into `backend/dist/public/` and served as static files by Express.

## Build / Dev / Lint Commands

```sh
# Install all dependencies (both workspaces)
npm install

# --- Development ---
npm run dev:backend          # Start backend with tsx watch (port 3000)
npm run dev:frontend         # Start Vite dev server (port 5173, proxies /api to :3000)

# --- Build ---
npm run build                # Build frontend then backend (production)
npm run build -w frontend    # Build frontend only
npm run build -w backend     # Build backend only (tsc)

# --- Type checking (lint) ---
npm run lint                 # Type-check both workspaces
npm run lint -w backend      # Type-check backend only (tsc --noEmit)
npm run lint -w frontend     # Type-check frontend only (tsc --noEmit)

# --- Production ---
npm run start                # Start compiled backend (serves frontend static files)

# --- Docker ---
npm run docker:build         # docker compose build
npm run docker:up            # docker compose up -d
npm run docker:down          # docker compose down
docker compose build         # Build Docker image
docker compose up -d         # Run in background
docker compose logs -f       # View logs
```

## Environment Variables

Copy `.env.example` to `.env` before running:

| Variable         | Default                          | Description                      |
|------------------|----------------------------------|----------------------------------|
| `PIN`            | `1234`                           | 4-digit auth PIN                 |
| `PORT`           | `3000`                           | Server port                      |
| `RATE_LIMIT_MAX` | `5`                              | Max API requests per minute / IP |
| `SESSION_SECRET` | random (auto-generated if unset) | Express session secret           |
| `TMP_DIR`        | `/tmp/ytd-web`                   | Temp dir for downloads           |

## Code Style Guidelines

### TypeScript

- Strict mode enabled in both `tsconfig.json` files
- Use explicit types for function parameters and return types
- Use `interface` for object shapes, `type` for unions/intersections
- No `any` — use `unknown` and narrow with type guards
- Use `const` by default, `let` only when reassignment is needed

### Imports

- Use named exports/imports (no default exports except React components)
- Import order: node builtins, external packages, internal modules (relative paths)
- Use `type` imports when importing only types: `import type { Config } from "./config"`

### Naming Conventions

| Element           | Convention        | Example                  |
|-------------------|-------------------|--------------------------|
| Files             | camelCase         | `rateLimiter.ts`         |
| React components  | PascalCase        | `PinPad.tsx`             |
| Functions         | camelCase         | `validateYouTubeUrl`     |
| Types/Interfaces  | PascalCase        | `DownloadProgress`       |
| Constants         | UPPER_SNAKE_CASE  | `MAX_ATTEMPTS`           |
| CSS classes       | kebab-case        | `pin-container`          |
| Env variables     | UPPER_SNAKE_CASE  | `RATE_LIMIT_MAX`         |

### React Components

- Functional components only (no class components)
- Use named function exports: `export function PinPad() {}`
- Hooks at the top of the component function
- Memoize callbacks with `useCallback` when passed as props
- Keep components in `frontend/src/components/`

### Error Handling

- Backend: try/catch in route handlers, return JSON error responses with appropriate status codes
- Use `err instanceof Error` type narrowing before accessing `.message`
- Never expose internal error details to the client
- Backend logs errors to console; client shows user-friendly messages

### Security (CRITICAL)

- **Command injection**: Always use `execFile` (not `exec`) to spawn yt-dlp. Never interpolate user input into shell commands
- **URL validation**: Only allow youtube.com and youtu.be domains (see `validation.ts`)
- **yt-dlp flags**: Always pass `--no-exec` and `--ignore-config` to prevent yt-dlp from running arbitrary commands
- **Rate limiting**: All `/api/*` routes are rate-limited
- **Input size**: Express body parser limited to 1KB
- **Session cookies**: httpOnly, sameSite strict, 1-week expiry
- **Non-root Docker**: Production container runs as `ytdweb` user

### CSS / Styling

- Plain CSS in `frontend/src/index.css` (no CSS-in-JS, no preprocessor)
- Mobile-first responsive design
- Dark theme (#0f0f1a background, #6c63ff accent)
- Large touch targets (min 48px) for mobile usability
- Use CSS custom properties if adding theming later

### API Endpoints

| Method | Path                | Auth? | Description                      |
|--------|---------------------|-------|----------------------------------|
| GET    | `/api/auth/status`  | No    | Check if session is authenticated |
| POST   | `/api/auth/verify`  | No    | Verify PIN, set session          |
| POST   | `/api/download`     | Yes   | Download YouTube audio as MP3    |
| GET    | `/api/health`       | No    | Health check                     |

### Adding New Features

1. Backend routes go in `backend/src/routes/` — create a new router file and mount in `index.ts`
2. Shared types should be duplicated (no shared package) — keep frontend/backend independent
3. New middleware goes in `backend/src/middleware/`
4. New React components go in `frontend/src/components/`
5. Run `npm run lint` after changes to ensure type safety

### Docker Notes

- Multi-stage Dockerfile: stage 1 builds frontend, stage 2 builds backend, stage 3 is production
- Production image includes: Node.js 20, Python 3, yt-dlp, ffmpeg
- Container resource limits: 512MB RAM, 1 CPU core
- Temp downloads stored in named Docker volume `ytd-tmp`
- yt-dlp auto-updates are disabled in Docker; rebuild image to update
