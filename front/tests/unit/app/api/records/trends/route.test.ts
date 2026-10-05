import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/records/trends/route';

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';

const makePrisma = (rows: unknown[] = []) => ({
  exerciseRecord: { findMany: vi.fn().mockResolvedValue(rows) },
});

const get = (query: string) => GET(new Request(`http://localhost/api/records/trends${query}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/records/trends', () => {
  // 正常系
  it('should aggregate sets and distance per day and return cardio type/minutes', async () => {
    vi.mocked(getPrisma).mockReturnValue(
      makePrisma([
        {
          date: new Date('2026-02-02T00:00:00.000Z'),
          workouts: [{ sets: 3 }, { sets: 4 }],
          cardios: [
            { type: 'ラン', minutes: 30, distance: 5 },
            { type: 'ウォーク', minutes: 20, distance: 1.5 },
          ],
        },
      ]) as never,
    );

    const res = await get('?from=2026-02-01');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      points: [
        {
          date: '2026-02-02',
          totalSets: 7,
          cardioDistance: 6.5,
          cardios: [
            { type: 'ラン', minutes: 30 },
            { type: 'ウォーク', minutes: 20 },
          ],
        },
      ],
    });
  });

  it('should query records on or after from (UTC midnight) in ascending order', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    await get('?from=2026-02-01');
    expect(prisma.exerciseRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { date: { gte: new Date('2026-02-01T00:00:00.000Z') } },
        orderBy: { date: 'asc' },
      }),
    );
  });

  it('should query all records when from is omitted', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    await get('');
    expect(prisma.exerciseRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {}, orderBy: { date: 'asc' } }),
    );
  });

  // 準正常系
  it('should return an empty list when there are no records in the period', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrisma() as never);
    expect(await (await get('?from=2026-02-01')).json()).toEqual({ points: [] });
  });

  it('should return zeros and an empty cardio list for a day without menus', async () => {
    vi.mocked(getPrisma).mockReturnValue(
      makePrisma([
        { date: new Date('2026-02-03T00:00:00.000Z'), workouts: [], cardios: [] },
      ]) as never,
    );
    expect(await (await get('')).json()).toEqual({
      points: [{ date: '2026-02-03', totalSets: 0, cardioDistance: 0, cardios: [] }],
    });
  });

  it('should return 400 for an invalid from without querying the database', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);
    for (const query of ['?from=2026-02-30', '?from=abc', '?from=']) {
      const res = await get(query);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid from' });
    }
    expect(prisma.exerciseRecord.findMany).not.toHaveBeenCalled();
  });

  // 異常系
  it('should not expose ids, audit columns or memo even if the rows carry them', async () => {
    vi.mocked(getPrisma).mockReturnValue(
      makePrisma([
        {
          id: 'rec-1',
          memo: 'メモ',
          createdAt: new Date(),
          date: new Date('2026-02-02T00:00:00.000Z'),
          workouts: [{ id: 'w-1', sets: 3 }],
          cardios: [{ id: 'c-1', recordId: 'rec-1', type: 'ラン', minutes: 30, distance: 5 }],
        },
      ]) as never,
    );
    const [point] = (await (await get('')).json()).points;
    expect(Object.keys(point).sort()).toEqual(['cardioDistance', 'cardios', 'date', 'totalSets']);
    expect(Object.keys(point.cardios[0]).sort()).toEqual(['minutes', 'type']);
  });

  it('should return 503 when the database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const res = await get('');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'database unavailable' });
  });
});
