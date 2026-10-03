import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useRecordMutations } from '@/hooks/useRecordMutations';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// authFetch が参照する Supabase セッション（外部 I/O）だけをモックする
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token-1' } } }),
    },
  },
}));

const values = {
  memo: ' 体調良好 ',
  workouts: [{ id: 'w1', part: '胸', name: 'ベンチプレス', sets: '3', reps: '10', weight: '60' }],
  cardios: [{ id: 'c1', type: 'ラン', minutes: '', distance: '' }],
};
const expectedBody = {
  memo: '体調良好',
  workouts: [{ part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 }],
  cardios: null,
};

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * fetch 呼び出しの本文を JSON として読む。
 *
 * @param n - 何回目の呼び出しか（0 始まり）
 * @returns 送信された本文
 */
const bodyOf = (n = 0) =>
  JSON.parse(String((fetchMock.mock.calls[n] as [string, RequestInit])[1].body)) as unknown;

describe('useRecordMutations', () => {
  it('should create a record from form values with the date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'rec-1' }));
    const { result } = renderHook(() => useRecordMutations());

    expect(await result.current.create('2026-01-02', values)).toEqual({
      ok: true,
      data: { id: 'rec-1' },
    });
    expect(bodyOf()).toEqual({ date: '2026-01-02', ...expectedBody });
  });

  it('should surface 409 when a record of the same date exists', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'duplicate date' }));
    const { result } = renderHook(() => useRecordMutations());
    expect(await result.current.create('2026-01-02', values)).toEqual({ ok: false, status: 409 });
  });

  it('should update the record of the date from form values', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'rec-1' }));
    const { result } = renderHook(() => useRecordMutations());

    await result.current.update('2026-01-02', values);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/records/2026-01-02');
    expect(bodyOf()).toEqual(expectedBody);
  });

  it('should report a failed delete with its status', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    const { result } = renderHook(() => useRecordMutations());
    expect(await result.current.remove('2099-01-01')).toEqual({ ok: false, status: 404 });
  });

  it('should return the same functions across renders', () => {
    const { result, rerender } = renderHook(() => useRecordMutations());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
