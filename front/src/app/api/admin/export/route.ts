import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const escapeCsv = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
};

/** CSV/JSON 出力に必要な筋トレ行の最小形（Prisma 取得結果と構造的に互換）。 */
type ExportWorkout = { part: string; name: string; sets: number; reps: number; weight: number };
/** CSV/JSON 出力に必要な有酸素行の最小形（Prisma 取得結果と構造的に互換）。 */
type ExportCardio = { type: string; minutes: number; distance: number };
/** CSV/JSON 出力に必要な 1 レコードの最小形（Prisma 取得結果と構造的に互換）。 */
type ExportRecord = {
  date: Date;
  memo: string | null;
  workouts: ExportWorkout[];
  cardios: ExportCardio[];
};

const buildCsv = (records: ExportRecord[]) => {
  const header = [
    'date',
    'memo',
    'workout_part',
    'workout_name',
    'workout_sets',
    'workout_reps',
    'workout_weight',
    'cardio_type',
    'cardio_minutes',
    'cardio_distance',
  ];
  const rows = [header.join(',')];

  records.forEach((record) => {
    const cardiosList: ExportCardio[] = record.cardios ?? [];
    const workoutsList: ExportWorkout[] = record.workouts ?? [];
    const maxLen = Math.max(workoutsList.length, cardiosList.length, 1);

    for (let i = 0; i < maxLen; i++) {
      const workout = workoutsList[i];
      const cardio = cardiosList[i];
      rows.push(
        [
          formatDate(record.date),
          record.memo ?? '',
          workout?.part ?? '',
          workout?.name ?? '',
          workout?.sets ?? '',
          workout?.reps ?? '',
          workout?.weight ?? '',
          cardio?.type ?? '',
          cardio?.minutes ?? '',
          cardio?.distance ?? '',
        ]
          .map((value) => escapeCsv(String(value)))
          .join(','),
      );
    }
  });

  return rows.join('\n');
};

/**
 * 指定期間の記録データを CSV または JSON で書き出す（管理者のみ）。
 *
 * 管理者認証必須。`from`/`to`（`YYYY-MM-DD`）で日付範囲を絞り、`format` に応じて
 * CSV（`Content-Disposition` 付きの添付ファイル）または JSON 配列を返す。
 * 筋トレ・有酸素は 1 レコード内で行を横並びに展開し、多い方の件数分の CSV 行を出力する。
 * ※ Issue #20 で削除予定のエンドポイント。
 *
 * @param request - リクエスト。`Authorization: Bearer <token>` と、クエリ `from`・`to`（必須）・`format`（`csv`|`json`、既定 `csv`）を参照する
 * @returns 200: CSV テキストまたは JSON 配列。401/403: 認証・認可エラー。400: `from`/`to` 欠落または `format` 不正。503: DB 接続不可
 */
export async function GET(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const format = searchParams.get('format') ?? 'csv';

  if (!from || !to) {
    return NextResponse.json({ error: 'from/to required' }, { status: 400 });
  }

  if (!['csv', 'json'].includes(format)) {
    return NextResponse.json({ error: 'invalid format' }, { status: 400 });
  }

  const records = await prisma.exerciseRecord.findMany({
    where: {
      date: {
        gte: new Date(from),
        lte: new Date(to),
      },
    },
    include: { workouts: true, cardios: true },
    orderBy: { date: 'asc' },
  });

  if (format === 'json') {
    return NextResponse.json(records);
  }

  const csv = buildCsv(records);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename=\"records_${from}_${to}.csv\"`,
    },
  });
}
