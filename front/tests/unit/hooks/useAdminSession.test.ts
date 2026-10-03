import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useAdminSession } from '@/hooks/useAdminSession';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// Supabase の認証（外部 I/O）をモックする。セッションはテストごとに差し替える
const auth = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
}));
vi.mock('@/lib/supabase', () => ({ supabase: { auth } }));

/**
 * `getSession` が返すセッションを設定する。
 *
 * @param accessToken - セッションの access token。`null` はセッション無し
 */
const givenSession = (accessToken: string | null) => {
  auth.getSession.mockResolvedValue({
    data: { session: accessToken ? { access_token: accessToken } : null },
  });
};

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
  localStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useAdminSession', () => {
  it('should be admin when /api/admin/me answers isAdmin: true for the session token', async () => {
    givenSession('token-admin');
    fetchMock.mockResolvedValue(jsonResponse(200, { isAdmin: true }));
    const { result } = renderHook(() => useAdminSession());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ isAdmin: true, isLoading: false, isBypass: false });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-admin');
  });

  it('should not be admin for a non-admin user (403)', async () => {
    givenSession('token-user');
    fetchMock.mockResolvedValue(jsonResponse(403, { isAdmin: false }));
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('should not call the API and not be admin without a session', async () => {
    givenSession(null);
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not be admin and finish loading when the request fails', async () => {
    givenSession('token-admin');
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });

  it('should not be admin and finish loading when the 2xx body is not JSON', async () => {
    givenSession('token-admin');
    fetchMock.mockResolvedValue(new Response('<html>', { status: 200 }));
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAdmin).toBe(false);
  });
});
