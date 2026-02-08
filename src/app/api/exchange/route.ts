import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const items = await prisma.exchangeItem.findMany({
    where: { isActive: true },
    orderBy: { requiredMiles: 'asc' },
  });

  return NextResponse.json({ success: true, data: items });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId, itemId } = body;

  if (!userId || !itemId) {
    return NextResponse.json(
      { success: false, error: 'userId and itemId are required' },
      { status: 400 }
    );
  }

  const item = await prisma.exchangeItem.findUnique({ where: { id: itemId } });
  if (!item || !item.isActive) {
    return NextResponse.json({ success: false, error: 'Item not available' }, { status: 404 });
  }

  if (item.stock !== null && item.stock <= 0) {
    return NextResponse.json({ success: false, error: 'Item out of stock' }, { status: 409 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totalMiles: true },
  });

  if (!user || user.totalMiles < item.requiredMiles) {
    return NextResponse.json({ success: false, error: 'Insufficient miles' }, { status: 400 });
  }

  const order = await prisma.$transaction(async (tx) => {
    const o = await tx.exchangeOrder.create({
      data: { userId, itemId, milesSpent: item.requiredMiles },
    });

    await tx.user.update({
      where: { id: userId },
      data: { totalMiles: { decrement: item.requiredMiles } },
    });

    await tx.mileTransaction.create({
      data: {
        userId,
        amount: item.requiredMiles,
        type: 'REDEEM',
        source: 'EXCHANGE',
        description: `Exchanged for: ${item.name}`,
      },
    });

    if (item.stock !== null) {
      await tx.exchangeItem.update({
        where: { id: itemId },
        data: { stock: { decrement: 1 } },
      });
    }

    return o;
  });

  return NextResponse.json({ success: true, data: order }, { status: 201 });
}
