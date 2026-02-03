'use client'

import { useEffect, useState } from 'react'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from 'recharts'
import { RefreshCw, TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, Meh } from 'lucide-react'

interface SentimentChartProps {
  accountId: string
  days?: number
}

interface SentimentData {
  totalPosts: number
  analyzedPosts: number
  distribution: {
    positive: number
    negative: number
    neutral: number
    mixed: number
  }
  averageScore: number
  trend: 'improving' | 'declining' | 'stable'
  recentPosts: {
    postId: string
    content: string
    sentiment: string
    score: number
    postedAt: string
  }[]
}

const COLORS = {
  positive: '#10b981',
  negative: '#ef4444',
  neutral: '#6b7280',
  mixed: '#f59e0b',
}

const LABELS = {
  positive: 'ポジティブ',
  negative: 'ネガティブ',
  neutral: 'ニュートラル',
  mixed: '混合',
}

export function SentimentChart({ accountId, days = 30 }: SentimentChartProps) {
  const [data, setData] = useState<SentimentData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (accountId) {
      fetchData()
    }
  }, [accountId, days])

  const fetchData = async () => {
    setLoading(true)
    setError('')

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(
        `/api/v1/analytics/sentiment/${accountId}?days=${days}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const json = await res.json()
      setData(json.data || null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <RefreshCw className="w-6 h-6 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>{error}</p>
      </div>
    )
  }

  if (!data || data.analyzedPosts === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>分析データがありません</p>
      </div>
    )
  }

  const chartData = Object.entries(data.distribution)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key as keyof typeof LABELS],
      value,
      color: COLORS[key as keyof typeof COLORS],
    }))

  const TrendIcon = () => {
    if (data.trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-500" />
    if (data.trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-500" />
    return <Minus className="w-5 h-5 text-gray-400" />
  }

  const SentimentIcon = () => {
    if (data.averageScore > 0.2) return <ThumbsUp className="w-6 h-6 text-green-500" />
    if (data.averageScore < -0.2) return <ThumbsDown className="w-6 h-6 text-red-500" />
    return <Meh className="w-6 h-6 text-gray-400" />
  }

  const trendLabels = {
    improving: '改善傾向',
    declining: '悪化傾向',
    stable: '安定',
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Average sentiment */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <SentimentIcon />
            <div>
              <p className="text-sm text-gray-500">平均スコア</p>
              <p
                className={`text-xl font-bold ${
                  data.averageScore > 0.2
                    ? 'text-green-500'
                    : data.averageScore < -0.2
                    ? 'text-red-500'
                    : 'text-gray-700'
                }`}
              >
                {data.averageScore.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Trend */}
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <TrendIcon />
            <div>
              <p className="text-sm text-gray-500">トレンド</p>
              <p className="text-lg font-medium text-gray-700">
                {trendLabels[data.trend]}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Pie chart */}
      {chartData.length > 0 && (
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value}件`, '']}
                contentStyle={{
                  backgroundColor: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                }}
              />
              <Legend
                formatter={(value) => (
                  <span className="text-sm text-gray-600">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent posts with sentiment */}
      {data.recentPosts.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            最近の投稿センチメント
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {data.recentPosts.slice(0, 5).map((post) => (
              <div
                key={post.postId}
                className="flex items-start gap-2 p-2 bg-gray-50 rounded text-sm"
              >
                <span
                  className={`inline-block w-2 h-2 mt-1.5 rounded-full flex-shrink-0 ${
                    post.sentiment === 'POSITIVE'
                      ? 'bg-green-500'
                      : post.sentiment === 'NEGATIVE'
                      ? 'bg-red-500'
                      : post.sentiment === 'MIXED'
                      ? 'bg-yellow-500'
                      : 'bg-gray-400'
                  }`}
                />
                <p className="text-gray-600 line-clamp-2">{post.content}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          分析対象: {data.analyzedPosts}件 / {data.totalPosts}件の投稿
        </p>
      </div>
    </div>
  )
}
