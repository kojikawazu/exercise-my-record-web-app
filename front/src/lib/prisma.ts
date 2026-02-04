import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | null;
};

export function getPrisma() {
  if (globalForPrisma.prisma !== undefined) {
    return globalForPrisma.prisma;
  }

  if (!process.env.DATABASE_URL) {
    globalForPrisma.prisma = null;
    return null;
  }

  try {
    const client = new PrismaClient();
    if (process.env.NODE_ENV !== 'production') {
      globalForPrisma.prisma = client;
    }
    return client;
  } catch {
    globalForPrisma.prisma = null;
    return null;
  }
}
