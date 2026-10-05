import { describe, it, expect } from 'vitest';
import { GET as getWeights } from '@/app/api/profile/weights/route';
import { POST as saveProfile } from '@/app/api/profile/route';

// 実 DB（Testcontainers の PostgreSQL）で、体重の履歴の起点日の扱い（当日を含む）と並び順を検証する。
// 履歴は本物の POST /api/profile を通して積む（requireAdmin は E2E_BYPASS=1 でバイパスされる）。

const save = (weightKg: number, date: string) =>
  saveProfile(
    new Request('http://localhost/api/profile', {
      method: 'POST',
      body: JSON.stringify({ weightKg, date }),
    }),
  );

const weightsOf = async (query: string) =>
  (await getWeights(new Request(`http://localhost/api/profile/weights${query}`))).json();

describe('IT: GET /api/profile/weights (実 DB)', () => {
  // --- 正常系 ---

  it('should return the history in ascending date order regardless of save order', async () => {
    await save(64.8, '2026-10-05');
    await save(66, '2026-09-20');
    await save(65.2, '2026-10-01');

    expect(await weightsOf('')).toEqual({
      points: [
        { date: '2026-09-20', weightKg: 66 },
        { date: '2026-10-01', weightKg: 65.2 },
        { date: '2026-10-05', weightKg: 64.8 },
      ],
    });
  });

  // --- 準正常系（境界） ---

  it('should include the start date itself and exclude earlier days', async () => {
    for (const date of ['2026-09-30', '2026-10-01', '2026-10-02']) {
      expect((await save(65, date)).status).toBe(200);
    }
    const { points } = await weightsOf('?from=2026-10-01');
    expect(points.map((p: { date: string }) => p.date)).toEqual(['2026-10-01', '2026-10-02']);
  });

  it('should return an empty list when no entry is on or after the start date', async () => {
    await save(65, '2026-09-15');
    expect(await weightsOf('?from=2026-10-01')).toEqual({ points: [] });
  });

  // --- 異常系 ---

  it('should return 400 for a date that does not exist', async () => {
    const res = await getWeights(
      new Request('http://localhost/api/profile/weights?from=2026-02-30'),
    );
    expect(res.status).toBe(400);
  });
});
