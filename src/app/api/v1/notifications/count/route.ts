import { withAuth, successResponse } from '@/lib/api-handler'
import { notificationRepository } from '@/repositories/notification.repository'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'

export const GET = withAuth(async (clerkId) => {
  const user = await userRepository.findByClerkId(clerkId)
  if (!user) {
    throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
  }
  const count = await notificationRepository.getUnreadCount(user.id)
  return successResponse({ unreadCount: count })
})
