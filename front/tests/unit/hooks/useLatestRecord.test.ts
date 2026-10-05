import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLatestRecord } from '@/hooks/useLatestRecord';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/record.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

/**
 * 一覧 1 ページ目のレスポンスを作る（日付降順で並んでいる前提）。
 *
 * @param dates - 記録日の並び
 * @returns `GET /api/records` のレスポンス本文
 */
const listOf = (dates: string[]) => ({
  records: dates.map((date) => ({
    date,
    totalSets: 3,
    workouts: [{ part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
    cardios: [],
  })),
  totalCount: dates.length,
  page: 1,
  totalPages: 1,
});

const detail = {
  date: '2026-02-02',
  memo: '体調良好',
  workouts: [{ id: 'w1', part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
};

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useLatestRecord', () => {
  it('should take the first date of page 1 as the latest and load its detail', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, listOf(['2026-02-02', '2026-01-15'])));
    const { result } = renderHook(() => useLatestRecord());

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records?page=1');
    expect(result.current.latestDate).toBe('2026-02-02');

    fetchMock.mockResolvedValueOnce(jsonResponse(200, detail));
    expect(await result.current.loadLatest()).toEqual({ ok: true, data: detail });
    expect(fetchMock).toHaveBeenLastCalledWith('/api/records/2026-02-02');
  });

  it('should report empty when there are no records', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, listOf([])));
    const { result } = renderHook(() => useLatestRecord());
    await waitFor(() => expect(result.current.status).toBe('empty'));
    expect(result.current.latestDate).toBeNull();
  });

  it('should not call the API from loadLatest while there is no latest record', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, listOf([])));
    const { result } = renderHook(() => useLatestRecord());
    await waitFor(() => expect(result.current.status).toBe('empty'));

    expect(await result.current.loadLatest()).toEqual({ ok: false, status: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('should return the failure when the latest record was deleted in the meantime', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, listOf(['2026-02-02'])));
    const { result } = renderHook(() => useLatestRecord());
    await waitFor(() => expect(result.current.status).toBe('ready'));

    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'not found' }));
    expect(await result.current.loadLatest()).toEqual({ ok: false, status: 404 });
  });

  it('should report error when the list request fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'database unavailable' }));
    const { result } = renderHook(() => useLatestRecord());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.latestDate).toBeNull();
  });

  it('should report error when the network fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useLatestRecord());
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
