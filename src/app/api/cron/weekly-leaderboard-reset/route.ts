import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)

  const weeklyEarners = await prisma.pointTransaction.groupBy({
    by: ['userId'],
    where: {
      type: 'earn',
      createdAt: { gte: oneWeekAgo },
    },
    _sum: { amount: true },
    orderBy: { _sum: { amount: 'desc' } },
    take: 10,
  })

  const topUsers = await Promise.all(
    weeklyEarners.map(async (entry, index) => {
      const user = await prisma.user.findUnique({
        where: { id: entry.userId },
        select: { displayName: true },
      })
      return {
        rank: index + 1,
        userId: entry.userId,
        displayName: user?.displayName ?? 'Unknown',
        weeklyMiles: entry._sum.amount ?? 0,
      }
    })
  )

  if (topUsers.length > 0 && topUsers[0].weeklyMiles > 0) {
    await prisma.notification.create({
      data: {
        userId: topUsers[0].userId,
        type: 'achievement',
        title: '週間ランキング1位おめでとうございます！',
        body: `今週${topUsers[0].weeklyMiles}マイルを獲得し、1位になりました。`,
        metadata: { weeklyRanking: topUsers },
      },
    })
  }

  return {
    processed: topUsers.length,
    details: `Weekly top ${topUsers.length} users calculated`,
  }
})
