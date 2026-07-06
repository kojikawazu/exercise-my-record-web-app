import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

/** 記録の詳細取得・編集・削除ハンドラーのルートコンテキスト。`params` に対象日付（`YYYY-MM-DD`）を含む。 */
type RouteContext = {
  params: Promise<{ date: string }>;
};

/**
 * 指定日付の記録詳細（メモ・筋トレ・有酸素）を取得する。
 *
 * 認証不要。パスパラメータ `date` の記録を、筋トレ（`workouts`）と有酸素（`cardios`）を
 * 含めて返す。該当日の記録が存在しない場合は 404。
 *
 * @param _request - リクエスト（本ハンドラーでは未使用）
 * @param context - ルートコンテキスト。`params` から対象日付を取り出す
 * @returns 200: `date`/`memo`/`workouts`/`cardios` を持つ詳細。404: 対象日付の記録なし。503: DB 接続不可
 */
export async function GET(_request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    include: { workouts: true, cardios: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    date: record.date.toISOString().slice(0, 10),
    memo: record.memo,
    workouts: record.workouts.map(
      (workout: {
        id: string;
        part: string;
        name: string;
        sets: number;
        reps: number;
        weight: number;
      }) => ({
      id: workout.id,
      part: workout.part,
      name: workout.name,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
    }),
    ),
    cardios: record.cardios.map(
      (c: { type: string; minutes: number; distance: number }) => ({
        type: c.type,
        minutes: c.minutes,
        distance: c.distance,
      }),
    ),
  });
}

/**
 * 指定日付の記録を編集する（管理者のみ）。
 *
 * 管理者認証必須。既存の筋トレ・有酸素を一旦全削除し、メモを更新したうえで本文の
 * `workouts`/`cardios` を作り直す（全置換）。対象日付の記録が無ければ 404、本文が
 * 不正 JSON なら 400 を返す。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` と、本文の `memo`・`workouts`・`cardios` を参照する
 * @param context - ルートコンテキスト。`params` から対象日付を取り出す
 * @returns 200: `{ id }`（更新後レコード ID）。401/403: 認証・認可エラー。400: 不正な本文。404: 対象日付の記録なし。500: 更新処理エラー。503: DB 接続不可
 */
export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    include: { cardios: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    await prisma.exerciseWorkout.deleteMany({ where: { recordId: record.id } });
    await prisma.exerciseCardio.deleteMany({ where: { recordId: record.id } });

    const updated = await prisma.exerciseRecord.update({
      where: { id: record.id },
      data: {
        memo: body.memo ?? null,
      },
    });

    if (body.workouts?.length) {
      for (let i = 0; i < body.workouts.length; i++) {
        const w = body.workouts[i];
        await prisma.exerciseWorkout.create({
          data: {
            recordId: record.id,
            part: String(w.part ?? ''),
            name: String(w.name ?? ''),
            sets: Number(w.sets ?? 0),
            reps: Number(w.reps ?? 0),
            weight: Number(w.weight ?? 0),
          },
        });
      }
    }

    if (body.cardios?.length) {
      for (let i = 0; i < body.cardios.length; i++) {
        const c = body.cardios[i];
        await prisma.exerciseCardio.create({
          data: {
            recordId: record.id,
            type: String(c.type ?? ''),
            minutes: Number(c.minutes ?? 0),
            distance: Number(c.distance ?? 0),
          },
        });
      }
    }

    return NextResponse.json({ id: updated.id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('PATCH /api/records/:date error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * 指定日付の記録を関連データごと削除する（管理者のみ）。
 *
 * 管理者認証必須。パスパラメータ `date` の記録に紐づく筋トレ・有酸素を削除してから
 * レコード本体を削除する。対象日付の記録が無ければ 404。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` を参照する
 * @param context - ルートコンテキスト。`params` から対象日付を取り出す
 * @returns 200: `{ ok: true }`。401/403: 認証・認可エラー。404: 対象日付の記録なし。503: DB 接続不可
 */
export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    select: { id: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await prisma.exerciseWorkout.deleteMany({ where: { recordId: record.id } });
  await prisma.exerciseCardio.deleteMany({ where: { recordId: record.id } });
  await prisma.exerciseRecord.delete({ where: { id: record.id } });

  return NextResponse.json({ ok: true });
}
