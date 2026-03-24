import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

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
    include: { workouts: true, cardios: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  return NextResponse.json({
    date: record.date.toISOString().slice(0, 10),
    memo: record.memo,
    workouts: record.workouts.map(
      (workout: {
        id: string;
        part: string;
        name: string;
        sets: number;
        reps: number;
        weight: number;
      }) => ({
      id: workout.id,
      part: workout.part,
      name: workout.name,
      sets: workout.sets,
      reps: workout.reps,
      weight: workout.weight,
    }),
    ),
    cardios: record.cardios.map(
      (c: { type: string; minutes: number; distance: number }) => ({
        type: c.type,
        minutes: c.minutes,
        distance: c.distance,
      }),
    ),
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

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
    include: { cardios: true },
  });

  if (!record) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  try {
    console.log('[PATCH] step1: deleteMany workouts/cardios');
    await prisma.exerciseWorkout.deleteMany({ where: { recordId: record.id } });
    await prisma.exerciseCardio.deleteMany({ where: { recordId: record.id } });

    console.log('[PATCH] step2: update record memo');
    const updated = await prisma.exerciseRecord.update({
      where: { id: record.id },
      data: {
        memo: body.memo ?? null,
      },
    });

    if (body.workouts?.length) {
      console.log('[PATCH] step3: create workouts count=' + body.workouts.length);
      for (let i = 0; i < body.workouts.length; i++) {
        const w = body.workouts[i];
        console.log('[PATCH] workout ' + i + ':', JSON.stringify(w));
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
      console.log('[PATCH] step4: create cardios count=' + body.cardios.length);
      for (let i = 0; i < body.cardios.length; i++) {
        const c = body.cardios[i];
        console.log('[PATCH] cardio ' + i + ':', JSON.stringify(c));
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

    console.log('[PATCH] done');
    return NextResponse.json({ id: updated.id });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : String(error);
    console.error('[PATCH] ERROR:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

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
