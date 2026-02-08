import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const clerkId = searchParams.get('clerkId');

  if (!clerkId) {
    return NextResponse.json({ success: false, error: 'clerkId is required' }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId },
    include: {
      streaks: true,
      _count: {
        select: {
          badges: true,
          transactions: true,
          exchangeOrders: true,
        },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: user });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { clerkId, email, displayName, avatarUrl } = body;

  if (!clerkId || !email) {
    return NextResponse.json(
      { success: false, error: 'clerkId and email are required' },
      { status: 400 }
    );
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    create: { clerkId, email, displayName, avatarUrl },
    update: { email, displayName, avatarUrl },
  });

  return NextResponse.json({ success: true, data: user }, { status: 201 });
}
