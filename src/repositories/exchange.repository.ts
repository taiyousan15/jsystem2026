import { prisma } from '@/lib/db'
import { InsufficientMilesError, AppError } from '@/lib/errors'
import type { CatalogItem, ExchangeRequest, Prisma } from '@prisma/client'

export const exchangeRepository = {
  async getCatalogItems(params: {
    page: number
    limit: number
    category?: string
  }): Promise<{ items: CatalogItem[]; total: number }> {
    const where: Prisma.CatalogItemWhereInput = {
      isActive: true,
      OR: [{ stock: null }, { stock: { gt: 0 } }],
      ...(params.category ? { category: params.category } : {}),
    }
    const [items, total] = await Promise.all([
      prisma.catalogItem.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { requiredMiles: 'asc' },
      }),
      prisma.catalogItem.count({ where }),
    ])
    return { items, total }
  },

  async getCatalogItem(id: string): Promise<CatalogItem | null> {
    return prisma.catalogItem.findUnique({ where: { id } })
  },

  async createExchangeRequest(data: {
    userId: string
    catalogItemId: string
    milesSpent: number
    shippingAddressId?: string
  }): Promise<ExchangeRequest> {
    return prisma.$transaction(async (tx) => {
      const item = await tx.catalogItem.findUnique({
        where: { id: data.catalogItemId },
      })
      if (!item || (item.stock !== null && item.stock <= 0)) {
        throw new Error('在庫がありません')
      }

      if (item.stock !== null) {
        await tx.catalogItem.update({
          where: { id: data.catalogItemId },
          data: { stock: { decrement: 1 } },
        })
      }

      return tx.exchangeRequest.create({
        data: {
          userId: data.userId,
          catalogItemId: data.catalogItemId,
          milesSpent: data.milesSpent,
          shippingAddressId: data.shippingAddressId ?? null,
          status: 'pending',
        },
      })
    })
  },

  async executeExchangeAtomic(data: {
    userId: string
    catalogItemId: string
    shippingAddressId?: string
  }): Promise<ExchangeRequest> {
    return prisma.$transaction(async (tx) => {
      // 1. Validate item exists and is active
      const item = await tx.catalogItem.findUnique({
        where: { id: data.catalogItemId },
      })
      if (!item || !item.isActive) {
        throw new AppError('商品が見つかりません', 'ITEM_NOT_FOUND', 404)
      }

      // 2. Atomic stock check + decrement (only for items with limited stock)
      if (item.stock !== null) {
        const stockResult = await tx.catalogItem.updateMany({
          where: { id: data.catalogItemId, stock: { gte: 1 } },
          data: { stock: { decrement: 1 } },
        })
        if (stockResult.count === 0) {
          throw new AppError('在庫がありません', 'OUT_OF_STOCK', 400)
        }
      }

      // 3. Atomic balance check + deduction (prevents double-spend)
      const balanceResult = await tx.pointBalance.updateMany({
        where: { userId: data.userId, totalMiles: { gte: item.requiredMiles } },
        data: { totalMiles: { decrement: item.requiredMiles } },
      })
      if (balanceResult.count === 0) {
        throw new InsufficientMilesError()
      }

      // 4. Create redeem transaction record
      await tx.pointTransaction.create({
        data: {
          userId: data.userId,
          amount: -item.requiredMiles,
          type: 'redeem',
          source: `exchange:${data.catalogItemId}`,
        },
      })

      // 5. Create exchange request
      return tx.exchangeRequest.create({
        data: {
          userId: data.userId,
          catalogItemId: data.catalogItemId,
          milesSpent: item.requiredMiles,
          shippingAddressId: data.shippingAddressId ?? null,
          status: 'pending',
        },
      })
    })
  },

  async getUserExchangeRequests(
    userId: string,
    params: { page: number; limit: number }
  ): Promise<{ requests: (ExchangeRequest & { catalogItem: CatalogItem })[]; total: number }> {
    const where = { userId }
    const [requests, total] = await Promise.all([
      prisma.exchangeRequest.findMany({
        where,
        include: { catalogItem: true },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.exchangeRequest.count({ where }),
    ])
    return { requests, total }
  },
}
