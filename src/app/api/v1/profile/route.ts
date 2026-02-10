import { withAuth, successResponse } from '@/lib/api-handler'
import { userRepository } from '@/repositories/user.repository'
import { updateProfileSchema } from '@/lib/validations/profile'
import { AppError } from '@/lib/errors'

export const GET = withAuth(async (clerkId) => {
  const user = await userRepository.findByClerkId(clerkId)
  if (!user) {
    throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
  }
  return successResponse({
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    bio: user.bio,
    avatarUrl: user.avatarUrl,
    role: user.role,
    createdAt: user.createdAt,
  })
})

export const PATCH = withAuth(async (clerkId, request) => {
  const user = await userRepository.findByClerkId(clerkId)
  if (!user) {
    throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
  }

  const body = await request.json()
  const parsed = updateProfileSchema.safeParse(body)
  if (!parsed.success) {
    throw new AppError(
      parsed.error.errors[0]?.message ?? 'バリデーションエラー',
      'VALIDATION_ERROR',
      400
    )
  }

  const updated = await userRepository.updateProfile(user.id, parsed.data)
  return successResponse(updated)
})
