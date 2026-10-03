import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { useMasterList } from '@/hooks/useMasterList';
import type { MasterType } from '@/types/master';
import { deferred, jsonResponse, stubFetch } from '../../setup/fetchMock';

// authFetch が参照する Supabase セッション（外部 I/O）だけをモックする
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token-1' } } }),
    },
  },
}));

const bodyParts = [
  { id: 'b1', name: '背中', type: 'body-parts' },
  { id: 'b2', name: '胸', type: 'body-parts' },
];
const exercises = [{ id: 'e1', name: 'ベンチプレス', type: 'exercises' }];

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

/**
 * 部位マスターを読み込んだ状態のフックを返す。
 *
 * @returns renderHook の結果
 */
const renderLoaded = async () => {
  fetchMock.mockResolvedValueOnce(jsonResponse(200, bodyParts));
  const hook = renderHook(({ type }: { type: MasterType }) => useMasterList(type), {
    initialProps: { type: 'body-parts' },
  });
  await waitFor(() => expect(hook.result.current.status).toBe('ready'));
  return hook;
};

describe('useMasterList', () => {
  it('should load the items of the given type', async () => {
    const { result } = await renderLoaded();
    expect(fetchMock).toHaveBeenCalledWith('/api/masters?type=body-parts');
    expect(result.current.items).toEqual(bodyParts);
  });

  it('should reload and not show the previous type while switching the type', async () => {
    const { result, rerender } = await renderLoaded();
    const pending = deferred<Response>();
    fetchMock.mockReturnValueOnce(pending.promise);

    rerender({ type: 'exercises' });
    expect(result.current.status).toBe('loading');
    expect(result.current.items).toEqual([]);

    await act(async () => pending.resolve(jsonResponse(200, exercises)));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(result.current.items).toEqual(exercises);
  });

  it('should prepend the created item on add', async () => {
    const { result } = await renderLoaded();
    const created = { id: 'b9', name: '肩', type: 'body-parts' };
    fetchMock.mockResolvedValueOnce(jsonResponse(200, created));

    let outcome: Awaited<ReturnType<typeof result.current.add>> | undefined;
    await act(async () => {
      outcome = await result.current.add('肩');
    });
    expect(outcome).toEqual({ ok: true, data: created });
    expect(result.current.items).toEqual([created, ...bodyParts]);
  });

  it('should replace the name with the one returned by the server on rename', async () => {
    const { result } = await renderLoaded();
    fetchMock.mockResolvedValueOnce(
      jsonResponse(200, { id: 'b2', name: '大胸筋', type: 'body-parts' }),
    );
    await act(async () => {
      await result.current.rename('b2', '大胸筋');
    });
    expect(result.current.items.map((i) => i.name)).toEqual(['背中', '大胸筋']);
  });

  it('should drop the item on remove', async () => {
    const { result } = await renderLoaded();
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { ok: true }));
    await act(async () => {
      await result.current.remove('b1');
    });
    expect(result.current.items).toEqual([bodyParts[1]]);
  });

  it('should return 409 and keep the items when the name is a duplicate', async () => {
    const { result } = await renderLoaded();
    fetchMock.mockResolvedValueOnce(jsonResponse(409, { error: 'duplicate' }));
    let outcome: Awaited<ReturnType<typeof result.current.add>> | undefined;
    await act(async () => {
      outcome = await result.current.add('胸');
    });
    expect(outcome).toEqual({ ok: false, status: 409 });
    expect(result.current.items).toEqual(bodyParts);
  });

  it('should keep the items when rename or remove fails', async () => {
    const { result } = await renderLoaded();
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'not found or duplicate' }));
    fetchMock.mockResolvedValueOnce(jsonResponse(404, { error: 'not found' }));
    await act(async () => {
      await result.current.rename('b2', '背中');
      await result.current.remove('missing');
    });
    expect(result.current.items).toEqual(bodyParts);
  });

  it('should not add the item to another type when the tab is switched during the request', async () => {
    const { result, rerender } = await renderLoaded();
    const pendingAdd = deferred<Response>();
    // add は authFetch 経由で getSession を待ってから fetch するため、タブ切り替えの取得と
    // 呼び出し順が前後する。順序に頼らず、メソッドで応答を振り分ける
    fetchMock.mockImplementation((_input, init) =>
      init?.method === 'POST' ? pendingAdd.promise : Promise.resolve(jsonResponse(200, exercises)),
    );

    let adding: Promise<unknown> | undefined;
    act(() => {
      adding = result.current.add('肩');
    });
    rerender({ type: 'exercises' });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    await act(async () => {
      pendingAdd.resolve(jsonResponse(200, { id: 'b9', name: '肩', type: 'body-parts' }));
      await adding;
    });
    expect(result.current.items).toEqual(exercises);
  });

  it('should report error with no items when loading fails', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(503, { error: 'database unavailable' }));
    const { result } = renderHook(() => useMasterList('body-parts'));
    await waitFor(() => expect(result.current.status).toBe('error'));
    expect(result.current.items).toEqual([]);
  });
});
