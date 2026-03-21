import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

const formatDate = (date: Date) => date.toISOString().slice(0, 10);

const escapeCsv = (value: string) => {
  if (value.includes('"') || value.includes(',') || value.includes('\n')) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
};

const buildCsv = (records: any[]) => {
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
    const cardiosList: any[] = record.cardios ?? [];
    const workoutsList: any[] = record.workouts ?? [];
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

export async function GET(request: Request) {
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
