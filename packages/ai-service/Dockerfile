# Build stage
FROM oven/bun:1 AS builder
WORKDIR /app
COPY packages/ai-service/package.json packages/ai-service/bun.lock* ./packages/ai-service/
COPY packages/shared/ ./packages/shared/
COPY packages/backend/openapi.json ./packages/backend/openapi.json
COPY package.json bun.lock* ./
RUN bun install
COPY packages/ai-service/ ./packages/ai-service/
RUN cd packages/ai-service && bun run build

# Runtime stage
FROM gcr.io/distroless/cc-debian12
WORKDIR /app
COPY --from=builder /app/packages/ai-service/dist/index.js ./
COPY --from=builder /usr/local/bin/bun /usr/local/bin/bun
EXPOSE 3001
CMD ["/usr/local/bin/bun", "run", "index.js"]
