import { describe, it, expect } from 'vitest';
import { NextRequest } from 'next/server';
import { GET as listMasters, POST as createMaster } from '../route';
import { PATCH as updateMaster, DELETE as deleteMaster } from '../[id]/route';
import { getPrisma } from '@/lib/prisma';

// 実 DB（Testcontainers）に対するマスター IT。
// @@unique([type, name]) 制約や name 昇順などを実 DB で検証する。

const url = (type: string) => `http://localhost/api/masters?type=${type}`;

const post = (type: string, name: string) =>
  new Request(url(type), { method: 'POST', body: JSON.stringify({ name }) });

const makeContext = (id: string) => ({ params: Promise.resolve({ id }) });

describe('IT: /api/masters (実 DB)', () => {
  // --- 正常系 ---

  it('should create masters and list them name-ascending', async () => {
    await createMaster(post('body-parts', '胸'));
    await createMaster(post('body-parts', '背中'));
    await createMaster(post('body-parts', '脚'));

    const res = await listMasters(new Request(url('body-parts')));
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list).toHaveLength(3);
    // name 昇順（日本語コードポイント順）。
    expect(list.map((m: { name: string }) => m.name)).toEqual(['背中', '胸', '脚']);
  });

  it('should scope listing by type', async () => {
    await createMaster(post('body-parts', '胸'));
    await createMaster(post('exercises', 'ベンチプレス'));

    const bodyParts = await (await listMasters(new Request(url('body-parts')))).json();
    const exercises = await (await listMasters(new Request(url('exercises')))).json();
    expect(bodyParts).toHaveLength(1);
    expect(exercises).toHaveLength(1);
    expect(exercises[0].name).toBe('ベンチプレス');
  });

  it('should update a master name via PATCH and delete via DELETE', async () => {
    const created = await (await createMaster(post('exercises', 'スクワト'))).json();

    const patchReq = new NextRequest('http://localhost', {
      method: 'PATCH',
      body: JSON.stringify({ name: 'スクワット' }),
    });
    const patched = await updateMaster(patchReq, makeContext(created.id));
    expect(patched.status).toBe(200);
    expect((await patched.json()).name).toBe('スクワット');

    const del = await deleteMaster(new NextRequest('http://localhost', { method: 'DELETE' }), makeContext(created.id));
    expect(del.status).toBe(200);

    const prisma = getPrisma()!;
    expect(await prisma.exerciseMaster.count()).toBe(0);
  });

  // --- 準正常系 ---

  it('should reject a duplicate (type,name) with 409 (unique constraint)', async () => {
    const first = await createMaster(post('cardio-types', 'ラン'));
    expect(first.status).toBe(200);

    const dup = await createMaster(post('cardio-types', 'ラン'));
    expect(dup.status).toBe(409);
    expect((await dup.json()).error).toBe('duplicate');

    const prisma = getPrisma()!;
    expect(await prisma.exerciseMaster.count()).toBe(1);
  });

  it('should allow the same name under a different type (composite unique)', async () => {
    // type が違えば同名でも作成できる（@@unique([type, name]) は複合キー）。
    const a = await createMaster(post('body-parts', '共通'));
    const b = await createMaster(post('exercises', '共通'));
    expect(a.status).toBe(200);
    expect(b.status).toBe(200);

    const prisma = getPrisma()!;
    expect(await prisma.exerciseMaster.count()).toBe(2);
  });

  // --- 異常系 ---

  it('should return 404 when updating a non-existent master id', async () => {
    const req = new NextRequest('http://localhost', { method: 'PATCH', body: JSON.stringify({ name: 'x' }) });
    const res = await updateMaster(req, makeContext('nonexistent-id'));
    expect(res.status).toBe(404);
  });
});
