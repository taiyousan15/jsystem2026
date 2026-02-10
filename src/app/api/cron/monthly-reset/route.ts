import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const result = await prisma.userStreak.updateMany({
    data: { freezeRemaining: 2 },
  })

  const expiredReferrals = await prisma.referral.updateMany({
    where: {
      status: 'pending',
      createdAt: {
        lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      },
    },
    data: { status: 'expired' },
  })

  return {
    processed: result.count + expiredReferrals.count,
    details: `Reset freeze for ${result.count} users, expired ${expiredReferrals.count} referrals`,
  }
})
