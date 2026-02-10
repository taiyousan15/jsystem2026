import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockEvent,
  createMockEventAttendee,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockEventService = {
  getUpcomingEvents: vi.fn(),
  getMyEvents: vi.fn(),
  register: vi.fn(),
  cancel: vi.fn(),
}

vi.mock('@/services/event.service', () => ({
  eventService: mockEventService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET, POST } = await import('@/app/api/v1/events/route')

describe('Events API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/events', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/events')
      const res = await GET(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return upcoming events with pagination', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const events = [createMockEvent(), createMockEvent()]
      mockEventService.getUpcomingEvents.mockResolvedValue({
        events,
        total: 2,
      })

      const req = createRequest('/api/v1/events', {
        searchParams: { page: '1', limit: '10' },
      })
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number; page: number; limit: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(2)
      expect(body.meta).toEqual({ total: 2, page: 1, limit: 10 })
    })

    it('should return my events when view=my', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const events = [
        { ...createMockEventAttendee(), event: createMockEvent() },
      ]
      mockEventService.getMyEvents.mockResolvedValue(events)

      const req = createRequest('/api/v1/events', {
        searchParams: { view: 'my' },
      })
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(mockEventService.getMyEvents).toHaveBeenCalledWith('clerk_user1')
    })
  })

  describe('POST /api/v1/events', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/events', {
        method: 'POST',
        body: { eventId: 'evt-1' },
      })
      const res = await POST(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should register for event', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const attendee = createMockEventAttendee({ eventId: 'evt-1' })
      mockEventService.register.mockResolvedValue(attendee)

      const req = createRequest('/api/v1/events', {
        method: 'POST',
        body: { eventId: 'evt-1' },
      })
      const res = await POST(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { eventId: string }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.eventId).toBe('evt-1')
      expect(mockEventService.register).toHaveBeenCalledWith(
        'clerk_user1',
        'evt-1'
      )
    })

    it('should cancel registration when action=cancel', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const attendee = createMockEventAttendee({ eventId: 'evt-1' })
      mockEventService.cancel.mockResolvedValue(attendee)

      const req = createRequest('/api/v1/events', {
        method: 'POST',
        body: { eventId: 'evt-1', action: 'cancel' },
      })
      const res = await POST(req)
      const { status, body } = await parseResponse<{ success: boolean }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockEventService.cancel).toHaveBeenCalledWith(
        'clerk_user1',
        'evt-1'
      )
    })
  })
})
