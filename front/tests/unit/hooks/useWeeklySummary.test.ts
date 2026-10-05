import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWeeklySummary } from '@/hooks/useWeeklySummary';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// repositories が import する authFetch は、読み込み時に Supabase クライアントを初期化する（外部 I/O）
vi.mock('@/lib/supabase', () => ({
  supabase: { auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) } },
}));

const point = (date: string, totalSets: number) => ({
  date,
  totalSets,
  cardioDistance: 0,
  cardios: [],
});

let fetchMock: ReturnType<typeof stubFetch>;

/**
 * URL ごとに応答を返す fetch の差し替え（推移 API とプロフィール API を同時に呼ぶため）。
 *
 * @param trends - 推移 API の応答
 * @param weightKg - プロフィール API が返す体重
 */
const respond = (trends: Response, weightKg: number | null) => {
  fetchMock.mockImplementation(async (input: string | URL | Request) =>
    String(input).startsWith('/api/profile') ? jsonResponse(200, { weightKg }) : trends,
  );
};

beforeEach(() => {
  // Date だけを偽装する（タイマーまで止めると React の内部スケジューリングに影響するため）
  vi.useFakeTimers({ toFake: ['Date'] });
  // 2026-10-07（水）。今週 = 10/5〜10/7、先週 = 9/28〜9/30
  vi.setSystemTime(new Date(2026, 9, 7, 12, 0));
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('useWeeklySummary', () => {
  it('should fetch once from last Monday and split totals into this week and last week', async () => {
    respond(
      jsonResponse(200, {
        points: [
          point('2026-09-28', 4),
          point('2026-10-01', 99),
          point('2026-10-05', 6),
          point('2026-10-07', 3),
        ],
      }),
      60,
    );
    const { result } = renderHook(() => useWeeklySummary());

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(fetchMock).toHaveBeenCalledWith('/api/records/trends?from=2026-09-28');
    // 体重（プロフィール）は推移と別に届くため、カロリーが埋まるまで待つ
    await waitFor(() =>
      expect(result.current.current).toEqual({ days: 2, totalSets: 9, calories: 54 }),
    );
    // 10/1（木）は先週の同じ曜日（水）より後なので含めない
    expect(result.current.previous).toEqual({ days: 1, totalSets: 4, calories: 24 });
  });

  it('should return null calories when the weight is not set', async () => {
    respond(jsonResponse(200, { points: [point('2026-10-05', 6)] }), null);
    const { result } = renderHook(() => useWeeklySummary());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() => expect(result.current.current?.calories).toBeNull());
    expect(result.current.current?.totalSets).toBe(6);
  });

  it('should report zeros for both weeks when there are no records', async () => {
    respond(jsonResponse(200, { points: [] }), 60);
    const { result } = renderHook(() => useWeeklySummary());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await waitFor(() =>
      expect(result.current.current).toEqual({ days: 0, totalSets: 0, calories: 0 }),
    );
    expect(result.current.previous).toEqual({ days: 0, totalSets: 0, calories: 0 });
  });

  it('should report error and no totals when fetching the records fails', async () => {
    respond(jsonResponse(500, { error: 'boom' }), 60);
    const { result } = renderHook(() => useWeeklySummary());
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.current).toBeNull();
    expect(result.current.previous).toBeNull();
  });
});
