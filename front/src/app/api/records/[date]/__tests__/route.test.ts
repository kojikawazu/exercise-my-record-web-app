import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, DELETE } from '../route';

vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const makeContext = (date: string) => ({
  params: Promise.resolve({ date }),
});

const existingRecord = {
  id: 'rec-1',
  date: new Date('2026-01-01'),
  memo: '体調良好',
  workouts: [{ id: 'w1', part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
};

const makePrisma = () => ({
  exerciseRecord: {
    findUnique: vi.fn().mockResolvedValue(existingRecord),
    update: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    delete: vi.fn().mockResolvedValue({}),
  },
  exerciseWorkout: {
    deleteMany: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
  exerciseCardio: {
    deleteMany: vi.fn().mockResolvedValue({}),
    create: vi.fn().mockResolvedValue({}),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ authorized: true });
});

// ---------------------------------------------------------------------------
// GET /api/records/[date]
// ---------------------------------------------------------------------------
describe('GET /api/records/[date]', () => {
  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const res = await GET(new Request('http://localhost'), makeContext('2026-01-01'));
    expect(res.status).toBe(503);
  });

  it('should return 404 when record does not exist', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.findUnique).mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request('http://localhost'), makeContext('2099-01-01'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not found');
  });

  it('should return record detail with workouts and cardios', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request('http://localhost'), makeContext('2026-01-01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.date).toBe('2026-01-01');
    expect(body.workouts).toHaveLength(1);
    expect(body.cardios).toHaveLength(1);
    expect(body.memo).toBe('体調良好');
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/records/[date]
// ---------------------------------------------------------------------------
describe('PATCH /api/records/[date]', () => {
  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ memo: 'ok' }) });
    const res = await PATCH(req, makeContext('2026-01-01'));
    expect(res.status).toBe(503);
  });

  it('should return 404 when record does not exist', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.findUnique).mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ memo: 'ok' }) });
    const res = await PATCH(req, makeContext('2099-01-01'));
    expect(res.status).toBe(404);
  });

  it('should return 400 when body is invalid JSON', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'PATCH', body: 'not-json' });
    const res = await PATCH(req, makeContext('2026-01-01'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid body');
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ memo: 'ok' }) });
    const res = await PATCH(req, makeContext('2026-01-01'));
    expect(res.status).toBe(401);
  });

  it('should update record and return id on success', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({
        memo: '更新メモ',
        workouts: [{ part: '背中', name: 'デッドリフト', sets: 3, reps: 5, weight: 100 }],
        cardios: [],
      }),
    });
    const res = await PATCH(req, makeContext('2026-01-01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('id', 'rec-1');
    expect(prisma.exerciseWorkout.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.exerciseCardio.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.exerciseWorkout.create).toHaveBeenCalledOnce();
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/records/[date]
// ---------------------------------------------------------------------------
describe('DELETE /api/records/[date]', () => {
  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('2026-01-01'));
    expect(res.status).toBe(503);
  });

  it('should return 404 when record does not exist', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseRecord.findUnique).mockResolvedValue(null);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('2099-01-01'));
    expect(res.status).toBe(404);
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('2026-01-01'));
    expect(res.status).toBe(401);
  });

  it('should delete record and return ok:true on success', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req, makeContext('2026-01-01'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(prisma.exerciseWorkout.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.exerciseCardio.deleteMany).toHaveBeenCalledOnce();
    expect(prisma.exerciseRecord.delete).toHaveBeenCalledOnce();
  });
});
