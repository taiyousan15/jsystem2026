import { withAdmin } from '@/lib/admin-handler'
import { successResponse } from '@/lib/api-handler'
import { aiService } from '@/services/ai.service'
import { generateEventDescriptionSchema } from '@/lib/validations/ai'
import { AppError } from '@/lib/errors'

export const POST = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const parsed = generateEventDescriptionSchema.safeParse(body)

  if (!parsed.success) {
    throw new AppError(
      parsed.error.errors[0]?.message ?? 'バリデーションエラー',
      'VALIDATION_ERROR',
      400
    )
  }

  const result = await aiService.generateEventDescription(clerkId, parsed.data)

  return successResponse(result, 201)
})
