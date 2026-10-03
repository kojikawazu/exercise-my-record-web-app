import { vi } from 'vitest';

/**
 * JSON 本文を持つ `Response` を作る（fetch モックの戻り値用）。
 *
 * @param status - HTTP ステータス
 * @param body - JSON として返す本文
 * @returns 指定ステータス・本文の Response
 */
export const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

/**
 * グローバル `fetch` をモックに差し替える（外部 I/O のみをモックする方針。testing.md）。
 * 後始末は呼び出し側の `afterEach` で `vi.unstubAllGlobals()` を呼ぶ。
 *
 * @returns 差し替えた fetch モック
 */
export const stubFetch = () => {
  const fetchMock = vi.fn<typeof fetch>();
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

/**
 * 解決タイミングを外から制御できる Promise（レスポンスの到着順を入れ替えるテスト用）。
 *
 * @returns Promise と、その resolve 関数
 */
export const deferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
