import { withAuth, successResponse, paginatedResponse } from '@/lib/api-handler'
import { eventService } from '@/services/event.service'
import { AppError } from '@/lib/errors'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const view = url.searchParams.get('view')

  if (view === 'my') {
    const events = await eventService.getMyEvents(clerkId)
    return successResponse(events)
  }

  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const result = await eventService.getUpcomingEvents(page, limit)
  return paginatedResponse(result.events, result.total, page, limit)
})

export const POST = withAuth(async (clerkId, request) => {
  const body = await request.json()
  if (!body.eventId) {
    throw new AppError('イベントIDが必要です', 'VALIDATION_ERROR', 400)
  }

  if (body.action === 'cancel') {
    const result = await eventService.cancel(clerkId, body.eventId)
    return successResponse(result)
  }

  const result = await eventService.register(clerkId, body.eventId)
  return successResponse(result)
})
