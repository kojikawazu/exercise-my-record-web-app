import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fetchMasters } from '@/repositories/master';
import { jsonResponse, stubFetch } from '../../setup/fetchMock';

let fetchMock: ReturnType<typeof stubFetch>;

beforeEach(() => {
  fetchMock = stubFetch();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMasters', () => {
  it('should request the given type and return the body on 200', async () => {
    const masters = [{ id: 'm1', name: '胸', type: 'body-parts' }];
    fetchMock.mockResolvedValue(jsonResponse(200, masters));
    expect(await fetchMasters('body-parts')).toEqual({ ok: true, data: masters });
    expect(fetchMock).toHaveBeenCalledWith('/api/masters?type=body-parts');
  });

  it('should return an empty array when the master has no items', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, []));
    expect(await fetchMasters('cardio-types')).toEqual({ ok: true, data: [] });
  });

  it('should return the HTTP status when the response is not 2xx', async () => {
    fetchMock.mockResolvedValue(jsonResponse(503, { error: 'database unavailable' }));
    expect(await fetchMasters('exercises')).toEqual({ ok: false, status: 503 });
  });

  it('should return status 0 when the request itself fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));
    expect(await fetchMasters('exercises')).toEqual({ ok: false, status: 0 });
  });
});
