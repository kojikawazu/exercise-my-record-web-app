import { NextRequest, NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

/** マスター編集・削除ハンドラーのルートコンテキスト。`params` に対象マスターの `id` を含む。 */
type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * 既存のマスター（部位・種目・有酸素種別）の名称を編集する（管理者のみ）。
 *
 * 管理者認証必須。パスパラメータ `id` のマスターの `name` を更新する。名称は
 * トリム後に空でないことを要求する。対象が存在しない、または同名重複で更新に
 * 失敗した場合は 404 を返す。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` と、本文の `name`（更新後の名称、必須）を参照する
 * @param context - ルートコンテキスト。`params` から対象マスターの `id` を取り出す
 * @returns 200: 更新後のマスター。401/403: 認証・認可エラー。400: `name` 欠落。404: 対象なしまたは重複。503: DB 接続不可
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const updated = await prisma.exerciseMaster.update({
      where: { id },
      data: { name },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'not found or duplicate' }, { status: 404 });
  }
}

/**
 * 既存のマスター（部位・種目・有酸素種別）を削除する（管理者のみ）。
 *
 * 管理者認証必須。パスパラメータ `id` のマスターを削除する。対象が存在せず
 * 削除に失敗した場合は 404 を返す。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` を参照する
 * @param context - ルートコンテキスト。`params` から対象マスターの `id` を取り出す
 * @returns 200: `{ ok: true }`。401/403: 認証・認可エラー。404: 対象なし。503: DB 接続不可
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { id } = await context.params;
  try {
    await prisma.exerciseMaster.delete({
      where: { id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
