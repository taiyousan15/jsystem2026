import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockCatalogItem,
  createMockExchangeRequest,
  createMockUserRepository,
  createMockExchangeRepository,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { AppError, InsufficientMilesError } from '@/lib/errors'

const mockUserRepo = createMockUserRepository()
const mockExchangeRepo = createMockExchangeRepository()

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/repositories/exchange.repository', () => ({
  exchangeRepository: mockExchangeRepo,
}))

const { exchangeService } = await import('@/services/exchange.service')

describe('exchangeService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('getCatalog', () => {
    it('should return catalog items with pagination', async () => {
      const items = [createMockCatalogItem(), createMockCatalogItem()]
      mockExchangeRepo.getCatalogItems.mockResolvedValue({
        items,
        total: 2,
      })

      const result = await exchangeService.getCatalog(1, 50)

      expect(result.items).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(mockExchangeRepo.getCatalogItems).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
      })
    })

    it('should pass category filter', async () => {
      mockExchangeRepo.getCatalogItems.mockResolvedValue({
        items: [],
        total: 0,
      })

      await exchangeService.getCatalog(1, 50, 'physical')

      expect(mockExchangeRepo.getCatalogItems).toHaveBeenCalledWith({
        page: 1,
        limit: 50,
        category: 'physical',
      })
    })
  })

  describe('requestExchange', () => {
    it('should exchange digital item successfully via atomic transaction', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({
        id: 'item-1',
        category: 'digital',
        requiredMiles: 500,
      })
      const request = createMockExchangeRequest({
        userId: user.id,
        catalogItemId: 'item-1',
        milesSpent: 500,
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)
      mockExchangeRepo.executeExchangeAtomic.mockResolvedValue(request)

      const result = await exchangeService.requestExchange('clerk_test', 'item-1')

      expect(result).toEqual(request)
      expect(mockExchangeRepo.executeExchangeAtomic).toHaveBeenCalledWith({
        userId: user.id,
        catalogItemId: 'item-1',
        shippingAddressId: undefined,
      })
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        exchangeService.requestExchange('invalid', 'item-1')
      ).rejects.toThrow('ユーザーが見つかりません')
    })

    it('should propagate ITEM_NOT_FOUND from atomic transaction', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(null)
      mockExchangeRepo.executeExchangeAtomic.mockRejectedValue(
        new AppError('商品が見つかりません', 'ITEM_NOT_FOUND', 404)
      )

      await expect(
        exchangeService.requestExchange('clerk_test', 'invalid')
      ).rejects.toThrow('商品が見つかりません')
    })

    it('should propagate OUT_OF_STOCK from atomic transaction', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({ stock: 0 })
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)
      mockExchangeRepo.executeExchangeAtomic.mockRejectedValue(
        new AppError('在庫がありません', 'OUT_OF_STOCK', 400)
      )

      await expect(
        exchangeService.requestExchange('clerk_test', item.id)
      ).rejects.toThrow('在庫がありません')
    })

    it('should propagate InsufficientMilesError from atomic transaction', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({ requiredMiles: 5000 })
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)
      mockExchangeRepo.executeExchangeAtomic.mockRejectedValue(
        new InsufficientMilesError()
      )

      await expect(
        exchangeService.requestExchange('clerk_test', item.id)
      ).rejects.toThrow('マイルが不足しています')
    })

    it('should allow exchange when stock is null (unlimited)', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({ stock: null, requiredMiles: 100 })
      const request = createMockExchangeRequest()

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)
      mockExchangeRepo.executeExchangeAtomic.mockResolvedValue(request)

      const result = await exchangeService.requestExchange('clerk_test', item.id)

      expect(result).toEqual(request)
    })

    it('should throw when physical item has no shipping address', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({
        category: 'physical',
        requiredMiles: 500,
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)

      await expect(
        exchangeService.requestExchange('clerk_test', item.id)
      ).rejects.toThrow('配送先住所が必要です')
      // executeExchangeAtomic should NOT be called (fast-fail before transaction)
      expect(mockExchangeRepo.executeExchangeAtomic).not.toHaveBeenCalled()
    })

    it('should accept physical item with shipping address', async () => {
      const user = createMockUser()
      const item = createMockCatalogItem({
        id: 'phys-1',
        category: 'physical',
        requiredMiles: 500,
      })
      const request = createMockExchangeRequest({
        shippingAddressId: 'addr-1',
      })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getCatalogItem.mockResolvedValue(item)
      mockExchangeRepo.executeExchangeAtomic.mockResolvedValue(request)

      const result = await exchangeService.requestExchange(
        'clerk_test',
        'phys-1',
        'addr-1'
      )

      expect(result.shippingAddressId).toBe('addr-1')
      expect(mockExchangeRepo.executeExchangeAtomic).toHaveBeenCalledWith({
        userId: user.id,
        catalogItemId: 'phys-1',
        shippingAddressId: 'addr-1',
      })
    })
  })

  describe('getMyExchanges', () => {
    it('should return user exchange requests', async () => {
      const user = createMockUser()
      const requests = [createMockExchangeRequest()]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockExchangeRepo.getUserExchangeRequests.mockResolvedValue({
        requests,
        total: 1,
      })

      const result = await exchangeService.getMyExchanges('clerk_test', 1, 20)

      expect(result.requests).toHaveLength(1)
      expect(result.total).toBe(1)
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        exchangeService.getMyExchanges('invalid', 1, 20)
      ).rejects.toThrow('ユーザーが見つかりません')
    })
  })
})
