import { withAdmin } from '@/lib/admin-handler'
import { paginatedResponse } from '@/lib/api-handler'
import { aiService } from '@/services/ai.service'
import { contentListQuerySchema } from '@/lib/validations/ai'
import { AppError } from '@/lib/errors'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const parsed = contentListQuerySchema.safeParse(
    Object.fromEntries(url.searchParams)
  )

  if (!parsed.success) {
    throw new AppError(
      parsed.error.errors[0]?.message ?? 'バリデーションエラー',
      'VALIDATION_ERROR',
      400
    )
  }

  const { type, approved, page, limit } = parsed.data
  const filters = {
    type,
    approved: approved === 'true' ? true : approved === 'false' ? false : undefined,
  }

  const { items, total } = await aiService.listGeneratedContent(filters, page, limit)

  return paginatedResponse(items, total, page, limit)
})
