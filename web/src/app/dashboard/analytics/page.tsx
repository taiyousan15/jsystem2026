'use client'

import { useEffect, useState } from 'react'
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Calendar,
  Download,
} from 'lucide-react'
import { FollowerChart } from '@/components/charts/FollowerChart'
import { KeywordCloud } from '@/components/charts/KeywordCloud'
import { SentimentChart } from '@/components/charts/SentimentChart'

interface Account {
  id: string
  platform: string
  accountId: string
  displayName: string
}

interface AnalyticsData {
  followerGrowth: number
  engagementRate: number
  avgLikes: number
  avgComments: number
  topPerformingDay: string
  reachTrend: number
}

export default function AnalyticsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState('30')
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    followerGrowth: 0,
    engagementRate: 0,
    avgLikes: 0,
    avgComments: 0,
    topPerformingDay: '-',
    reachTrend: 0,
  })

  useEffect(() => {
    fetchAccounts()
  }, [])

  useEffect(() => {
    if (selectedAccount) {
      fetchAnalytics()
    }
  }, [selectedAccount, dateRange])

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAccounts(data.data || [])
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

  const fetchAnalytics = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(
        `/api/v1/analytics/summary/${selectedAccount}?days=${dateRange}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (res.ok) {
        const data = await res.json()
        if (data.data) {
          setAnalytics(data.data)
        }
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    }
  }

  const metricCards = [
    {
      name: 'フォロワー増減',
      value: analytics.followerGrowth,
      format: (v: number) => `${v > 0 ? '+' : ''}${v.toLocaleString()}`,
      icon: analytics.followerGrowth >= 0 ? TrendingUp : TrendingDown,
      color: analytics.followerGrowth >= 0 ? 'text-green-500' : 'text-red-500',
      bgColor: analytics.followerGrowth >= 0 ? 'bg-green-50' : 'bg-red-50',
    },
    {
      name: 'エンゲージメント率',
      value: analytics.engagementRate,
      format: (v: number) => `${v.toFixed(2)}%`,
      icon: BarChart3,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
    },
    {
      name: '平均いいね',
      value: analytics.avgLikes,
      format: (v: number) => v.toLocaleString(),
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
    },
    {
      name: '平均コメント',
      value: analytics.avgComments,
      format: (v: number) => v.toLocaleString(),
      icon: TrendingUp,
      color: 'text-orange-500',
      bgColor: 'bg-orange-50',
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">分析</h1>
          <p className="text-gray-500 mt-1">アカウントのパフォーマンスを分析</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition">
          <Download className="w-5 h-5" />
          レポート出力
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4">
        <select
          value={selectedAccount || ''}
          onChange={(e) => setSelectedAccount(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
        >
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.displayName || account.accountId} ({account.platform})
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="text-sm focus:outline-none"
          >
            <option value="7">過去7日間</option>
            <option value="30">過去30日間</option>
            <option value="90">過去90日間</option>
          </select>
        </div>
      </div>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metricCards.map((metric) => (
          <div
            key={metric.name}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-100"
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 ${metric.bgColor} rounded-lg flex items-center justify-center`}
              >
                <metric.icon className={`w-6 h-6 ${metric.color}`} />
              </div>
              <div>
                <p className="text-sm text-gray-500">{metric.name}</p>
                <p className={`text-2xl font-bold ${metric.color}`}>
                  {metric.format(metric.value)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Follower trend */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            フォロワー推移
          </h2>
          {selectedAccount ? (
            <FollowerChart accountId={selectedAccount} days={parseInt(dateRange)} />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">
              アカウントを選択してください
            </div>
          )}
        </div>

        {/* Performance summary */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">
            パフォーマンスサマリー
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">最もパフォーマンスが高い曜日</span>
              <span className="font-medium text-gray-900">
                {analytics.topPerformingDay}
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">リーチトレンド</span>
              <span
                className={`font-medium ${
                  analytics.reachTrend >= 0 ? 'text-green-500' : 'text-red-500'
                }`}
              >
                {analytics.reachTrend > 0 ? '+' : ''}
                {analytics.reachTrend}%
              </span>
            </div>
            <div className="flex items-center justify-between py-3 border-b border-gray-100">
              <span className="text-gray-500">分析期間</span>
              <span className="font-medium text-gray-900">
                {dateRange}日間
              </span>
            </div>
            <div className="flex items-center justify-between py-3">
              <span className="text-gray-500">データ更新</span>
              <span className="font-medium text-gray-900">
                6時間ごと
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyword and Sentiment Analysis */}
      {selectedAccount && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keyword analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              キーワード分析
            </h2>
            <KeywordCloud accountId={selectedAccount} days={parseInt(dateRange)} />
          </div>

          {/* Sentiment analysis */}
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              センチメント分析
            </h2>
            <SentimentChart accountId={selectedAccount} days={parseInt(dateRange)} />
          </div>
        </div>
      )}

      {/* No account message */}
      {accounts.length === 0 && (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-100 text-center">
          <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            アカウントがありません
          </h3>
          <p className="text-gray-500 mb-4">
            分析を開始するには、まずSNSアカウントを登録してください
          </p>
          <a
            href="/dashboard/accounts"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
          >
            アカウントを追加
          </a>
        </div>
      )}
    </div>
  )
}
