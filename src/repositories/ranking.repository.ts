import { prisma } from '@/lib/db'
import type { LeaderboardEntry } from '@/types/api'

export const rankingRepository = {
  async getLeaderboard(limit: number = 20): Promise<LeaderboardEntry[]> {
    const balances = await prisma.pointBalance.findMany({
      take: limit,
      orderBy: { lifetimeMiles: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            displayName: true,
            avatarUrl: true,
          },
        },
      },
    })

    return balances.map((b, index) => ({
      rank: index + 1,
      userId: b.user.id,
      displayName: b.user.displayName,
      avatarUrl: b.user.avatarUrl,
      lifetimeMiles: b.lifetimeMiles,
      tier: b.tier,
    }))
  },

  async getUserRank(userId: string): Promise<number> {
    const userBalance = await prisma.pointBalance.findUnique({
      where: { userId },
    })
    if (!userBalance) return 0

    const higherCount = await prisma.pointBalance.count({
      where: { lifetimeMiles: { gt: userBalance.lifetimeMiles } },
    })

    return higherCount + 1
  },
}
