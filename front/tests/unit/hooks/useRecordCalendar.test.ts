import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useRecordCalendar } from '@/hooks/useRecordCalendar';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories/record.ts が import する authFetch は、読み込み時に Supabase クライアントを
// 初期化する（外部 I/O）。読み取り系のテストでもモックしておく
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useRecordCalendar', () => {
  it('should load recorded dates of the month', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { month: '2026-02', dates: ['2026-02-02', '2026-02-15'] }),
    );
    const { result } = renderHook(() => useRecordCalendar('2026-02'));

    expect(result.current.status).toBe('loading');
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/calendar?month=2026-02');
    expect([...result.current.recordedDates]).toEqual(['2026-02-02', '2026-02-15']);
  });

  it('should not fetch while the month is undetermined (empty string)', () => {
    const { result } = renderHook(() => useRecordCalendar(''));
    expect(result.current.status).toBe('loading');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('should be ready with no dates for a month without records', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { month: '2026-03', dates: [] }));
    const { result } = renderHook(() => useRecordCalendar('2026-03'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.recordedDates.size).toBe(0);
  });

  it('should not carry over the previous month while the next month is loading', async () => {
    const next = deferred<Response>();
    fetchMock
      .mockResolvedValueOnce(jsonResponse(200, { month: '2026-02', dates: ['2026-02-02'] }))
      .mockReturnValueOnce(next.promise);
    const { result, rerender } = renderHook(({ month }) => useRecordCalendar(month), {
      initialProps: { month: '2026-02' },
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    rerender({ month: '2026-03' });
    expect(result.current.status).toBe('loading');
    expect(result.current.recordedDates.size).toBe(0);

    await act(async () =>
      next.resolve(jsonResponse(200, { month: '2026-03', dates: ['2026-03-01'] })),
    );
    expect([...result.current.recordedDates]).toEqual(['2026-03-01']);
  });

  it('should ignore a stale response that arrives after the month changed', async () => {
    const stale = deferred<Response>();
    fetchMock
      .mockReturnValueOnce(stale.promise)
      .mockResolvedValueOnce(jsonResponse(200, { month: '2026-03', dates: ['2026-03-01'] }));
    const { result, rerender } = renderHook(({ month }) => useRecordCalendar(month), {
      initialProps: { month: '2026-02' },
    });
    rerender({ month: '2026-03' });
    await waitFor(() => expect(result.current.status).toBe('ready'));

    await act(async () =>
      stale.resolve(jsonResponse(200, { month: '2026-02', dates: ['2026-02-02'] })),
    );
    expect([...result.current.recordedDates]).toEqual(['2026-03-01']);
  });

  it('should report error on a server error', async () => {
    fetchMock.mockResolvedValue(jsonResponse(500, { error: 'boom' }));
    const { result } = renderHook(() => useRecordCalendar('2026-02'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.recordedDates.size).toBe(0);
  });

  it('should report error on a network failure', async () => {
    fetchMock.mockRejectedValue(new TypeError('network'));
    const { result } = renderHook(() => useRecordCalendar('2026-02'));
    await waitFor(() => expect(result.current.status).toBe('error'));
  });
});
