import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockUser,
  createMockPointBalance,
  createMockTransaction,
  createMockMileRule,
  createMockUserRepository,
  createMockMileRepository,
  resetIdCounter,
} from '@/__tests__/helpers/mocks'

// Mock dependencies before importing service
const mockUserRepo = createMockUserRepository()
const mockMileRepo = createMockMileRepository()
const mockRedis = { get: vi.fn(), set: vi.fn() }

vi.mock('@/repositories/user.repository', () => ({
  userRepository: mockUserRepo,
}))

vi.mock('@/repositories/mile.repository', () => ({
  mileRepository: mockMileRepo,
}))

vi.mock('@/lib/redis', () => ({
  redis: mockRedis,
}))

// Import after mocks
const { mileService } = await import('@/services/mile.service')

describe('mileService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
  })

  describe('getBalance', () => {
    it('should return point balance for valid user', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)

      const result = await mileService.getBalance('clerk_test')

      expect(result).toEqual(user.pointBalance)
      expect(mockUserRepo.findByClerkId).toHaveBeenCalledWith('clerk_test')
    })

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(mileService.getBalance('invalid')).rejects.toThrow(
        'ユーザーが見つかりません'
      )
    })

    it('should throw BALANCE_NOT_FOUND when balance is null', async () => {
      const user = createMockUser({ pointBalance: null })
      mockUserRepo.findByClerkId.mockResolvedValue(user)

      await expect(mileService.getBalance('clerk_test')).rejects.toThrow(
        'マイル残高が初期化されていません'
      )
    })
  })

  describe('earnMiles', () => {
    it('should earn miles successfully', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ baseMiles: 200 })
      const transaction = createMockTransaction({ amount: 200 })
      const newBalance = createMockPointBalance({ totalMiles: 1200, tier: 'silver' })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockMileRepo.earnMiles.mockResolvedValue(transaction)
      mockMileRepo.getBalance.mockResolvedValue(newBalance)

      const result = await mileService.earnMiles('clerk_test', 'test_action')

      expect(result.transaction).toEqual(transaction)
      expect(result.newBalance).toBe(1200)
      expect(result.tierChanged).toBe(false)
      expect(result.newTier).toBe('silver')
    })

    it('should detect tier change', async () => {
      const user = createMockUser({
        pointBalance: createMockPointBalance({ tier: 'bronze' }),
      })
      const rule = createMockMileRule({ baseMiles: 1000 })
      const transaction = createMockTransaction({ amount: 1000 })
      const newBalance = createMockPointBalance({ totalMiles: 1000, tier: 'silver' })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockMileRepo.earnMiles.mockResolvedValue(transaction)
      mockMileRepo.getBalance.mockResolvedValue(newBalance)

      const result = await mileService.earnMiles('clerk_test', 'test_action')

      expect(result.tierChanged).toBe(true)
      expect(result.newTier).toBe('silver')
    })

    it('should throw when user not found', async () => {
      mockUserRepo.findByClerkId.mockResolvedValue(null)

      await expect(
        mileService.earnMiles('invalid', 'test_action')
      ).rejects.toThrow('ユーザーが見つかりません')
    })

    it('should throw when action code is invalid', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(null)

      await expect(
        mileService.earnMiles('clerk_test', 'invalid_action')
      ).rejects.toThrow('無効なアクションコードです')
    })

    it('should throw when action code is inactive', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ isActive: false })
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)

      await expect(
        mileService.earnMiles('clerk_test', 'test_action')
      ).rejects.toThrow('無効なアクションコードです')
    })

    it('should throw when daily limit reached', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ dailyLimit: 3 })
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockMileRepo.countTodayEarns.mockResolvedValue(3)

      await expect(
        mileService.earnMiles('clerk_test', 'test_action')
      ).rejects.toThrow('本日の上限に達しました')
    })

    it('should allow when under daily limit', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ dailyLimit: 3 })
      const transaction = createMockTransaction()
      const balance = createMockPointBalance()

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockMileRepo.countTodayEarns.mockResolvedValue(2)
      mockMileRepo.earnMiles.mockResolvedValue(transaction)
      mockMileRepo.getBalance.mockResolvedValue(balance)

      const result = await mileService.earnMiles('clerk_test', 'test_action')
      expect(result.transaction).toEqual(transaction)
    })

    it('should throw when cooldown is active', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ cooldownSeconds: 60 })
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockRedis.get.mockResolvedValue('1')

      await expect(
        mileService.earnMiles('clerk_test', 'test_action')
      ).rejects.toThrow('クールダウン中です')
    })

    it('should set cooldown after earning', async () => {
      const user = createMockUser()
      const rule = createMockMileRule({ cooldownSeconds: 60 })
      const transaction = createMockTransaction()
      const balance = createMockPointBalance()

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockRedis.get.mockResolvedValue(null)
      mockMileRepo.earnMiles.mockResolvedValue(transaction)
      mockMileRepo.getBalance.mockResolvedValue(balance)

      await mileService.earnMiles('clerk_test', 'test_action')

      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining('cooldown:'),
        '1',
        { ex: 60 }
      )
    })

    it('should pass metadata to earnMiles', async () => {
      const user = createMockUser()
      const rule = createMockMileRule()
      const transaction = createMockTransaction()
      const balance = createMockPointBalance()
      const metadata = { source: 'chatwork', messageId: '123' }

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getRuleByActionCode.mockResolvedValue(rule)
      mockMileRepo.earnMiles.mockResolvedValue(transaction)
      mockMileRepo.getBalance.mockResolvedValue(balance)

      await mileService.earnMiles('clerk_test', 'test_action', metadata)

      expect(mockMileRepo.earnMiles).toHaveBeenCalledWith(
        user.id,
        rule.baseMiles,
        'test_action',
        metadata
      )
    })
  })

  describe('redeemMiles', () => {
    it('should redeem miles successfully', async () => {
      const user = createMockUser()
      const balance = createMockPointBalance({ totalMiles: 1000 })
      const transaction = createMockTransaction({ amount: -500, type: 'redeem' })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getBalance.mockResolvedValue(balance)
      mockMileRepo.redeemMiles.mockResolvedValue(transaction)

      const result = await mileService.redeemMiles('clerk_test', 500, 'exchange:item1')

      expect(result).toEqual(transaction)
      expect(mockMileRepo.redeemMiles).toHaveBeenCalledWith(
        user.id, 500, 'exchange:item1', {}
      )
    })

    it('should throw when insufficient miles', async () => {
      const user = createMockUser()
      const balance = createMockPointBalance({ totalMiles: 100 })

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getBalance.mockResolvedValue(balance)

      await expect(
        mileService.redeemMiles('clerk_test', 500, 'exchange:item1')
      ).rejects.toThrow('マイルが不足しています')
    })

    it('should throw when balance is null', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getBalance.mockResolvedValue(null)

      await expect(
        mileService.redeemMiles('clerk_test', 500, 'exchange:item1')
      ).rejects.toThrow('マイルが不足しています')
    })
  })

  describe('getHistory', () => {
    it('should return transaction history', async () => {
      const user = createMockUser()
      const transactions = [createMockTransaction(), createMockTransaction()]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getTransactions.mockResolvedValue({
        transactions,
        total: 2,
      })

      const result = await mileService.getHistory('clerk_test', {
        page: 1,
        limit: 20,
      })

      expect(result.transactions).toHaveLength(2)
      expect(result.total).toBe(2)
    })

    it('should pass type filter', async () => {
      const user = createMockUser()
      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getTransactions.mockResolvedValue({
        transactions: [],
        total: 0,
      })

      await mileService.getHistory('clerk_test', {
        page: 1,
        limit: 20,
        type: 'earn',
      })

      expect(mockMileRepo.getTransactions).toHaveBeenCalledWith(user.id, {
        page: 1,
        limit: 20,
        type: 'earn',
      })
    })
  })

  describe('getExpiringMiles', () => {
    it('should return expiring miles', async () => {
      const user = createMockUser()
      const expiring = [createMockTransaction()]

      mockUserRepo.findByClerkId.mockResolvedValue(user)
      mockMileRepo.getExpiringMiles.mockResolvedValue(expiring)

      const result = await mileService.getExpiringMiles('clerk_test', 30)

      expect(result).toEqual(expiring)
      expect(mockMileRepo.getExpiringMiles).toHaveBeenCalledWith(user.id, 30)
    })
  })

  describe('getRules', () => {
    it('should return active rules', async () => {
      const rules = [createMockMileRule(), createMockMileRule({ actionCode: 'other' })]
      mockMileRepo.getActiveRules.mockResolvedValue(rules)

      const result = await mileService.getRules()

      expect(result).toEqual(rules)
    })
  })
})
