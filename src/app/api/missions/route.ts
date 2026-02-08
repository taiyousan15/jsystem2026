import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ success: false, error: 'userId is required' }, { status: 400 });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const missions = await prisma.mission.findMany({
    where: { isActive: true },
    include: {
      progress: {
        where: { userId, assignedDate: today },
      },
    },
  });

  const data = missions.map((mission) => {
    const prog = mission.progress[0];
    return {
      id: mission.id,
      title: mission.title,
      description: mission.description,
      targetCount: mission.targetCount,
      rewardMiles: mission.rewardMiles,
      currentCount: prog?.currentCount ?? 0,
      completed: prog?.completed ?? false,
      completedAt: prog?.completedAt ?? null,
    };
  });

  return NextResponse.json({ success: true, data });
}
