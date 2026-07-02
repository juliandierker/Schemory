# Multi-stage build for Schemory Dashboard
# Standalone build using dashboard's own package.json

# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Copy dashboard package.json first
COPY packages/schemory-dashboard/package.json ./

# Install dependencies (this will create package-lock.json)
RUN npm install

# Copy all dashboard source files
COPY packages/schemory-dashboard/src/ ./src/
COPY packages/schemory-dashboard/tsconfig.json ./
COPY packages/schemory-dashboard/tsconfig.base.json ./
COPY packages/schemory-dashboard/vite.config.ts ./
COPY packages/schemory-dashboard/index.html ./
COPY packages/schemory-dashboard/postcss.config.js ./
COPY packages/schemory-dashboard/tailwind.config.js ./

# Build the dashboard
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# Copy built files from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.ts ./
COPY --from=builder /app/index.html ./
COPY --from=builder /app/package.json ./
COPY --from=builder /app/tsconfig.json ./
COPY --from=builder /app/tsconfig.base.json ./
COPY --from=builder /app/postcss.config.js ./
COPY --from=builder /app/tailwind.config.js ./

EXPOSE 5173
CMD ["npm", "run", "preview"]
