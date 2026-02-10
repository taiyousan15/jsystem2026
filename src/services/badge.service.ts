import { badgeRepository } from '@/repositories/badge.repository'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'
import type { Badge, UserBadge } from '@prisma/client'

export const badgeService = {
  async getUserBadges(
    clerkId: string
  ): Promise<(UserBadge & { badge: Badge })[]> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }
    return badgeRepository.getUserBadges(user.id)
  },

  async getAllBadges(): Promise<Badge[]> {
    return badgeRepository.getAllBadges()
  },

  async checkAndAwardBadge(
    userId: string,
    badgeId: string
  ): Promise<UserBadge | null> {
    const alreadyHas = await badgeRepository.hasBadge(userId, badgeId)
    if (alreadyHas) return null
    return badgeRepository.awardBadge(userId, badgeId)
  },
}
