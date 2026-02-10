import { withAdmin } from '@/lib/admin-handler'
import { successResponse, paginatedResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const status = url.searchParams.get('status') ?? undefined

  const where = status ? { status } : {}
  const [requests, total] = await Promise.all([
    prisma.exchangeRequest.findMany({
      where,
      include: {
        user: { select: { id: true, displayName: true, email: true } },
        catalogItem: { select: { id: true, name: true, category: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.exchangeRequest.count({ where }),
  ])

  return paginatedResponse(requests, total, page, limit)
})

export const PATCH = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { exchangeId, status, trackingNumber, adminNote } = body

  if (!exchangeId) {
    throw new AppError('交換申請IDが必要です', 'MISSING_EXCHANGE_ID', 400)
  }

  const validStatuses = ['approved', 'rejected', 'shipped', 'completed']
  if (status && !validStatuses.includes(status)) {
    throw new AppError('無効なステータスです', 'INVALID_STATUS', 400)
  }

  const existing = await prisma.exchangeRequest.findUnique({
    where: { id: exchangeId },
  })
  if (!existing) {
    throw new AppError('交換申請が見つかりません', 'EXCHANGE_NOT_FOUND', 404)
  }

  const updateData: Record<string, unknown> = {}
  if (status) updateData.status = status
  if (trackingNumber) updateData.trackingNumber = trackingNumber
  if (adminNote !== undefined) updateData.adminNote = adminNote

  const updated = await prisma.exchangeRequest.update({
    where: { id: exchangeId },
    data: updateData,
    include: {
      user: { select: { id: true, displayName: true } },
      catalogItem: { select: { id: true, name: true } },
    },
  })

  // Refund miles if rejected
  if (status === 'rejected') {
    await prisma.$transaction([
      prisma.pointBalance.update({
        where: { userId: existing.userId },
        data: { totalMiles: { increment: existing.milesSpent } },
      }),
      prisma.pointTransaction.create({
        data: {
          userId: existing.userId,
          amount: existing.milesSpent,
          type: 'refund',
          source: `exchange_rejected:${exchangeId}`,
        },
      }),
    ])
  }

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: `exchange_${status ?? 'update'}`,
      targetType: 'exchange_request',
      targetId: exchangeId,
      beforeValue: { status: existing.status },
      afterValue: updateData,
    },
  })

  return successResponse(updated)
})
