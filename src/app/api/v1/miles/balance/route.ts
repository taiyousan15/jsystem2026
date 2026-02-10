import { withAuth, successResponse } from '@/lib/api-handler'
import { mileService } from '@/services/mile.service'

export const GET = withAuth(async (clerkId) => {
  const balance = await mileService.getBalance(clerkId)
  return successResponse({
    totalMiles: balance.totalMiles,
    lifetimeMiles: balance.lifetimeMiles,
    tier: balance.tier,
  })
})
