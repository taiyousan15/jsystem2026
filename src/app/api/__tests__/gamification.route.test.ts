import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockStreak,
  createMockMission,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockGamificationService = {
  getStreak: vi.fn(),
  freezeStreak: vi.fn(),
  getTodayMissions: vi.fn(),
}

vi.mock('@/services/gamification.service', () => ({
  gamificationService: mockGamificationService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET: getStreak, POST: postStreak } = await import(
  '@/app/api/v1/streaks/route'
)
const { GET: getMissions } = await import(
  '@/app/api/v1/missions/today/route'
)

describe('Gamification API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/streaks', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/streaks')
      const res = await getStreak(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return streak data', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const streak = createMockStreak({
        currentStreak: 7,
        longestStreak: 15,
      })
      mockGamificationService.getStreak.mockResolvedValue(streak)

      const req = createRequest('/api/v1/streaks')
      const res = await getStreak(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { currentStreak: number; longestStreak: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.currentStreak).toBe(7)
      expect(body.data.longestStreak).toBe(15)
    })
  })

  describe('POST /api/v1/streaks', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/streaks', {
        method: 'POST',
        body: { action: 'freeze' },
      })
      const res = await postStreak(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should freeze streak when action=freeze', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const streak = createMockStreak({ freezeRemaining: 2 })
      mockGamificationService.freezeStreak.mockResolvedValue(streak)

      const req = createRequest('/api/v1/streaks', {
        method: 'POST',
        body: { action: 'freeze' },
      })
      const res = await postStreak(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { freezeRemaining: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.freezeRemaining).toBe(2)
    })

    it('should return error for unknown action', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })

      const req = createRequest('/api/v1/streaks', {
        method: 'POST',
        body: { action: 'invalid' },
      })
      const res = await postStreak(req)
      const { status } = await parseResponse(res)

      // Route returns successResponse with error in data and status 400
      expect(status).toBe(400)
    })
  })

  describe('GET /api/v1/missions/today', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/missions/today')
      const res = await getMissions(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return today missions', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const missions = [createMockMission(), createMockMission()]
      mockGamificationService.getTodayMissions.mockResolvedValue(missions)

      const req = createRequest('/api/v1/missions/today')
      const res = await getMissions(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
    })
  })
})
