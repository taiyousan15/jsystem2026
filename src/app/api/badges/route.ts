import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('userId');

  if (userId) {
    const badges = await prisma.badge.findMany({
      where: { isActive: true },
      include: { userBadges: { where: { userId } } },
      orderBy: { createdAt: 'desc' },
    });

    const data = badges.map((badge) => ({
      ...badge,
      earned: badge.userBadges.length > 0,
      earnedAt: badge.userBadges.length > 0 ? badge.userBadges[0].earnedAt : null,
    }));

    return NextResponse.json({ success: true, data });
  }

  const badges = await prisma.badge.findMany({
    where: { isActive: true },
    orderBy: { createdAt: 'desc' },
  });

  const data = badges.map((badge) => ({
    ...badge,
    earned: false,
    earnedAt: null,
  }));

  return NextResponse.json({ success: true, data });
}
