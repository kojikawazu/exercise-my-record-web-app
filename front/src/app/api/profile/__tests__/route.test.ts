import { describe, it, expect, vi, beforeEach } from 'vitest';

// モック: 外部 I/O のみ（prisma / adminAuth）
vi.mock('@/lib/prisma', () => ({
  getPrisma: vi.fn(),
}));

vi.mock('@/lib/adminAuth', () => ({
  requireAdmin: vi.fn(),
}));

const makePrisma = (overrides: Record<string, unknown> = {}) => ({
  exerciseProfile: {
    findFirst: vi.fn().mockResolvedValue(null),
    update: vi.fn().mockResolvedValue({}),
    deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
    create: vi.fn().mockResolvedValue({}),
  },
  ...overrides,
});

/**
 * モジュールスコープの `fallbackWeightKg` はテスト順に依存するため、
 * 各テストで `vi.resetModules()` 済みの新鮮なモジュールを動的 import する。
 * これにより毎テスト `fallbackWeightKg = null` の初期状態から検証できる。
 *
 * @returns route ハンドラ（`GET`/`POST`）と mock 済み `getPrisma`/`requireAdmin`
 */
async function load() {
  const prismaMod = await import('@/lib/prisma');
  const authMod = await import('@/lib/adminAuth');
  const route = await import('../route');
  const getPrisma = vi.mocked(prismaMod.getPrisma);
  const requireAdmin = vi.mocked(authMod.requireAdmin);
  // POST の既定認証は成功。個別テストで上書きする。
  requireAdmin.mockResolvedValue({ authorized: true } as never);
  return { getPrisma, requireAdmin, GET: route.GET, POST: route.POST };
}

const makePostRequest = (body: unknown) =>
  new Request('http://localhost/api/profile', {
    method: 'POST',
    body: JSON.stringify(body),
  });

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// GET /api/profile
// ---------------------------------------------------------------------------
describe('GET /api/profile', () => {
  // 正常系
  it('should return the latest saved weightKg when a profile exists', async () => {
    const { getPrisma, GET } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockResolvedValue({ id: 'p1', weightKg: 72.5 });
    getPrisma.mockReturnValue(prisma as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: 72.5 });
    expect(prisma.exerciseProfile.findFirst).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    });
  });

  // 準正常系: プロフィール未存在 → フォールバック(初期null)
  it('should return null when no profile row exists and no fallback is set', async () => {
    const { getPrisma, GET } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockResolvedValue(null);
    getPrisma.mockReturnValue(prisma as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: null });
  });

  // 異常系: DB 未接続(getPrisma=null) → フォールバック(初期null)
  it('should return fallback null when the database is unavailable', async () => {
    const { getPrisma, GET } = await load();
    getPrisma.mockReturnValue(null as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: null });
  });

  // 異常系: findFirst が throw → catch でフォールバック(初期null)
  it('should swallow DB errors and return fallback null', async () => {
    const { getPrisma, GET } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockRejectedValue(new Error('db down'));
    getPrisma.mockReturnValue(prisma as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: null });
  });
});

// ---------------------------------------------------------------------------
// POST /api/profile
// ---------------------------------------------------------------------------
describe('POST /api/profile', () => {
  // 正常系: 既存あり → update + deleteMany(他行削除) を呼び、{ weightKg } を返す
  it('should update the existing profile and delete duplicate rows', async () => {
    const { getPrisma, POST } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockResolvedValue({ id: 'existing-1' });
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({ weightKg: 68 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: 68 });

    expect(prisma.exerciseProfile.update).toHaveBeenCalledWith({
      where: { id: 'existing-1' },
      data: { weightKg: 68 },
    });
    // 他行を削除して 1 件のみ維持
    expect(prisma.exerciseProfile.deleteMany).toHaveBeenCalledWith({
      where: { id: { not: 'existing-1' } },
    });
    expect(prisma.exerciseProfile.create).not.toHaveBeenCalled();
  });

  // 正常系: 既存なし → create を呼び、{ weightKg } を返す
  it('should create a new profile when none exists', async () => {
    const { getPrisma, POST } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockResolvedValue(null);
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({ weightKg: 55.4 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: 55.4 });

    expect(prisma.exerciseProfile.create).toHaveBeenCalledWith({
      data: { weightKg: 55.4 },
    });
    expect(prisma.exerciseProfile.update).not.toHaveBeenCalled();
    expect(prisma.exerciseProfile.deleteMany).not.toHaveBeenCalled();
  });

  // 準正常系: weightKg が数値でない → 400
  it('should return 400 when weightKg is not a number', async () => {
    const { getPrisma, POST } = await load();
    const prisma = makePrisma();
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({ weightKg: '70' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('weightKg is required');
    expect(prisma.exerciseProfile.update).not.toHaveBeenCalled();
    expect(prisma.exerciseProfile.create).not.toHaveBeenCalled();
  });

  // 準正常系: weightKg 未指定 → 400
  it('should return 400 when weightKg is omitted', async () => {
    const { getPrisma, POST } = await load();
    const prisma = makePrisma();
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('weightKg is required');
  });

  // 異常系: 未認証 → 401（認証レスポンスをそのまま返す）
  it('should return 401 when not authorized', async () => {
    const { getPrisma, requireAdmin, POST } = await load();
    requireAdmin.mockResolvedValue({
      authorized: false,
      response: new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401 }),
    } as never);
    const prisma = makePrisma();
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({ weightKg: 60 }));
    expect(res.status).toBe(401);
    // 認証で弾かれた場合は DB へ触れない
    expect(prisma.exerciseProfile.findFirst).not.toHaveBeenCalled();
  });

  // 異常系: DB エラー(update が throw)でも握りつぶして { weightKg } を返す
  it('should swallow DB errors during update and still return weightKg', async () => {
    const { getPrisma, POST } = await load();
    const prisma = makePrisma();
    prisma.exerciseProfile.findFirst.mockResolvedValue({ id: 'existing-1' });
    prisma.exerciseProfile.update.mockRejectedValue(new Error('db down'));
    getPrisma.mockReturnValue(prisma as never);

    const res = await POST(makePostRequest({ weightKg: 80 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: 80 });
  });

  // 異常系: getPrisma=null でも 200 で保存値を返す
  it('should return 200 with the saved weightKg even when the database is unavailable', async () => {
    const { getPrisma, POST } = await load();
    getPrisma.mockReturnValue(null as never);

    const res = await POST(makePostRequest({ weightKg: 90 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ weightKg: 90 });
  });

  // 上書き挙動(module state): POST 成功で更新した fallback を後続 GET が参照する
  it('should persist weightKg via module fallback so a later GET reads it back', async () => {
    const { getPrisma, POST, GET } = await load();
    getPrisma.mockReturnValue(null as never); // DB を使わず fallback のみ検証

    const postRes = await POST(makePostRequest({ weightKg: 63 }));
    expect(postRes.status).toBe(200);
    expect(await postRes.json()).toEqual({ weightKg: 63 });

    const getRes = await GET();
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual({ weightKg: 63 });
  });
});
