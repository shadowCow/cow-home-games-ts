# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/server/package*.json ./packages/server/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build all packages using npm scripts
RUN npm run build -w @cow-sunday/server
RUN npm run build -w @cow-sunday/client

# Production stage
FROM node:24-alpine

# Create non-root user with specific UID
RUN adduser -D -u 1001 appuser

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/server/package*.json ./packages/server/

# Install production dependencies only
RUN npm install --workspace=@cow-sunday/server --omit=dev

# Copy built server
COPY --from=builder /app/packages/server/dist ./packages/server/dist

# Copy built client static assets
COPY --from=builder /app/packages/client/dist ./packages/client/dist

# Create data directory for persistent application data
RUN mkdir -p /var/lib/cow-home-games-ts && \
    chown -R appuser:appuser /var/lib/cow-home-games-ts

# Change ownership of app directory
RUN chown -R appuser:appuser /app

# Set up volume for persistent data
VOLUME ["/var/lib/cow-home-games-ts"]

# Switch to non-root user
USER appuser

# Expose server port
EXPOSE 3000

# Start the server
CMD ["node", "packages/server/dist/index.js"]
