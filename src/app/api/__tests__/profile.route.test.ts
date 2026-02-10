import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, resetIdCounter } from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockUserRepo = {
  findByClerkId: vi.fn(),
  updateProfile: vi.fn(),
}

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET, PATCH } = await import('@/app/api/v1/profile/route')

describe('Profile API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/profile', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/profile')
      const res = await GET(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return user profile', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser({
        displayName: 'テストユーザー',
        email: 'test@example.com',
        bio: 'Hello',
        role: 'member',
      })
      mockUserRepo.findByClerkId.mockResolvedValue(user)

      const req = createRequest('/api/v1/profile')
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: {
          id: string
          displayName: string
          email: string
          role: string
        }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.displayName).toBe('テストユーザー')
      expect(body.data.email).toBe('test@example.com')
      expect(body.data.role).toBe('member')
    })
  })

  describe('PATCH /api/v1/profile', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/profile', {
        method: 'PATCH',
        body: { displayName: 'New Name' },
      })
      const res = await PATCH(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should update profile successfully', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      const updated = { ...user, displayName: 'Updated Name' }
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockUserRepo.updateProfile.mockResolvedValue(updated)

      const req = createRequest('/api/v1/profile', {
        method: 'PATCH',
        body: { displayName: 'Updated Name' },
      })
      const res = await PATCH(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { displayName: string }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockUserRepo.updateProfile).toHaveBeenCalledWith(user.id, {
        displayName: 'Updated Name',
      })
    })
  })
})
