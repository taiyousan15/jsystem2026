import { eventRepository } from '@/repositories/event.repository'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'
import type { Event, EventAttendee } from '@prisma/client'

export const eventService = {
  async getUpcomingEvents(
    page: number,
    limit: number
  ): Promise<{ events: Event[]; total: number }> {
    return eventRepository.getUpcomingEvents({ page, limit })
  },

  async getEvent(id: string): Promise<Event & { attendees: EventAttendee[] }> {
    const event = await eventRepository.getEvent(id)
    if (!event) {
      throw new AppError('イベントが見つかりません', 'EVENT_NOT_FOUND', 404)
    }
    return event
  },

  async register(clerkId: string, eventId: string): Promise<EventAttendee> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const event = await eventRepository.getEvent(eventId)
    if (!event) {
      throw new AppError('イベントが見つかりません', 'EVENT_NOT_FOUND', 404)
    }

    if (event.status === 'cancelled' || event.status === 'completed') {
      throw new AppError('このイベントには参加できません', 'EVENT_NOT_AVAILABLE', 400)
    }

    const registeredCount = event.attendees.length
    if (event.capacity > 0 && registeredCount >= event.capacity) {
      throw new AppError('定員に達しています', 'EVENT_FULL', 400)
    }

    const existing = await eventRepository.getAttendee(eventId, user.id)
    if (existing) {
      throw new AppError('既に参加登録済みです', 'ALREADY_REGISTERED', 400)
    }

    return eventRepository.registerAttendee(eventId, user.id)
  },

  async cancel(clerkId: string, eventId: string): Promise<EventAttendee> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }
    return eventRepository.cancelAttendee(eventId, user.id)
  },

  async getMyEvents(clerkId: string): Promise<(EventAttendee & { event: Event })[]> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }
    return eventRepository.getUserEvents(user.id)
  },
}
