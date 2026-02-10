import { zoomRepository } from '@/repositories/zoom.repository'
import { mileRepository } from '@/repositories/mile.repository'
import { userRepository } from '@/repositories/user.repository'
import { zoomClient } from '@/lib/integrations/zoom-client'
import { calculateAttendanceMiles } from '@/services/zoom-mile-calculator'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { ZoomMeetingRecord, ZoomParticipationLog } from '@prisma/client'

export const zoomService = {
  async processMeetingEnded(meetingUuid: string): Promise<{
    meetingRecordId: string
    participantsProcessed: number
    milesAwarded: number
  }> {
    const existing = await zoomRepository.findMeetingByUuid(meetingUuid)
    if (existing && existing.status === 'ended') {
      logger.info('Meeting already processed, skipping', { meetingUuid })
      return { meetingRecordId: existing.id, participantsProcessed: 0, milesAwarded: 0 }
    }

    const meetingDetail = await zoomClient.getMeetingDetails(meetingUuid)
    const participants = await zoomClient.getMeetingParticipants(meetingUuid)

    const startTime = new Date(meetingDetail.start_time)
    const endTime = meetingDetail.end_time ? new Date(meetingDetail.end_time) : new Date()
    const meetingDurationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000)

    let meetingRecord: ZoomMeetingRecord
    if (existing) {
      meetingRecord = await zoomRepository.updateMeetingRecord(existing.id, {
        endTime,
        durationMinutes: meetingDurationMinutes,
        status: 'ended',
      })
    } else {
      meetingRecord = await zoomRepository.createMeetingRecord({
        zoomMeetingId: String(meetingDetail.id),
        zoomMeetingUuid: meetingUuid,
        topic: meetingDetail.topic,
        startTime,
        endTime,
        durationMinutes: meetingDurationMinutes,
        status: 'ended',
      })
    }

    let totalMilesAwarded = 0
    let participantsProcessed = 0

    for (const participant of participants) {
      try {
        const result = await processParticipant(
          participant,
          meetingRecord.id,
          meetingDurationMinutes
        )
        totalMilesAwarded += result.milesAwarded
        participantsProcessed++
      } catch (error) {
        logger.error('Failed to process participant', {
          email: participant.user_email,
          meetingUuid,
          error: String(error),
        })
      }
    }

    logger.info('Meeting processing completed', {
      meetingUuid,
      meetingRecordId: meetingRecord.id,
      participantsProcessed,
      totalMilesAwarded,
    })

    return {
      meetingRecordId: meetingRecord.id,
      participantsProcessed,
      milesAwarded: totalMilesAwarded,
    }
  },

  async processMeetingStarted(
    meetingId: string,
    meetingUuid: string,
    topic: string,
    startTime: string
  ): Promise<ZoomMeetingRecord> {
    const existing = await zoomRepository.findMeetingByUuid(meetingUuid)
    if (existing) {
      return existing
    }

    return zoomRepository.createMeetingRecord({
      zoomMeetingId: meetingId,
      zoomMeetingUuid: meetingUuid,
      topic,
      startTime: new Date(startTime),
      status: 'started',
    })
  },

  async getMeetings(
    page: number,
    limit: number,
    status?: string
  ): Promise<{ meetings: ZoomMeetingRecord[]; total: number }> {
    return zoomRepository.getMeetings({ page, limit, status })
  },

  async getMeetingDetail(meetingRecordId: string) {
    const meeting = await zoomRepository.getMeetingWithParticipations(meetingRecordId)
    if (!meeting) {
      throw new AppError('会議レコードが見つかりません', 'MEETING_NOT_FOUND', 404)
    }
    return meeting
  },

  async getUserParticipations(
    clerkId: string,
    page: number,
    limit: number
  ): Promise<{ participations: ZoomParticipationLog[]; total: number }> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }
    return zoomRepository.getParticipationsByUser(user.id, { page, limit })
  },

  async getParticipationReport(meetingRecordId: string) {
    return zoomRepository.getParticipationsByMeeting(meetingRecordId)
  },
}

async function processParticipant(
  participant: { user_email: string; join_time: string; leave_time: string; duration: number },
  meetingRecordId: string,
  meetingDurationMinutes: number
): Promise<{ milesAwarded: number }> {
  const durationMinutes = Math.round(participant.duration / 60)
  const { miles, reason, attendanceRate } = calculateAttendanceMiles(
    durationMinutes,
    meetingDurationMinutes
  )

  const userId = await resolveUserId(participant.user_email)

  await zoomRepository.upsertParticipationLog({
    userId,
    meetingRecordId,
    zoomEmail: participant.user_email,
    joinTime: new Date(participant.join_time),
    leaveTime: new Date(participant.leave_time),
    durationMinutes,
    milesAwarded: miles,
  })

  if (userId && miles > 0) {
    await mileRepository.earnMiles(userId, miles, 'zoom_attendance', {
      meetingRecordId,
      zoomEmail: participant.user_email,
      durationMinutes,
      attendanceRate,
      reason,
    })

    logger.info('Miles awarded for Zoom attendance', {
      userId,
      miles,
      reason,
      durationMinutes,
    })
  }

  return { milesAwarded: userId ? miles : 0 }
}

async function resolveUserId(zoomEmail: string): Promise<string | null> {
  const mapping = await zoomRepository.findMappingByEmail(zoomEmail)
  if (mapping) {
    return mapping.userId
  }

  const user = await userRepository.findByEmail(zoomEmail)
  if (user) {
    await zoomRepository.createMapping({
      userId: user.id,
      zoomEmail,
      verified: true,
    })
    logger.info('Auto-mapped Zoom email to user', { zoomEmail, userId: user.id })
    return user.id
  }

  logger.warn('Unresolved Zoom email', { zoomEmail })
  return null
}
