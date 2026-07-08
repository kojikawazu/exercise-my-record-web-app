import { describe, it, expect } from 'vitest';
import { GET as getProfile, POST as saveProfile } from '../route';
import { getPrisma } from '@/lib/prisma';

// 実 DB（Testcontainers）に対するプロフィール IT。
// 体重の「1 件のみ維持（上書き）」という実 DB でしか確認できない挙動を検証する。

const postWeight = (weightKg: unknown) =>
  new Request('http://localhost/api/profile', {
    method: 'POST',
    body: JSON.stringify({ weightKg }),
  });

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

  // --- 準正常系 ---

  it('should return 400 when weightKg is not a number', async () => {
    const res = await saveProfile(postWeight('heavy'));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('weightKg is required');

    // 不正保存では行は作られない。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseProfile.count()).toBe(0);
  });
});
