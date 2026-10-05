import { describe, it, expect } from 'vitest';
import { GET as getCalendar } from '@/app/api/records/calendar/route';
import { POST as createRecord } from '@/app/api/records/route';

// 実 DB（Testcontainers の PostgreSQL）で月の範囲指定（半開区間）と並び順を検証する。
// 記録の作成は本物の POST ハンドラを通す（requireAdmin は E2E_BYPASS=1 でバイパスされる）。

const create = (date: string) =>
  createRecord(
    new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({ date, workouts: [], cardios: [] }),
    }),
  );

const calendarOf = async (month: string) =>
  (await getCalendar(new Request(`http://localhost/api/records/calendar?month=${month}`))).json();

describe('IT: GET /api/records/calendar (実 DB)', () => {
  // --- 正常系 ---

  it('should return dates within the month in ascending order', async () => {
    for (const date of ['2026-02-15', '2026-02-02', '2026-02-28']) {
      expect((await create(date)).status).toBe(200);
    }
    expect(await calendarOf('2026-02')).toEqual({
      month: '2026-02',
      dates: ['2026-02-02', '2026-02-15', '2026-02-28'],
    });
  });

  // --- 準正常系（境界） ---

  it('should include the first and last day of the month and exclude adjacent months', async () => {
    for (const date of ['2026-01-31', '2026-02-01', '2026-02-28', '2026-03-01']) {
      expect((await create(date)).status).toBe(200);
    }
    expect((await calendarOf('2026-02')).dates).toEqual(['2026-02-01', '2026-02-28']);
  });

  it('should cover the year boundary for December', async () => {
    for (const date of ['2026-12-31', '2027-01-01']) {
      expect((await create(date)).status).toBe(200);
    }
    expect((await calendarOf('2026-12')).dates).toEqual(['2026-12-31']);
    expect((await calendarOf('2027-01')).dates).toEqual(['2027-01-01']);
  });

  it('should include February 29 in a leap year', async () => {
    expect((await create('2028-02-29')).status).toBe(200);
    expect((await calendarOf('2028-02')).dates).toEqual(['2028-02-29']);
  });

  it('should return an empty list for a month without records', async () => {
    expect(await calendarOf('2026-04')).toEqual({ month: '2026-04', dates: [] });
  });
});
