# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.base.json /tsconfig.base.json
COPY packages/schemory-server/package.json ./package.json
COPY packages/schemory-server/src ./src
COPY packages/schemory-server/tsconfig.json ./
RUN npm install
RUN npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./

# For development (mount src volume)
COPY packages/schemory-server/src ./src
COPY packages/schemory-server/tsconfig.json ./
COPY packages/schemory-server/entrypoint.sh ./entrypoint.sh

EXPOSE 5555
CMD ["./entrypoint.sh"]
