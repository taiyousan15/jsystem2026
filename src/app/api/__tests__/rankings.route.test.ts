import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resetIdCounter } from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockRankingRepo = {
  getLeaderboard: vi.fn(),
}

vi.mock('@/repositories/ranking.repository', () => ({
  rankingRepository: mockRankingRepo,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET } = await import('@/app/api/v1/rankings/route')

describe('Rankings API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/rankings', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/rankings')
      const res = await GET(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return leaderboard with default limit', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const leaderboard = [
        { rank: 1, displayName: 'User1', totalMiles: 5000 },
        { rank: 2, displayName: 'User2', totalMiles: 3000 },
      ]
      mockRankingRepo.getLeaderboard.mockResolvedValue(leaderboard)

      const req = createRequest('/api/v1/rankings')
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(mockRankingRepo.getLeaderboard).toHaveBeenCalledWith(20)
    })

    it('should clamp limit to max 100', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockRankingRepo.getLeaderboard.mockResolvedValue([])

      const req = createRequest('/api/v1/rankings', {
        searchParams: { limit: '500' },
      })
      await GET(req)

      expect(mockRankingRepo.getLeaderboard).toHaveBeenCalledWith(100)
    })
  })
})
