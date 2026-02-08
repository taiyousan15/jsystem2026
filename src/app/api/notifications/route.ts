import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');
  const unreadOnly = searchParams.get('unreadOnly') === 'true';

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const where = unreadOnly
    ? { userId, isRead: false }
    : { userId };

  const notifications = await prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId, isRead: false },
  });

  return NextResponse.json({
    success: true,
    data: { notifications, unreadCount },
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json();
  const { notificationIds, userId } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  if (notificationIds && Array.isArray(notificationIds)) {
    await prisma.notification.updateMany({
      where: { id: { in: notificationIds }, userId },
      data: { isRead: true },
    });
  } else {
    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
