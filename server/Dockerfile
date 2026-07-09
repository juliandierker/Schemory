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

# Copy root package.json, pnpm-workspace.yaml, lockfile, and tsconfig for workspace setup
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml tsconfig.base.json ./

# Copy all package files for workspace resolution
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
COPY cli/package.json cli/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source files
COPY server/src/ server/src/
COPY server/tsconfig.json server/
COPY server/migrations/ server/migrations/
COPY server/run-migrations.js server/run-migrations.js
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

# Install wget for health checks
RUN apk add --no-cache wget

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Set working directory and ownership
WORKDIR /app
RUN chown nodejs:nodejs /app

# Switch to non-root user
USER nodejs

# Copy all production dependencies from builder (with --shamefully-hoist, they're in root node_modules)
COPY --from=builder --chown=nodejs:nodejs /app/node_modules/ /app/node_modules/

# Copy built @schemory/shared package to node_modules
RUN mkdir -p /app/node_modules/@schemory
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist /app/node_modules/@schemory/shared

# Copy built files from builder
COPY --from=builder --chown=nodejs:nodejs /app/server/dist/ ./server/dist/
COPY --from=builder --chown=nodejs:nodejs /app/packages/shared/dist/ ./packages/shared/dist/
COPY --from=builder --chown=nodejs:nodejs /app/server/migrations/ ./server/migrations/

# Copy package.json files for reference
COPY --chown=nodejs:nodejs server/package.json ./server/package.json
COPY --chown=nodejs:nodejs packages/shared/package.json ./packages/shared/package.json

# Copy migration runner script
COPY server/run-migrations.js /app/run-migrations.js

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
