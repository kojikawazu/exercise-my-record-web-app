import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GET, POST } from '@/app/api/records/route';

// モック: prisma と adminAuth
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  exerciseRecord: {
    count: vi.fn().mockResolvedValue(0),
    findMany: vi.fn().mockResolvedValue([]),
    findUnique: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
  },
  exerciseWorkout: {
    create: vi.fn().mockResolvedValue({}),
  },
  exerciseCardio: {
    create: vi.fn().mockResolvedValue({}),
  },
  ...overrides,
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ authorized: true });
});

// ---------------------------------------------------------------------------
// GET /api/records
// ---------------------------------------------------------------------------
describe('GET /api/records', () => {
  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const req = new Request('http://localhost/api/records');
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });

  it('should return records with pagination metadata', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.count).mockResolvedValue(2);
    vi.mocked(prisma.exerciseRecord.findMany).mockResolvedValue([
      {
        date: new Date('2026-01-02'),
        workouts: [{ sets: 3 }],
        cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
      },
      { date: new Date('2026-01-01'), workouts: [{ sets: 5 }], cardios: [] },
    ] as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records?page=1');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.records).toHaveLength(2);
    expect(body.totalCount).toBe(2);
    expect(body.page).toBe(1);
    expect(body.totalPages).toBe(1);
  });

  it('should clamp page to 1 when page param is non-numeric', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.count).mockResolvedValue(5);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records?page=abc');
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(1);
  });

  it('should clamp page to totalPages when page exceeds range', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.count).mockResolvedValue(5);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records?page=999');
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(1); // 5件 → totalPages=1 → clamp to 1
  });

  it('should default to page=1 when page param is omitted', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records');
    const res = await GET(req);
    const body = await res.json();
    expect(body.page).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// POST /api/records
// ---------------------------------------------------------------------------
describe('POST /api/records', () => {
  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const req = new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-01-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
  });

  it('should return 400 when date is missing', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('date is required');
  });

  it('should return 409 when the same date already exists', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.findUnique).mockResolvedValue({ id: 'existing' } as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-01-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('duplicate date');
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({ date: '2026-01-01' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
  });

  it('should create a record and return its id on success', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/records', {
      method: 'POST',
      body: JSON.stringify({
        date: '2026-01-01',
        workouts: [{ part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
        cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
      }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', 'rec-1');
    expect(prisma.exerciseWorkout.create).toHaveBeenCalledOnce();
    expect(prisma.exerciseCardio.create).toHaveBeenCalledOnce();
  });

  describe('when the database throws during creation', () => {
    // Prisma の例外メッセージが含み得る内部情報（テーブル名・制約名）を模した文言
    const internalMessage =
      'Unique constraint failed on the constraint: `ExerciseWorkout_recordId_fkey`';

    const postValidRecord = () =>
      POST(
        new Request('http://localhost/api/records', {
          method: 'POST',
          body: JSON.stringify({
            date: '2026-01-01',
            workouts: [{ part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
          }),
        }),
      );

    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      vi.mocked(console.error).mockRestore();
    });

    it('should return 500 with a fixed message instead of the raw exception message', async () => {
      const prisma = makePrisma({
        exerciseWorkout: { create: vi.fn().mockRejectedValue(new Error(internalMessage)) },
      });
      vi.mocked(getPrisma).mockReturnValue(prisma as never);

      const res = await postValidRecord();
      expect(res.status).toBe(500);
      const body = await res.json();
      expect(body).toEqual({ error: 'failed to create record' });
      expect(JSON.stringify(body)).not.toContain('ExerciseWorkout_recordId_fkey');
    });

    it('should log the original error object for server-side investigation', async () => {
      const thrown = new Error(internalMessage);
      const prisma = makePrisma({
        exerciseWorkout: { create: vi.fn().mockRejectedValue(thrown) },
      });
      vi.mocked(getPrisma).mockReturnValue(prisma as never);

      await postValidRecord();
      expect(console.error).toHaveBeenCalledWith('POST /api/records error:', thrown);
    });

    it('should return the same fixed message when a non-Error value is thrown', async () => {
      const prisma = makePrisma({
        exerciseRecord: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockRejectedValue('connection refused at db.internal:5432'),
        },
      });
      vi.mocked(getPrisma).mockReturnValue(prisma as never);

      const res = await postValidRecord();
      expect(res.status).toBe(500);
      expect(await res.json()).toEqual({ error: 'failed to create record' });
    });
  });
});
