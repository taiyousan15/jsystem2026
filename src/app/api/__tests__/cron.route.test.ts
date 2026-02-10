import { describe, it, expect, vi, beforeEach } from 'vitest'
import { parseResponse } from './helpers'

const mockPrisma = {
  pointTransaction: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
    create: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  },
  pointBalance: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  dailyMission: {
    updateMany: vi.fn(),
  },
  userStreak: {
    findMany: vi.fn(),
    updateMany: vi.fn(),
  },
  notification: {
    createMany: vi.fn(),
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
  referral: {
    updateMany: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/lib/db', () => ({ prisma: mockPrisma }))

const CRON_SECRET = 'test-cron-secret'

function createCronRequest(path: string, withAuth = true): Request {
  const headers: Record<string, string> = {}
  if (withAuth) {
    headers['authorization'] = `Bearer ${CRON_SECRET}`
  }
  return new Request(`http://localhost:3000${path}`, { headers })
}

describe('Cron Jobs', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubEnv('CRON_SECRET', CRON_SECRET)
  })

  describe('Auth', () => {
    it('returns 401 without authorization header', async () => {
      const { GET } = await import('../cron/expire-miles/route')
      const req = createCronRequest('/api/cron/expire-miles', false)
      const { status, body } = await parseResponse(await GET(req))
      expect(status).toBe(401)
      expect(body).toHaveProperty('error', 'Unauthorized')
    })

    it('returns 401 with wrong secret', async () => {
      const { GET } = await import('../cron/expire-miles/route')
      const req = new Request('http://localhost:3000/api/cron/expire-miles', {
        headers: { authorization: 'Bearer wrong-secret' },
      })
      const { status, body } = await parseResponse(await GET(req))
      expect(status).toBe(401)
      expect(body).toHaveProperty('error', 'Unauthorized')
    })

    it('returns 401 when CRON_SECRET is not set', async () => {
      vi.stubEnv('CRON_SECRET', '')
      vi.resetModules()
      const { GET } = await import('../cron/expire-miles/route')
      const req = createCronRequest('/api/cron/expire-miles')
      const { status } = await parseResponse(await GET(req))
      expect(status).toBe(401)
    })
  })

  describe('expire-miles', () => {
    it('returns 0 when no expired miles', async () => {
      const { GET } = await import('../cron/expire-miles/route')
      mockPrisma.pointTransaction.findMany.mockResolvedValue([])
      const req = createCronRequest('/api/cron/expire-miles')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.processed).toBe(0)
    })

    it('processes expired miles and deducts from balances', async () => {
      const { GET } = await import('../cron/expire-miles/route')
      const userId = 'user-1'
      mockPrisma.pointTransaction.findMany.mockResolvedValue([
        { id: 'tx-1', userId, amount: 100 },
        { id: 'tx-2', userId, amount: 50 },
      ])
      mockPrisma.$transaction.mockImplementation(async (fn: (tx: typeof mockPrisma) => Promise<void>) => {
        await fn(mockPrisma)
      })
      mockPrisma.pointTransaction.updateMany.mockResolvedValue({ count: 2 })
      mockPrisma.pointBalance.update.mockResolvedValue({})
      mockPrisma.pointTransaction.create.mockResolvedValue({})

      const req = createCronRequest('/api/cron/expire-miles')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.processed).toBe(2)
      expect(mockPrisma.pointBalance.update).toHaveBeenCalledWith({
        where: { userId },
        data: { totalMiles: { decrement: 150 } },
      })
    })
  })

  describe('reset-daily-missions', () => {
    it('expires incomplete daily missions', async () => {
      const { GET } = await import('../cron/reset-daily-missions/route')
      mockPrisma.dailyMission.updateMany.mockResolvedValue({ count: 5 })

      const req = createCronRequest('/api/cron/reset-daily-missions')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.success).toBe(true)
      expect(body.processed).toBe(5)
      expect(mockPrisma.dailyMission.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'expired' },
        })
      )
    })
  })

  describe('streak-reminder', () => {
    it('returns 0 when no at-risk streaks', async () => {
      const { GET } = await import('../cron/streak-reminder/route')
      mockPrisma.userStreak.findMany.mockResolvedValue([])

      const req = createCronRequest('/api/cron/streak-reminder')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(0)
    })

    it('sends reminders to users with at-risk streaks', async () => {
      const { GET } = await import('../cron/streak-reminder/route')
      mockPrisma.userStreak.findMany.mockResolvedValue([
        {
          userId: 'u1',
          currentStreak: 7,
          user: {
            notificationSettings: { streakReminder: true },
          },
        },
        {
          userId: 'u2',
          currentStreak: 5,
          user: {
            notificationSettings: { streakReminder: false },
          },
        },
      ])
      mockPrisma.notification.createMany.mockResolvedValue({ count: 1 })

      const req = createCronRequest('/api/cron/streak-reminder')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(1)
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ userId: 'u1', type: 'streak_reminder' }),
          ]),
        })
      )
    })
  })

  describe('expire-notifications', () => {
    it('deletes old read notifications', async () => {
      const { GET } = await import('../cron/expire-notifications/route')
      mockPrisma.notification.deleteMany.mockResolvedValue({ count: 42 })

      const req = createCronRequest('/api/cron/expire-notifications')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(42)
      expect(mockPrisma.notification.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ isRead: true }),
        })
      )
    })
  })

  describe('weekly-leaderboard-reset', () => {
    it('calculates weekly top earners', async () => {
      const { GET } = await import('../cron/weekly-leaderboard-reset/route')
      mockPrisma.pointTransaction.groupBy.mockResolvedValue([
        { userId: 'u1', _sum: { amount: 500 } },
        { userId: 'u2', _sum: { amount: 300 } },
      ])
      mockPrisma.user.findUnique
        .mockResolvedValueOnce({ displayName: 'Top User' })
        .mockResolvedValueOnce({ displayName: 'Second User' })
      mockPrisma.notification.create.mockResolvedValue({})

      const req = createCronRequest('/api/cron/weekly-leaderboard-reset')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(2)
      expect(mockPrisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u1',
            type: 'achievement',
          }),
        })
      )
    })
  })

  describe('monthly-reset', () => {
    it('resets freeze counts and expires old referrals', async () => {
      const { GET } = await import('../cron/monthly-reset/route')
      mockPrisma.userStreak.updateMany.mockResolvedValue({ count: 100 })
      mockPrisma.referral.updateMany.mockResolvedValue({ count: 3 })

      const req = createCronRequest('/api/cron/monthly-reset')
      const { status, body } = await parseResponse<{ success: boolean; processed: number }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(103)
      expect(mockPrisma.userStreak.updateMany).toHaveBeenCalledWith({
        data: { freezeRemaining: 2 },
      })
      expect(mockPrisma.referral.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'expired' },
        })
      )
    })
  })

  describe('balance-integrity-check', () => {
    it('reports consistent balances', async () => {
      const { GET } = await import('../cron/balance-integrity-check/route')
      mockPrisma.pointBalance.findMany.mockResolvedValue([
        { userId: 'u1', totalMiles: 500, lifetimeMiles: 1000 },
      ])
      mockPrisma.pointTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 500 },
      })

      const req = createCronRequest('/api/cron/balance-integrity-check')
      const { status, body } = await parseResponse<{ success: boolean; processed: number; details: string }>(await GET(req))
      expect(status).toBe(200)
      expect(body.processed).toBe(1)
      expect(body.details).toContain('consistent')
    })

    it('reports mismatches', async () => {
      const { GET } = await import('../cron/balance-integrity-check/route')
      mockPrisma.pointBalance.findMany.mockResolvedValue([
        { userId: 'u1', totalMiles: 500, lifetimeMiles: 1000 },
      ])
      mockPrisma.pointTransaction.aggregate.mockResolvedValue({
        _sum: { amount: 300 },
      })

      const req = createCronRequest('/api/cron/balance-integrity-check')
      const { status, body } = await parseResponse<{ success: boolean; details: string }>(await GET(req))
      expect(status).toBe(200)
      expect(body.details).toContain('1 mismatches')
    })
  })

  describe('error handling', () => {
    it('returns 500 when handler throws', async () => {
      const { GET } = await import('../cron/expire-miles/route')
      mockPrisma.pointTransaction.findMany.mockRejectedValue(new Error('DB connection failed'))

      const req = createCronRequest('/api/cron/expire-miles')
      const { status, body } = await parseResponse<{ success: boolean; error: string }>(await GET(req))
      expect(status).toBe(500)
      expect(body.success).toBe(false)
      expect(body.error).toBe('DB connection failed')
    })
  })
})
