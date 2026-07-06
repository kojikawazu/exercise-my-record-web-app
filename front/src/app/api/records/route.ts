import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const PAGE_LIMIT = 10;

/**
 * 記録一覧を日付降順・ページング付きで取得する。
 *
 * 認証不要。1 ページ 10 件固定。クエリ `page` は 1 始まりで、未指定/NaN/0 以下は 1 に
 * 正規化し、総ページ数を超える値は最終ページに丸める。各記録は筋トレのセット数合計・
 * 有酸素の合計時間/距離と有酸素明細を集約して返す。
 *
 * @param request - リクエスト。クエリ `page`（取得ページ、任意）を参照する
 * @returns 200: `{ records, totalCount, page, totalPages }`。503: DB 接続不可
 */
export async function GET(request: Request) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const totalCount = await prisma.exerciseRecord.count();
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_LIMIT));

  let page = Math.floor(Number(searchParams.get('page') ?? 1));
  if (Number.isNaN(page) || page < 1) page = 1;
  if (page > totalPages) page = totalPages;

  const records = await prisma.exerciseRecord.findMany({
    orderBy: { date: 'desc' },
    include: { workouts: true, cardios: true },
    skip: (page - 1) * PAGE_LIMIT,
    take: PAGE_LIMIT,
  });

  const result = records.map(
    (record: {
      date: Date;
      workouts: { sets: number }[];
      cardios: { type: string; minutes: number; distance: number }[];
    }) => ({
    date: record.date.toISOString().slice(0, 10),
    totalSets: record.workouts.reduce((sum, workout) => sum + workout.sets, 0),
    cardioMinutes: record.cardios.reduce((sum, c) => sum + c.minutes, 0),
    cardioDistance: record.cardios.reduce((sum, c) => sum + c.distance, 0),
    cardios: record.cardios.map((c) => ({
      type: c.type,
      minutes: c.minutes,
      distance: c.distance,
    })),
  }),
  );

  return NextResponse.json({ records: result, totalCount, page, totalPages });
}

/**
 * 1 日 1 レコードの記録を新規作成する（管理者のみ）。
 *
 * 管理者認証必須。本文の `date` は必須。同日既存レコードがある場合は上書きせず 409。
 * 記録本体を作成後、本文の `workouts`/`cardios` を紐付けて作成する。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` と、本文の `date`（必須）・`memo`・`workouts`・`cardios` を参照する
 * @returns 200: `{ id }`（作成レコード ID）。401/403: 認証・認可エラー。400: `date` 欠落。409: 同日重複。500: 作成処理エラー。503: DB 接続不可
 */
export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const body = await request.json().catch(() => null);
  if (!body?.date) {
    return NextResponse.json({ error: 'date is required' }, { status: 400 });
  }

  const date = new Date(body.date);
  const existing = await prisma.exerciseRecord.findUnique({
    where: { date },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ error: 'duplicate date' }, { status: 409 });
  }

  try {
    const record = await prisma.exerciseRecord.create({
      data: {
        date,
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

    return NextResponse.json({ id: record.id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('POST /api/records error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
