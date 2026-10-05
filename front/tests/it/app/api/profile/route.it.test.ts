import { describe, it, expect } from 'vitest';
import { GET as getProfile, POST as saveProfile } from '@/app/api/profile/route';
import { getPrisma } from '@/lib/prisma';

// 実 DB（Testcontainers）に対するプロフィール IT。
// 体重の「1 件のみ維持（上書き）」という実 DB でしか確認できない挙動を検証する。

const postWeight = (weightKg: unknown, date = '2026-10-06') =>
  new Request('http://localhost/api/profile', {
    method: 'POST',
    body: JSON.stringify({ weightKg, date }),
  });

/**
 * 体重の履歴を実 DB から日付昇順で読む。
 *
 * @returns 履歴（`YYYY-MM-DD` と体重 kg の組）
 */
const readHistory = async () =>
  (await getPrisma()!.exerciseWeightLog.findMany({ orderBy: { date: 'asc' } })).map((log) => ({
    date: log.date.toISOString().slice(0, 10),
    weightKg: log.weightKg,
  }));

describe('IT: /api/profile (実 DB)', () => {
  // --- 正常系 ---

  it('should persist weight and return it via GET', async () => {
    const saved = await saveProfile(postWeight(65.5));
    expect(saved.status).toBe(200);
    expect(await saved.json()).toEqual({ weightKg: 65.5 });

    const got = await getProfile();
    expect((await got.json()).weightKg).toBe(65.5);

    const prisma = getPrisma()!;
    expect(await prisma.exerciseProfile.count()).toBe(1);
  });

  it('should overwrite (keep a single row) on repeated saves', async () => {
    await saveProfile(postWeight(60));
    await saveProfile(postWeight(70));
    await saveProfile(postWeight(72.3));

    // 3 回保存しても行は 1 件だけ維持され、最新値が返る。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseProfile.count()).toBe(1);

    const got = await getProfile();
    expect((await got.json()).weightKg).toBe(72.3);
  });

  it('should append one history entry per day while keeping a single current value', async () => {
    await saveProfile(postWeight(66, '2026-10-01'));
    await saveProfile(postWeight(65.4, '2026-10-03'));

    expect(await readHistory()).toEqual([
      { date: '2026-10-01', weightKg: 66 },
      { date: '2026-10-03', weightKg: 65.4 },
    ]);
    expect(await getPrisma()!.exerciseProfile.count()).toBe(1);
    expect((await (await getProfile()).json()).weightKg).toBe(65.4);
  });

  it('should overwrite the history entry when saving twice on the same day', async () => {
    await saveProfile(postWeight(66, '2026-10-06'));
    await saveProfile(postWeight(65.8, '2026-10-06'));

    expect(await readHistory()).toEqual([{ date: '2026-10-06', weightKg: 65.8 }]);
  });

  // --- 準正常系 ---

  it('should return 400 when weightKg is not a number', async () => {
    const res = await saveProfile(postWeight('heavy'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('weightKg is required');

    // 不正保存では行は作られない。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseProfile.count()).toBe(0);
    expect(await prisma.exerciseWeightLog.count()).toBe(0);
  });

  it('should return 400 and write neither the current value nor the history for an invalid date', async () => {
    const res = await saveProfile(postWeight(65, '2026-02-30'));
    expect(res.status).toBe(400);

    const prisma = getPrisma()!;
    expect(await prisma.exerciseProfile.count()).toBe(0);
    expect(await prisma.exerciseWeightLog.count()).toBe(0);
  });
});
