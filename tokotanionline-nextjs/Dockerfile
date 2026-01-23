# Next.js Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install system dependencies for native modules
RUN apk add --no-cache libc6-compat python3 make g++

# Install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
# Use npm install with retry and better error handling
RUN npm install --no-audit --no-fund --legacy-peer-deps || \
    (npm cache clean --force && npm install --no-audit --no-fund --legacy-peer-deps)

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client (doesn't need DATABASE_URL for generation)
RUN npx prisma generate

# Copy source code
COPY . .

# Set build-time environment (optional, for Next.js build optimizations)
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build Next.js app
RUN npm run build

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
