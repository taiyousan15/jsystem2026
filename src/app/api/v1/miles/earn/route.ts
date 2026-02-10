import { withAuth, successResponse, handleError } from '@/lib/api-handler'
import { mileService } from '@/services/mile.service'
import { earnMilesSchema } from '@/lib/validations/mile'
import { AppError } from '@/lib/errors'

export const POST = withAuth(async (clerkId, request) => {
  const body = await request.json()
  const parsed = earnMilesSchema.safeParse(body)

  if (!parsed.success) {
    throw new AppError(
      parsed.error.errors[0]?.message ?? 'バリデーションエラー',
      'VALIDATION_ERROR',
      400
    )
  }

  const result = await mileService.earnMiles(
    clerkId,
    parsed.data.actionCode,
    parsed.data.metadata ?? {}
  )

  return successResponse({
    transaction: result.transaction,
    newBalance: result.newBalance,
    tierChanged: result.tierChanged,
    newTier: result.newTier,
  })
})
