import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '@/app/api/records/streak/route';

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';

const makePrisma = (dates: string[] = []) => ({
  exerciseRecord: {
    findMany: vi
      .fn()
      .mockResolvedValue(dates.map((d) => ({ date: new Date(`${d}T00:00:00.000Z`) }))),
  },
});

const get = (query: string) => GET(new Request(`http://localhost/api/records/streak${query}`));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('GET /api/records/streak', () => {
  // 正常系
  it('should return the streak ending today', async () => {
    vi.mocked(getPrisma).mockReturnValue(
      makePrisma(['2026-10-07', '2026-10-06', '2026-10-04']) as never,
    );
    const res = await get('?today=2026-10-07');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      days: 2,
      from: '2026-10-06',
      to: '2026-10-07',
      recordedToday: true,
    });
  });

  it('should query only dates on or before today (UTC midnight), newest first', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);
    await get('?today=2026-10-07');
    expect(prisma.exerciseRecord.findMany).toHaveBeenCalledWith({
      where: { date: { lte: new Date('2026-10-07T00:00:00.000Z') } },
      select: { date: true },
      orderBy: { date: 'desc' },
    });
  });

  // 準正常系
  it('should return 0 days when there is no streak', async () => {
    vi.mocked(getPrisma).mockReturnValue(makePrisma(['2026-10-01']) as never);
    expect(await (await get('?today=2026-10-07')).json()).toEqual({
      days: 0,
      from: null,
      to: null,
      recordedToday: false,
    });
  });

  it('should return 400 for a missing or invalid today without querying the database', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);
    for (const query of ['', '?today=2026-02-30', '?today=abc']) {
      const res = await get(query);
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: 'invalid today' });
    }
    expect(prisma.exerciseRecord.findMany).not.toHaveBeenCalled();
  });

  // 異常系
  it('should return 503 when the database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const res = await get('?today=2026-10-07');
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: 'database unavailable' });
  });
});
