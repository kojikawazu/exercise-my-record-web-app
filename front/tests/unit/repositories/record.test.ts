import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createRecord,
  deleteRecord,
  fetchRecordDetail,
  fetchRecordList,
  updateRecord,
} from '@/repositories/record';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

// authFetch が参照する Supabase セッション（外部 I/O）だけをモックする
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'token-1' } } }),
    },
  },
}));

const listResponse = {
  records: [{ date: '2026-01-02', totalSets: 0, workouts: [], cardios: [] }],
  totalCount: 1,
  page: 1,
  totalPages: 1,
};

const updateBody = {
  memo: null,
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
 * fetch 呼び出しの引数を取り出す。
 *
 * @param n - 何回目の呼び出しか（0 始まり）
 * @returns `[URL, init]`
 */
const callOf = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit | undefined];

describe('fetchRecordList', () => {
  it('should request the given page and return the body on 200', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, listResponse));
    const result = await fetchRecordList(2);
    expect(callOf()[0]).toBe('/api/records?page=2');
    expect(result).toEqual({ ok: true, data: listResponse });
  });

  it('should return the HTTP status when the response is not 2xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'database unavailable' }));
    expect(await fetchRecordList(1)).toEqual({ ok: false, status: 503 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchRecordList(1)).toEqual({ ok: false, status: 0 });
  });
});

describe('fetchRecordDetail', () => {
  it('should request the detail of the given date', async () => {
    const detail = { date: '2026-01-02', memo: null, workouts: [], cardios: [] };
    fetchMock.mockResolvedValue(jsonResponse(200, detail));
    expect(await fetchRecordDetail('2026-01-02')).toEqual({ ok: true, data: detail });
    expect(callOf()[0]).toBe('/api/records/2026-01-02');
  });

  it('should return status 404 when the record does not exist', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    expect(await fetchRecordDetail('2099-01-01')).toEqual({ ok: false, status: 404 });
  });
});

describe('createRecord', () => {
  it('should POST the body as JSON with the bearer token', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'rec-1' }));
    const result = await createRecord({ date: '2026-01-02', ...updateBody });

    expect(result).toEqual({ ok: true, data: { id: 'rec-1' } });
    const [url, init] = callOf();
    expect(url).toBe('/api/records');
    expect(init?.method).toBe('POST');
    expect(new Headers(init?.headers).get('Authorization')).toBe('Bearer token-1');
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(init?.body))).toEqual({ date: '2026-01-02', ...updateBody });
  });

  it('should return status 409 when a record of the same date exists', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { error: 'duplicate date' }));
    expect(await createRecord({ date: '2026-01-02', ...updateBody })).toEqual({
      ok: false,
      status: 409,
    });
  });

  it('should return status 401 when not authorized', async () => {
    fetchMock.mockResolvedValue(jsonResponse(401, { error: 'unauthorized' }));
    expect(await createRecord({ date: '2026-01-02', ...updateBody })).toEqual({
      ok: false,
      status: 401,
    });
  });
});

describe('updateRecord', () => {
  it('should PATCH the record of the given date', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { id: 'rec-1' }));
    expect(await updateRecord('2026-01-02', updateBody)).toEqual({
      ok: true,
      data: { id: 'rec-1' },
    });
    const [url, init] = callOf();
    expect(url).toBe('/api/records/2026-01-02');
    expect(init?.method).toBe('PATCH');
    expect(JSON.parse(String(init?.body))).toEqual(updateBody);
  });

  it('should return status 404 when the record does not exist', async () => {
    fetchMock.mockResolvedValue(jsonResponse(404, { error: 'not found' }));
    expect(await updateRecord('2099-01-01', updateBody)).toEqual({ ok: false, status: 404 });
  });
});

describe('deleteRecord', () => {
  it('should DELETE the record and return null without reading the body', async () => {
    // 本文が JSON でなくても成功扱いになる（本文を読まないことの確認）
    fetchMock.mockResolvedValue(new Response('not json', { status: 200 }));
    expect(await deleteRecord('2026-01-02')).toEqual({ ok: true, data: null });
    const [url, init] = callOf();
    expect(url).toBe('/api/records/2026-01-02');
    expect(init?.method).toBe('DELETE');
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await deleteRecord('2026-01-02')).toEqual({ ok: false, status: 0 });
  });
});
