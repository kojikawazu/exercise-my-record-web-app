import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const PAGE_LIMIT = 10;

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

  const record = await prisma.exerciseRecord.create({
    data: {
      date,
      memo: body.memo ?? null,
      workouts: body.workouts?.length
        ? {
            create: body.workouts.map((workout: any) => ({
              part: workout.part,
              name: workout.name,
              sets: Number(workout.sets ?? 0),
              reps: Number(workout.reps ?? 0),
              weight: Number(workout.weight ?? 0),
            })),
          }
        : undefined,
      cardios: body.cardios?.length
        ? {
            create: body.cardios.map((c: any) => ({
              type: c.type,
              minutes: Number(c.minutes ?? 0),
              distance: Number(c.distance ?? 0),
            })),
          }
        : undefined,
    },
  });

  return NextResponse.json({ id: record.id });
}
