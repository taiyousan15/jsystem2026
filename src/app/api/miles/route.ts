import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const transactions = await prisma.mileTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalMiles: true, lifetimeMiles: true, tier: true },
  });

  return NextResponse.json({
    success: true,
    data: { transactions, summary: user },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, amount, type, source, description, idempotencyKey } = body;

  if (!userId || !amount || !type || !source) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields' },
      { status: 400 }
    );
  }

  if (idempotencyKey) {
    const existing = await prisma.mileTransaction.findUnique({
      where: { idempotencyKey },
    });
    if (existing) {
      return NextResponse.json({ success: true, data: existing });
    }
  }

  const transaction = await prisma.$transaction(async (tx) => {
    const t = await tx.mileTransaction.create({
      data: { userId, amount, type, source, description, idempotencyKey },
    });

    const updateData = type === 'EARN'
      ? { totalMiles: { increment: amount }, lifetimeMiles: { increment: amount } }
      : type === 'REDEEM'
      ? { totalMiles: { decrement: amount } }
      : { totalMiles: { increment: amount } };

    await tx.user.update({
      where: { id: userId },
      data: updateData,
    });

    return t;
  });

  return NextResponse.json({ success: true, data: transaction }, { status: 201 });
}
