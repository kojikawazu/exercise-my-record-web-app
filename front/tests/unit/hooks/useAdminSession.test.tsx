import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { setBypassSession, useAdminSession } from '@/hooks/useAdminSession';
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

const BYPASS_KEY = 'e2e_admin_bypass';

/** フックの状態をそのまま描画する検証用コンポーネント（サーバー描画・hydration の比較に使う）。 */
function SessionProbe() {
  const { isAdmin, isLoading, isBypass } = useAdminSession();
  return <span>{`admin=${isAdmin} loading=${isLoading} bypass=${isBypass}`}</span>;
}

describe('useAdminSession (E2E bypass flag)', () => {
  beforeEach(() => {
    givenSession(null);
  });

  it('should hydrate without a mismatch when the bypass flag is set, then become admin', async () => {
    // 実サーバーは localStorage を見られない。jsdom の renderToString は window を持つため、
    // フラグを立てる前にサーバー HTML を作って「サーバーはフラグ無しで描画した」状態を再現する
    const container = document.createElement('div');
    container.innerHTML = renderToString(<SessionProbe />);
    document.body.appendChild(container);
    localStorage.setItem(BYPASS_KEY, '1');
    const onRecoverableError = vi.fn();

    const root = await act(async () =>
      hydrateRoot(container, <SessionProbe />, { onRecoverableError }),
    );

    expect(onRecoverableError).not.toHaveBeenCalled();
    expect(container.textContent).toBe('admin=true loading=false bypass=true');
    act(() => root.unmount());
    container.remove();
  });

  it('should render as not-bypassed and loading on the server even when the flag is set', () => {
    localStorage.setItem(BYPASS_KEY, '1');
    expect(renderToString(<SessionProbe />)).toBe(
      '<span>admin=false loading=true bypass=false</span>',
    );
  });

  it('should follow setBypassSession in the same tab', async () => {
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ isAdmin: false, isLoading: false, isBypass: false });

    act(() => setBypassSession(true));
    expect(result.current).toEqual({ isAdmin: true, isLoading: false, isBypass: true });

    act(() => setBypassSession(false));
    expect(result.current).toEqual({ isAdmin: false, isLoading: false, isBypass: false });
  });

  it('should follow a flag change made in another tab (storage event)', async () => {
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      // 別タブでの変更を再現する（jsdom は同一ドキュメントの setItem で storage イベントを発火しない）
      localStorage.setItem(BYPASS_KEY, '1');
      window.dispatchEvent(new StorageEvent('storage', { key: BYPASS_KEY, newValue: '1' }));
    });

    expect(result.current.isBypass).toBe(true);
    expect(result.current.isAdmin).toBe(true);
  });

  it.each(['0', 'true', ''])('should not bypass when the stored flag is %j', async (value) => {
    localStorage.setItem(BYPASS_KEY, value);
    const { result } = renderHook(() => useAdminSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current).toEqual({ isAdmin: false, isLoading: false, isBypass: false });
  });
});
