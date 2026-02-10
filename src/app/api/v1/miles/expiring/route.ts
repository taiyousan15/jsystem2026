import { withAuth, successResponse } from '@/lib/api-handler'
import { mileService } from '@/services/mile.service'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const withinDays = Math.min(90, Math.max(1, Number(url.searchParams.get('days') ?? '30')))

  const transactions = await mileService.getExpiringMiles(clerkId, withinDays)
  return successResponse(transactions)
})
