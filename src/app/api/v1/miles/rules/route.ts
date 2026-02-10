import { withAuth, successResponse } from '@/lib/api-handler'
import { mileService } from '@/services/mile.service'

export const GET = withAuth(async () => {
  const rules = await mileService.getRules()
  return successResponse(rules)
})
