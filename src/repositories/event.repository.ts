import { prisma } from '@/lib/db'
import type { Event, EventAttendee, Prisma } from '@prisma/client'

export const eventRepository = {
  async getUpcomingEvents(params: {
    page: number
    limit: number
  }): Promise<{ events: Event[]; total: number }> {
    const where: Prisma.EventWhereInput = {
      status: { in: ['upcoming', 'ongoing'] },
      startAt: { gte: new Date() },
    }
    const [events, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { startAt: 'asc' },
      }),
      prisma.event.count({ where }),
    ])
    return { events, total }
  },

  async getEvent(id: string): Promise<(Event & { attendees: EventAttendee[] }) | null> {
    return prisma.event.findUnique({
      where: { id },
      include: { attendees: true },
    })
  },

  async registerAttendee(eventId: string, userId: string): Promise<EventAttendee> {
    return prisma.eventAttendee.create({
      data: { eventId, userId },
    })
  },

  async cancelAttendee(eventId: string, userId: string): Promise<EventAttendee> {
    return prisma.eventAttendee.delete({
      where: { eventId_userId: { eventId, userId } },
    })
  },

  async getAttendee(eventId: string, userId: string): Promise<EventAttendee | null> {
    return prisma.eventAttendee.findUnique({
      where: { eventId_userId: { eventId, userId } },
    })
  },

  async getUserEvents(userId: string): Promise<(EventAttendee & { event: Event })[]> {
    return prisma.eventAttendee.findMany({
      where: { userId },
      include: { event: true },
      orderBy: { event: { startAt: 'asc' } },
    })
  },
}
