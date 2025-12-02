# WebSocket Voice Server Dockerfile for Fly.io
# Build from project root: fly deploy --config server/fly.toml
# This uses root as build context to access shared source files from src/

FROM node:20-alpine

WORKDIR /app

# Copy package manifest for dependency install
COPY server/package.json ./

# Install pnpm and dependencies
# Note: dependencies include zod, ai, @ai-sdk/google, etc.
RUN npm install -g pnpm
RUN pnpm install --prod --shamefully-hoist

# Copy server entrypoints and code
COPY server/live-server.ts ./
COPY server/session-logger.ts ./
COPY server/message-types.ts ./
COPY server/message-payload-types.ts ./

# Copy server subdirectories
COPY server/utils ./utils
COPY server/handlers ./handlers
COPY server/websocket ./websocket
COPY server/context ./context
COPY server/live-api ./live-api
COPY server/rate-limiting ./rate-limiting

# Copy shared source code to /app/src (for tsconfig resolution)
COPY src /app/src
COPY types.ts /app/types.ts

# Create symlink for legacy /src imports (if any code relies on absolute /src path)
# and for relative imports like ../../src that resolve to /src
RUN ln -s /app/src /src

# Copy tsconfig.json for path resolution
COPY tsconfig.json ./

# Install tsx for TypeScript execution
RUN pnpm add tsx

# Create non-root user for runtime security
RUN addgroup -g 1001 -S nodejs && \
  adduser -S nodejs -u 1001

# Ensure correct ownership
RUN chown -R nodejs:nodejs /app /src

USER nodejs

# Fly.io maps incoming traffic to PORT (default 8080 in fly.toml)
EXPOSE 8080

# Health check mirrors fly.toml /health probe
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "const http = require('http'); http.get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); }).on('error', () => process.exit(1));"

# Start the live server
# NODE_PATH includes /app to support absolute imports relative to baseUrl (.)
CMD ["sh", "-c", "export NODE_PATH=/app/node_modules:/app && echo 'Starting server with PORT=${PORT:-8080}' && PORT=${PORT:-8080} pnpm tsx live-server.ts"]
