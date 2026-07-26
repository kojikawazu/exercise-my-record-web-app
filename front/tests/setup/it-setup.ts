import { Pool } from 'pg';
import { inject, beforeEach, afterAll } from 'vitest';

// globalSetup で起動したコンテナの接続文字列を worker の env へ注入する。
// getPrisma() は呼び出し時に process.env.DATABASE_URL を読むため、
// テスト実行前にここで設定しておけば実 DB に接続する。
const databaseUrl = inject('DATABASE_URL');
process.env.DATABASE_URL = databaseUrl;

// IT は実 DB を叩くが認証は対象外（admin/me で別途 UT 済み）のため、
// requireAdmin をサーバー専用フラグでバイパスする。
process.env.E2E_BYPASS = '1';

// テーブル TRUNCATE 用の軽量プール（Prisma とは別接続、同一 DB）。
const pool = new Pool({ connectionString: databaseUrl });

const TABLES = [
  'ExerciseWorkout',
  'ExerciseCardio',
  'ExerciseRecord',
  'ExerciseMaster',
  'ExerciseProfile',
];

// 各テスト前に全 Exercise テーブルを空にしてテスト間の独立性を担保する。
beforeEach(async () => {
  const list = TABLES.map((t) => `"${t}"`).join(', ');
  await pool.query(`TRUNCATE ${list} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await pool.end();
});
