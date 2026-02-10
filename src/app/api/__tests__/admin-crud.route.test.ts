import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockCatalogItem, createMockExchangeRequest, createMockEvent, createMockMileRule, createMockUser, resetIdCounter } from '@/__tests__/helpers/mocks'
import { createRequest, parseResponse } from './helpers'

const mockAuth = vi.fn()
const mockCurrentUser = vi.fn()

vi.mock('@clerk/nextjs/server', () => ({
  auth: mockAuth,
  currentUser: mockCurrentUser,
}))

vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

const mockPrisma = {
  exchangeRequest: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  catalogItem: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  event: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  mileRule: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  pointBalance: {
    update: vi.fn(),
  },
  pointTransaction: {
    create: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn(),
}

vi.mock('@/lib/db', () => ({
  prisma: mockPrisma,
}))

const { GET: getExchanges, PATCH: patchExchanges } = await import(
  '@/app/api/v1/admin/exchanges/route'
)
const { GET: getCatalog, POST: postCatalog, PATCH: patchCatalog } = await import(
  '@/app/api/v1/admin/catalog/route'
)
const { GET: getEvents, POST: postEvents, PATCH: patchEvents } = await import(
  '@/app/api/v1/admin/events/route'
)
const { GET: getMileRules, POST: postMileRules, PATCH: patchMileRules } = await import(
  '@/app/api/v1/admin/mile-rules/route'
)

function setupAdmin() {
  mockAuth.mockResolvedValue({ userId: 'clerk_admin' })
  mockCurrentUser.mockResolvedValue({
    publicMetadata: { role: 'admin' },
  })
}

function setupMember() {
  mockAuth.mockResolvedValue({ userId: 'clerk_user1' })
  mockCurrentUser.mockResolvedValue({
    publicMetadata: { role: 'member' },
  })
}

describe('Admin CRUD API Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetIdCounter()
    mockPrisma.auditLog.create.mockResolvedValue({ id: 'audit-1' })
  })

  // ========================================
  // Exchanges
  // ========================================
  describe('Admin Exchanges', () => {
    describe('GET /api/v1/admin/exchanges', () => {
      it('should return 403 for non-admin', async () => {
        setupMember()
        const req = createRequest('/api/v1/admin/exchanges')
        const res = await getExchanges(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(403)
      })

      it('should return paginated exchange requests', async () => {
        setupAdmin()
        const requests = [createMockExchangeRequest()]
        mockPrisma.exchangeRequest.findMany.mockResolvedValue(requests)
        mockPrisma.exchangeRequest.count.mockResolvedValue(1)

        const req = createRequest('/api/v1/admin/exchanges', {
          searchParams: { page: '1', limit: '20' },
        })
        const res = await getExchanges(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: unknown[]
          meta: { total: number }
        }>(res)

        expect(status).toBe(200)
        expect(body.data).toHaveLength(1)
        expect(body.meta.total).toBe(1)
      })

      it('should filter by status', async () => {
        setupAdmin()
        mockPrisma.exchangeRequest.findMany.mockResolvedValue([])
        mockPrisma.exchangeRequest.count.mockResolvedValue(0)

        const req = createRequest('/api/v1/admin/exchanges', {
          searchParams: { status: 'pending' },
        })
        await getExchanges(req)

        expect(mockPrisma.exchangeRequest.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { status: 'pending' } })
        )
      })
    })

    describe('PATCH /api/v1/admin/exchanges', () => {
      it('should return 400 when exchangeId missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/exchanges', {
          method: 'PATCH',
          body: { status: 'approved' },
        })
        const res = await patchExchanges(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 400 for invalid status', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/exchanges', {
          method: 'PATCH',
          body: { exchangeId: 'ex-1', status: 'invalid' },
        })
        const res = await patchExchanges(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 404 when exchange not found', async () => {
        setupAdmin()
        mockPrisma.exchangeRequest.findUnique.mockResolvedValue(null)

        const req = createRequest('/api/v1/admin/exchanges', {
          method: 'PATCH',
          body: { exchangeId: 'not-found', status: 'approved' },
        })
        const res = await patchExchanges(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(404)
      })

      it('should update exchange status', async () => {
        setupAdmin()
        const existing = createMockExchangeRequest({ id: 'ex-1' })
        mockPrisma.exchangeRequest.findUnique.mockResolvedValue(existing)
        mockPrisma.exchangeRequest.update.mockResolvedValue({
          ...existing,
          status: 'approved',
        })

        const req = createRequest('/api/v1/admin/exchanges', {
          method: 'PATCH',
          body: { exchangeId: 'ex-1', status: 'approved' },
        })
        const res = await patchExchanges(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: { status: string }
        }>(res)

        expect(status).toBe(200)
        expect(body.success).toBe(true)
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })

      it('should refund miles on rejection', async () => {
        setupAdmin()
        const existing = createMockExchangeRequest({
          id: 'ex-1',
          userId: 'user-1',
          milesSpent: 500,
        })
        mockPrisma.exchangeRequest.findUnique.mockResolvedValue(existing)
        mockPrisma.exchangeRequest.update.mockResolvedValue({
          ...existing,
          status: 'rejected',
        })
        mockPrisma.$transaction.mockResolvedValue([{}, {}])

        const req = createRequest('/api/v1/admin/exchanges', {
          method: 'PATCH',
          body: { exchangeId: 'ex-1', status: 'rejected' },
        })
        const res = await patchExchanges(req)
        const { status } = await parseResponse(res)

        expect(status).toBe(200)
        expect(mockPrisma.$transaction).toHaveBeenCalled()
      })
    })
  })

  // ========================================
  // Catalog
  // ========================================
  describe('Admin Catalog', () => {
    describe('GET /api/v1/admin/catalog', () => {
      it('should return paginated catalog items', async () => {
        setupAdmin()
        const items = [createMockCatalogItem(), createMockCatalogItem()]
        mockPrisma.catalogItem.findMany.mockResolvedValue(items)
        mockPrisma.catalogItem.count.mockResolvedValue(2)

        const req = createRequest('/api/v1/admin/catalog')
        const res = await getCatalog(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: unknown[]
          meta: { total: number }
        }>(res)

        expect(status).toBe(200)
        expect(body.data).toHaveLength(2)
        expect(body.meta.total).toBe(2)
      })

      it('should filter by category', async () => {
        setupAdmin()
        mockPrisma.catalogItem.findMany.mockResolvedValue([])
        mockPrisma.catalogItem.count.mockResolvedValue(0)

        const req = createRequest('/api/v1/admin/catalog', {
          searchParams: { category: 'physical' },
        })
        await getCatalog(req)

        expect(mockPrisma.catalogItem.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({ category: 'physical', isActive: true }),
          })
        )
      })

      it('should include inactive items when requested', async () => {
        setupAdmin()
        mockPrisma.catalogItem.findMany.mockResolvedValue([])
        mockPrisma.catalogItem.count.mockResolvedValue(0)

        const req = createRequest('/api/v1/admin/catalog', {
          searchParams: { includeInactive: 'true' },
        })
        await getCatalog(req)

        const call = mockPrisma.catalogItem.findMany.mock.calls[0][0]
        expect(call.where).not.toHaveProperty('isActive')
      })
    })

    describe('POST /api/v1/admin/catalog', () => {
      it('should return 400 when required fields missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/catalog', {
          method: 'POST',
          body: { name: 'Test' },
        })
        const res = await postCatalog(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 400 for invalid requiredMiles', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/catalog', {
          method: 'POST',
          body: { name: 'Test', description: 'Desc', category: 'digital', requiredMiles: -1 },
        })
        const res = await postCatalog(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should create catalog item', async () => {
        setupAdmin()
        const item = createMockCatalogItem({ name: 'New Item' })
        mockPrisma.catalogItem.create.mockResolvedValue(item)

        const req = createRequest('/api/v1/admin/catalog', {
          method: 'POST',
          body: {
            name: 'New Item',
            description: 'Description',
            category: 'digital',
            requiredMiles: 500,
          },
        })
        const res = await postCatalog(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: { name: string }
        }>(res)

        expect(status).toBe(201)
        expect(body.success).toBe(true)
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })
    })

    describe('PATCH /api/v1/admin/catalog', () => {
      it('should return 400 when itemId missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/catalog', {
          method: 'PATCH',
          body: { name: 'Updated' },
        })
        const res = await patchCatalog(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 404 when item not found', async () => {
        setupAdmin()
        mockPrisma.catalogItem.findUnique.mockResolvedValue(null)

        const req = createRequest('/api/v1/admin/catalog', {
          method: 'PATCH',
          body: { itemId: 'not-found', name: 'Updated' },
        })
        const res = await patchCatalog(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(404)
      })

      it('should update catalog item', async () => {
        setupAdmin()
        const existing = createMockCatalogItem({ id: 'item-1' })
        mockPrisma.catalogItem.findUnique.mockResolvedValue(existing)
        mockPrisma.catalogItem.update.mockResolvedValue({
          ...existing,
          name: 'Updated',
        })

        const req = createRequest('/api/v1/admin/catalog', {
          method: 'PATCH',
          body: { itemId: 'item-1', name: 'Updated', isActive: false },
        })
        const res = await patchCatalog(req)
        const { status, body } = await parseResponse<{
          success: boolean
        }>(res)

        expect(status).toBe(200)
        expect(body.success).toBe(true)
        expect(mockPrisma.catalogItem.update).toHaveBeenCalledWith({
          where: { id: 'item-1' },
          data: { name: 'Updated', isActive: false },
        })
      })
    })
  })

  // ========================================
  // Events
  // ========================================
  describe('Admin Events', () => {
    describe('GET /api/v1/admin/events', () => {
      it('should return paginated events with attendee count', async () => {
        setupAdmin()
        const events = [{ ...createMockEvent(), _count: { attendees: 5 } }]
        mockPrisma.event.findMany.mockResolvedValue(events)
        mockPrisma.event.count.mockResolvedValue(1)

        const req = createRequest('/api/v1/admin/events')
        const res = await getEvents(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: unknown[]
          meta: { total: number }
        }>(res)

        expect(status).toBe(200)
        expect(body.data).toHaveLength(1)
      })

      it('should filter by status', async () => {
        setupAdmin()
        mockPrisma.event.findMany.mockResolvedValue([])
        mockPrisma.event.count.mockResolvedValue(0)

        const req = createRequest('/api/v1/admin/events', {
          searchParams: { status: 'upcoming' },
        })
        await getEvents(req)

        expect(mockPrisma.event.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { status: 'upcoming' } })
        )
      })
    })

    describe('POST /api/v1/admin/events', () => {
      it('should return 400 when required fields missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/events', {
          method: 'POST',
          body: { title: 'Test' },
        })
        const res = await postEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 400 for invalid date format', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/events', {
          method: 'POST',
          body: {
            title: 'Test',
            type: 'online',
            startAt: 'not-a-date',
            endAt: '2025-12-31',
            capacity: 30,
          },
        })
        const res = await postEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 400 when end is before start', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/events', {
          method: 'POST',
          body: {
            title: 'Test',
            type: 'online',
            startAt: '2025-12-31T10:00:00Z',
            endAt: '2025-12-31T09:00:00Z',
            capacity: 30,
          },
        })
        const res = await postEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should create event', async () => {
        setupAdmin()
        const event = createMockEvent({ title: 'New Event' })
        mockPrisma.event.create.mockResolvedValue(event)

        const req = createRequest('/api/v1/admin/events', {
          method: 'POST',
          body: {
            title: 'New Event',
            type: 'online',
            startAt: '2025-06-01T10:00:00Z',
            endAt: '2025-06-01T12:00:00Z',
            capacity: 30,
            milesReward: 500,
          },
        })
        const res = await postEvents(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: { title: string }
        }>(res)

        expect(status).toBe(201)
        expect(body.success).toBe(true)
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })
    })

    describe('PATCH /api/v1/admin/events', () => {
      it('should return 400 when eventId missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/events', {
          method: 'PATCH',
          body: { title: 'Updated' },
        })
        const res = await patchEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 404 when event not found', async () => {
        setupAdmin()
        mockPrisma.event.findUnique.mockResolvedValue(null)

        const req = createRequest('/api/v1/admin/events', {
          method: 'PATCH',
          body: { eventId: 'not-found' },
        })
        const res = await patchEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(404)
      })

      it('should return 400 for invalid event status', async () => {
        setupAdmin()
        const existing = createMockEvent({ id: 'ev-1' })
        mockPrisma.event.findUnique.mockResolvedValue(existing)

        const req = createRequest('/api/v1/admin/events', {
          method: 'PATCH',
          body: { eventId: 'ev-1', status: 'invalid_status' },
        })
        const res = await patchEvents(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should update event', async () => {
        setupAdmin()
        const existing = createMockEvent({ id: 'ev-1' })
        mockPrisma.event.findUnique.mockResolvedValue(existing)
        mockPrisma.event.update.mockResolvedValue({
          ...existing,
          status: 'cancelled',
          _count: { attendees: 0 },
        })

        const req = createRequest('/api/v1/admin/events', {
          method: 'PATCH',
          body: { eventId: 'ev-1', status: 'cancelled' },
        })
        const res = await patchEvents(req)
        const { status, body } = await parseResponse<{
          success: boolean
        }>(res)

        expect(status).toBe(200)
        expect(body.success).toBe(true)
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })
    })
  })

  // ========================================
  // Mile Rules
  // ========================================
  describe('Admin Mile Rules', () => {
    describe('GET /api/v1/admin/mile-rules', () => {
      it('should return paginated rules (active only by default)', async () => {
        setupAdmin()
        const rules = [createMockMileRule()]
        mockPrisma.mileRule.findMany.mockResolvedValue(rules)
        mockPrisma.mileRule.count.mockResolvedValue(1)

        const req = createRequest('/api/v1/admin/mile-rules')
        const res = await getMileRules(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: unknown[]
          meta: { total: number }
        }>(res)

        expect(status).toBe(200)
        expect(body.data).toHaveLength(1)
        expect(mockPrisma.mileRule.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ where: { isActive: true } })
        )
      })

      it('should include inactive when requested', async () => {
        setupAdmin()
        mockPrisma.mileRule.findMany.mockResolvedValue([])
        mockPrisma.mileRule.count.mockResolvedValue(0)

        const req = createRequest('/api/v1/admin/mile-rules', {
          searchParams: { includeInactive: 'true' },
        })
        await getMileRules(req)

        const call = mockPrisma.mileRule.findMany.mock.calls[0][0]
        expect(call.where).toEqual({})
      })
    })

    describe('POST /api/v1/admin/mile-rules', () => {
      it('should return 400 when required fields missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'POST',
          body: { actionCode: 'test' },
        })
        const res = await postMileRules(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 400 for invalid baseMiles', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'POST',
          body: { actionCode: 'test', actionName: 'Test', baseMiles: -1 },
        })
        const res = await postMileRules(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 409 for duplicate action code', async () => {
        setupAdmin()
        mockPrisma.mileRule.findUnique.mockResolvedValue(createMockMileRule())

        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'POST',
          body: { actionCode: 'test_action', actionName: 'Test', baseMiles: 100 },
        })
        const res = await postMileRules(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(409)
      })

      it('should create mile rule', async () => {
        setupAdmin()
        mockPrisma.mileRule.findUnique.mockResolvedValue(null)
        const rule = createMockMileRule({ actionCode: 'new_action' })
        mockPrisma.mileRule.create.mockResolvedValue(rule)

        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'POST',
          body: {
            actionCode: 'new_action',
            actionName: '新しいアクション',
            baseMiles: 50,
            dailyLimit: 3,
          },
        })
        const res = await postMileRules(req)
        const { status, body } = await parseResponse<{
          success: boolean
          data: { actionCode: string }
        }>(res)

        expect(status).toBe(201)
        expect(body.success).toBe(true)
        expect(mockPrisma.mileRule.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            actionCode: 'new_action',
            actionName: '新しいアクション',
            baseMiles: 50,
            dailyLimit: 3,
            cooldownSeconds: 5,
          }),
        })
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })
    })

    describe('PATCH /api/v1/admin/mile-rules', () => {
      it('should return 400 when ruleId missing', async () => {
        setupAdmin()
        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'PATCH',
          body: { baseMiles: 200 },
        })
        const res = await patchMileRules(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(400)
      })

      it('should return 404 when rule not found', async () => {
        setupAdmin()
        mockPrisma.mileRule.findUnique.mockResolvedValue(null)

        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'PATCH',
          body: { ruleId: 'not-found' },
        })
        const res = await patchMileRules(req)
        const { status } = await parseResponse(res)
        expect(status).toBe(404)
      })

      it('should update mile rule', async () => {
        setupAdmin()
        const existing = createMockMileRule({ id: 'rule-1' })
        mockPrisma.mileRule.findUnique.mockResolvedValue(existing)
        mockPrisma.mileRule.update.mockResolvedValue({
          ...existing,
          baseMiles: 200,
          isActive: false,
        })

        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'PATCH',
          body: { ruleId: 'rule-1', baseMiles: 200, isActive: false },
        })
        const res = await patchMileRules(req)
        const { status, body } = await parseResponse<{
          success: boolean
        }>(res)

        expect(status).toBe(200)
        expect(body.success).toBe(true)
        expect(mockPrisma.mileRule.update).toHaveBeenCalledWith({
          where: { id: 'rule-1' },
          data: { baseMiles: 200, isActive: false },
        })
        expect(mockPrisma.auditLog.create).toHaveBeenCalled()
      })

      it('should only allow whitelisted fields', async () => {
        setupAdmin()
        const existing = createMockMileRule({ id: 'rule-1' })
        mockPrisma.mileRule.findUnique.mockResolvedValue(existing)
        mockPrisma.mileRule.update.mockResolvedValue(existing)

        const req = createRequest('/api/v1/admin/mile-rules', {
          method: 'PATCH',
          body: { ruleId: 'rule-1', actionCode: 'hacked', baseMiles: 200 },
        })
        await patchMileRules(req)

        expect(mockPrisma.mileRule.update).toHaveBeenCalledWith({
          where: { id: 'rule-1' },
          data: { baseMiles: 200 },
        })
      })
    })
  })
})
