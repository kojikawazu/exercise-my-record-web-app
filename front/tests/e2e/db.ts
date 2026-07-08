import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { E2E_DATABASE_URL } from './db-url';

// E2E の seed / reset 用 Prisma クライアント（実 DB に接続）。
// アプリ本体の getPrisma() とは別接続だが同一 DB を操作する。
// アプリと同じ new Date() 経由でデータを作るため、日付の型/タイムゾーンが一致する。
let prisma: PrismaClient | null = null;

const getClient = (): PrismaClient => {
  if (!prisma) {
    const pool = new Pool({ connectionString: E2E_DATABASE_URL });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return prisma;
};

/** 全 Exercise テーブルを空にする（テスト間の独立性を担保）。 */
export const resetDb = async (): Promise<void> => {
  const db = getClient();
  await db.$executeRawUnsafe(
    'TRUNCATE "ExerciseWorkout", "ExerciseCardio", "ExerciseRecord", "ExerciseMaster", "ExerciseProfile" RESTART IDENTITY CASCADE',
  );
};

/** 一覧・詳細・マスター・プロフィールで使うベースラインデータを投入する。 */
export const seedBaseline = async (): Promise<void> => {
  const db = getClient();

  await db.exerciseProfile.create({ data: { weightKg: 65 } });

  await db.exerciseMaster.createMany({
    data: [
      { type: 'body-parts', name: '胸' },
      { type: 'body-parts', name: '背中' },
      { type: 'body-parts', name: '脚' },
      { type: 'exercises', name: 'ベンチプレス' },
      { type: 'exercises', name: 'デッドリフト' },
      { type: 'exercises', name: 'スクワット' },
      { type: 'cardio-types', name: 'ラン' },
      { type: 'cardio-types', name: 'ウォーク' },
    ],
  });

  await db.exerciseRecord.create({
    data: {
      date: new Date('2026-02-02'),
      memo: '体調良好',
      workouts: {
        create: [
          { part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 },
          { part: '背中', name: 'デッドリフト', sets: 3, reps: 5, weight: 100 },
          { part: '脚', name: 'スクワット', sets: 3, reps: 8, weight: 80 },
        ],
      },
      cardios: { create: [{ type: 'ラン', minutes: 30, distance: 5 }] },
    },
  });

  await db.exerciseRecord.create({
    data: {
      date: new Date('2026-01-15'),
      memo: null,
      workouts: {
        create: [{ part: '胸', name: 'ベンチプレス', sets: 2, reps: 10, weight: 50 }],
      },
    },
  });
};

/** 指定日付の（子行なし）レコードをまとめて作成する（ページング検証用）。 */
export const seedRecordsForDates = async (dates: string[]): Promise<void> => {
  const db = getClient();
  for (const date of dates) {
    await db.exerciseRecord.create({ data: { date: new Date(date) } });
  }
};

/** reset してからベースラインを投入するショートカット。 */
export const resetAndSeedBaseline = async (): Promise<void> => {
  await resetDb();
  await seedBaseline();
};

/** Prisma 接続を閉じる（globalTeardown 用）。 */
export const disconnectDb = async (): Promise<void> => {
  if (prisma) {
    await prisma.$disconnect();
    prisma = null;
  }
};
