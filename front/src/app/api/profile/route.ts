import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

let fallbackWeightKg: number | null = null;

/**
 * 保存済みの体重（kg）を取得する。
 *
 * 認証不要。最新のプロフィール行から体重を返す。DB 未接続や取得失敗時は
 * プロセス内の暫定フォールバック値（直近保存値。無ければ `null`）を返す。
 * ※ 暫定実装のエンドポイント。
 *
 * @returns 200: `{ weightKg }`（未保存かつフォールバック無しは `null`）
 */
export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ weightKg: fallbackWeightKg });
  }
  try {
    const profile = await prisma.exerciseProfile.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (typeof profile?.weightKg === 'number') {
      fallbackWeightKg = profile.weightKg;
    }
    return NextResponse.json({ weightKg: profile?.weightKg ?? fallbackWeightKg });
  } catch {
    return NextResponse.json({ weightKg: fallbackWeightKg });
  }
}

/**
 * 体重（kg）を保存する（管理者のみ）。
 *
 * 管理者認証必須。既存プロフィール行があれば更新し、旧バグで生成された重複行を
 * 併せて削除する。無ければ新規作成する。DB エラーは無視し、常に暫定フォールバック
 * 値を更新して保存値を返す。※ 暫定実装のエンドポイント。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` と、本文の `weightKg`（数値、必須）を参照する
 * @returns 200: `{ weightKg }`。401/403: 認証・認可エラー。400: `weightKg` が数値でない
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  const body = await request.json().catch(() => null);
  const weightKg = typeof body?.weightKg === 'number' ? body.weightKg : null;

  if (weightKg === null) {
    return NextResponse.json({ error: 'weightKg is required' }, { status: 400 });
  }

  try {
    if (prisma) {
      const existing = await prisma.exerciseProfile.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await prisma.exerciseProfile.update({
          where: { id: existing.id },
          data: { weightKg },
        });
        // Clean up duplicate rows created by the old create-only bug
        await prisma.exerciseProfile.deleteMany({
          where: { id: { not: existing.id } },
        });
      } else {
        await prisma.exerciseProfile.create({ data: { weightKg } });
      }
    }
  } catch {
    // Ignore DB errors in the provisional profile endpoint.
  }
  fallbackWeightKg = weightKg;
  return NextResponse.json({ weightKg });
}
