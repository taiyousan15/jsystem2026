import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const result = await prisma.dailyMission.updateMany({
    where: {
      date: { lt: today },
      status: 'active',
    },
    data: { status: 'expired' },
  })

  return {
    processed: result.count,
    details: `Expired ${result.count} incomplete daily missions`,
  }
})
