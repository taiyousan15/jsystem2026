import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockBadge,
  createMockUserBadge,
  createMockUserRepository,
  createMockBadgeRepository,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'

const mockUserRepo = createMockUserRepository()
const mockBadgeRepo = createMockBadgeRepository()

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/repositories/badge.repository', () => ({
  badgeRepository: mockBadgeRepo,
}))

const { badgeService } = await import('@/services/badge.service')

describe('badgeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('getUserBadges', () => {
    it('should return user badges', async () => {
      const user = createMockUser()
      const badges = [
        { ...createMockUserBadge(), badge: createMockBadge() },
      ]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockBadgeRepo.getUserBadges.mockResolvedValue(badges)

      const result = await badgeService.getUserBadges('clerk_test')

      expect(result).toHaveLength(1)
      expect(result[0].badge.name).toBe('テストバッジ')
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        badgeService.getUserBadges('invalid')
      ).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('getAllBadges', () => {
    it('should return all badges', async () => {
      const badges = [
        createMockBadge({ name: 'Badge 1' }),
        createMockBadge({ name: 'Badge 2' }),
      ]
      mockBadgeRepo.getAllBadges.mockResolvedValue(badges)

      const result = await badgeService.getAllBadges()

      expect(result).toHaveLength(2)
    })
  })

  describe('checkAndAwardBadge', () => {
    it('should award badge when user does not have it', async () => {
      const userBadge = createMockUserBadge({
        userId: 'user-1',
        badgeId: 'badge-1',
      })

      mockBadgeRepo.hasBadge.mockResolvedValue(false)
      mockBadgeRepo.awardBadge.mockResolvedValue(userBadge)

      const result = await badgeService.checkAndAwardBadge('user-1', 'badge-1')

      expect(result).toEqual(userBadge)
      expect(mockBadgeRepo.awardBadge).toHaveBeenCalledWith('user-1', 'badge-1')
    })

    it('should return null when user already has badge', async () => {
      mockBadgeRepo.hasBadge.mockResolvedValue(true)

      const result = await badgeService.checkAndAwardBadge('user-1', 'badge-1')

      expect(result).toBeNull()
      expect(mockBadgeRepo.awardBadge).not.toHaveBeenCalled()
    })
  })
})
