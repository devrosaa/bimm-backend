# syntax=docker/dockerfile:1

FROM node:22-bookworm-slim AS deps
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN corepack enable
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
RUN pnpm run build

FROM node:22-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV DATABASE_URL=file:/data/prod.db
ENV LOG_LEVEL=info
ENV INGEST_ON_BOOT=true
ENV INGEST_MAKE_LIMIT=0
ENV INGEST_CONCURRENCY=10
ENV NHTSA_TIMEOUT_MS=15000
ENV NHTSA_RETRY_COUNT=2
ENV NHTSA_BASE_URL=https://vpic.nhtsa.dot.gov/api/vehicles
RUN corepack enable && mkdir -p /data
COPY package.json pnpm-lock.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
RUN pnpm prune --prod
EXPOSE 3000
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/main.js"]
