FROM node:20-alpine AS base

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

FROM base AS dependencies
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS builder
ENV NODE_ENV=production
ENV DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build
ENV APP_SECRET=build-only-placeholder-change-at-runtime-000000
ENV APP_TIMEZONE=Asia/Taipei
ENV ADMIN_INITIAL_PASSWORD=build-only
ENV MASTER_INITIAL_PASSWORD=build-only
ENV MAX_UPLOAD_SIZE_MB=20
ENV AI_ENABLED=false

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app /app
RUN mkdir -p /app/storage/documents \
  && chmod +x /app/docker-entrypoint.sh

EXPOSE 3010
ENTRYPOINT ["/app/docker-entrypoint.sh"]
