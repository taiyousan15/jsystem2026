import { prisma } from '@/lib/db'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'
import type { UserStreak, DailyMission } from '@prisma/client'

export const gamificationService = {
  async getStreak(clerkId: string): Promise<UserStreak> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const streak = await prisma.userStreak.findUnique({
      where: { userId: user.id },
    })

    if (!streak) {
      return prisma.userStreak.create({
        data: { userId: user.id },
      })
    }

    return streak
  },

  async updateStreak(userId: string): Promise<UserStreak> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const streak = await prisma.userStreak.findUnique({
      where: { userId },
    })

    if (!streak) {
      return prisma.userStreak.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastActiveDate: today,
        },
      })
    }

    const lastActive = streak.lastActiveDate
      ? new Date(streak.lastActiveDate)
      : null

    if (lastActive) {
      lastActive.setHours(0, 0, 0, 0)
      const diffDays = Math.floor(
        (today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24)
      )

      if (diffDays === 0) {
        return streak
      }

      if (diffDays === 1) {
        const newStreak = streak.currentStreak + 1
        return prisma.userStreak.update({
          where: { userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, streak.longestStreak),
            lastActiveDate: today,
          },
        })
      }

      if (diffDays === 2 && streak.freezeRemaining > 0) {
        const newStreak = streak.currentStreak + 1
        return prisma.userStreak.update({
          where: { userId },
          data: {
            currentStreak: newStreak,
            longestStreak: Math.max(newStreak, streak.longestStreak),
            lastActiveDate: today,
            freezeRemaining: { decrement: 1 },
          },
        })
      }

      return prisma.userStreak.update({
        where: { userId },
        data: {
          currentStreak: 1,
          lastActiveDate: today,
        },
      })
    }

    return prisma.userStreak.update({
      where: { userId },
      data: {
        currentStreak: 1,
        longestStreak: Math.max(1, streak.longestStreak),
        lastActiveDate: today,
      },
    })
  },

  async freezeStreak(clerkId: string): Promise<UserStreak> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const streak = await prisma.userStreak.findUnique({
      where: { userId: user.id },
    })

    if (!streak || streak.freezeRemaining <= 0) {
      throw new AppError('フリーズ回数が残っていません', 'NO_FREEZE_REMAINING', 400)
    }

    return prisma.userStreak.update({
      where: { userId: user.id },
      data: { freezeRemaining: { decrement: 1 } },
    })
  },

  async getTodayMissions(clerkId: string): Promise<DailyMission[]> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return prisma.dailyMission.findMany({
      where: {
        userId: user.id,
        date: today,
      },
      orderBy: { createdAt: 'asc' },
    })
  },

  async progressMission(
    userId: string,
    actionCode: string
  ): Promise<DailyMission | null> {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const mission = await prisma.dailyMission.findFirst({
      where: {
        userId,
        actionCode,
        date: today,
        status: 'active',
      },
    })

    if (!mission) return null

    const newCount = mission.currentCount + 1
    const isCompleted = newCount >= mission.targetCount

    return prisma.dailyMission.update({
      where: { id: mission.id },
      data: {
        currentCount: newCount,
        status: isCompleted ? 'completed' : 'active',
      },
    })
  },
}
