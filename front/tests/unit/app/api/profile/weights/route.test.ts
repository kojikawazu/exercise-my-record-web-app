import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/profile/weights/route';

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';

const makePrisma = (rows: unknown[] = []) => ({
  exerciseWeightLog: { findMany: vi.fn().mockResolvedValue(rows) },
});

const get = (query: string) => GET(new Request(`http://localhost/api/profile/weights${query}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/profile/weights', () => {
  // 正常系
  it('should return each day as YYYY-MM-DD with its weight', async () => {
    vi.mocked(getPrisma).mockReturnValue(
      makePrisma([
        { date: new Date('2026-10-01T00:00:00.000Z'), weightKg: 65.2 },
        { date: new Date('2026-10-05T00:00:00.000Z'), weightKg: 64.8 },
      ]) as never,
    );

    const res = await get('?from=2026-09-07');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      points: [
        { date: '2026-10-01', weightKg: 65.2 },
        { date: '2026-10-05', weightKg: 64.8 },
      ],
    });
  });

  it('should query entries on or after from (UTC midnight) in ascending order', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    await get('?from=2026-09-07');
    expect(prisma.exerciseWeightLog.findMany).toHaveBeenCalledWith({
      where: { date: { gte: new Date('2026-09-07T00:00:00.000Z') } },
      select: { date: true, weightKg: true },
      orderBy: { date: 'asc' },
    });
  });

  // 準正常系
  it('should query the whole history when from is omitted', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await get('');
    expect(await res.json()).toEqual({ points: [] });
    expect(prisma.exerciseWeightLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it.each(['2026-02-30', '2026-9-7', 'abc', ''])(
    'should return 400 for an invalid from (%s) without querying',
    async (from) => {
      const prisma = makePrisma();
      vi.mocked(getPrisma).mockReturnValue(prisma as never);

      const res = await get(`?from=${from}`);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid from' });
      expect(prisma.exerciseWeightLog.findMany).not.toHaveBeenCalled();
    },
  );

  // 異常系
  it('should return 503 when the database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null as never);
    const res = await get('');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'database unavailable' });
  });
});
