import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStreak } from '@/hooks/useStreak';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories が import する authFetch は、読み込み時に Supabase クライアントを初期化する（外部 I/O）
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  // Date だけを偽装する（タイマーまで止めると React の内部スケジューリングに影響するため）
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 7, 8, 0));
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useStreak', () => {
  it("should request the streak with today's local date", async () => {
    const body = { days: 3, from: '2026-10-05', to: '2026-10-07', recordedToday: true };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    const { result } = renderHook(() => useStreak());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/streak?today=2026-10-07');
    expect(result.current.streak).toEqual(body);
  });

  it('should be ready with 0 days when there is no streak', async () => {
    const body = { days: 0, from: null, to: null, recordedToday: false };
    fetchMock.mockResolvedValue(jsonResponse(200, body));
    const { result } = renderHook(() => useStreak());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.streak?.days).toBe(0);
  });

  it('should report error and no streak on a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const { result } = renderHook(() => useStreak());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.streak).toBeNull();
  });

  it('should report error on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    const { result } = renderHook(() => useStreak());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
