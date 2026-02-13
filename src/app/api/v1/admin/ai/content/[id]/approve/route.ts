import { withAdmin } from '@/lib/admin-handler'
import { successResponse } from '@/lib/api-handler'
import { aiService } from '@/services/ai.service'

export const PATCH = withAdmin(async (clerkId, request) => {
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const idIndex = segments.indexOf('content') + 1
  const contentId = segments[idIndex]

  if (!contentId) {
    const { AppError } = await import('@/lib/errors')
    throw new AppError('コンテンツIDが必要です', 'VALIDATION_ERROR', 400)
  }

  const approved = await aiService.approveContent(contentId, clerkId)

  return successResponse(approved)
})

export const DELETE = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const segments = url.pathname.split('/')
  const idIndex = segments.indexOf('content') + 1
  const contentId = segments[idIndex]

  if (!contentId) {
    const { AppError } = await import('@/lib/errors')
    throw new AppError('コンテンツIDが必要です', 'VALIDATION_ERROR', 400)
  }

  await aiService.rejectContent(contentId)

  return successResponse({ deleted: true })
})
