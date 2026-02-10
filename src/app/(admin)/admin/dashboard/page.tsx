'use client'

import { useEffect, useState } from 'react'

interface Stats {
  totalUsers: number
  activeToday: number
  totalMilesIssued: number
  pendingExchanges: number
  upcomingEvents: number
  tierDistribution: Array<{ tier: string; count: number }>
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-600',
  silver: 'bg-gray-400',
  gold: 'bg-yellow-400',
  platinum: 'bg-blue-400',
  diamond: 'bg-purple-400',
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/v1/admin/stats')
        const json = await res.json()
        if (json.success) setStats(json.data)
      } catch {
        // silently fail
      }
    }
    load()
  }, [])

  const cards = [
    { label: '総会員数', value: stats?.totalUsers ?? 0, suffix: '人' },
    { label: '本日のアクティブ', value: stats?.activeToday ?? 0, suffix: '人' },
    { label: '発行マイル合計', value: stats?.totalMilesIssued ?? 0, suffix: '' },
    { label: '交換申請（未処理）', value: stats?.pendingExchanges ?? 0, suffix: '件' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">管理者ダッシュボード</h1>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border bg-white p-6 shadow-sm">
            <p className="text-sm text-gray-500">{card.label}</p>
            <p className="mt-2 text-3xl font-bold">
              {card.value.toLocaleString()}
              {card.suffix && (
                <span className="ml-1 text-base font-normal text-gray-400">
                  {card.suffix}
                </span>
              )}
            </p>
          </div>
        ))}
      </div>

      {stats?.tierDistribution && stats.tierDistribution.length > 0 && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            ティア分布
          </h2>
          <div className="space-y-3">
            {stats.tierDistribution.map((t) => {
              const pct =
                stats.totalUsers > 0
                  ? Math.round((t.count / stats.totalUsers) * 100)
                  : 0
              return (
                <div key={t.tier} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-medium capitalize text-gray-700">
                    {t.tier}
                  </span>
                  <div className="flex-1 rounded-full bg-gray-100">
                    <div
                      className={`h-6 rounded-full ${TIER_COLORS[t.tier] ?? 'bg-gray-400'}`}
                      style={{ width: `${Math.max(pct, 2)}%` }}
                    />
                  </div>
                  <span className="w-16 text-right text-sm text-gray-500">
                    {t.count}人 ({pct}%)
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
