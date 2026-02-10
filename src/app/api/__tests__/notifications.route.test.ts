import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockUser, resetIdCounter } from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockUserRepo = {
  findByClerkId: vi.fn(),
}

const mockNotificationRepo = {
  getNotifications: vi.fn(),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  getUnreadCount: vi.fn(),
}

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/repositories/notification.repository', () => ({
  notificationRepository: mockNotificationRepo,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET: getNotifications, PATCH: patchNotifications } = await import(
  '@/app/api/v1/notifications/route'
)
const { GET: getUnreadCount } = await import(
  '@/app/api/v1/notifications/count/route'
)

describe('Notifications API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/notifications', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/notifications')
      const res = await getNotifications(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return paginated notifications', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      const notifications = [
        { id: 'n1', title: 'Test', body: 'body', isRead: false },
      ]
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockNotificationRepo.getNotifications.mockResolvedValue({
        notifications,
        total: 1,
      })

      const req = createRequest('/api/v1/notifications')
      const res = await getNotifications(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.meta.total).toBe(1)
    })

    it('should pass unread filter', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockNotificationRepo.getNotifications.mockResolvedValue({
        notifications: [],
        total: 0,
      })

      const req = createRequest('/api/v1/notifications', {
        searchParams: { unread: 'true' },
      })
      await getNotifications(req)

      expect(mockNotificationRepo.getNotifications).toHaveBeenCalledWith(
        user.id,
        { page: 1, limit: 20, unreadOnly: true }
      )
    })
  })

  describe('PATCH /api/v1/notifications', () => {
    it('should mark all as read', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockNotificationRepo.markAllAsRead.mockResolvedValue(5)

      const req = createRequest('/api/v1/notifications', {
        method: 'PATCH',
        body: { action: 'markAllRead' },
      })
      const res = await patchNotifications(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { markedCount: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data.markedCount).toBe(5)
    })

    it('should mark single notification as read', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      const notification = { id: 'n1', isRead: true }
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockNotificationRepo.markAsRead.mockResolvedValue(notification)

      const req = createRequest('/api/v1/notifications', {
        method: 'PATCH',
        body: { notificationId: 'n1' },
      })
      const res = await patchNotifications(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { id: string; isRead: boolean }
      }>(res)

      expect(status).toBe(200)
      expect(body.data.isRead).toBe(true)
    })
  })

  describe('GET /api/v1/notifications/count', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/notifications/count')
      const res = await getUnreadCount(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return unread count', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockNotificationRepo.getUnreadCount.mockResolvedValue(3)

      const req = createRequest('/api/v1/notifications/count')
      const res = await getUnreadCount(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { unreadCount: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data.unreadCount).toBe(3)
    })
  })
})
