'use client'

import { useEffect, useState } from 'react'
import {
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart,
  RefreshCw,
} from 'lucide-react'
import { FollowerChart } from '@/components/charts/FollowerChart'

interface Account {
  id: string
  platform: string
  accountId: string
  displayName: string
}

interface Stats {
  totalAccounts: number
  totalFollowers: number
  avgEngagement: number
  weeklyGrowth: number
}

export default function DashboardPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [stats, setStats] = useState<Stats>({
    totalAccounts: 0,
    totalFollowers: 0,
    avgEngagement: 0,
    weeklyGrowth: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAccounts(data.data || [])
        setStats((prev) => ({ ...prev, totalAccounts: data.meta?.total || 0 }))

        if (data.data?.length > 0) {
          setSelectedAccount(data.data[0].id)
        }
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const statCards = [
    {
      name: '登録アカウント',
      value: stats.totalAccounts,
      icon: Users,
      color: 'bg-blue-500',
    },
    {
      name: '総フォロワー',
      value: stats.totalFollowers.toLocaleString(),
      icon: TrendingUp,
      color: 'bg-green-500',
    },
    {
      name: '平均エンゲージメント',
      value: `${stats.avgEngagement}%`,
      icon: Activity,
      color: 'bg-purple-500',
    },
    {
      name: '週間成長率',
      value: `${stats.weeklyGrowth > 0 ? '+' : ''}${stats.weeklyGrowth}%`,
      icon: stats.weeklyGrowth >= 0 ? TrendingUp : TrendingDown,
      color: stats.weeklyGrowth >= 0 ? 'bg-emerald-500' : 'bg-red-500',
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
        <p className="text-gray-500 mt-1">SNSアカウントの分析概要</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat) => (
          <div
            key={stat.name}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${stat.color} rounded-lg flex items-center justify-center`}
              >
                <stat.icon className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Follower chart */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              フォロワー推移
            </h2>
            {accounts.length > 0 && (
              <select
                value={selectedAccount || ''}
                onChange={(e) => setSelectedAccount(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.displayName || account.accountId} ({account.platform})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedAccount ? (
            <FollowerChart accountId={selectedAccount} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <BarChart className="w-12 h-12 mx-auto mb-2" />
                <p>アカウントを登録してください</p>
              </div>
            </div>
          )}
        </div>

        {/* Recent accounts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            登録アカウント
          </h2>
          {accounts.length > 0 ? (
            <div className="space-y-3">
              {accounts.slice(0, 5).map((account) => (
                <div
                  key={account.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                    <span className="text-primary-600 font-medium text-sm">
                      {account.platform.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {account.displayName || account.accountId}
                    </p>
                    <p className="text-xs text-gray-500">{account.platform}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Users className="w-12 h-12 mx-auto mb-2" />
                <p>アカウントがありません</p>
                <a
                  href="/dashboard/accounts"
                  className="text-primary-500 text-sm hover:underline mt-2 inline-block"
                >
                  アカウントを追加
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
