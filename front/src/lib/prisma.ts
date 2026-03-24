import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

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
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    const client = new PrismaClient({ adapter, log: ['error'] });
    globalForPrisma.prisma = client;
    return client;
  } catch {
    globalForPrisma.prisma = null;
    return null;
  }
}
