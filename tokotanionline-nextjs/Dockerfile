# Next.js Production Dockerfile
FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including devDependencies for build)
COPY package.json package-lock.json* ./
RUN npm ci

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

# Install ALL dependencies (Prisma needed for runtime)
# Use npm install instead of npm ci for more flexibility
RUN npm install --production --no-audit --no-fund && npm cache clean --force

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
