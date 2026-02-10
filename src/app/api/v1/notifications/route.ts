import { withAuth, successResponse, paginatedResponse } from '@/lib/api-handler'
import { notificationRepository } from '@/repositories/notification.repository'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'

export const GET = withAuth(async (clerkId, request) => {
  const user = await userRepository.findByClerkId(clerkId)
  if (!user) {
    throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
  }

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const unreadOnly = url.searchParams.get('unread') === 'true'

  const result = await notificationRepository.getNotifications(user.id, {
    page,
    limit,
    unreadOnly,
  })
  return paginatedResponse(result.notifications, result.total, page, limit)
})

export const PATCH = withAuth(async (clerkId, request) => {
  const user = await userRepository.findByClerkId(clerkId)
  if (!user) {
    throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
  }

  const body = await request.json()

  if (body.action === 'markAllRead') {
    const count = await notificationRepository.markAllAsRead(user.id)
    return successResponse({ markedCount: count })
  }

  if (body.notificationId) {
    const notification = await notificationRepository.markAsRead(
      user.id,
      body.notificationId
    )
    return successResponse(notification)
  }

  throw new AppError('不明なアクション', 'INVALID_ACTION', 400)
})
