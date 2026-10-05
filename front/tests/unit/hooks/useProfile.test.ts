import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useProfile } from '@/hooks/useProfile';
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

describe('useProfile', () => {
  it('should load the saved weight', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 65 }));
    const { result } = renderHook(() => useProfile());
    expect(result.current.status).toBe('loading');
    expect(result.current.weightKg).toBeNull();
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.weightKg).toBe(65);
  });

  it('should update the weight after a successful save', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 65 }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 70 }));
    await act(async () => {
      expect(await result.current.save(70)).toEqual({ ok: true, data: { weightKg: 70 } });
    });
    expect(result.current.weightKg).toBe(70);
  });

  it('should send the browser local date as the history date when saving', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 65 }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    // ローカル日付の 23:30（UTC に直すと日付が変わり得る時刻）でも、ローカルの日付を送る
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 9, 6, 23, 30));
    try {
      fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 70 }));
      await act(async () => {
        await result.current.save(70);
      });
    } finally {
      vi.useRealTimers();
    }
    const [, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(init.body).toBe(JSON.stringify({ weightKg: 70, date: '2026-10-06' }));
  });

  it('should be ready with null weight when nothing is saved', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: null }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.weightKg).toBeNull();
  });

  it('should keep the saved weight and return the failure when saving fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { weightKg: 65 }));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: 'unauthorized' }));
    await act(async () => {
      expect(await result.current.save(70)).toEqual({ ok: false, status: 401 });
    });
    expect(result.current.weightKg).toBe(65);
  });

  it('should report error with null weight when loading fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useProfile());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.weightKg).toBeNull();
  });
});
