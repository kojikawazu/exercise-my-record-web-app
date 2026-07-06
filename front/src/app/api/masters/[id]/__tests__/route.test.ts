import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH, DELETE } from '../route';

// モック: prisma と adminAuth（外部 I/O のみ）
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';
import type { NextRequest } from 'next/server';

const makeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

const makePrisma = () => ({
  exerciseMaster: {
    update: vi.fn().mockResolvedValue({ id: 'm-1', type: 'body-parts', name: '胸' }),
    delete: vi.fn().mockResolvedValue({}),
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(requireAdmin).mockResolvedValue({ authorized: true });
});

// ---------------------------------------------------------------------------
// PATCH /api/masters/[id]
// ---------------------------------------------------------------------------
describe('PATCH /api/masters/[id]', () => {
  it('should update the master name and return the updated master', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.update).mockResolvedValue({
      id: 'm-1',
      type: 'body-parts',
      name: '大胸筋',
    } as never);
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '  大胸筋  ' }),
    });
    const res = await PATCH(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ id: 'm-1', type: 'body-parts', name: '大胸筋' });
    expect(prisma.exerciseMaster.update).toHaveBeenCalledWith({
      where: { id: 'm-1' },
      data: { name: '大胸筋' },
    });
  });

  it('should return 400 when name is blank after trimming', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '   ' }),
    });
    const res = await PATCH(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('name is required');
    expect(prisma.exerciseMaster.update).not.toHaveBeenCalled();
  });

  it('should return 404 when the target does not exist or the name duplicates', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.update).mockRejectedValue(new Error('not found'));
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await PATCH(req as NextRequest, makeContext('missing'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not found or duplicate');
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await PATCH(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(401);
    expect(prisma.exerciseMaster.update).not.toHaveBeenCalled();
  });

  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);

    const req = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: '胸' }),
    });
    const res = await PATCH(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/masters/[id]
// ---------------------------------------------------------------------------
describe('DELETE /api/masters/[id]', () => {
  it('should delete the master and return ok:true on success', async () => {
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(prisma.exerciseMaster.delete).toHaveBeenCalledWith({ where: { id: 'm-1' } });
  });

  it('should return 404 when the target does not exist', async () => {
    const prisma = makePrisma();
    vi.mocked(prisma.exerciseMaster.delete).mockRejectedValue(new Error('not found'));
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req as NextRequest, makeContext('missing'));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('not found');
  });

  it('should return 401 when not authorized', async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    vi.mocked(getPrisma).mockReturnValue(prisma as never);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(401);
    expect(prisma.exerciseMaster.delete).not.toHaveBeenCalled();
  });

  it('should return 503 when database is unavailable', async () => {
    vi.mocked(getPrisma).mockReturnValue(null);

    const req = new Request('http://localhost', { method: 'DELETE' });
    const res = await DELETE(req as NextRequest, makeContext('m-1'));
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toBe('database unavailable');
  });
});
