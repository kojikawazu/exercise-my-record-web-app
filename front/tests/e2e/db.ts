import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../src/generated/prisma/client';
import { resolveTestDatabaseUrl } from '../setup/test-database-url';

// E2E の seed / reset 用 Prisma クライアント（実 DB に接続）。
// アプリ本体の getPrisma() とは別接続だが同一 DB を操作する。
// アプリと同じ new Date() 経由でデータを作るため、日付の型/タイムゾーンが一致する。
let prisma: PrismaClient | null = null;

const getClient = (): PrismaClient => {
  if (!prisma) {
    const pool = new Pool({ connectionString: resolveTestDatabaseUrl() });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  }
  return prisma;
};

/** 全 Exercise テーブルを空にする（テスト間の独立性を担保）。 */
export const resetDb = async (): Promise<void> => {
  const db = getClient();
  await db.$executeRawUnsafe(
    'TRUNCATE "ExerciseWorkout", "ExerciseCardio", "ExerciseRecord", "ExerciseMaster", "ExerciseProfile", "ExerciseWeightLog" RESTART IDENTITY CASCADE',
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

/**
 * 筋トレ 1 種目だけを持つ記録を作成する（今日基準の相対日付で集計を検証する用）。
 *
 * @param date - 記録日（`YYYY-MM-DD`）
 * @param workout - 筋トレ 1 種目。回数・重量は検証に使わないため固定値
 * @param workout.part - 部位
 * @param workout.name - 種目名
 * @param workout.sets - セット数
 */
export const seedWorkoutRecord = async (
  date: string,
  workout: { part: string; name: string; sets: number },
): Promise<void> => {
  const db = getClient();
  await db.exerciseRecord.create({
    data: {
      date: new Date(date),
      workouts: { create: [{ ...workout, reps: 10, weight: 40 }] },
    },
  });
};

/**
 * 指定日付の（子行なし）レコードをまとめて作成する（ページング検証用）。
 *
 * @param dates - 作成対象の日付（`YYYY-MM-DD`）。重複を含めない
 */
export const seedRecordsForDates = async (dates: string[]): Promise<void> => {
  const db = getClient();
  for (const date of dates) {
    await db.exerciseRecord.create({ data: { date: new Date(date) } });
  }
};

/**
 * 体重の履歴を投入する（推移グラフの体重の検証用）。記録日はアプリと同じく UTC の 0 時で保存する。
 *
 * @param entries - 投入する履歴（日付 `YYYY-MM-DD` と体重 kg）。日付を重複させない
 */
export const seedWeightLogs = async (
  entries: { date: string; weightKg: number }[],
): Promise<void> => {
  const db = getClient();
  await db.exerciseWeightLog.createMany({
    data: entries.map((e) => ({ date: new Date(`${e.date}T00:00:00.000Z`), weightKg: e.weightKg })),
  });
};

/**
 * 指定種別・名称のマスターを削除する（保存済みの記録がマスターから外れた状態を作る検証用）。
 *
 * @param type - マスター種別（`body-parts` 等）
 * @param name - 削除する名称
 */
export const deleteMaster = async (type: string, name: string): Promise<void> => {
  const db = getClient();
  await db.exerciseMaster.deleteMany({ where: { type, name } });
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
