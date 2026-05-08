# Multi-stage build: compile TS in builder, ship only runtime artifacts.
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./
# --ignore-scripts skips the `prepare` hook (which runs `tsc`) — we
# can't build before src/ is copied, so we run it explicitly below.
RUN npm ci --ignore-scripts
COPY src ./src
RUN npm run build

FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

COPY --from=builder /app/dist ./dist

# Required at runtime — pass via `docker run -e`.
ENV TRELLO_API_KEY="" \
    TRELLO_TOKEN=""

# Optional — see README "Configuration" for behavior.
ENV TRELLO_READ_ONLY="" \
    TRELLO_DOWNLOAD_IMAGES="" \
    TRELLO_MCP_LOGGING=""

# stdio MCP server — clients pipe JSON-RPC over stdin/stdout.
ENTRYPOINT ["node", "dist/index.js"]
