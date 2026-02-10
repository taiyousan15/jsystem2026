import { withAuth, successResponse } from '@/lib/api-handler'
import { gamificationService } from '@/services/gamification.service'

export const GET = withAuth(async (clerkId) => {
  const missions = await gamificationService.getTodayMissions(clerkId)
  return successResponse(missions)
})
