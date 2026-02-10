import type { ApiResponse } from '@/types/api'

const BASE_URL = '/api/v1'

async function fetchApi<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  })

  const json = (await res.json()) as ApiResponse<T>
  if (!json.success) {
    throw new Error(json.error ?? 'APIエラーが発生しました')
  }
  return json.data as T
}

export const apiClient = {
  miles: {
    getBalance: () =>
      fetchApi<{ totalMiles: number; lifetimeMiles: number; tier: string }>(
        '/miles/balance'
      ),
    getHistory: (page = 1, limit = 20, type?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (type) params.set('type', type)
      return fetchApi<{ transactions: unknown[]; total: number }>(
        `/miles/history?${params}`
      )
    },
    earn: (actionCode: string, metadata?: Record<string, unknown>) =>
      fetchApi<{ transaction: unknown; newBalance: number; tierChanged: boolean; newTier: string }>(
        '/miles/earn',
        { method: 'POST', body: JSON.stringify({ actionCode, metadata }) }
      ),
    getExpiring: (days = 30) =>
      fetchApi<unknown[]>(`/miles/expiring?days=${days}`),
    getRules: () =>
      fetchApi<unknown[]>('/miles/rules'),
  },
  streaks: {
    get: () =>
      fetchApi<{ currentStreak: number; longestStreak: number; freezeRemaining: number; lastActiveDate: string | null }>(
        '/streaks'
      ),
    freeze: () =>
      fetchApi<unknown>('/streaks', {
        method: 'POST',
        body: JSON.stringify({ action: 'freeze' }),
      }),
  },
  missions: {
    getToday: () =>
      fetchApi<Array<{ id: string; title: string; description: string; actionCode: string; currentCount: number; targetCount: number; status: string; rewardMiles: number }>>(
        '/missions/today'
      ),
  },
  badges: {
    getUserBadges: () =>
      fetchApi<Array<{ id: string; badge: { id: string; name: string; description: string; iconUrl: string; rarity: string }; earnedAt: string }>>(
        '/badges'
      ),
    getAllBadges: () =>
      fetchApi<Array<{ id: string; name: string; description: string; iconUrl: string; rarity: string }>>(
        '/badges?view=all'
      ),
  },
  rankings: {
    get: (limit = 20) =>
      fetchApi<Array<{ rank: number; userId: string; displayName: string; avatarUrl: string | null; lifetimeMiles: number; tier: string }>>(
        `/rankings?limit=${limit}`
      ),
  },
  profile: {
    get: () =>
      fetchApi<{ id: string; displayName: string; email: string; bio: string | null; avatarUrl: string | null; role: string; createdAt: string }>(
        '/profile'
      ),
    update: (data: { displayName?: string; bio?: string }) =>
      fetchApi<unknown>('/profile', {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },
  notifications: {
    get: (page = 1, limit = 20, unread = false) =>
      fetchApi<unknown[]>(
        `/notifications?page=${page}&limit=${limit}&unread=${unread}`
      ),
    getUnreadCount: () =>
      fetchApi<{ unreadCount: number }>('/notifications/count'),
    markAllRead: () =>
      fetchApi<unknown>('/notifications', {
        method: 'PATCH',
        body: JSON.stringify({ action: 'markAllRead' }),
      }),
  },
  exchange: {
    getCatalog: (page = 1, limit = 50, category?: string) => {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) })
      if (category) params.set('category', category)
      return fetchApi<{ items: Array<{ id: string; name: string; description: string; category: string; requiredMiles: number; stock: number; imageUrl: string | null }>; total: number }>(
        `/exchange?${params}`
      )
    },
    request: (catalogItemId: string, shippingAddressId?: string) =>
      fetchApi<unknown>('/exchange', {
        method: 'POST',
        body: JSON.stringify({ catalogItemId, shippingAddressId }),
      }),
    getMyExchanges: (page = 1, limit = 20) =>
      fetchApi<{ requests: unknown[]; total: number }>(
        `/exchange?view=my&page=${page}&limit=${limit}`
      ),
  },
  events: {
    getUpcoming: (page = 1, limit = 20) =>
      fetchApi<{ events: Array<{ id: string; title: string; description: string | null; startAt: string; endAt: string; capacity: number; milesReward: number; status: string; attendees: Array<{ userId: string }> }>; total: number }>(
        `/events?page=${page}&limit=${limit}`
      ),
    getMy: () =>
      fetchApi<Array<{ eventId: string; event: { id: string; title: string; description: string | null; startAt: string; endAt: string; milesReward: number; status: string } }>>(
        '/events?view=my'
      ),
    register: (eventId: string) =>
      fetchApi<unknown>('/events', {
        method: 'POST',
        body: JSON.stringify({ eventId }),
      }),
    cancel: (eventId: string) =>
      fetchApi<unknown>('/events', {
        method: 'POST',
        body: JSON.stringify({ eventId, action: 'cancel' }),
      }),
  },
}
