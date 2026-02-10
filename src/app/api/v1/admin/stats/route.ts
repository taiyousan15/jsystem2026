import { withAdmin } from '@/lib/admin-handler'
import { successResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'

export const GET = withAdmin(async (_clerkId, _request) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [
    totalUsers,
    activeToday,
    totalMilesIssued,
    pendingExchanges,
    upcomingEvents,
    tierDistribution,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.pointTransaction.groupBy({
      by: ['userId'],
      where: { createdAt: { gte: today } },
    }).then((r) => r.length),
    prisma.pointTransaction.aggregate({
      where: { type: 'earn' },
      _sum: { amount: true },
    }).then((r) => r._sum.amount ?? 0),
    prisma.exchangeRequest.count({
      where: { status: 'pending' },
    }),
    prisma.event.count({
      where: { status: 'upcoming', startAt: { gte: new Date() } },
    }),
    prisma.pointBalance.groupBy({
      by: ['tier'],
      _count: true,
    }),
  ])

  return successResponse({
    totalUsers,
    activeToday,
    totalMilesIssued,
    pendingExchanges,
    upcomingEvents,
    tierDistribution: tierDistribution.map((t) => ({
      tier: t.tier,
      count: t._count,
    })),
  })
})
