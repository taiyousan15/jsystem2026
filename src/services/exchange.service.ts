import { exchangeRepository } from '@/repositories/exchange.repository'
import { userRepository } from '@/repositories/user.repository'
import { AppError } from '@/lib/errors'
import type { CatalogItem, ExchangeRequest } from '@prisma/client'

export const exchangeService = {
  async getCatalog(
    page: number,
    limit: number,
    category?: string
  ): Promise<{ items: CatalogItem[]; total: number }> {
    return exchangeRepository.getCatalogItems({ page, limit, category })
  },

  async requestExchange(
    clerkId: string,
    catalogItemId: string,
    shippingAddressId?: string
  ): Promise<ExchangeRequest> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    // Pre-validate shipping address for physical items (fast-fail before transaction)
    const item = await exchangeRepository.getCatalogItem(catalogItemId)
    if (item?.category === 'physical' && !shippingAddressId) {
      throw new AppError('配送先住所が必要です', 'SHIPPING_ADDRESS_REQUIRED', 400)
    }

    // All critical operations (item validation, stock decrement, balance check,
    // miles deduction, exchange creation) happen atomically in a single transaction.
    // This prevents TOCTOU race conditions for double-spend and oversell.
    return exchangeRepository.executeExchangeAtomic({
      userId: user.id,
      catalogItemId,
      shippingAddressId,
    })
  },

  async getMyExchanges(
    clerkId: string,
    page: number,
    limit: number
  ): Promise<{ requests: (ExchangeRequest & { catalogItem: CatalogItem })[]; total: number }> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }
    return exchangeRepository.getUserExchangeRequests(user.id, { page, limit })
  },
}
