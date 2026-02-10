import { prisma } from '@/lib/db'
import type { Badge, UserBadge } from '@prisma/client'

export const badgeRepository = {
  async getUserBadges(userId: string): Promise<(UserBadge & { badge: Badge })[]> {
    return prisma.userBadge.findMany({
      where: { userId },
      include: { badge: true },
      orderBy: { earnedAt: 'desc' },
    })
  },

  async getAllBadges(): Promise<Badge[]> {
    return prisma.badge.findMany({
      where: { isActive: true },
      orderBy: [{ rarity: 'desc' }, { name: 'asc' }],
    })
  },

  async hasBadge(userId: string, badgeId: string): Promise<boolean> {
    const existing = await prisma.userBadge.findUnique({
      where: { userId_badgeId: { userId, badgeId } },
    })
    return existing !== null
  },

  async awardBadge(userId: string, badgeId: string): Promise<UserBadge> {
    return prisma.userBadge.create({
      data: { userId, badgeId },
    })
  },

  async getUserBadgeCount(userId: string): Promise<number> {
    return prisma.userBadge.count({ where: { userId } })
  },
}
