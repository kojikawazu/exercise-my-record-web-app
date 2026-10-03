import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createMaster, deleteMaster, fetchMasters, updateMaster } from '@/repositories/master';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// authFetch が参照する Supabase セッション（外部 I/O）だけをモックする
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token-1' } } }),
    },
  },
}));

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * fetch 呼び出しの引数を取り出す。
 *
 * @param n - 何回目の呼び出しか（0 始まり）
 * @returns `[URL, init]`
 */
const callOf = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit | undefined];

/**
 * 呼び出しに付いた Authorization ヘッダーを取り出す。
 *
 * @param n - 何回目の呼び出しか（0 始まり）
 * @returns ヘッダーの値。無ければ `null`
 */
const authOf = (n = 0) => new Headers(callOf(n)[1]?.headers).get('Authorization');

describe('fetchMasters', () => {
  it('should request the given type and return the body on 200', async () => {
    const masters = [{ id: 'm1', name: '胸', type: 'body-parts' }];
    fetchMock.mockResolvedValue(jsonResponse(200, masters));
    expect(await fetchMasters('body-parts')).toEqual({ ok: true, data: masters });
    expect(fetchMock).toHaveBeenCalledWith('/api/masters?type=body-parts');
  });

  it('should return an empty array when the master has no items', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    expect(await fetchMasters('cardio-types')).toEqual({ ok: true, data: [] });
  });

  it('should return the HTTP status when the response is not 2xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'database unavailable' }));
    expect(await fetchMasters('exercises')).toEqual({ ok: false, status: 503 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchMasters('exercises')).toEqual({ ok: false, status: 0 });
  });
});

describe('createMaster', () => {
  it('should POST the name with a bearer token and return the created master', async () => {
    const created = { id: 'm9', name: '肩', type: 'body-parts' };
    fetchMock.mockResolvedValue(jsonResponse(200, created));
    expect(await createMaster('body-parts', '肩')).toEqual({ ok: true, data: created });

    const [url, init] = callOf();
    expect(url).toBe('/api/masters?type=body-parts');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(JSON.stringify({ name: '肩' }));
    expect(authOf()).toBe('Bearer token-1');
  });

  it('should return status 409 when the name already exists', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'duplicate' }));
    expect(await createMaster('body-parts', '胸')).toEqual({ ok: false, status: 409 });
  });

  it('should return status 401 when not authenticated', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthorized' }));
    expect(await createMaster('body-parts', '肩')).toEqual({ ok: false, status: 401 });
  });
});

describe('updateMaster', () => {
  it('should PATCH the name of the given id', async () => {
    const updated = { id: 'm1', name: '大胸筋', type: 'body-parts' };
    fetchMock.mockResolvedValue(jsonResponse(200, updated));
    expect(await updateMaster('m1', '大胸筋')).toEqual({ ok: true, data: updated });

    const [url, init] = callOf();
    expect(url).toBe('/api/masters/m1');
    expect(init?.method).toBe('PATCH');
    expect(init?.body).toBe(JSON.stringify({ name: '大胸筋' }));
    expect(authOf()).toBe('Bearer token-1');
  });

  it('should return status 404 when the master does not exist or the name is a duplicate', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found or duplicate' }));
    expect(await updateMaster('missing', '胸')).toEqual({ ok: false, status: 404 });
  });
});

describe('deleteMaster', () => {
  it('should DELETE the given id without reading the body', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { ok: true }));
    expect(await deleteMaster('m1')).toEqual({ ok: true, data: null });

    const [url, init] = callOf();
    expect(url).toBe('/api/masters/m1');
    expect(init?.method).toBe('DELETE');
    expect(authOf()).toBe('Bearer token-1');
  });

  it('should return status 404 when the master does not exist', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    expect(await deleteMaster('missing')).toEqual({ ok: false, status: 404 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await deleteMaster('m1')).toEqual({ ok: false, status: 0 });
  });
});
