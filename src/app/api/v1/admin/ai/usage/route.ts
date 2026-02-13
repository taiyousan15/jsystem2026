import { withAdmin, } from '@/lib/admin-handler'
import { successResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'

export const GET = withAdmin(async () => {
  const [totalConversations, totalMessages, recentActivity] = await Promise.all([
    prisma.aiConversation.count(),
    prisma.aiMessage.count(),
    prisma.aiMessage.findMany({
      take: 100,
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        tokens: true,
        model: true,
      },
    }),
  ])

  const totalTokens = recentActivity.reduce((sum, msg) => sum + (msg.tokens ?? 0), 0)

  return successResponse({
    totalConversations,
    totalMessages,
    totalTokens,
    recentActivity,
  })
})
