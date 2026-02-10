import { prisma } from '@/lib/db'
import type {
  ZoomUserMapping,
  ZoomMeetingRecord,
  ZoomParticipationLog,
  Prisma,
} from '@prisma/client'

export const zoomRepository = {
  // --- Meeting Records ---

  async findMeetingByUuid(zoomMeetingUuid: string): Promise<ZoomMeetingRecord | null> {
    return prisma.zoomMeetingRecord.findUnique({
      where: { zoomMeetingUuid },
    })
  },

  async createMeetingRecord(
    data: Prisma.ZoomMeetingRecordCreateInput
  ): Promise<ZoomMeetingRecord> {
    return prisma.zoomMeetingRecord.create({ data })
  },

  async updateMeetingRecord(
    id: string,
    data: Prisma.ZoomMeetingRecordUpdateInput
  ): Promise<ZoomMeetingRecord> {
    return prisma.zoomMeetingRecord.update({ where: { id }, data })
  },

  async getMeetings(params: {
    page: number
    limit: number
    status?: string
  }): Promise<{ meetings: ZoomMeetingRecord[]; total: number }> {
    const where: Prisma.ZoomMeetingRecordWhereInput = {
      ...(params.status ? { status: params.status } : {}),
    }
    const [meetings, total] = await Promise.all([
      prisma.zoomMeetingRecord.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { startTime: 'desc' },
        include: { _count: { select: { participations: true } } },
      }),
      prisma.zoomMeetingRecord.count({ where }),
    ])
    return { meetings, total }
  },

  async getMeetingWithParticipations(
    id: string
  ): Promise<(ZoomMeetingRecord & { participations: ZoomParticipationLog[] }) | null> {
    return prisma.zoomMeetingRecord.findUnique({
      where: { id },
      include: {
        participations: {
          include: { user: { select: { id: true, name: true, email: true } } },
          orderBy: { joinTime: 'asc' },
        },
      },
    })
  },

  // --- Participation Logs ---

  async upsertParticipationLog(data: {
    userId: string | null
    meetingRecordId: string
    zoomEmail: string
    joinTime: Date
    leaveTime: Date | null
    durationMinutes: number | null
    milesAwarded: number
  }): Promise<ZoomParticipationLog> {
    if (data.userId) {
      return prisma.zoomParticipationLog.upsert({
        where: {
          userId_meetingRecordId: {
            userId: data.userId,
            meetingRecordId: data.meetingRecordId,
          },
        },
        create: data,
        update: {
          leaveTime: data.leaveTime,
          durationMinutes: data.durationMinutes,
          milesAwarded: data.milesAwarded,
        },
      })
    }
    return prisma.zoomParticipationLog.create({ data })
  },

  async getParticipationsByMeeting(
    meetingRecordId: string
  ): Promise<ZoomParticipationLog[]> {
    return prisma.zoomParticipationLog.findMany({
      where: { meetingRecordId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { joinTime: 'asc' },
    })
  },

  async getParticipationsByUser(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<{ participations: ZoomParticipationLog[]; total: number }> {
    const where = { userId }
    const [participations, total] = await Promise.all([
      prisma.zoomParticipationLog.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: {
          meetingRecord: {
            select: { topic: true, startTime: true, durationMinutes: true },
          },
        },
        orderBy: { joinTime: 'desc' },
      }),
      prisma.zoomParticipationLog.count({ where }),
    ])
    return { participations, total }
  },

  // --- User Mappings ---

  async findMappingByEmail(zoomEmail: string): Promise<ZoomUserMapping | null> {
    return prisma.zoomUserMapping.findUnique({ where: { zoomEmail } })
  },

  async findMappingsByUserId(userId: string): Promise<ZoomUserMapping[]> {
    return prisma.zoomUserMapping.findMany({ where: { userId } })
  },

  async createMapping(data: {
    userId: string
    zoomEmail: string
    zoomUserId?: string
    verified?: boolean
  }): Promise<ZoomUserMapping> {
    return prisma.zoomUserMapping.create({ data })
  },

  async updateMapping(
    id: string,
    data: Prisma.ZoomUserMappingUpdateInput
  ): Promise<ZoomUserMapping> {
    return prisma.zoomUserMapping.update({ where: { id }, data })
  },

  async deleteMapping(id: string): Promise<ZoomUserMapping> {
    return prisma.zoomUserMapping.delete({ where: { id } })
  },

  async getAllMappings(params: {
    page: number
    limit: number
  }): Promise<{ mappings: ZoomUserMapping[]; total: number }> {
    const [mappings, total] = await Promise.all([
      prisma.zoomUserMapping.findMany({
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.zoomUserMapping.count(),
    ])
    return { mappings, total }
  },
}
