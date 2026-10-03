import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchAdminMe } from '@/repositories/admin';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchAdminMe', () => {
  it('should send the given token without caching and return isAdmin', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { isAdmin: true }));
    expect(await fetchAdminMe('token-x')).toEqual({ ok: true, data: { isAdmin: true } });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/admin/me');
    expect(init.cache).toBe('no-store');
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-x');
  });

  it('should return status 403 for a non-admin user', async () => {
    fetchMock.mockResolvedValue(jsonResponse(403, { isAdmin: false }));
    expect(await fetchAdminMe('token-x')).toEqual({ ok: false, status: 403 });
  });

  it('should return status 401 for an invalid token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { isAdmin: false }));
    expect(await fetchAdminMe('expired')).toEqual({ ok: false, status: 401 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchAdminMe('token-x')).toEqual({ ok: false, status: 0 });
  });
});
