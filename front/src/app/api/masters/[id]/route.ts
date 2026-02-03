import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';

type RouteContext = {
  params: { id: string };
};

export async function PATCH(request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const updated = await prisma.exerciseMaster.update({
      where: { id: context.params.id },
      data: { name },
    });
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'not found or duplicate' }, { status: 404 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  try {
    await prisma.exerciseMaster.delete({
      where: { id: context.params.id },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }
}
