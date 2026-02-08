import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  let streak = await prisma.streak.findUnique({ where: { userId } });

  if (!streak) {
    streak = await prisma.streak.create({
      data: { userId, currentStreak: 0, longestStreak: 0 },
    });
  }

  return NextResponse.json({ success: true, data: streak });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { userId } = body;

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const streak = await prisma.streak.upsert({
    where: { userId },
    create: {
      userId,
      currentStreak: 1,
      longestStreak: 1,
      lastLoginDate: today,
    },
    update: {},
  });

  if (streak.lastLoginDate) {
    const lastDate = new Date(streak.lastLoginDate);
    lastDate.setHours(0, 0, 0, 0);
    const diffDays = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return NextResponse.json({ success: true, data: streak, message: 'Already checked in today' });
    }

    const newStreak = diffDays === 1 ? streak.currentStreak + 1 : 1;
    const newLongest = Math.max(streak.longestStreak, newStreak);

    const updated = await prisma.streak.update({
      where: { userId },
      data: {
        currentStreak: newStreak,
        longestStreak: newLongest,
        lastLoginDate: today,
      },
    });

    return NextResponse.json({ success: true, data: updated });
  }

  const updated = await prisma.streak.update({
    where: { userId },
    data: { currentStreak: 1, longestStreak: 1, lastLoginDate: today },
  });

  return NextResponse.json({ success: true, data: updated });
}
