# ==========================================
# STAGE 1: Build Process
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# Install build dependencies if needed
RUN apk add --no-cache python3 make g++

# Copy package descriptors
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm ci

# Copy configuration files and source code
COPY tsconfig*.json ./
COPY nest-cli.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client
RUN npx prisma generate

# Build production application bundle
RUN npm run build

# Prune dev dependencies to minimize image size
RUN npm prune --production

# ==========================================
# STAGE 2: Runtime Environment
# ==========================================
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production

# Copy built application and required production packages
COPY --from=builder /usr/src/app/package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/prisma ./prisma
COPY --from=builder /usr/src/app/prisma.config.ts ./prisma.config.ts

# Create startup script for migrations and application startup
RUN echo '#!/bin/sh' > start.sh && \
    echo 'npx prisma migrate deploy' >> start.sh && \
    echo 'node dist/src/main.js' >> start.sh && \
    chmod +x start.sh

# Expose NestJS default application port
EXPOSE 3000

# Start script
CMD ["./start.sh"]
