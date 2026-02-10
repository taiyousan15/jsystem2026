import { withAuth, successResponse } from '@/lib/api-handler'
import { gamificationService } from '@/services/gamification.service'

export const GET = withAuth(async (clerkId) => {
  const streak = await gamificationService.getStreak(clerkId)
  return successResponse(streak)
})

export const POST = withAuth(async (clerkId, request) => {
  const body = await request.json()

  if (body.action === 'freeze') {
    const streak = await gamificationService.freezeStreak(clerkId)
    return successResponse(streak)
  }

  return successResponse({ error: '不明なアクション' }, 400)
})
