import { prisma } from '@/lib/db'
import type { PointBalance, PointTransaction, MileRule, Prisma } from '@prisma/client'
import { TIER_THRESHOLDS } from '@/types/domain'

export const mileRepository = {
  async getBalance(userId: string): Promise<PointBalance | null> {
    return prisma.pointBalance.findUnique({ where: { userId } })
  },

  async getTransactions(
    userId: string,
    params: { page: number; limit: number; type?: string }
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const where = {
      userId,
      ...(params.type ? { type: params.type } : {}),
    }
    const [transactions, total] = await Promise.all([
      prisma.pointTransaction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.pointTransaction.count({ where }),
    ])
    return { transactions, total }
  },

  async earnMiles(
    userId: string,
    amount: number,
    source: string,
    metadata: Record<string, unknown> = {}
  ): Promise<PointTransaction> {
    const expiresAt = new Date()
    expiresAt.setMonth(expiresAt.getMonth() + 12)

    return prisma.$transaction(async (tx) => {
      const transaction = await tx.pointTransaction.create({
        data: {
          userId,
          amount,
          type: 'earn',
          source,
          metadata: metadata as Prisma.InputJsonValue,
          expiresAt,
        },
      })

      const balance = await tx.pointBalance.update({
        where: { userId },
        data: {
          totalMiles: { increment: amount },
          lifetimeMiles: { increment: amount },
        },
      })

      const newTier = calculateTier(balance.lifetimeMiles)
      if (newTier !== balance.tier) {
        await tx.pointBalance.update({
          where: { userId },
          data: { tier: newTier },
        })
      }

      return transaction
    })
  },

  async redeemMiles(
    userId: string,
    amount: number,
    source: string,
    metadata: Record<string, unknown> = {}
  ): Promise<PointTransaction> {
    return prisma.$transaction(async (tx) => {
      // Atomic check + deduction: WHERE totalMiles >= amount prevents TOCTOU race
      const result = await tx.pointBalance.updateMany({
        where: { userId, totalMiles: { gte: amount } },
        data: { totalMiles: { decrement: amount } },
      })

      if (result.count === 0) {
        const balance = await tx.pointBalance.findUnique({ where: { userId } })
        throw new Error(`Insufficient miles: have ${balance?.totalMiles ?? 0}, need ${amount}`)
      }

      return tx.pointTransaction.create({
        data: {
          userId,
          amount: -amount,
          type: 'redeem',
          source,
          metadata: metadata as Prisma.InputJsonValue,
        },
      })
    })
  },

  async getExpiringMiles(
    userId: string,
    withinDays: number = 30
  ): Promise<PointTransaction[]> {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + withinDays)

    return prisma.pointTransaction.findMany({
      where: {
        userId,
        type: 'earn',
        expiresAt: {
          lte: deadline,
          gt: new Date(),
        },
      },
      orderBy: { expiresAt: 'asc' },
    })
  },

  async getActiveRules(): Promise<MileRule[]> {
    return prisma.mileRule.findMany({
      where: { isActive: true },
      orderBy: { actionCode: 'asc' },
    })
  },

  async getRuleByActionCode(actionCode: string): Promise<MileRule | null> {
    return prisma.mileRule.findUnique({ where: { actionCode } })
  },

  async countTodayEarns(userId: string, actionCode: string): Promise<number> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    return prisma.pointTransaction.count({
      where: {
        userId,
        source: actionCode,
        type: 'earn',
        createdAt: { gte: today, lt: tomorrow },
      },
    })
  },
}

function calculateTier(lifetimeMiles: number): string {
  for (let i = TIER_THRESHOLDS.length - 1; i >= 0; i--) {
    if (lifetimeMiles >= TIER_THRESHOLDS[i].requiredMiles) {
      return TIER_THRESHOLDS[i].tier
    }
  }
  return 'bronze'
}
