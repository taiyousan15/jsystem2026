import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockCatalogItem,
  createMockExchangeRequest,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockExchangeService = {
  getCatalog: vi.fn(),
  requestExchange: vi.fn(),
  getMyExchanges: vi.fn(),
}

vi.mock('@/services/exchange.service', () => ({
  exchangeService: mockExchangeService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET, POST } = await import('@/app/api/v1/exchange/route')

describe('Exchange API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/exchange', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/exchange')
      const res = await GET(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should return catalog items with pagination', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const items = [createMockCatalogItem(), createMockCatalogItem()]
      mockExchangeService.getCatalog.mockResolvedValue({
        items,
        total: 2,
      })

      const req = createRequest('/api/v1/exchange', {
        searchParams: { page: '1', limit: '20' },
      })
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number; page: number; limit: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.meta.total).toBe(2)
    })

    it('should pass category filter', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockExchangeService.getCatalog.mockResolvedValue({
        items: [],
        total: 0,
      })

      const req = createRequest('/api/v1/exchange', {
        searchParams: { category: 'digital' },
      })
      await GET(req)

      expect(mockExchangeService.getCatalog).toHaveBeenCalledWith(
        1,
        20,
        'digital'
      )
    })

    it('should return my exchanges when view=my', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const requests = [createMockExchangeRequest()]
      mockExchangeService.getMyExchanges.mockResolvedValue({
        requests,
        total: 1,
      })

      const req = createRequest('/api/v1/exchange', {
        searchParams: { view: 'my' },
      })
      const res = await GET(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.data).toHaveLength(1)
      expect(body.meta.total).toBe(1)
      expect(mockExchangeService.getMyExchanges).toHaveBeenCalledWith(
        'clerk_user1',
        1,
        20
      )
    })
  })

  describe('POST /api/v1/exchange', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/exchange', {
        method: 'POST',
        body: { catalogItemId: 'item-1' },
      })
      const res = await POST(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should exchange item successfully', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const exchangeReq = createMockExchangeRequest({
        catalogItemId: 'item-1',
        milesSpent: 500,
      })
      mockExchangeService.requestExchange.mockResolvedValue(exchangeReq)

      const req = createRequest('/api/v1/exchange', {
        method: 'POST',
        body: { catalogItemId: 'item-1' },
      })
      const res = await POST(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { catalogItemId: string }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.catalogItemId).toBe('item-1')
    })

    it('should pass shippingAddressId for physical items', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockExchangeService.requestExchange.mockResolvedValue(
        createMockExchangeRequest()
      )

      const req = createRequest('/api/v1/exchange', {
        method: 'POST',
        body: { catalogItemId: 'item-1', shippingAddressId: 'addr-1' },
      })
      await POST(req)

      expect(mockExchangeService.requestExchange).toHaveBeenCalledWith(
        'clerk_user1',
        'item-1',
        'addr-1'
      )
    })
  })
})
