'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { apiClient } from '@/lib/api-client'
import { cn } from '@/lib/utils'

interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string
  rarity: string
}

interface UserBadge {
  id: string
  badge: Badge
  earnedAt: string
}

const rarityColors = {
  common: 'border-gray-300 bg-gray-50',
  rare: 'border-blue-300 bg-blue-50',
  epic: 'border-purple-300 bg-purple-50',
  legendary: 'border-amber-400 bg-amber-50',
} as const

const rarityLabels = {
  common: 'コモン',
  rare: 'レア',
  epic: 'エピック',
  legendary: 'レジェンダリー',
} as const

export default function BadgesPage() {
  const [userBadges, setUserBadges] = useState<UserBadge[]>([])
  const [allBadges, setAllBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [userData, allData] = await Promise.all([
          apiClient.badges.getUserBadges(),
          apiClient.badges.getAllBadges(),
        ])
        setUserBadges(userData as UserBadge[])
        setAllBadges(allData as Badge[])
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">バッジ</h1>
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  const earnedIds = new Set(userBadges.map((ub) => ub.badge.id))

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">バッジ</h1>
      <p className="text-sm text-gray-500">
        獲得済み: {userBadges.length} / {allBadges.length}
      </p>

      {userBadges.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>獲得済みバッジ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {userBadges.map((ub) => (
                <div
                  key={ub.id}
                  className={cn(
                    'flex flex-col items-center rounded-xl border-2 p-4 text-center',
                    rarityColors[ub.badge.rarity as keyof typeof rarityColors] ?? rarityColors.common
                  )}
                >
                  <div className="mb-2 text-3xl">{ub.badge.iconUrl || '🏆'}</div>
                  <p className="text-sm font-semibold">{ub.badge.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{ub.badge.description}</p>
                  <span className="mt-2 text-xs text-gray-400">
                    {new Date(ub.earnedAt).toLocaleDateString('ja-JP')}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>全バッジ一覧</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id)
              return (
                <div
                  key={badge.id}
                  className={cn(
                    'flex flex-col items-center rounded-xl border-2 p-4 text-center transition-opacity',
                    earned
                      ? rarityColors[badge.rarity as keyof typeof rarityColors] ?? rarityColors.common
                      : 'border-gray-200 bg-gray-50 opacity-50'
                  )}
                >
                  <div className="mb-2 text-3xl">{earned ? (badge.iconUrl || '🏆') : '🔒'}</div>
                  <p className="text-sm font-semibold">{badge.name}</p>
                  <p className="mt-1 text-xs text-gray-500">{badge.description}</p>
                  <span className="mt-2 rounded-full bg-white px-2 py-0.5 text-xs text-gray-500">
                    {rarityLabels[badge.rarity as keyof typeof rarityLabels] ?? badge.rarity}
                  </span>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
