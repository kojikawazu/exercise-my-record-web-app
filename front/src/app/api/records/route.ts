import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const records = await prisma.exerciseRecord.findMany({
    orderBy: { date: 'desc' },
    include: { workouts: true, cardios: true },
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

  return NextResponse.json(result);
}

export async function POST(request: Request) {
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
