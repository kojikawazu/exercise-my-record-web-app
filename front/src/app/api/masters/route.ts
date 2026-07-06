import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const ALLOWED_TYPES = new Set(['body-parts', 'exercises', 'cardio-types']);

const isValidType = (value: string | null): value is string =>
  value !== null && ALLOWED_TYPES.has(value);

/**
 * 指定種別のマスター（部位・種目・有酸素種別）を名称昇順で一覧取得する。
 *
 * 認証不要。クエリ `type` は `body-parts` / `exercises` / `cardio-types` のいずれか
 * である必要があり、それ以外や未指定は 400 を返す。
 *
 * @param request - リクエスト。クエリ `type`（取得対象の種別、必須）を参照する
 * @returns 200: マスターの配列（名称昇順）。400: `type` 不正。503: DB 接続不可
 */
export async function GET(request: Request) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const masters = await prisma.exerciseMaster.findMany({
    where: { type },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(masters);
}

/**
 * 指定種別のマスター（部位・種目・有酸素種別）を新規追加する（管理者のみ）。
 *
 * 管理者認証必須。クエリ `type` は `body-parts` / `exercises` / `cardio-types` の
 * いずれか。本文の `name` はトリム後に空でないことを要求する。同種別内で名称が
 * 重複する場合は 409 を返す。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>`、クエリ `type`（必須）、本文の `name`（追加する名称、必須）を参照する
 * @returns 200: 作成したマスター。401/403: 認証・認可エラー。400: `type` 不正または `name` 欠落。409: 名称重複。503: DB 接続不可
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const master = await prisma.exerciseMaster.create({
      data: { type, name },
    });
    return NextResponse.json(master);
  } catch {
    return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  }
}
