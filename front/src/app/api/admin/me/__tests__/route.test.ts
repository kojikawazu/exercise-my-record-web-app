import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Supabase クライアントは外部 I/O（認証 HTTP）なのでモックする。
// getUser の戻りをテストごとに差し替えてトークン検証の分岐を再現する。
const mockGetUser = vi.fn();
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { getUser: mockGetUser } }),
}));

const ADMIN_EMAIL = 'admin@example.com';

/**
 * env を設定したうえでルートを再評価して読み込む。
 * route.ts は supabaseUrl / adminEmail をモジュールトップレベルで捕捉するため、
 * env を変えるたびに resetModules + 動的 import で読み直す必要がある。
 * 引数 env は上書きする env（未指定のキーは有効なダミー値を使う）。
 *
 * @returns 再評価した route モジュール（`GET` を含む）
 */
const loadRoute = async (
  env: { url?: string; anon?: string; admin?: string } = {},
) => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', env.url ?? 'https://dummy.supabase.co');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', env.anon ?? 'dummy-anon-key');
  vi.stubEnv('ADMIN_EMAIL', env.admin ?? ADMIN_EMAIL);
  return import('../route');
};

const bearerRequest = (token?: string) =>
  new Request('http://localhost/api/admin/me', {
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

beforeEach(() => {
  mockGetUser.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('GET /api/admin/me', () => {
  // --- 正常系 ---

  it('should return isAdmin=true when the token belongs to ADMIN_EMAIL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: ADMIN_EMAIL } }, error: null });
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: true });
  });

  it('should match ADMIN_EMAIL case-insensitively and trimming whitespace', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: '  ADMIN@Example.com ' } }, error: null });
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ isAdmin: true });
  });

  // --- 準正常系 ---

  it('should return 401 when Authorization header is missing', async () => {
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest());
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ isAdmin: false });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should return 401 when the token is invalid (getUser returns error)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } });
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest('bad-token'));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ isAdmin: false });
  });

  it('should return 403 when the authenticated email is not ADMIN_EMAIL', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: 'other@example.com' } }, error: null });
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ isAdmin: false });
  });

  it('should return 403 when the authenticated user has no email', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { email: undefined } }, error: null });
    const { GET } = await loadRoute();

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ isAdmin: false });
  });

  // --- 異常系 ---

  it('should return 500 when admin auth is not configured (missing ADMIN_EMAIL)', async () => {
    const { GET } = await loadRoute({ admin: '' });

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'admin auth is not configured' });
    expect(mockGetUser).not.toHaveBeenCalled();
  });

  it('should return 500 when Supabase env is missing', async () => {
    const { GET } = await loadRoute({ url: '' });

    const res = await GET(bearerRequest('valid-token'));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'admin auth is not configured' });
  });
});
