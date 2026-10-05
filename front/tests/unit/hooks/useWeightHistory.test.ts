import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useWeightHistory } from '@/hooks/useWeightHistory';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/profile.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const point = (date: string) => ({ date, weightKg: 65 });

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useWeightHistory', () => {
  it('should load points from the given start date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points: [point('2026-02-02')] }));
    const { result } = renderHook(() => useWeightHistory('2026-02-01'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/weights?from=2026-02-01');
    expect(result.current.points.map((p) => p.date)).toEqual(['2026-02-02']);
  });

  it('should request the whole history without from when the start date is null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points: [] }));
    const { result } = renderHook(() => useWeightHistory(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/profile/weights');
    expect(result.current.points).toEqual([]);
  });

  it('should not fetch while the period is undetermined (undefined)', () => {
    const { result } = renderHook(() => useWeightHistory(undefined));
    expect(result.current.status).toBe('loading');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not carry over the previous period while the next one is loading', async () => {
    const next = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { points: [point('2026-02-02')] }))
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ from }) => useWeightHistory(from), {
      initialProps: { from: '2026-02-01' as string | null },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({ from: null });
    expect(result.current.status).toBe('loading');
    expect(result.current.points).toEqual([]);

    await act(async () =>
      next.resolve(jsonResponse(200, { points: [point('2026-01-15'), point('2026-02-02')] })),
    );
    expect(result.current.points).toHaveLength(2);
  });

  it('should ignore a stale response that arrives after the period changed', async () => {
    const stale = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(jsonResponse(200, { points: [point('2026-02-02')] }));
    const { result, rerender } = renderHook(({ from }) => useWeightHistory(from), {
      initialProps: { from: '2026-01-01' as string | null },
    });
    rerender({ from: '2026-02-01' });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => stale.resolve(jsonResponse(200, { points: [point('2026-01-15')] })));
    expect(result.current.points.map((p) => p.date)).toEqual(['2026-02-02']);
  });

  it('should report error on a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const { result } = renderHook(() => useWeightHistory('2026-02-01'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.points).toEqual([]);
  });

  it('should report error on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    const { result } = renderHook(() => useWeightHistory('2026-02-01'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
