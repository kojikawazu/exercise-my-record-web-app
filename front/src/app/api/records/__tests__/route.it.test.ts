import { describe, it, expect } from 'vitest';
import { GET as listRecords, POST as createRecord } from '../route';
import {
  GET as getDetail,
  PATCH as patchRecord,
  DELETE as deleteRecord,
} from '../[date]/route';
import { getPrisma } from '@/lib/prisma';

// 実 DB（Testcontainers の PostgreSQL）を叩く統合テスト。
// getPrisma() は it-setup で注入された DATABASE_URL 経由でコンテナに接続し、
// requireAdmin は E2E_BYPASS=1 でバイパスされる。
// モックは一切使わず、Prisma のクエリ・制約・並び順を実 DB で検証する。

const postUrl = 'http://localhost/api/records';

const makeContext = (date: string) => ({ params: Promise.resolve({ date }) });

const createRequest = (body: unknown) =>
  new Request(postUrl, { method: 'POST', body: JSON.stringify(body) });

const sampleBody = (date: string) => ({
  date,
  memo: '体調良好',
  workouts: [
    { part: '胸', name: 'ベンチプレス', sets: 3, reps: 10, weight: 60 },
    { part: '背中', name: 'デッドリフト', sets: 4, reps: 8, weight: 100 },
  ],
  cardios: [{ type: 'ラン', minutes: 30, distance: 5 }],
});

describe('IT: POST /api/records (実 DB)', () => {
  // --- 正常系 ---

  it('should persist a record with workouts and cardios, retrievable via detail', async () => {
    const res = await createRecord(createRequest(sampleBody('2026-01-01')));
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect(typeof id).toBe('string');

    // 実 DB に子行が保存されていることを Prisma で直接確認。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseWorkout.count()).toBe(2);
    expect(await prisma.exerciseCardio.count()).toBe(1);

    // 詳細ハンドラ経由でも往復できる。
    const detail = await getDetail(new Request('http://localhost'), makeContext('2026-01-01'));
    expect(detail.status).toBe(200);
    const body = await detail.json();
    expect(body.date).toBe('2026-01-01');
    expect(body.memo).toBe('体調良好');
    expect(body.workouts).toHaveLength(2);
    expect(body.cardios).toHaveLength(1);
    expect(body.workouts[0].name).toBe('ベンチプレス');
  });

  // --- 準正常系 ---

  it('should reject a second record on the same date with 409 (unique constraint)', async () => {
    const first = await createRecord(createRequest(sampleBody('2026-02-02')));
    expect(first.status).toBe(200);

    const dup = await createRecord(createRequest(sampleBody('2026-02-02')));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error).toBe('duplicate date');

    // 重複は保存されず、レコードは 1 件のまま。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseRecord.count()).toBe(1);
  });

  it('should return 400 when date is missing', async () => {
    const res = await createRecord(createRequest({ memo: 'no date' }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('date is required');
  });
});

describe('IT: GET /api/records — pagination & ordering (実 DB)', () => {
  // --- 正常系 ---

  it('should paginate 12 records (10 per page) in date-descending order', async () => {
    // 2026-03-01 〜 2026-03-12 の 12 レコードを作成。
    for (let d = 1; d <= 12; d++) {
      const date = `2026-03-${String(d).padStart(2, '0')}`;
      const res = await createRecord(createRequest({ date, workouts: [], cardios: [] }));
      expect(res.status).toBe(200);
    }

    const page1 = await listRecords(new Request(`${postUrl}?page=1`));
    const body1 = await page1.json();
    expect(body1.totalCount).toBe(12);
    expect(body1.totalPages).toBe(2);
    expect(body1.page).toBe(1);
    expect(body1.records).toHaveLength(10);
    // 日付降順: 先頭は最新の 2026-03-12。
    expect(body1.records[0].date).toBe('2026-03-12');
    expect(body1.records[9].date).toBe('2026-03-03');

    const page2 = await listRecords(new Request(`${postUrl}?page=2`));
    const body2 = await page2.json();
    expect(body2.records).toHaveLength(2);
    expect(body2.records[0].date).toBe('2026-03-02');
    expect(body2.records[1].date).toBe('2026-03-01');
  });

  // --- 準正常系 ---

  it('should clamp page beyond range to the last page', async () => {
    await createRecord(createRequest({ date: '2026-04-01', workouts: [], cardios: [] }));

    const res = await listRecords(new Request(`${postUrl}?page=999`));
    const body = await res.json();
    // 1 件 → totalPages=1 → clamp to 1。
    expect(body.page).toBe(1);
    expect(body.records).toHaveLength(1);
  });

  // --- 異常系（空状態） ---

  it('should return empty list with totalPages=1 when there are no records', async () => {
    const res = await listRecords(new Request(`${postUrl}?page=1`));
    const body = await res.json();
    expect(body.totalCount).toBe(0);
    expect(body.totalPages).toBe(1);
    expect(body.records).toEqual([]);
  });
});

describe('IT: PATCH/DELETE /api/records/[date] (実 DB)', () => {
  // --- 正常系 ---

  it('should replace workouts/cardios and memo on PATCH (full replace)', async () => {
    await createRecord(createRequest(sampleBody('2026-05-01')));

    const patchReq = new Request('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({
        memo: '更新後メモ',
        workouts: [{ part: '脚', name: 'スクワット', sets: 5, reps: 5, weight: 80 }],
        cardios: [],
      }),
    });
    const patched = await patchRecord(patchReq, makeContext('2026-05-01'));
    expect(patched.status).toBe(200);

    // 全置換: 筋トレ 1 件・有酸素 0 件・メモ更新。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseWorkout.count()).toBe(1);
    expect(await prisma.exerciseCardio.count()).toBe(0);

    const detail = await getDetail(new Request('http://localhost'), makeContext('2026-05-01'));
    const body = await detail.json();
    expect(body.memo).toBe('更新後メモ');
    expect(body.workouts[0].name).toBe('スクワット');
  });

  it('should delete a record and cascade-remove its workouts/cardios', async () => {
    await createRecord(createRequest(sampleBody('2026-06-01')));

    const del = await deleteRecord(new Request('http://localhost', { method: 'DELETE' }), makeContext('2026-06-01'));
    expect(del.status).toBe(200);
    expect(await del.json()).toEqual({ ok: true });

    // レコード・子行ともに残らない（孤児なし）。
    const prisma = getPrisma()!;
    expect(await prisma.exerciseRecord.count()).toBe(0);
    expect(await prisma.exerciseWorkout.count()).toBe(0);
    expect(await prisma.exerciseCardio.count()).toBe(0);
  });

  // --- 準正常系 ---

  it('should return 404 when patching a non-existent date', async () => {
    const req = new Request('http://localhost', { method: 'PATCH', body: JSON.stringify({ memo: 'x' }) });
    const res = await patchRecord(req, makeContext('2099-01-01'));
    expect(res.status).toBe(404);
  });

  it('should return 404 when deleting a non-existent date', async () => {
    const res = await deleteRecord(new Request('http://localhost', { method: 'DELETE' }), makeContext('2099-01-01'));
    expect(res.status).toBe(404);
  });
});
