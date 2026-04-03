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
