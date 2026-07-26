import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '@/app/api/masters/route';

// モック: prisma と adminAuth（外部 I/O のみ）
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';
import { MASTER_SELECT } from '@/types/master';
import { requireAdmin } from '@/lib/adminAuth';

const makePrisma = () => ({
  exerciseMaster: {
    findMany: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({ id: 'm-1' }),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ authorized: true });
});

// ---------------------------------------------------------------------------
// GET /api/masters
// ---------------------------------------------------------------------------
describe('GET /api/masters', () => {
  it('should return masters ordered by name for a valid type', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.findMany).mockResolvedValue([
      { id: 'm-1', type: 'body-parts', name: '胸' },
      { id: 'm-2', type: 'body-parts', name: '背中' },
    ] as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=body-parts');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({ id: 'm-1', type: 'body-parts', name: '胸' });
    // select で公開列を確定していること（監査カラムを返さない）を検証する。
    expect(prisma.exerciseMaster.findMany).toHaveBeenCalledWith({
      where: { type: 'body-parts' },
      orderBy: { name: 'asc' },
      select: MASTER_SELECT,
    });
  });

  // 準正常系: Prisma が監査カラムを返しても、レスポンスには載せない。
  // select による絞り込みが外れた場合の保険として、詰め替え側の挙動を固定する。
  it('should not expose audit columns even if rows carry them', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.findMany).mockResolvedValue([
      {
        id: 'm-1',
        type: 'body-parts',
        name: '胸',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      },
    ] as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const res = await GET(new Request('http://localhost/api/masters?type=body-parts'));
    const body = await res.json();
    expect(Object.keys(body[0]).sort()).toEqual(['id', 'name', 'type']);
  });

  it('should return 400 when type is invalid', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=unknown');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid type');
    expect(prisma.exerciseMaster.findMany).not.toHaveBeenCalled();
  });

  it('should return 400 when type is omitted', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters');
    const res = await GET(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid type');
  });

  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);
    const req = new Request('http://localhost/api/masters?type=body-parts');
    const res = await GET(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });
});

// ---------------------------------------------------------------------------
// POST /api/masters
// ---------------------------------------------------------------------------
describe('POST /api/masters', () => {
  it('should create a master and return it on success', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.create).mockResolvedValue({
      id: 'm-9',
      type: 'exercises',
      name: 'ベンチプレス',
    } as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=exercises', {
      method: 'POST',
      body: JSON.stringify({ name: 'ベンチプレス' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'm-9', type: 'exercises', name: 'ベンチプレス' });
    expect(prisma.exerciseMaster.create).toHaveBeenCalledWith({
      data: { type: 'exercises', name: 'ベンチプレス' },
      select: MASTER_SELECT,
    });
  });

  it('should trim the name before creating', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=cardio-types', {
      method: 'POST',
      body: JSON.stringify({ name: '  ランニング  ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(prisma.exerciseMaster.create).toHaveBeenCalledWith({
      data: { type: 'cardio-types', name: 'ランニング' },
      select: MASTER_SELECT,
    });
  });

  it('should return 400 when type is invalid', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=unknown', {
      method: 'POST',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('invalid type');
    expect(prisma.exerciseMaster.create).not.toHaveBeenCalled();
  });

  it('should return 400 when name is missing', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=body-parts', {
      method: 'POST',
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('name is required');
  });

  it('should return 400 when name is blank after trimming', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=body-parts', {
      method: 'POST',
      body: JSON.stringify({ name: '   ' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('name is required');
    expect(prisma.exerciseMaster.create).not.toHaveBeenCalled();
  });

  it('should return 409 when the name duplicates an existing master', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.create).mockRejectedValue(new Error('unique constraint'));
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=body-parts', {
      method: 'POST',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBe('duplicate');
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost/api/masters?type=body-parts', {
      method: 'POST',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(prisma.exerciseMaster.create).not.toHaveBeenCalled();
  });

  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);

    const req = new Request('http://localhost/api/masters?type=body-parts', {
      method: 'POST',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });
});
