import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const balances = await prisma.pointBalance.findMany({
    select: { userId: true, totalMiles: true, lifetimeMiles: true },
  })

  const mismatches: Array<{
    userId: string
    recorded: number
    calculated: number
    diff: number
  }> = []

  for (const balance of balances) {
    const result = await prisma.pointTransaction.aggregate({
      where: { userId: balance.userId },
      _sum: { amount: true },
    })

    const calculatedTotal = result._sum.amount ?? 0

    if (calculatedTotal !== balance.totalMiles) {
      mismatches.push({
        userId: balance.userId,
        recorded: balance.totalMiles,
        calculated: calculatedTotal,
        diff: balance.totalMiles - calculatedTotal,
      })
    }
  }

  if (mismatches.length > 0) {
    console.error('[BALANCE INTEGRITY] Mismatches found:', JSON.stringify(mismatches))
  }

  return {
    processed: balances.length,
    details: mismatches.length === 0
      ? `All ${balances.length} balances are consistent`
      : `Found ${mismatches.length} mismatches out of ${balances.length} users`,
  }
})
