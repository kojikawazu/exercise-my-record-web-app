import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { parseIsoDate } from '@/lib/date';
import type { WeightHistoryPoint, WeightHistoryResponse } from '@/types/profile';

/**
 * 推移グラフ用に、期間内の体重の履歴を日付昇順で取得する。
 *
 * 認証不要。クエリ `from`（`YYYY-MM-DD`、任意）以降（当日を含む）の履歴を返し、省略時は全期間。
 * 起点日は推移 API（`/api/records/trends`）と同じくブラウザのローカル日付で決めて渡す。
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

  const logs = await prisma.exerciseWeightLog.findMany({
    // 記録日は UTC の 0 時で保存しているため、起点日も UTC の 0 時で比較する
    where: from ? { date: { gte: new Date(`${from}T00:00:00.000Z`) } } : {},
    select: { date: true, weightKg: true },
    orderBy: { date: 'asc' },
  });

  const points: WeightHistoryPoint[] = logs.map((log: { date: Date; weightKg: number }) => ({
    date: log.date.toISOString().slice(0, 10),
    weightKg: log.weightKg,
  }));

  return NextResponse.json<WeightHistoryResponse>({ points });
}
