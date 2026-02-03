import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

type RouteContext = {
  params: Promise<{ date: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    include: { workouts: true, cardio: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    date: record.date.toISOString().slice(0, 10),
    memo: record.memo,
    workouts: record.workouts.map((workout) => ({
      part: workout.part,
      name: workout.name,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
    })),
    cardio: record.cardio
      ? {
          type: record.cardio.type,
          minutes: record.cardio.minutes,
          distance: record.cardio.distance,
        }
      : null,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'invalid body' }, { status: 400 });
  }

  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    include: { cardio: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await prisma.exerciseWorkout.deleteMany({ where: { recordId: record.id } });
  if (record.cardio) {
    await prisma.exerciseCardio.delete({ where: { recordId: record.id } });
  }

  const updated = await prisma.exerciseRecord.update({
    where: { id: record.id },
    data: {
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
      cardio: body.cardio
        ? {
            create: {
              type: body.cardio.type,
              minutes: Number(body.cardio.minutes ?? 0),
              distance: Number(body.cardio.distance ?? 0),
            },
          }
        : undefined,
    },
  });

  return NextResponse.json({ id: updated.id });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }
  const { date } = await context.params;
  const recordDate = new Date(date);
  const record = await prisma.exerciseRecord.findUnique({
    where: { date: recordDate },
    select: { id: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  await prisma.exerciseWorkout.deleteMany({ where: { recordId: record.id } });
  await prisma.exerciseCardio.deleteMany({ where: { recordId: record.id } });
  await prisma.exerciseRecord.delete({ where: { id: record.id } });

  return NextResponse.json({ ok: true });
}
