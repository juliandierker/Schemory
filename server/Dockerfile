# Server Dockerfile
# Multi-stage build: builder stage with full deps, final stage with only production dependencies

# =============================================================================
# Stage 1: Builder stage
# =============================================================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@8.15.0 --activate
ENV PNPM_HOME=/usr/local/pnpm
ENV PATH="$PNPM_HOME:$PATH"

# Copy root package.json and pnpm-workspace.yaml for workspace setup
COPY package.json pnpm-workspace.yaml ./

# Copy all package files for workspace resolution
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
COPY cli/package.json cli/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY server/src/ server/src/
COPY server/tsconfig.json server/
COPY server/migrations/ server/migrations/
COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/
COPY cli/src/ cli/src/
COPY cli/tsconfig.json cli/

# Build TypeScript
RUN pnpm --filter @schemory/server build
RUN pnpm --filter @schemory/shared build

# =============================================================================
# Stage 2: Final production image
# =============================================================================
FROM node:20-alpine AS final

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory and ownership
WORKDIR /app
RUN chown nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy production dependencies from builder
# We copy only the production dependencies we need
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/pg /app/node_modules/pg
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/fastify /app/node_modules/fastify
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/bcrypt /app/node_modules/bcrypt
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/resend /app/node_modules/resend
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/node-pg-migrate /app/node_modules/node-pg-migrate
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@fastify /app/node_modules/@fastify
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/@schemory /app/node_modules/@schemory

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/server/dist/ ./server/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder --chown=nodejs:nodejs /app/server/migrations/ ./server/migrations/

# Copy package.json files for reference
COPY --chown=nodejs:nodejs server/package.json ./server/package.json
COPY --chown=nodejs:nodejs packages/shared/package.json ./packages/shared/package.json

# Create a migration runner script that uses DATABASE_URL or DB_* env vars
RUN echo '#!/usr/bin/env node
const { runner } = require("/app/node_modules/node-pg-migrate");
const databaseUrl = process.env.DATABASE_URL || 
  `postgres://${process.env.DB_USER || "postgres"}:${process.env.DB_PASSWORD || "postgres"}@${process.env.DB_HOST || "localhost"}:${process.env.DB_PORT || "5432"}/${process.env.DB_NAME || "schemory"}`;
runner({ databaseUrl, dir: "/app/server/migrations", direction: "up" }).catch(err => { console.error("Migration failed:", err); process.exit(1); });
' > /app/run-migrations.js && chmod +x /app/run-migrations.js

# Environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { if (res.statusCode !== 200) process.exit(1); }).on('error', () => process.exit(1))" || exit 1

# Run migrations and start server
CMD ["sh", "-c", "node /app/run-migrations.js && node /app/server/dist/index.js"]
