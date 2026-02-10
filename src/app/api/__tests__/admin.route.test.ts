import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, resetIdCounter } from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()
const mockCurrentUser = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}))

const mockUserRepo = {
  findMany: vi.fn(),
  updateProfile: vi.fn(),
}

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

const mockPrisma = {
  user: { count: vi.fn() },
  pointTransaction: { groupBy: vi.fn(), aggregate: vi.fn() },
  exchangeRequest: { count: vi.fn() },
  event: { count: vi.fn() },
  pointBalance: { groupBy: vi.fn() },
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET: getAdminStats } = await import(
  '@/app/api/v1/admin/stats/route'
)
const { GET: getAdminUsers, PATCH: patchAdminUsers } = await import(
  '@/app/api/v1/admin/users/route'
)

describe('Admin API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/admin/stats', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/admin/stats')
      const res = await getAdminStats(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return 403 for non-admin user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'member' },
      })

      const req = createRequest('/api/v1/admin/stats')
      const res = await getAdminStats(req)
      const { status, body } = await parseResponse<{
        success: boolean
        error: string
      }>(res)

      expect(status).toBe(403)
      expect(body.error).toBe('管理者権限が必要です')
    })

    it('should return stats for admin user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_admin' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      })

      mockPrisma.user.count.mockResolvedValue(100)
      mockPrisma.pointTransaction.groupBy.mockResolvedValue([
        { userId: 'u1' },
        { userId: 'u2' },
      ])
      mockPrisma.pointTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 50000 },
      })
      mockPrisma.exchangeRequest.count.mockResolvedValue(5)
      mockPrisma.event.count.mockResolvedValue(3)
      mockPrisma.pointBalance.groupBy.mockResolvedValue([
        { tier: 'bronze', _count: 80 },
        { tier: 'silver', _count: 20 },
      ])

      const req = createRequest('/api/v1/admin/stats')
      const res = await getAdminStats(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: {
          totalUsers: number
          activeToday: number
          totalMilesIssued: number
          pendingExchanges: number
          upcomingEvents: number
          tierDistribution: Array<{ tier: string; count: number }>
        }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.totalUsers).toBe(100)
      expect(body.data.activeToday).toBe(2)
      expect(body.data.totalMilesIssued).toBe(50000)
      expect(body.data.pendingExchanges).toBe(5)
      expect(body.data.tierDistribution).toHaveLength(2)
    })
  })

  describe('GET /api/v1/admin/users', () => {
    it('should return 403 for non-admin user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'member' },
      })

      const req = createRequest('/api/v1/admin/users')
      const res = await getAdminUsers(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(403)
    })

    it('should return paginated users for admin', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_admin' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      })
      const users = [createMockUser(), createMockUser()]
      mockUserRepo.findMany.mockResolvedValue({
        users,
        total: 2,
      })

      const req = createRequest('/api/v1/admin/users', {
        searchParams: { page: '1', limit: '20' },
      })
      const res = await getAdminUsers(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(2)
      expect(body.meta.total).toBe(2)
    })

    it('should pass role filter', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_admin' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      })
      mockUserRepo.findMany.mockResolvedValue({ users: [], total: 0 })

      const req = createRequest('/api/v1/admin/users', {
        searchParams: { role: 'admin' },
      })
      await getAdminUsers(req)

      expect(mockUserRepo.findMany).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        role: 'admin',
      })
    })
  })

  describe('PATCH /api/v1/admin/users', () => {
    it('should update user profile', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_admin' })
      mockCurrentUser.mockResolvedValue({
        publicMetadata: { role: 'admin' },
      })
      const updated = createMockUser({ displayName: 'Updated' })
      mockUserRepo.updateProfile.mockResolvedValue(updated)

      const req = createRequest('/api/v1/admin/users', {
        method: 'PATCH',
        body: { userId: 'user-1', displayName: 'Updated' },
      })
      const res = await patchAdminUsers(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { displayName: string }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith('user-1', {
        displayName: 'Updated',
        bio: undefined,
      })
    })
  })
})
