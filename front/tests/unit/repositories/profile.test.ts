import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchProfile, fetchWeightHistory, saveProfile } from '@/repositories/profile';
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

describe('fetchProfile', () => {
  it('should return the saved weight', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { weightKg: 65 }));
    expect(await fetchProfile()).toEqual({ ok: true, data: { weightKg: 65 } });
    expect(fetchMock).toHaveBeenCalledWith('/api/profile');
  });

  it('should return null weight when nothing is saved', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { weightKg: null }));
    expect(await fetchProfile()).toEqual({ ok: true, data: { weightKg: null } });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchProfile()).toEqual({ ok: false, status: 0 });
  });
});

describe('saveProfile', () => {
  it('should POST the weight and date with a bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { weightKg: 70.5 }));
    expect(await saveProfile({ weightKg: 70.5, date: '2026-10-06' })).toEqual({
      ok: true,
      data: { weightKg: 70.5 },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/profile');
    expect(init.method).toBe('POST');
    expect(init.body).toBe(JSON.stringify({ weightKg: 70.5, date: '2026-10-06' }));
    expect(new Headers(init.headers).get('Authorization')).toBe('Bearer token-1');
  });

  it('should return status 401 when not authenticated', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthorized' }));
    expect(await saveProfile({ weightKg: 70, date: '2026-10-06' })).toEqual({
      ok: false,
      status: 401,
    });
  });

  it('should return status 400 when the server rejects the weight', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'weightKg is required' }));
    expect(await saveProfile({ weightKg: Number.NaN, date: '2026-10-06' })).toEqual({
      ok: false,
      status: 400,
    });
  });
});

describe('fetchWeightHistory', () => {
  const points = [{ date: '2026-10-01', weightKg: 65.2 }];

  it('should request the history from the given start date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points }));
    expect(await fetchWeightHistory('2026-09-07')).toEqual({ ok: true, data: { points } });
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/weights?from=2026-09-07');
  });

  it('should request the whole history without from when the start date is null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points: [] }));
    expect(await fetchWeightHistory(null)).toEqual({ ok: true, data: { points: [] } });
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/weights');
  });

  it('should return the status when the server rejects the start date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(400, { error: 'invalid from' }));
    expect(await fetchWeightHistory('2026-02-30')).toEqual({ ok: false, status: 400 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchWeightHistory(null)).toEqual({ ok: false, status: 0 });
  });
});
