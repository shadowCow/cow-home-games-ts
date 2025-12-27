# Build stage
FROM node:24-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY packages/client/package*.json ./packages/client/
COPY packages/server/package*.json ./packages/server/
COPY packages/drover/package*.json ./packages/drover/

# Install dependencies
RUN npm install

# Copy source files
COPY . .

# Build drover first
RUN npm run build --workspace=@cow-sunday/drover

# Use drover to build everything
RUN npx drover all

# Production stage
FROM node:24-alpine

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

# Expose server port
EXPOSE 3000

# Start the server
CMD ["node", "packages/server/dist/index.js"]
