import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecordList } from '@/hooks/useRecordList';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/record.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

// repositories はモックせず、外部 I/O の fetch だけを差し替える（testing.md）
const item = (date: string) => ({
  date,
  totalSets: 3,
  cardioMinutes: 30,
  cardioDistance: 5,
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
});
const listBody = (page: number, totalPages: number, dates: string[]) => ({
  records: dates.map(item),
  totalCount: dates.length,
  page,
  totalPages,
});

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordList', () => {
  it('should load the requested page', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, listBody(2, 3, ['2026-01-02'])));
    const { result } = renderHook(() => useRecordList(2));

    expect(result.current.hasFetched).toBe(false);
    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(fetchMock).toHaveBeenCalledWith('/api/records?page=2');
    expect(result.current.records.map((r) => r.date)).toEqual(['2026-01-02']);
    expect(result.current.page).toBe(2);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.hasError).toBe(false);
  });

  it('should expose the page clamped by the server', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, listBody(3, 3, ['2026-01-01'])));
    const { result } = renderHook(() => useRecordList(99));
    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(result.current.page).toBe(3);
  });

  it('should keep the previous records while the next page is loading', async () => {
    const next = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, listBody(1, 2, ['2026-01-02'])))
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ page }) => useRecordList(page), {
      initialProps: { page: 1 },
    });
    await waitFor(() => expect(result.current.hasFetched).toBe(true));

    rerender({ page: 2 });
    expect(result.current.hasFetched).toBe(false);
    expect(result.current.records.map((r) => r.date)).toEqual(['2026-01-02']);

    await act(async () => next.resolve(jsonResponse(200, listBody(2, 2, ['2026-01-01']))));
    expect(result.current.records.map((r) => r.date)).toEqual(['2026-01-01']);
  });

  it('should ignore a stale response that arrives after the page changed', async () => {
    const stale = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(jsonResponse(200, listBody(2, 2, ['2026-01-01'])));
    const { result, rerender } = renderHook(({ page }) => useRecordList(page), {
      initialProps: { page: 1 },
    });

    rerender({ page: 2 });
    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    await act(async () => stale.resolve(jsonResponse(200, listBody(1, 2, ['2026-01-02']))));

    expect(result.current.page).toBe(2);
    expect(result.current.records.map((r) => r.date)).toEqual(['2026-01-01']);
  });

  it('should report an error with empty records when the request fails', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'database unavailable' }));
    const { result } = renderHook(() => useRecordList(1));
    await waitFor(() => expect(result.current.hasFetched).toBe(true));
    expect(result.current.hasError).toBe(true);
    expect(result.current.records).toEqual([]);
    expect(result.current.totalPages).toBe(1);
  });

  it('should report an error when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    const { result } = renderHook(() => useRecordList(1));
    await waitFor(() => expect(result.current.hasError).toBe(true));
  });

  it('should refetch the page, apply the result and return it', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, listBody(1, 1, ['2026-01-02', '2026-01-01'])))
      .mockResolvedValueOnce(jsonResponse(200, listBody(1, 1, ['2026-01-01'])));
    const { result } = renderHook(() => useRecordList(1));
    await waitFor(() => expect(result.current.hasFetched).toBe(true));

    let returned: Awaited<ReturnType<typeof result.current.refetch>> = null;
    await act(async () => {
      returned = await result.current.refetch();
    });
    expect(returned).toEqual(listBody(1, 1, ['2026-01-01']));
    expect(result.current.records.map((r) => r.date)).toEqual(['2026-01-01']);
  });

  it('should return null from refetch when it fails', async () => {
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, listBody(1, 1, ['2026-01-02'])))
      .mockResolvedValueOnce(jsonResponse(500, { error: 'failed' }));
    const { result } = renderHook(() => useRecordList(1));
    await waitFor(() => expect(result.current.hasFetched).toBe(true));

    let returned: Awaited<ReturnType<typeof result.current.refetch>> | undefined;
    await act(async () => {
      returned = await result.current.refetch();
    });
    expect(returned).toBeNull();
    expect(result.current.hasError).toBe(true);
  });
});
