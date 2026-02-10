import { withCron } from '@/lib/cron-handler'
import { prisma } from '@/lib/db'

export const GET = withCron(async () => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const atRiskUsers = await prisma.userStreak.findMany({
    where: {
      currentStreak: { gte: 3 },
      lastActiveDate: yesterday,
    },
    include: {
      user: {
        include: {
          notificationSettings: true,
        },
      },
    },
  })

  const eligibleUsers = atRiskUsers.filter(
    (s) => s.user.notificationSettings?.streakReminder !== false
  )

  if (eligibleUsers.length === 0) {
    return { processed: 0, details: 'No at-risk streaks found' }
  }

  await prisma.notification.createMany({
    data: eligibleUsers.map((s) => ({
      userId: s.userId,
      type: 'streak_reminder',
      title: 'ストリーク継続のお知らせ',
      body: `${s.currentStreak}日連続のストリークが途切れそうです！今日中にログインして維持しましょう。`,
      metadata: { currentStreak: s.currentStreak },
    })),
  })

  return {
    processed: eligibleUsers.length,
    details: `Sent streak reminders to ${eligibleUsers.length} users`,
  }
})
