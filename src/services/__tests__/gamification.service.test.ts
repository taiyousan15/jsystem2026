import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockStreak,
  createMockMission,
  createMockUserRepository,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'

const mockUserRepo = createMockUserRepository()
const mockPrisma = {
  userStreak: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  dailyMission: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
  },
}

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

const { gamificationService } = await import('@/services/gamification.service')

describe('gamificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('getStreak', () => {
    it('should return existing streak', async () => {
      const user = createMockUser()
      const streak = createMockStreak({ userId: user.id })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)

      const result = await gamificationService.getStreak('clerk_test')

      expect(result.currentStreak).toBe(5)
      expect(result.longestStreak).toBe(10)
    })

    it('should create streak if none exists', async () => {
      const user = createMockUser()
      const newStreak = createMockStreak({
        userId: user.id,
        currentStreak: 0,
        longestStreak: 0,
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.userStreak.findUnique.mockResolvedValue(null)
      mockPrisma.userStreak.create.mockResolvedValue(newStreak)

      const result = await gamificationService.getStreak('clerk_test')

      expect(mockPrisma.userStreak.create).toHaveBeenCalledWith({
        data: { userId: user.id },
      })
      expect(result).toEqual(newStreak)
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        gamificationService.getStreak('invalid')
      ).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('updateStreak', () => {
    it('should create streak for new user', async () => {
      const newStreak = createMockStreak({
        currentStreak: 1,
        longestStreak: 1,
      })

      mockPrisma.userStreak.findUnique.mockResolvedValue(null)
      mockPrisma.userStreak.create.mockResolvedValue(newStreak)

      const result = await gamificationService.updateStreak('user-1')

      expect(result.currentStreak).toBe(1)
    })

    it('should not increment on same day', async () => {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const streak = createMockStreak({
        lastActiveDate: today,
        currentStreak: 5,
      })

      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)

      const result = await gamificationService.updateStreak('user-1')

      expect(result.currentStreak).toBe(5)
      expect(mockPrisma.userStreak.update).not.toHaveBeenCalled()
    })

    it('should increment streak on consecutive day', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const streak = createMockStreak({
        userId: 'user-1',
        lastActiveDate: yesterday,
        currentStreak: 5,
        longestStreak: 10,
      })
      const updatedStreak = createMockStreak({
        currentStreak: 6,
        longestStreak: 10,
      })

      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)
      mockPrisma.userStreak.update.mockResolvedValue(updatedStreak)

      const result = await gamificationService.updateStreak('user-1')

      expect(result.currentStreak).toBe(6)
    })

    it('should use freeze when 2 days gap and freeze available', async () => {
      const twoDaysAgo = new Date()
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2)
      twoDaysAgo.setHours(0, 0, 0, 0)

      const streak = createMockStreak({
        userId: 'user-1',
        lastActiveDate: twoDaysAgo,
        currentStreak: 5,
        freezeRemaining: 2,
      })
      const updatedStreak = createMockStreak({
        currentStreak: 6,
        freezeRemaining: 1,
      })

      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)
      mockPrisma.userStreak.update.mockResolvedValue(updatedStreak)

      const result = await gamificationService.updateStreak('user-1')

      expect(result.currentStreak).toBe(6)
      expect(result.freezeRemaining).toBe(1)
    })

    it('should reset streak when gap > 1 day without freeze', async () => {
      const threeDaysAgo = new Date()
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)
      threeDaysAgo.setHours(0, 0, 0, 0)

      const streak = createMockStreak({
        userId: 'user-1',
        lastActiveDate: threeDaysAgo,
        currentStreak: 5,
        freezeRemaining: 0,
      })
      const updatedStreak = createMockStreak({ currentStreak: 1 })

      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)
      mockPrisma.userStreak.update.mockResolvedValue(updatedStreak)

      const result = await gamificationService.updateStreak('user-1')

      expect(result.currentStreak).toBe(1)
    })
  })

  describe('freezeStreak', () => {
    it('should decrement freeze remaining', async () => {
      const user = createMockUser()
      const streak = createMockStreak({
        userId: user.id,
        freezeRemaining: 3,
      })
      const updatedStreak = createMockStreak({ freezeRemaining: 2 })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)
      mockPrisma.userStreak.update.mockResolvedValue(updatedStreak)

      const result = await gamificationService.freezeStreak('clerk_test')

      expect(result.freezeRemaining).toBe(2)
    })

    it('should throw when no freeze remaining', async () => {
      const user = createMockUser()
      const streak = createMockStreak({ freezeRemaining: 0 })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.userStreak.findUnique.mockResolvedValue(streak)

      await expect(
        gamificationService.freezeStreak('clerk_test')
      ).rejects.toThrow('フリーズ回数が残っていません')
    })

    it('should throw when streak not found', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.userStreak.findUnique.mockResolvedValue(null)

      await expect(
        gamificationService.freezeStreak('clerk_test')
      ).rejects.toThrow('フリーズ回数が残っていません')
    })
  })

  describe('getTodayMissions', () => {
    it('should return today missions', async () => {
      const user = createMockUser()
      const missions = [createMockMission(), createMockMission()]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockPrisma.dailyMission.findMany.mockResolvedValue(missions)

      const result = await gamificationService.getTodayMissions('clerk_test')

      expect(result).toHaveLength(2)
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        gamificationService.getTodayMissions('invalid')
      ).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('progressMission', () => {
    it('should increment mission progress', async () => {
      const mission = createMockMission({
        currentCount: 0,
        targetCount: 3,
        status: 'active',
      })
      const updatedMission = createMockMission({
        currentCount: 1,
        targetCount: 3,
        status: 'active',
      })

      mockPrisma.dailyMission.findFirst.mockResolvedValue(mission)
      mockPrisma.dailyMission.update.mockResolvedValue(updatedMission)

      const result = await gamificationService.progressMission(
        'user-1',
        'daily_login'
      )

      expect(result?.currentCount).toBe(1)
      expect(result?.status).toBe('active')
    })

    it('should complete mission when target reached', async () => {
      const mission = createMockMission({
        currentCount: 2,
        targetCount: 3,
        status: 'active',
      })
      const completedMission = createMockMission({
        currentCount: 3,
        targetCount: 3,
        status: 'completed',
      })

      mockPrisma.dailyMission.findFirst.mockResolvedValue(mission)
      mockPrisma.dailyMission.update.mockResolvedValue(completedMission)

      const result = await gamificationService.progressMission(
        'user-1',
        'daily_login'
      )

      expect(result?.status).toBe('completed')
    })

    it('should return null when no active mission found', async () => {
      mockPrisma.dailyMission.findFirst.mockResolvedValue(null)

      const result = await gamificationService.progressMission(
        'user-1',
        'nonexistent'
      )

      expect(result).toBeNull()
    })
  })
})
