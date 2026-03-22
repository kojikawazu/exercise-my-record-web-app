import { NextResponse } from 'next/server';
import { getPrisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/adminAuth';

let fallbackWeightKg: number | null = null;

export async function GET() {
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ weightKg: fallbackWeightKg });
  }
  try {
    const profile = await prisma.exerciseProfile.findFirst({
      orderBy: { createdAt: 'desc' },
    });
    if (typeof profile?.weightKg === 'number') {
      fallbackWeightKg = profile.weightKg;
    }
    return NextResponse.json({ weightKg: profile?.weightKg ?? fallbackWeightKg });
  } catch {
    return NextResponse.json({ weightKg: fallbackWeightKg });
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if (!auth.authorized) return auth.response;

  const prisma = getPrisma();
  const body = await request.json().catch(() => null);
  const weightKg = typeof body?.weightKg === 'number' ? body.weightKg : null;

  if (weightKg === null) {
    return NextResponse.json({ error: 'weightKg is required' }, { status: 400 });
  }

  try {
    if (prisma) {
      const existing = await prisma.exerciseProfile.findFirst({
        orderBy: { createdAt: 'desc' },
      });
      if (existing) {
        await prisma.exerciseProfile.update({
          where: { id: existing.id },
          data: { weightKg },
        });
        // Clean up duplicate rows created by the old create-only bug
        await prisma.exerciseProfile.deleteMany({
          where: { id: { not: existing.id } },
        });
      } else {
        await prisma.exerciseProfile.create({ data: { weightKg } });
      }
    }
  } catch {
    // Ignore DB errors in the provisional profile endpoint.
  }
  fallbackWeightKg = weightKg;
  return NextResponse.json({ weightKg });
}
