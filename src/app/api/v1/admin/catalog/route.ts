import { withAdmin } from '@/lib/admin-handler'
import { successResponse, paginatedResponse } from '@/lib/api-handler'
import { prisma } from '@/lib/db'
import { AppError } from '@/lib/errors'

export const GET = withAdmin(async (_clerkId, request) => {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? '20')))
  const category = url.searchParams.get('category') ?? undefined
  const includeInactive = url.searchParams.get('includeInactive') === 'true'

  const where = {
    ...(category ? { category } : {}),
    ...(includeInactive ? {} : { isActive: true }),
  }
  const [items, total] = await Promise.all([
    prisma.catalogItem.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.catalogItem.count({ where }),
  ])

  return paginatedResponse(items, total, page, limit)
})

export const POST = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { name, description, category, requiredMiles, stock, imageUrl } = body

  if (!name || !description || !category || requiredMiles == null) {
    throw new AppError('必須項目が不足しています', 'MISSING_FIELDS', 400)
  }

  if (typeof requiredMiles !== 'number' || requiredMiles < 1) {
    throw new AppError('必要マイル数は1以上の数値です', 'INVALID_MILES', 400)
  }

  const item = await prisma.catalogItem.create({
    data: {
      name,
      description,
      category,
      requiredMiles,
      stock: stock ?? null,
      imageUrl: imageUrl ?? null,
    },
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: 'catalog_create',
      targetType: 'catalog_item',
      targetId: item.id,
      afterValue: { name, category, requiredMiles },
    },
  })

  return successResponse(item, 201)
})

export const PATCH = withAdmin(async (clerkId, request) => {
  const body = await request.json()
  const { itemId, ...updates } = body

  if (!itemId) {
    throw new AppError('商品IDが必要です', 'MISSING_ITEM_ID', 400)
  }

  const existing = await prisma.catalogItem.findUnique({
    where: { id: itemId },
  })
  if (!existing) {
    throw new AppError('商品が見つかりません', 'ITEM_NOT_FOUND', 404)
  }

  const allowedFields = ['name', 'description', 'category', 'requiredMiles', 'stock', 'imageUrl', 'isActive']
  const updateData: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (updates[field] !== undefined) {
      updateData[field] = updates[field]
    }
  }

  const updated = await prisma.catalogItem.update({
    where: { id: itemId },
    data: updateData,
  })

  await prisma.auditLog.create({
    data: {
      adminId: clerkId,
      action: 'catalog_update',
      targetType: 'catalog_item',
      targetId: itemId,
      beforeValue: { name: existing.name, requiredMiles: existing.requiredMiles, isActive: existing.isActive },
      afterValue: updateData,
    },
  })

  return successResponse(updated)
})
