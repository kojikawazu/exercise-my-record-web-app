import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { parseMonthParam, shiftMonth } from '@/lib/calendar';
import type { RecordCalendarResponse } from '@/types/record';

/**
 * 指定月に記録がある日の一覧を取得する（カレンダー画面用）。
 *
 * 認証不要。クエリ `month`（`YYYY-MM`）は必須。記録日は UTC の 0 時で保存しているため、
 * `[月初, 翌月初)` の半開区間を UTC で指定して取得する（月末日の計算をしない）。明細は読まず
 * 日付だけを取得し、昇順で返す。
 *
 * @param request - リクエスト。クエリ `month`（`YYYY-MM`、必須）を参照する
 * @returns 200: `{ month, dates }`。400: `month` 欠落・形式不正。503: DB 接続不可
 */
export async function GET(request: Request) {
  const month = parseMonthParam(new URL(request.url).searchParams.get('month'));
  if (!month) {
    return NextResponse.json({ error: 'invalid month' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const records = await prisma.exerciseRecord.findMany({
    where: {
      date: {
        gte: new Date(`${month}-01T00:00:00.000Z`),
        lt: new Date(`${shiftMonth(month, 1)}-01T00:00:00.000Z`),
      },
    },
    select: { date: true },
    orderBy: { date: 'asc' },
  });

  return NextResponse.json<RecordCalendarResponse>({
    month,
    dates: records.map((record: { date: Date }) => record.date.toISOString().slice(0, 10)),
  });
}
