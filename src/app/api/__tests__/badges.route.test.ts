import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockBadge,
  createMockUserBadge,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockBadgeService = {
  getUserBadges: vi.fn(),
  getAllBadges: vi.fn(),
}

vi.mock('@/services/badge.service', () => ({
  badgeService: mockBadgeService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET } = await import('@/app/api/v1/badges/route')

describe('Badges API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/badges', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/badges')
      const res = await GET(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return user badges by default', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const userBadges = [
        { ...createMockUserBadge(), badge: createMockBadge() },
      ]
      mockBadgeService.getUserBadges.mockResolvedValue(userBadges)

      const req = createRequest('/api/v1/badges')
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(1)
      expect(mockBadgeService.getUserBadges).toHaveBeenCalledWith('clerk_user1')
    })

    it('should return all badges when view=all', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const badges = [
        createMockBadge({ name: 'Badge 1' }),
        createMockBadge({ name: 'Badge 2' }),
      ]
      mockBadgeService.getAllBadges.mockResolvedValue(badges)

      const req = createRequest('/api/v1/badges', {
        searchParams: { view: 'all' },
      })
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(2)
      expect(mockBadgeService.getAllBadges).toHaveBeenCalled()
      expect(mockBadgeService.getUserBadges).not.toHaveBeenCalled()
    })
  })
})
