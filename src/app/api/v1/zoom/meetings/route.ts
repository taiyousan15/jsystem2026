import { withAuth, paginatedResponse } from '@/lib/api-handler'
import { zoomService } from '@/services/zoom.service'

export const GET = withAuth(async (clerkId, request) => {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const { participations, total } = await zoomService.getUserParticipations(clerkId, page, limit)
  return paginatedResponse(participations, total, page, limit)
})
