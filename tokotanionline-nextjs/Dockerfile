# Next.js Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++ git

# Configure npm for better reliability
RUN npm config set registry https://registry.npmjs.org/ && \
    npm config set fetch-retries 5 && \
    npm config set fetch-retry-mintimeout 20000 && \
    npm config set fetch-retry-maxtimeout 120000

# Install ALL dependencies (including devDependencies for build)
COPY package.json ./
# Install with verbose output and better error handling
RUN npm install --no-audit --no-fund --legacy-peer-deps --verbose 2>&1 | tee /tmp/npm-install.log || \
    (echo "=== npm install failed, retrying ===" && \
     npm cache clean --force && \
     npm install --no-audit --no-fund --legacy-peer-deps --verbose)

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client (doesn't need DATABASE_URL for generation)
RUN npx prisma generate || (echo "=== Prisma generate failed ===" && exit 1)

# Copy source code
COPY . .

# Set build-time environment (optional, for Next.js build optimizations)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app with better error handling
# Split build command to avoid issues with && in Docker
RUN npm run build 2>&1 | tee /tmp/build.log || \
    (echo "=== Build failed, showing logs ===" && \
     cat /tmp/build.log && \
     echo "=== Checking for common issues ===" && \
     ls -la .next 2>/dev/null || echo "No .next directory" && \
     exit 1)

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"
ENV NEXT_TELEMETRY_DISABLED=1

# Copy package files
COPY package.json package-lock.json* ./

# Copy node_modules from builder (already installed with all dependencies)
COPY --from=builder /app/node_modules ./node_modules

# Copy Prisma files and generate client in production
COPY prisma ./prisma
RUN npx prisma generate

# Copy built application
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.mjs ./

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
