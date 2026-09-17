# syntax=docker/dockerfile:1

# ---- dependencies (better-sqlite3 is native, so this stage needs a compiler)
FROM node:22-alpine AS deps
RUN apk add --no-cache python3 make g++
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# ---- build
FROM node:22-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- runtime: only the standalone output, running as an unprivileged user
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATA_DIR=/data

RUN addgroup -S -g 1001 baanjager \
 && adduser -S -u 1001 -G baanjager baanjager \
 && mkdir -p /data \
 && chown baanjager:baanjager /data

COPY --from=build --chown=baanjager:baanjager /app/.next/standalone ./
COPY --from=build --chown=baanjager:baanjager /app/.next/static ./.next/static
COPY --from=build --chown=baanjager:baanjager /app/public ./public
# Migrations run at startup, so they have to ship with the image.
COPY --from=build --chown=baanjager:baanjager /app/drizzle ./drizzle

USER baanjager
EXPOSE 3000
VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/health >/dev/null || exit 1

CMD ["node", "server.js"]
