import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecordTrends } from '@/hooks/useRecordTrends';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/record.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const point = (date: string) => ({ date, totalSets: 3, cardioDistance: 5, cardios: [] });

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordTrends', () => {
  it('should load points from the given start date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points: [point('2026-02-02')] }));
    const { result } = renderHook(() => useRecordTrends('2026-02-01'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/trends?from=2026-02-01');
    expect(result.current.points.map((p) => p.date)).toEqual(['2026-02-02']);
  });

  it('should request all records without from when the start date is null', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { points: [] }));
    const { result } = renderHook(() => useRecordTrends(null));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/trends');
    expect(result.current.points).toEqual([]);
  });

  it('should not fetch while the period is undetermined (undefined)', () => {
    const { result } = renderHook(() => useRecordTrends(undefined));
    expect(result.current.status).toBe('loading');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should not carry over the previous period while the next one is loading', async () => {
    const next = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { points: [point('2026-02-02')] }))
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ from }) => useRecordTrends(from), {
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
    const { result, rerender } = renderHook(({ from }) => useRecordTrends(from), {
      initialProps: { from: '2026-01-01' as string | null },
    });
    rerender({ from: '2026-02-01' });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () => stale.resolve(jsonResponse(200, { points: [point('2026-01-15')] })));
    expect(result.current.points.map((p) => p.date)).toEqual(['2026-02-02']);
  });

  it('should report error on a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const { result } = renderHook(() => useRecordTrends('2026-02-01'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.points).toEqual([]);
  });

  it('should report error on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    const { result } = renderHook(() => useRecordTrends('2026-02-01'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
