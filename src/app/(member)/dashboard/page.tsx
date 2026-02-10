'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MileBalance } from '@/components/gamification/MileBalance'
import { TierProgress } from '@/components/gamification/TierProgress'
import { StreakDisplay } from '@/components/gamification/StreakDisplay'
import { MissionCard } from '@/components/gamification/MissionCard'
import { apiClient } from '@/lib/api-client'
import type { Tier } from '@/types/domain'

interface BalanceData {
  totalMiles: number
  lifetimeMiles: number
  tier: Tier
}

interface StreakData {
  currentStreak: number
  longestStreak: number
  freezeRemaining: number
}

interface MissionData {
  id: string
  title: string
  description: string
  actionCode: string
  currentCount: number
  targetCount: number
  status: string
  rewardMiles: number
}

export default function DashboardPage() {
  const [balance, setBalance] = useState<BalanceData | null>(null)
  const [streak, setStreak] = useState<StreakData | null>(null)
  const [missions, setMissions] = useState<MissionData[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      try {
        const [balanceData, streakData, missionsData] = await Promise.all([
          apiClient.miles.getBalance(),
          apiClient.streaks.get(),
          apiClient.missions.getToday(),
        ])
        setBalance(balanceData as BalanceData)
        setStreak(streakData as StreakData)
        setMissions(missionsData as MissionData[])
      } catch {
        // API未接続時はデフォルト値を表示
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>マイル</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <MileBalance
              totalMiles={balance?.totalMiles ?? 0}
              lifetimeMiles={balance?.lifetimeMiles ?? 0}
              tier={(balance?.tier as Tier) ?? 'bronze'}
            />
            <TierProgress
              lifetimeMiles={balance?.lifetimeMiles ?? 0}
              currentTier={(balance?.tier as Tier) ?? 'bronze'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>連続ログイン</CardTitle>
          </CardHeader>
          <CardContent>
            <StreakDisplay
              currentStreak={streak?.currentStreak ?? 0}
              longestStreak={streak?.longestStreak ?? 0}
              freezeRemaining={streak?.freezeRemaining ?? 0}
            />
          </CardContent>
        </Card>
      </div>

      {missions.length > 0 && (
        <div>
          <h2 className="mb-3 text-lg font-semibold text-gray-900">今日のミッション</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {missions.map((mission) => (
              <MissionCard
                key={mission.id}
                title={mission.title}
                description={mission.description}
                currentCount={mission.currentCount}
                targetCount={mission.targetCount}
                rewardMiles={mission.rewardMiles}
                status={mission.status}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
