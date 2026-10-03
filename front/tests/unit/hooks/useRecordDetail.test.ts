import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecordDetail } from '@/hooks/useRecordDetail';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/record.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const detail = (date: string) => ({
  date,
  memo: '体調良好',
  workouts: [{ id: 'w1', part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
});

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordDetail', () => {
  it('should load the detail and call onLoaded once with it', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, detail('2026-01-02')));
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useRecordDetail('2026-01-02', onLoaded));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/2026-01-02');
    expect(result.current.detail).toEqual(detail('2026-01-02'));
    expect(onLoaded).toHaveBeenCalledTimes(1);
    expect(onLoaded).toHaveBeenCalledWith(detail('2026-01-02'));
  });

  it('should report not-found on 404 without calling onLoaded', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    const onLoaded = vi.fn();
    const { result } = renderHook(() => useRecordDetail('2099-01-01', onLoaded));
    await waitFor(() => expect(result.current.status).toBe('not-found'));
    expect(result.current.detail).toBeNull();
    expect(onLoaded).not.toHaveBeenCalled();
  });

  it('should report error on a non-404 failure', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'database unavailable' }));
    const { result } = renderHook(() => useRecordDetail('2026-01-02'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('should report error when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRecordDetail('2026-01-02'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });

  it('should ignore a stale response that arrives after the date changed', async () => {
    const stale = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(jsonResponse(200, detail('2026-01-03')));
    const onLoaded = vi.fn();
    const { result, rerender } = renderHook(({ date }) => useRecordDetail(date, onLoaded), {
      initialProps: { date: '2026-01-02' },
    });

    rerender({ date: '2026-01-03' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => stale.resolve(jsonResponse(200, detail('2026-01-02'))));

    expect(result.current.detail?.date).toBe('2026-01-03');
    expect(onLoaded).toHaveBeenCalledTimes(1);
  });
});
