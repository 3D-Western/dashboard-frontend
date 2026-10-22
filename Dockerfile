# Dashboard image: Next.js standalone output (D-19: containers, configured only by environment variables).
# Build context is this folder:  docker build -t makerspace-frontend frontend
# The public website (website/) stays on Vercel and has no Dockerfile.
# Run-time env: API_URL (where the backend is, e.g. http://backend:8000). MOCK_ENABLED must be absent or false.
# Nothing secret is needed or baked in.

FROM node:24.22.0-alpine3.24 AS base
RUN npm install -g pnpm@11.28.7
WORKDIR /app

# ---- dependencies (cached until the lockfile changes) ----
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# next.config.ts switches to standalone output on this variable. GIT_SHA makes the service worker change per deploy.
ARG GIT_SHA=
ENV NEXT_OUTPUT=standalone NEXT_TELEMETRY_DISABLED=1 GITHUB_SHA=${GIT_SHA}
RUN pnpm run build

# ---- run ----
FROM node:24.22.0-alpine3.24
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
RUN addgroup -S -g 10001 app && adduser -S -u 10001 -G app -h /app app
WORKDIR /app
COPY --from=build --chown=app:app /app/.next/standalone ./
COPY --from=build --chown=app:app /app/.next/static ./.next/static
COPY --from=build --chown=app:app /app/public ./public
USER app
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q --spider "http://127.0.0.1:${PORT}/manifest.webmanifest" || exit 1
CMD ["node", "server.js"]
