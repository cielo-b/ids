FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig*.json ./
COPY nest-cli.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY apps/ ./apps/
COPY libs/ ./libs/
COPY config/ ./config/

# Build argument for app name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Build the specific application
RUN npm run build ${APP_NAME}

# Production stage
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Build argument for app name
ARG APP_NAME
ENV APP_NAME=${APP_NAME}

# Copy built application
COPY --from=builder /app/dist/apps/${APP_NAME} ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001

# Change ownership
RUN chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose port (will be overridden by docker-compose)
EXPOSE 3000

# Start the application
CMD node dist/main.js

