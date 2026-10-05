import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { parseIsoDate } from '@/lib/date';
import { computeStreak } from '@/lib/streak';
import type { RecordStreakResponse } from '@/types/record';

/**
 * 今日を起点とした連続記録日数（ストリーク）を返す（トップページのサマリー用）。
 *
 * 認証不要。クエリ `today`（`YYYY-MM-DD`、必須）はブラウザのローカル日付（サーバーの UTC で
 * 決めると日付がずれるため）。連続は月をまたいで遡るため、今日以前の記録日を日付だけ取得して
 * サーバーで数える（明細は読まない）。判定は {@link computeStreak} に従う。
 *
 * @param request - リクエスト。クエリ `today`（今日、必須）を参照する
 * @returns 200: `{ days, from, to, recordedToday }`。400: `today` の欠落・不正。503: DB 接続不可
 */
export async function GET(request: Request) {
  const today = parseIsoDate(new URL(request.url).searchParams.get('today'));
  if (!today) {
    return NextResponse.json({ error: 'invalid today' }, { status: 400 });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const records = await prisma.exerciseRecord.findMany({
    // 記録日は UTC の 0 時で保存しているため、今日も UTC の 0 時で比較する
    where: { date: { lte: new Date(`${today}T00:00:00.000Z`) } },
    select: { date: true },
    orderBy: { date: 'desc' },
  });

  return NextResponse.json<RecordStreakResponse>(
    computeStreak(
      records.map((record: { date: Date }) => record.date.toISOString().slice(0, 10)),
      today,
    ),
  );
}
