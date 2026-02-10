'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { TierBadge } from '@/components/gamification/TierBadge'
import { apiClient } from '@/lib/api-client'
import type { Tier } from '@/types/domain'

interface RankEntry {
  rank: number
  userId: string
  displayName: string
  avatarUrl: string | null
  lifetimeMiles: number
  tier: Tier
}

export default function RankingsPage() {
  const [rankings, setRankings] = useState<RankEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.rankings.get(50)
        setRankings(data as RankEntry[])
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
        <h1 className="text-2xl font-bold text-gray-900">ランキング</h1>
        <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ランキング</h1>
      <Card>
        <CardHeader>
          <CardTitle>累計マイルランキング</CardTitle>
        </CardHeader>
        <CardContent>
          {rankings.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">ランキングデータがありません</p>
          ) : (
            <div className="divide-y">
              {rankings.map((entry) => (
                <div key={entry.userId} className="flex items-center gap-4 py-3">
                  <span className={
                    entry.rank <= 3
                      ? 'w-8 text-center text-lg font-bold text-amber-500'
                      : 'w-8 text-center text-sm font-medium text-gray-500'
                  }>
                    {entry.rank}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-200">
                    {entry.avatarUrl ? (
                      <img src={entry.avatarUrl} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-sm font-medium text-gray-500">
                        {entry.displayName.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{entry.displayName}</p>
                    <p className="text-xs text-gray-500">{entry.lifetimeMiles.toLocaleString()} マイル</p>
                  </div>
                  <TierBadge tier={entry.tier} size="sm" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
