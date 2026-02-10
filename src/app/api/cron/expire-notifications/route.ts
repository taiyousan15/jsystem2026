import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const result = await prisma.notification.deleteMany({
    where: {
      isRead: true,
      createdAt: { lt: thirtyDaysAgo },
    },
  })

  return {
    processed: result.count,
    details: `Deleted ${result.count} read notifications older than 30 days`,
  }
})
