import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useMasters } from '@/hooks/useMasters';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

const masters = {
  'body-parts': [
    { id: 'b1', name: '胸', type: 'body-parts' },
    { id: 'b2', name: '背中', type: 'body-parts' },
  ],
  exercises: [{ id: 'e1', name: 'ベンチプレス', type: 'exercises' }],
  'cardio-types': [
    { id: 'c1', name: 'ウォーク', type: 'cardio-types' },
    { id: 'c2', name: 'ラン', type: 'cardio-types' },
  ],
};

let fetchMock: ReturnType<typeof stubFetch>;

/**
 * クエリ `type` に応じて応答を返す fetch モック実装を作る。
 *
 * @param failing - 失敗させる種別と、その応答（HTTP ステータス。`0` は通信エラー）
 * @returns fetch の代替実装
 */
const respondByType =
  (failing: Partial<Record<keyof typeof masters, number>> = {}) =>
  async (input: RequestInfo | URL) => {
    const type = new URL(String(input), 'http://localhost').searchParams.get(
      'type',
    ) as keyof typeof masters;
    const status = failing[type];
    if (status === 0) throw new TypeError('Failed to fetch');
    if (status !== undefined) return jsonResponse(status, { error: 'failed' });
    return jsonResponse(200, masters[type]);
  };

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('useMasters', () => {
  it('should load names of all three master types', async () => {
    fetchMock.mockImplementation(respondByType());
    const { result } = renderHook(() => useMasters());

    expect(result.current).toEqual({
      bodyParts: [],
      exercises: [],
      cardioTypes: [],
      status: 'loading',
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current).toEqual({
      bodyParts: ['胸', '背中'],
      exercises: ['ベンチプレス'],
      cardioTypes: ['ウォーク', 'ラン'],
      status: 'ready',
    });
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('should keep the succeeded types and report error when one type fails', async () => {
    fetchMock.mockImplementation(respondByType({ exercises: 503 }));
    const { result } = renderHook(() => useMasters());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.bodyParts).toEqual(['胸', '背中']);
    expect(result.current.exercises).toEqual([]);
    expect(result.current.cardioTypes).toEqual(['ウォーク', 'ラン']);
  });

  it('should return empty options and report error when every request fails', async () => {
    fetchMock.mockImplementation(
      respondByType({ 'body-parts': 0, exercises: 0, 'cardio-types': 500 }),
    );
    const { result } = renderHook(() => useMasters());

    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current).toEqual({
      bodyParts: [],
      exercises: [],
      cardioTypes: [],
      status: 'error',
    });
  });
});
