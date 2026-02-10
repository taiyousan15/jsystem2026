import { withAuth, successResponse } from '@/lib/api-handler'
import { badgeService } from '@/services/badge.service'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const view = url.searchParams.get('view')

  if (view === 'all') {
    const badges = await badgeService.getAllBadges()
    return successResponse(badges)
  }

  const userBadges = await badgeService.getUserBadges(clerkId)
  return successResponse(userBadges)
})
