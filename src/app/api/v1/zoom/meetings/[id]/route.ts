import { withAuth, successResponse } from '@/lib/api-handler'
import { zoomService } from '@/services/zoom.service'

export const GET = withAuth(async (_clerkId, request) => {
  const url = new URL(request.url)
  const id = url.pathname.split('/').pop() ?? ''

  const meeting = await zoomService.getMeetingDetail(id)
  return successResponse(meeting)
})
