import { withAdmin } from '@/lib/admin-handler'
import { successResponse, paginatedResponse } from '@/lib/api-handler'
import { userRepository } from '@/repositories/user.repository'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const role = url.searchParams.get('role') ?? undefined

  const result = await userRepository.findMany({ page, limit, role })
  return paginatedResponse(result.users, result.total, page, limit)
})

export const PATCH = withAdmin(async (_clerkId, request) => {
  const body = await request.json()
  if (!body.userId) {
    return successResponse({ error: 'ユーザーIDが必要です' }, 400)
  }
  const updated = await userRepository.updateProfile(body.userId, {
    displayName: body.displayName,
    bio: body.bio,
  })
  return successResponse(updated)
})
