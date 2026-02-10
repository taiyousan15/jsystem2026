import { withAuth, successResponse } from '@/lib/api-handler'
import { rankingRepository } from '@/repositories/ranking.repository'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))

  const leaderboard = await rankingRepository.getLeaderboard(limit)
  return successResponse(leaderboard)
})
