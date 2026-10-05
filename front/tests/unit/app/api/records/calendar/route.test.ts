import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/records/calendar/route';

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';

const makePrisma = (rows: { date: Date }[] = []) => ({
  exerciseRecord: { findMany: vi.fn().mockResolvedValue(rows) },
});

const get = (query: string) => GET(new Request(`http://localhost/api/records/calendar${query}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/records/calendar', () => {
  // 正常系
  it('should return recorded dates of the month', async () => {
    const prisma = makePrisma([
      { date: new Date('2026-02-02T00:00:00.000Z') },
      { date: new Date('2026-02-15T00:00:00.000Z') },
    ]);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await get('?month=2026-02');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ month: '2026-02', dates: ['2026-02-02', '2026-02-15'] });
  });

  it('should query the half-open UTC range [first day, first day of next month) in ascending order', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    await get('?month=2026-12');
    expect(prisma.exerciseRecord.findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2026-12-01T00:00:00.000Z'),
          lt: new Date('2027-01-01T00:00:00.000Z'),
        },
      },
      select: { date: true },
      orderBy: { date: 'asc' },
    });
  });

  // 準正常系
  it('should return an empty list for a month without records', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrisma() as never);
    const res = await get('?month=2026-03');
    expect(await res.json()).toEqual({ month: '2026-03', dates: [] });
  });

  it('should return 400 when month is missing', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrisma() as never);
    const res = await get('');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'invalid month' });
  });

  it('should return 400 for an out-of-range month without querying the database', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);
    const res = await get('?month=2026-13');
    expect(res.status).toBe(400);
    expect(prisma.exerciseRecord.findMany).not.toHaveBeenCalled();
  });

  // 異常系
  it('should return 503 when the database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const res = await get('?month=2026-02');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'database unavailable' });
  });
});
