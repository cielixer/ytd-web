# ===== Stage 1: Install all dependencies =====
FROM node:20-slim AS deps
WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend/package.json frontend/

RUN npm ci


# ===== Stage 2: Build Frontend =====
FROM deps AS frontend-build
WORKDIR /app

COPY frontend/ frontend/
COPY backend/package.json backend/
RUN npm run build --workspace=frontend


# ===== Stage 3: Build Backend =====
FROM deps AS backend-build
WORKDIR /app

COPY backend/ backend/
RUN npm run build --workspace=backend


# ===== Stage 4: Production =====
FROM node:20-slim

# Install yt-dlp and ffmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      python3 \
      python3-pip \
      ffmpeg \
      ca-certificates && \
    pip3 install --break-system-packages "yt-dlp[default]" && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy backend build output and hoisted node_modules
COPY --from=backend-build /app/backend/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
COPY backend/package.json ./package.json

# Copy frontend build output into backend's public directory
COPY --from=frontend-build /app/backend/dist/public ./dist/public

# Create temp directory for downloads
RUN mkdir -p /tmp/ytd-web

# Non-root user for security
RUN groupadd -r ytdweb && useradd -r -g ytdweb -d /app ytdweb && \
    chown -R ytdweb:ytdweb /app /tmp/ytd-web
USER ytdweb

EXPOSE 3000

ENV NODE_ENV=production
ENV TMP_DIR=/tmp/ytd-web

CMD ["node", "dist/index.js"]
