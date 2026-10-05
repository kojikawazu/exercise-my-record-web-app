import { describe, it, expect } from 'vitest';
import { GET as getStreak } from '@/app/api/records/streak/route';
import { POST as createRecord } from '@/app/api/records/route';

// 実 DB（Testcontainers の PostgreSQL）で、今日以前の記録日だけを使って連続を数えることを検証する。
// 記録の作成は本物の POST ハンドラを通す（requireAdmin は E2E_BYPASS=1 でバイパスされる）。

const create = (date: string) =>
  createRecord(
    new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({ date, workouts: [], cardios: [] }),
    }),
  );

const streakOn = async (today: string) =>
  (await getStreak(new Request(`http://localhost/api/records/streak?today=${today}`))).json();

describe('IT: GET /api/records/streak (実 DB)', () => {
  // --- 正常系 ---

  it('should count consecutive days ending today across a month boundary', async () => {
    for (const date of ['2026-09-30', '2026-10-01', '2026-10-02', '2026-09-27']) {
      expect((await create(date)).status).toBe(200);
    }
    expect(await streakOn('2026-10-02')).toEqual({
      days: 3,
      from: '2026-09-30',
      to: '2026-10-02',
      recordedToday: true,
    });
  });

  // --- 準正常系 ---

  it('should keep the streak up to yesterday when today is not recorded', async () => {
    for (const date of ['2026-10-05', '2026-10-06']) {
      expect((await create(date)).status).toBe(200);
    }
    expect(await streakOn('2026-10-07')).toMatchObject({ days: 2, recordedToday: false });
  });

  it('should ignore records after today', async () => {
    for (const date of ['2026-10-06', '2026-10-08']) {
      expect((await create(date)).status).toBe(200);
    }
    expect(await streakOn('2026-10-07')).toEqual({
      days: 1,
      from: '2026-10-06',
      to: '2026-10-06',
      recordedToday: false,
    });
  });

  it('should be 0 when there are no records', async () => {
    expect(await streakOn('2026-10-07')).toEqual({
      days: 0,
      from: null,
      to: null,
      recordedToday: false,
    });
  });
});
