import { vi } from 'vitest'
import type { User, PointBalance, PointTransaction, MileRule, Badge, UserBadge, Event, EventAttendee, CatalogItem, ExchangeRequest, UserStreak, DailyMission } from '@prisma/client'

// --- Factories ---

let idCounter = 0
function nextId(): string {
  idCounter++
  return `test-id-${idCounter}`
}

export function resetIdCounter(): void {
  idCounter = 0
}

export function createMockUser(overrides: Partial<User & { pointBalance: PointBalance | null }> = {}): User & { pointBalance: PointBalance | null } {
  const id = overrides.id ?? nextId()
  return {
    id,
    clerkId: `clerk_${id}`,
    email: `${id}@test.com`,
    displayName: `User ${id}`,
    bio: null,
    avatarUrl: null,
    role: 'member',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    pointBalance: {
      id: nextId(),
      userId: id,
      totalMiles: 1000,
      lifetimeMiles: 2000,
      tier: 'silver',
      updatedAt: new Date('2025-01-01'),
    },
    ...overrides,
  }
}

export function createMockPointBalance(overrides: Partial<PointBalance> = {}): PointBalance {
  return {
    id: nextId(),
    userId: nextId(),
    totalMiles: 1000,
    lifetimeMiles: 2000,
    tier: 'silver',
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockTransaction(overrides: Partial<PointTransaction> = {}): PointTransaction {
  return {
    id: nextId(),
    userId: nextId(),
    amount: 100,
    type: 'earn',
    source: 'test_action',
    metadata: {},
    expiresAt: new Date('2026-01-01'),
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockMileRule(overrides: Partial<MileRule> = {}): MileRule {
  return {
    id: nextId(),
    actionCode: 'test_action',
    name: 'テストアクション',
    description: 'テスト用',
    baseMiles: 100,
    dailyLimit: null,
    cooldownSeconds: 0,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockBadge(overrides: Partial<Badge> = {}): Badge {
  return {
    id: overrides.id ?? nextId(),
    name: 'テストバッジ',
    description: 'テスト用バッジ',
    iconUrl: '/badges/test.png',
    rarity: 'common',
    condition: {},
    isActive: true,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockUserBadge(overrides: Partial<UserBadge> = {}): UserBadge {
  return {
    id: nextId(),
    userId: nextId(),
    badgeId: nextId(),
    earnedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: overrides.id ?? nextId(),
    title: 'テストイベント',
    description: 'テスト用イベント',
    startAt: new Date('2025-06-01T10:00:00Z'),
    endAt: new Date('2025-06-01T12:00:00Z'),
    capacity: 30,
    milesReward: 500,
    status: 'upcoming',
    location: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockEventAttendee(overrides: Partial<EventAttendee> = {}): EventAttendee {
  return {
    id: nextId(),
    eventId: nextId(),
    userId: nextId(),
    checkedIn: false,
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockCatalogItem(overrides: Partial<CatalogItem> = {}): CatalogItem {
  return {
    id: overrides.id ?? nextId(),
    name: 'テスト商品',
    description: 'テスト用商品',
    category: 'digital',
    requiredMiles: 500,
    stock: 10,
    imageUrl: null,
    isActive: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockExchangeRequest(overrides: Partial<ExchangeRequest> = {}): ExchangeRequest {
  return {
    id: nextId(),
    userId: nextId(),
    catalogItemId: nextId(),
    milesSpent: 500,
    status: 'pending',
    shippingAddressId: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    ...overrides,
  }
}

export function createMockStreak(overrides: Partial<UserStreak> = {}): UserStreak {
  return {
    id: nextId(),
    userId: nextId(),
    currentStreak: 5,
    longestStreak: 10,
    lastActiveDate: new Date('2025-01-01'),
    freezeRemaining: 3,
    ...overrides,
  }
}

export function createMockMission(overrides: Partial<DailyMission> = {}): DailyMission {
  return {
    id: nextId(),
    userId: nextId(),
    actionCode: 'daily_login',
    title: 'デイリーログイン',
    description: 'ログインしよう',
    targetCount: 1,
    currentCount: 0,
    rewardMiles: 50,
    status: 'active',
    date: new Date('2025-01-01'),
    createdAt: new Date('2025-01-01'),
    ...overrides,
  }
}

// --- Repository Mocks ---

export function createMockUserRepository() {
  return {
    findByClerkId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updateProfile: vi.fn(),
    findMany: vi.fn(),
  }
}

export function createMockMileRepository() {
  return {
    getBalance: vi.fn(),
    getTransactions: vi.fn(),
    earnMiles: vi.fn(),
    redeemMiles: vi.fn(),
    getExpiringMiles: vi.fn(),
    getActiveRules: vi.fn(),
    getRuleByActionCode: vi.fn(),
    countTodayEarns: vi.fn(),
  }
}

export function createMockBadgeRepository() {
  return {
    getUserBadges: vi.fn(),
    getAllBadges: vi.fn(),
    hasBadge: vi.fn(),
    awardBadge: vi.fn(),
    getUserBadgeCount: vi.fn(),
  }
}

export function createMockEventRepository() {
  return {
    getUpcomingEvents: vi.fn(),
    getEvent: vi.fn(),
    registerAttendee: vi.fn(),
    cancelAttendee: vi.fn(),
    getAttendee: vi.fn(),
    getUserEvents: vi.fn(),
  }
}

export function createMockExchangeRepository() {
  return {
    getCatalogItems: vi.fn(),
    getCatalogItem: vi.fn(),
    createExchangeRequest: vi.fn(),
    executeExchangeAtomic: vi.fn(),
    getUserExchangeRequests: vi.fn(),
  }
}
