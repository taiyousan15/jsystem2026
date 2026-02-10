import { withAuth, successResponse, paginatedResponse } from '@/lib/api-handler'
import { exchangeService } from '@/services/exchange.service'
import { AppError } from '@/lib/errors'

export const GET = withAuth(async (clerkId, request) => {
  const url = new URL(request.url)
  const view = url.searchParams.get('view')
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))

  if (view === 'my') {
    const result = await exchangeService.getMyExchanges(clerkId, page, limit)
    return paginatedResponse(result.requests, result.total, page, limit)
  }

  const category = url.searchParams.get('category') ?? undefined
  const result = await exchangeService.getCatalog(page, limit, category)
  return paginatedResponse(result.items, result.total, page, limit)
})

export const POST = withAuth(async (clerkId, request) => {
  const body = await request.json()
  if (!body.catalogItemId) {
    throw new AppError('商品IDが必要です', 'VALIDATION_ERROR', 400)
  }
  const exchangeRequest = await exchangeService.requestExchange(
    clerkId,
    body.catalogItemId,
    body.shippingAddressId
  )
  return successResponse(exchangeRequest)
})
