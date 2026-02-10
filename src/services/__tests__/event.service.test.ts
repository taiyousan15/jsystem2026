import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockEvent,
  createMockEventAttendee,
  createMockUserRepository,
  createMockEventRepository,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'

const mockUserRepo = createMockUserRepository()
const mockEventRepo = createMockEventRepository()

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/repositories/event.repository', () => ({
  eventRepository: mockEventRepo,
}))

const { eventService } = await import('@/services/event.service')

describe('eventService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('getUpcomingEvents', () => {
    it('should return upcoming events', async () => {
      const events = [createMockEvent(), createMockEvent()]
      mockEventRepo.getUpcomingEvents.mockResolvedValue({
        events,
        total: 2,
      })

      const result = await eventService.getUpcomingEvents(1, 20)

      expect(result.events).toHaveLength(2)
      expect(result.total).toBe(2)
    })
  })

  describe('getEvent', () => {
    it('should return event with attendees', async () => {
      const event = {
        ...createMockEvent({ id: 'evt-1' }),
        attendees: [createMockEventAttendee()],
      }
      mockEventRepo.getEvent.mockResolvedValue(event)

      const result = await eventService.getEvent('evt-1')

      expect(result.id).toBe('evt-1')
      expect(result.attendees).toHaveLength(1)
    })

    it('should throw when event not found', async () => {
      mockEventRepo.getEvent.mockResolvedValue(null)

      await expect(eventService.getEvent('invalid')).rejects.toThrow(
        'イベントが見つかりません'
      )
    })
  })

  describe('register', () => {
    it('should register user for event', async () => {
      const user = createMockUser()
      const event = {
        ...createMockEvent({ id: 'evt-1', capacity: 30, status: 'upcoming' }),
        attendees: [createMockEventAttendee()],
      }
      const attendee = createMockEventAttendee({
        eventId: 'evt-1',
        userId: user.id,
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)
      mockEventRepo.getAttendee.mockResolvedValue(null)
      mockEventRepo.registerAttendee.mockResolvedValue(attendee)

      const result = await eventService.register('clerk_test', 'evt-1')

      expect(result.eventId).toBe('evt-1')
      expect(result.userId).toBe(user.id)
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        eventService.register('invalid', 'evt-1')
      ).rejects.toThrow('ユーザーが見つかりません')
    })

    it('should throw when event not found', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(null)

      await expect(
        eventService.register('clerk_test', 'invalid')
      ).rejects.toThrow('イベントが見つかりません')
    })

    it('should throw when event is cancelled', async () => {
      const user = createMockUser()
      const event = {
        ...createMockEvent({ status: 'cancelled' }),
        attendees: [],
      }
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)

      await expect(
        eventService.register('clerk_test', event.id)
      ).rejects.toThrow('このイベントには参加できません')
    })

    it('should throw when event is completed', async () => {
      const user = createMockUser()
      const event = {
        ...createMockEvent({ status: 'completed' }),
        attendees: [],
      }
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)

      await expect(
        eventService.register('clerk_test', event.id)
      ).rejects.toThrow('このイベントには参加できません')
    })

    it('should throw when event is full', async () => {
      const user = createMockUser()
      const attendees = Array.from({ length: 30 }, () =>
        createMockEventAttendee()
      )
      const event = {
        ...createMockEvent({ capacity: 30, status: 'upcoming' }),
        attendees,
      }
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)

      await expect(
        eventService.register('clerk_test', event.id)
      ).rejects.toThrow('定員に達しています')
    })

    it('should allow when capacity is 0 (unlimited)', async () => {
      const user = createMockUser()
      const event = {
        ...createMockEvent({ capacity: 0, status: 'upcoming' }),
        attendees: Array.from({ length: 100 }, () =>
          createMockEventAttendee()
        ),
      }
      const attendee = createMockEventAttendee()

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)
      mockEventRepo.getAttendee.mockResolvedValue(null)
      mockEventRepo.registerAttendee.mockResolvedValue(attendee)

      const result = await eventService.register('clerk_test', event.id)
      expect(result).toEqual(attendee)
    })

    it('should throw when already registered', async () => {
      const user = createMockUser()
      const event = {
        ...createMockEvent({ status: 'upcoming' }),
        attendees: [],
      }
      const existing = createMockEventAttendee()

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getEvent.mockResolvedValue(event)
      mockEventRepo.getAttendee.mockResolvedValue(existing)

      await expect(
        eventService.register('clerk_test', event.id)
      ).rejects.toThrow('既に参加登録済みです')
    })
  })

  describe('cancel', () => {
    it('should cancel registration', async () => {
      const user = createMockUser()
      const attendee = createMockEventAttendee({
        eventId: 'evt-1',
        userId: user.id,
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.cancelAttendee.mockResolvedValue(attendee)

      const result = await eventService.cancel('clerk_test', 'evt-1')

      expect(result).toEqual(attendee)
      expect(mockEventRepo.cancelAttendee).toHaveBeenCalledWith(
        'evt-1',
        user.id
      )
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        eventService.cancel('invalid', 'evt-1')
      ).rejects.toThrow('ユーザーが見つかりません')
    })
  })

  describe('getMyEvents', () => {
    it('should return user registered events', async () => {
      const user = createMockUser()
      const events = [
        { ...createMockEventAttendee(), event: createMockEvent() },
      ]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockEventRepo.getUserEvents.mockResolvedValue(events)

      const result = await eventService.getMyEvents('clerk_test')

      expect(result).toHaveLength(1)
    })
  })
})
