# Dashboard Dockerfile
# Multi-stage build: builder stage with full deps and Vite, final stage with only static files

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

# Copy package files for workspace resolution (matching server Dockerfile + dashboard)
COPY server/package.json server/
COPY packages/shared/package.json packages/shared/
COPY cli/package.json cli/
COPY dashboard/package.json dashboard/

# Install all dependencies (including dev dependencies for build)
# --shamefully-hoist ensures workspace packages have node_modules with binaries
RUN pnpm install --frozen-lockfile --shamefully-hoist

# Copy source files
COPY server/src/ server/src/
COPY server/tsconfig.json server/
COPY server/migrations/ server/migrations/
COPY server/run-migrations.js server/
COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/
COPY cli/src/ cli/src/
COPY cli/tsconfig.json cli/
COPY dashboard/src/ dashboard/src/
COPY dashboard/index.html dashboard/
COPY dashboard/vite.config.ts dashboard/
COPY dashboard/tsconfig.json dashboard/
COPY dashboard/postcss.config.js dashboard/
COPY dashboard/tailwind.config.js dashboard/

# Set NODE_ENV for production build (after pnpm install so devDependencies are installed)
ENV NODE_ENV=production

# Allow VITE_API_URL to be passed from build args
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build TypeScript
RUN pnpm --filter @schemory/shared build
RUN pnpm --filter @schemory/dashboard build

# =============================================================================
# Stage 2: Final production image - minimal nginx to serve static files
# =============================================================================
FROM nginx:1.25-alpine

# Create non-root user (keep nginx user for nginx process)
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs

# Copy built static files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dashboard/dist/ /usr/share/nginx/html/

# Copy nginx configuration
COPY dashboard/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown nodejs:nodejs /etc/nginx/conf.d/default.conf && \
    chown -R nodejs:nodejs /usr/share/nginx/html/

# Change ownership of nginx directories
RUN chown -R nodejs:nodejs /var/log/nginx /var/cache/nginx /etc/nginx 2>/dev/null || true


# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1
