import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Handle connection errors gracefully with retry logic
let connectionAttempts = 0;
const maxConnectionAttempts = 3;

async function ensureConnection() {
  try {
    await prisma.$connect();
    connectionAttempts = 0;
  } catch (error: any) {
    connectionAttempts++;
    if (connectionAttempts < maxConnectionAttempts) {
      console.warn(`⚠️ Database connection attempt ${connectionAttempts}/${maxConnectionAttempts} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * connectionAttempts));
      return ensureConnection();
    } else {
      console.error('❌ Database connection failed after multiple attempts:', error?.message || error);
      // Don't throw - let Prisma handle reconnection on next query
    }
  }
}

// Initialize connection (non-blocking)
if (typeof window === 'undefined') {
  ensureConnection().catch(() => {
    // Silent fail - connection will retry on first query
  });
}

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
