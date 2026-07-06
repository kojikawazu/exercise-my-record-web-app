import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient | null;
};

/**
 * Prisma クライアント（`adapter-pg` 経由）を遅延生成し、グローバルにキャッシュして返す。
 *
 * `DATABASE_URL` 未設定時や初期化失敗時は `null` を返す（呼び出し側は 503 を返す想定）。
 * 一度確定した結果（クライアント or `null`）はグローバルに保持し、開発時の HMR による
 * 接続増殖を防ぐ。
 *
 * @returns Prisma クライアント。DB が利用不可なら `null`
 */
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
