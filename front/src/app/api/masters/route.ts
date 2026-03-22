import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

const ALLOWED_TYPES = new Set(['body-parts', 'exercises', 'cardio-types']);

const isValidType = (value: string | null): value is string =>
  value !== null && ALLOWED_TYPES.has(value);

export async function GET(request: Request) {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const masters = await prisma.exerciseMaster.findMany({
    where: { type },
    orderBy: { name: 'asc' },
  });

  return NextResponse.json(masters);
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ error: 'database unavailable' }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  if (!isValidType(type)) {
    return NextResponse.json({ error: 'invalid type' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const master = await prisma.exerciseMaster.create({
      data: { type, name },
    });
    return NextResponse.json(master);
  } catch {
    return NextResponse.json({ error: 'duplicate' }, { status: 409 });
  }
}
