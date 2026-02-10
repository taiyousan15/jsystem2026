import { withAdmin } from '@/lib/admin-handler'
import { successResponse, paginatedResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const includeInactive = url.searchParams.get('includeInactive') === 'true'

  const where = includeInactive ? {} : { isActive: true }
  const [rules, total] = await Promise.all([
    prisma.mileRule.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.mileRule.count({ where }),
  ])

  return paginatedResponse(rules, total, page, limit)
})

export const POST = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { actionCode, actionName, baseMiles, dailyLimit, cooldownSeconds, conditions } = body

  if (!actionCode || !actionName || baseMiles == null) {
    throw new AppError('必須項目が不足しています', 'MISSING_FIELDS', 400)
  }

  if (typeof baseMiles !== 'number' || baseMiles < 1) {
    throw new AppError('基本マイル数は1以上の数値です', 'INVALID_MILES', 400)
  }

  const existingRule = await prisma.mileRule.findUnique({
    where: { actionCode },
  })
  if (existingRule) {
    throw new AppError('このアクションコードは既に存在します', 'DUPLICATE_ACTION_CODE', 409)
  }

  const rule = await prisma.mileRule.create({
    data: {
      actionCode,
      actionName,
      baseMiles,
      dailyLimit: dailyLimit ?? null,
      cooldownSeconds: cooldownSeconds ?? 5,
      conditions: conditions ?? {},
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: 'mile_rule_create',
      targetType: 'mile_rule',
      targetId: rule.id,
      afterValue: { actionCode, actionName, baseMiles },
    },
  })

  return successResponse(rule, 201)
})

export const PATCH = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { ruleId, ...updates } = body

  if (!ruleId) {
    throw new AppError('ルールIDが必要です', 'MISSING_RULE_ID', 400)
  }

  const existing = await prisma.mileRule.findUnique({
    where: { id: ruleId },
  })
  if (!existing) {
    throw new AppError('ルールが見つかりません', 'RULE_NOT_FOUND', 404)
  }

  const allowedFields = ['actionName', 'baseMiles', 'dailyLimit', 'cooldownSeconds', 'isActive', 'conditions']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
    }
  }

  const updated = await prisma.mileRule.update({
    where: { id: ruleId },
    data: updateData,
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: 'mile_rule_update',
      targetType: 'mile_rule',
      targetId: ruleId,
      beforeValue: { actionName: existing.actionName, baseMiles: existing.baseMiles, isActive: existing.isActive },
      afterValue: updateData,
    },
  })

  return successResponse(updated)
})
