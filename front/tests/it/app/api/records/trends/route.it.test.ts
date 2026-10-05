import { describe, it, expect } from 'vitest';
import { GET as getTrends } from '@/app/api/records/trends/route';
import { POST as createRecord } from '@/app/api/records/route';

// 実 DB（Testcontainers の PostgreSQL）で起点日の扱い（当日を含む）・並び順・集約を検証する。
// 記録の作成は本物の POST ハンドラを通す（requireAdmin は E2E_BYPASS=1 でバイパスされる）。

const create = (body: Record<string, unknown>) =>
  createRecord(
    new Request('http://localhost/api/records', { method: 'POST', body: JSON.stringify(body) }),
  );

const trendsOf = async (query: string) =>
  (await getTrends(new Request(`http://localhost/api/records/trends${query}`))).json();

describe('IT: GET /api/records/trends (実 DB)', () => {
  // --- 正常系 ---

  it('should aggregate each day and return points in ascending date order', async () => {
    await create({
      date: '2026-02-10',
      workouts: [
        { part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 },
        { part: '脚', name: 'スクワット', sets: 4, reps: 8, weight: 80 },
      ],
      cardios: [
        { type: 'ラン', minutes: 30, distance: 5 },
        { type: 'ウォーク', minutes: 20, distance: 1.5 },
      ],
    });
    await create({ date: '2026-02-01', workouts: [], cardios: [] });

    const { points } = await trendsOf('');
    expect(points.map((p: { date: string }) => p.date)).toEqual(['2026-02-01', '2026-02-10']);
    expect(points[1]).toMatchObject({ totalSets: 7, cardioDistance: 6.5 });
    expect(points[1].cardios).toEqual(
      expect.arrayContaining([
        { type: 'ラン', minutes: 30 },
        { type: 'ウォーク', minutes: 20 },
      ]),
    );
    expect(points[0]).toEqual({ date: '2026-02-01', totalSets: 0, cardioDistance: 0, cardios: [] });
  });

  // --- 準正常系（境界） ---

  it('should include the start date itself and exclude earlier days', async () => {
    for (const date of ['2026-01-31', '2026-02-01', '2026-02-02']) {
      expect((await create({ date, workouts: [], cardios: [] })).status).toBe(200);
    }
    const { points } = await trendsOf('?from=2026-02-01');
    expect(points.map((p: { date: string }) => p.date)).toEqual(['2026-02-01', '2026-02-02']);
  });

  it('should return an empty list when no record is on or after the start date', async () => {
    await create({ date: '2026-01-15', workouts: [], cardios: [] });
    expect(await trendsOf('?from=2026-02-01')).toEqual({ points: [] });
  });

  // --- 異常系 ---

  it('should return 400 for a date that does not exist', async () => {
    const res = await getTrends(new Request('http://localhost/api/records/trends?from=2026-02-30'));
    expect(res.status).toBe(400);
  });
});
