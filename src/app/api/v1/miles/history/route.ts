import { withAuth, paginatedResponse } from '@/lib/api-handler'
import { mileService } from '@/services/mile.service'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const type = url.searchParams.get('type') ?? undefined

  const result = await mileService.getHistory(clerkId, { page, limit, type })
  return paginatedResponse(result.transactions, result.total, page, limit)
})
