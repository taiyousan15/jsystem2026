import { withAdmin } from '@/lib/admin-handler'
import { successResponse, paginatedResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'
import { randomUUID } from 'crypto'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const status = url.searchParams.get('status') ?? undefined

  const where = status ? { status } : {}
  const [events, total] = await Promise.all([
    prisma.event.findMany({
      where,
      include: {
        _count: { select: { attendees: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startAt: 'desc' },
    }),
    prisma.event.count({ where }),
  ])

  return paginatedResponse(events, total, page, limit)
})

export const POST = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { title, description, type, startAt, endAt, location, onlineUrl, capacity, milesReward, isPaid, price, tierRequired } = body

  if (!title || !type || !startAt || !endAt || capacity == null) {
    throw new AppError('必須項目が不足しています', 'MISSING_FIELDS', 400)
  }

  const start = new Date(startAt)
  const end = new Date(endAt)
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw new AppError('無効な日時形式です', 'INVALID_DATE', 400)
  }
  if (end <= start) {
    throw new AppError('終了日時は開始日時より後にしてください', 'INVALID_DATE_RANGE', 400)
  }

  const event = await prisma.event.create({
    data: {
      title,
      description: description ?? null,
      type,
      startAt: start,
      endAt: end,
      location: location ?? null,
      onlineUrl: onlineUrl ?? null,
      capacity,
      milesReward: milesReward ?? 0,
      qrPayload: `event_${randomUUID()}`,
      isPaid: isPaid ?? false,
      price: price ?? null,
      tierRequired: tierRequired ?? null,
      createdBy: null,
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: 'event_create',
      targetType: 'event',
      targetId: event.id,
      afterValue: { title, type, startAt, capacity },
    },
  })

  return successResponse(event, 201)
})

export const PATCH = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { eventId, ...updates } = body

  if (!eventId) {
    throw new AppError('イベントIDが必要です', 'MISSING_EVENT_ID', 400)
  }

  const existing = await prisma.event.findUnique({
    where: { id: eventId },
  })
  if (!existing) {
    throw new AppError('イベントが見つかりません', 'EVENT_NOT_FOUND', 404)
  }

  const allowedFields = ['title', 'description', 'type', 'startAt', 'endAt', 'location', 'onlineUrl', 'capacity', 'milesReward', 'status', 'isPaid', 'price', 'tierRequired']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      if (field === 'startAt' || field === 'endAt') {
        updateData[field] = new Date(updates[field])
      } else {
        updateData[field] = updates[field]
      }
    }
  }

  if (updates.status) {
    const validStatuses = ['upcoming', 'ongoing', 'completed', 'cancelled']
    if (!validStatuses.includes(updates.status)) {
      throw new AppError('無効なステータスです', 'INVALID_STATUS', 400)
    }
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
    include: {
      _count: { select: { attendees: true } },
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: `event_${updates.status ?? 'update'}`,
      targetType: 'event',
      targetId: eventId,
      beforeValue: { status: existing.status, title: existing.title },
      afterValue: updateData as Record<string, string | number | boolean | null>,
    },
  })

  return successResponse(updated)
})
