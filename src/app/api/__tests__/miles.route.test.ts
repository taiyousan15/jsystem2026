import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockPointBalance,
  createMockTransaction,
  createMockMileRule,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
}))

const mockMileService = {
  getBalance: vi.fn(),
  earnMiles: vi.fn(),
  getHistory: vi.fn(),
  getExpiringMiles: vi.fn(),
  getRules: vi.fn(),
}

vi.mock('@/services/mile.service', () => ({
  mileService: mockMileService,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const { GET: getBalance } = await import('@/app/api/v1/miles/balance/route')
const { POST: postEarn } = await import('@/app/api/v1/miles/earn/route')
const { GET: getHistory } = await import('@/app/api/v1/miles/history/route')
const { GET: getExpiring } = await import('@/app/api/v1/miles/expiring/route')
const { GET: getRules } = await import('@/app/api/v1/miles/rules/route')

describe('Miles API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('GET /api/v1/miles/balance', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/miles/balance')
      const res = await getBalance(req)
      const { status, body } = await parseResponse(res)

      expect(status).toBe(401)
      expect(body).toEqual({ success: false, error: '認証が必要です' })
    })

    it('should return balance for authenticated user', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const balance = createMockPointBalance({
        totalMiles: 1500,
        lifetimeMiles: 3000,
        tier: 'silver',
      })
      mockMileService.getBalance.mockResolvedValue(balance)

      const req = createRequest('/api/v1/miles/balance')
      const res = await getBalance(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: { totalMiles: number; lifetimeMiles: number; tier: string }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.totalMiles).toBe(1500)
      expect(body.data.lifetimeMiles).toBe(3000)
      expect(body.data.tier).toBe('silver')
    })

    it('should call service with correct clerkId', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_abc123' })
      mockMileService.getBalance.mockResolvedValue(createMockPointBalance())

      const req = createRequest('/api/v1/miles/balance')
      await getBalance(req)

      expect(mockMileService.getBalance).toHaveBeenCalledWith('clerk_abc123')
    })
  })

  describe('POST /api/v1/miles/earn', () => {
    it('should return 401 when unauthenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null })
      const req = createRequest('/api/v1/miles/earn', {
        method: 'POST',
        body: { actionCode: 'daily_login' },
      })
      const res = await postEarn(req)
      const { status } = await parseResponse(res)

      expect(status).toBe(401)
    })

    it('should earn miles with valid action code', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const transaction = createMockTransaction({ amount: 100 })
      mockMileService.earnMiles.mockResolvedValue({
        transaction,
        newBalance: 1100,
        tierChanged: false,
        newTier: 'silver',
      })

      const req = createRequest('/api/v1/miles/earn', {
        method: 'POST',
        body: { actionCode: 'daily_login' },
      })
      const res = await postEarn(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: {
          transaction: unknown
          newBalance: number
          tierChanged: boolean
          newTier: string
        }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data.newBalance).toBe(1100)
      expect(body.data.tierChanged).toBe(false)
      expect(body.data.newTier).toBe('silver')
    })

    it('should pass metadata to service', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const transaction = createMockTransaction()
      mockMileService.earnMiles.mockResolvedValue({
        transaction,
        newBalance: 1000,
        tierChanged: false,
        newTier: 'silver',
      })

      const req = createRequest('/api/v1/miles/earn', {
        method: 'POST',
        body: { actionCode: 'chat_message', metadata: { roomId: '123' } },
      })
      await postEarn(req)

      expect(mockMileService.earnMiles).toHaveBeenCalledWith(
        'clerk_user1',
        'chat_message',
        { roomId: '123' }
      )
    })

    it('should default metadata to empty object', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const transaction = createMockTransaction()
      mockMileService.earnMiles.mockResolvedValue({
        transaction,
        newBalance: 1000,
        tierChanged: false,
        newTier: 'silver',
      })

      const req = createRequest('/api/v1/miles/earn', {
        method: 'POST',
        body: { actionCode: 'daily_login' },
      })
      await postEarn(req)

      expect(mockMileService.earnMiles).toHaveBeenCalledWith(
        'clerk_user1',
        'daily_login',
        {}
      )
    })
  })

  describe('GET /api/v1/miles/history', () => {
    it('should return paginated history', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const transactions = [createMockTransaction(), createMockTransaction()]
      mockMileService.getHistory.mockResolvedValue({
        transactions,
        total: 2,
      })

      const req = createRequest('/api/v1/miles/history', {
        searchParams: { page: '1', limit: '20' },
      })
      const res = await getHistory(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
        meta: { total: number; page: number; limit: number }
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
      expect(body.meta).toEqual({ total: 2, page: 1, limit: 20 })
    })

    it('should pass type filter', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockMileService.getHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      })

      const req = createRequest('/api/v1/miles/history', {
        searchParams: { type: 'earn' },
      })
      await getHistory(req)

      expect(mockMileService.getHistory).toHaveBeenCalledWith('clerk_user1', {
        page: 1,
        limit: 20,
        type: 'earn',
      })
    })

    it('should clamp page and limit values', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockMileService.getHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      })

      const req = createRequest('/api/v1/miles/history', {
        searchParams: { page: '-5', limit: '999' },
      })
      await getHistory(req)

      expect(mockMileService.getHistory).toHaveBeenCalledWith('clerk_user1', {
        page: 1,
        limit: 50,
        type: undefined,
      })
    })

    it('should default to page 1 and limit 20', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockMileService.getHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      })

      const req = createRequest('/api/v1/miles/history')
      await getHistory(req)

      expect(mockMileService.getHistory).toHaveBeenCalledWith('clerk_user1', {
        page: 1,
        limit: 20,
        type: undefined,
      })
    })
  })

  describe('GET /api/v1/miles/expiring', () => {
    it('should return expiring miles with default 30 days', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const transactions = [createMockTransaction()]
      mockMileService.getExpiringMiles.mockResolvedValue(transactions)

      const req = createRequest('/api/v1/miles/expiring')
      const res = await getExpiring(req)
      const { status, body } = await parseResponse<{ success: boolean }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(mockMileService.getExpiringMiles).toHaveBeenCalledWith(
        'clerk_user1',
        30
      )
    })

    it('should clamp days to max 90', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockMileService.getExpiringMiles.mockResolvedValue([])

      const req = createRequest('/api/v1/miles/expiring', {
        searchParams: { days: '200' },
      })
      await getExpiring(req)

      expect(mockMileService.getExpiringMiles).toHaveBeenCalledWith(
        'clerk_user1',
        90
      )
    })

    it('should clamp days to min 1', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      mockMileService.getExpiringMiles.mockResolvedValue([])

      const req = createRequest('/api/v1/miles/expiring', {
        searchParams: { days: '-10' },
      })
      await getExpiring(req)

      expect(mockMileService.getExpiringMiles).toHaveBeenCalledWith(
        'clerk_user1',
        1
      )
    })
  })

  describe('GET /api/v1/miles/rules', () => {
    it('should return active rules', async () => {
      mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
      const rules = [createMockMileRule(), createMockMileRule({ actionCode: 'other' })]
      mockMileService.getRules.mockResolvedValue(rules)

      const req = createRequest('/api/v1/miles/rules')
      const res = await getRules(req)
      const { status, body } = await parseResponse<{
        success: boolean
        data: unknown[]
      }>(res)

      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.data).toHaveLength(2)
    })
  })
})
