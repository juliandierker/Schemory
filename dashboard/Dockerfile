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

# Copy root package.json and pnpm-workspace.yaml for workspace setup
COPY package.json pnpm-workspace.yaml ./

# Copy dashboard package files
COPY dashboard/package.json dashboard/

# Copy shared package (needed for workspace resolution)
COPY packages/shared/package.json packages/shared/

# Copy cli package for workspace resolution
COPY cli/package.json cli/

# Install all dependencies (including dev dependencies for build)
RUN pnpm install --frozen-lockfile

# Copy source files
COPY dashboard/src/ dashboard/src/
COPY dashboard/index.html dashboard/
COPY dashboard/vite.config.ts dashboard/
COPY dashboard/tsconfig.json dashboard/
COPY dashboard/postcss.config.js dashboard/
COPY dashboard/tailwind.config.js dashboard/
COPY packages/shared/src/ packages/shared/src/
COPY packages/shared/tsconfig.json packages/shared/

# Build the shared package first
RUN pnpm --filter @schemory/shared build

# Build the dashboard (TypeScript + Vite build)
RUN pnpm --filter @schemory/dashboard build

# =============================================================================
# Stage 2: Final production image - minimal nginx to serve static files
# =============================================================================
FROM nginx:1.25-alpine

# Remove default nginx user and create our non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 -G nodejs && \
    deluser nginx 2>/dev/null || true

# Copy built static files from builder
COPY --from=builder --chown=nodejs:nodejs /app/dashboard/dist/ /usr/share/nginx/html/

# Copy nginx configuration
RUN mkdir -p /etc/nginx/conf.d && \
    echo 'server {
    listen 80;
    server_name localhost;
    root /usr/share/nginx/html;
    index index.html;

    # Handle React Router client-side routing
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # API proxy to server (optional, for same-origin API calls)
    # location /api/ {
    #     proxy_pass http://server:3000/;
    # }

    # Health check
    location /health {
        return 200 "ok";
        add_header Content-Type text/plain;
    }
}' > /etc/nginx/conf.d/default.conf && \
    chown nodejs:nodejs /etc/nginx/conf.d/default.conf && \
    chown -R nodejs:nodejs /etc/nginx/conf.d/ && \
    chown -R nodejs:nodejs /usr/share/nginx/html/

# Change ownership of nginx directories
RUN chown -R nodejs:nodejs /var/log/nginx /var/cache/nginx /etc/nginx 2>/dev/null || true

# Switch to non-root user
USER nodejs

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q --spider http://localhost/health || exit 1
