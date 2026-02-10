import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const now = new Date()

  const expiredTransactions = await prisma.pointTransaction.findMany({
    where: {
      type: 'earn',
      expiresAt: { lte: now },
      amount: { gt: 0 },
    },
    select: { id: true, userId: true, amount: true },
  })

  if (expiredTransactions.length === 0) {
    return { processed: 0, details: 'No expired miles found' }
  }

  const userTotals = new Map<string, number>()
  const txIds: string[] = []

  for (const tx of expiredTransactions) {
    userTotals.set(tx.userId, (userTotals.get(tx.userId) ?? 0) + tx.amount)
    txIds.push(tx.id)
  }

  await prisma.$transaction(async (tx) => {
    await tx.pointTransaction.updateMany({
      where: { id: { in: txIds } },
      data: { type: 'expire', amount: 0 },
    })

    for (const [userId, totalExpired] of userTotals) {
      await tx.pointBalance.update({
        where: { userId },
        data: { totalMiles: { decrement: totalExpired } },
      })

      await tx.pointTransaction.create({
        data: {
          userId,
          amount: -totalExpired,
          type: 'expire',
          source: 'system_expiry',
          metadata: { expiredCount: expiredTransactions.filter(t => t.userId === userId).length },
        },
      })
    }
  })

  return {
    processed: expiredTransactions.length,
    details: `Expired miles for ${userTotals.size} users`,
  }
})
