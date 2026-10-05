import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { parseIsoDate } from '@/lib/trends';
import type { RecordTrendPoint, RecordTrendsResponse } from '@/types/record';

/**
 * 推移グラフ用に、期間内の記録を日付昇順で取得する。
 *
 * 認証不要。クエリ `from`（`YYYY-MM-DD`、任意）以降（当日を含む）の記録を返し、省略時は全期間。
 * 「今日」と期間の起点はブラウザのローカル日付で決めて `from` で渡す（サーバーの UTC で決めると
 * 日付がずれるため）。セット数・有酸素距離は日ごとに集約し、推定カロリーの算定に使う有酸素の
 * 種別と時間だけを明細で返す（カロリー自体はプロフィールの体重を持つクライアントで算定する）。
 *
 * @param request - リクエスト。クエリ `from`（起点日、任意）を参照する
 * @returns 200: `{ points }`。400: `from` が不正な日付。503: DB 接続不可
 */
export async function GET(request: Request) {
  const fromParam = new URL(request.url).searchParams.get('from');
  const from = fromParam === null ? null : parseIsoDate(fromParam);
  if (fromParam !== null && from === null) {
    return NextResponse.json({ error: 'invalid from' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const records = await prisma.exerciseRecord.findMany({
    // 記録日は UTC の 0 時で保存しているため、起点日も UTC の 0 時で比較する
    where: from ? { date: { gte: new Date(`${from}T00:00:00.000Z`) } } : {},
    select: {
      date: true,
      workouts: { select: { sets: true } },
      cardios: { select: { type: true, minutes: true, distance: true } },
    },
    orderBy: { date: 'asc' },
  });

  const points: RecordTrendPoint[] = records.map(
    (record: {
      date: Date;
      workouts: { sets: number }[];
      cardios: { type: string; minutes: number; distance: number }[];
    }) => ({
      date: record.date.toISOString().slice(0, 10),
      totalSets: record.workouts.reduce((sum, w) => sum + w.sets, 0),
      cardioDistance: record.cardios.reduce((sum, c) => sum + c.distance, 0),
      cardios: record.cardios.map((c) => ({ type: c.type, minutes: c.minutes })),
    }),
  );

  return NextResponse.json<RecordTrendsResponse>({ points });
}
