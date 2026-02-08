import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const offset = parseInt(searchParams.get('offset') ?? '0', 10);

  const users = await prisma.user.findMany({
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      tier: true,
      lifetimeMiles: true,
      _count: { select: { badges: true } },
    },
    orderBy: { lifetimeMiles: 'desc' },
    take: limit,
    skip: offset,
  });

  const total = await prisma.user.count();

  const data = users.map((user, index) => ({
    rank: offset + index + 1,
    ...user,
    badgeCount: user._count.badges,
  }));

  return NextResponse.json({
    success: true,
    data,
    meta: { total, limit, offset },
  });
}
