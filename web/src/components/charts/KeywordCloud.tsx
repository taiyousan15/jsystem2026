'use client'

import { useEffect, useState } from 'react'
import { RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface KeywordCloudProps {
  accountId: string
  days?: number
}

interface KeywordData {
  keyword: string
  count: number
  score: number
  trend: 'up' | 'down' | 'stable'
}

interface AnalysisResult {
  totalPosts: number
  keywords: KeywordData[]
  hashtags: KeywordData[]
  mentions: KeywordData[]
}

export function KeywordCloud({ accountId, days = 30 }: KeywordCloudProps) {
  const [data, setData] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState<'keywords' | 'hashtags' | 'mentions'>('keywords')

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
        `/api/v1/analytics/keywords/${accountId}?days=${days}`,
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

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4 text-green-500" />
    if (trend === 'down') return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-gray-400" />
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

  if (!data || data.totalPosts === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>投稿データがありません</p>
      </div>
    )
  }

  const tabs = [
    { id: 'keywords' as const, label: 'キーワード', count: data.keywords.length },
    { id: 'hashtags' as const, label: 'ハッシュタグ', count: data.hashtags.length },
    { id: 'mentions' as const, label: 'メンション', count: data.mentions.length },
  ]

  const activeData = data[activeTab] || []

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              activeTab === tab.id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Keyword list */}
      <div className="space-y-2 max-h-80 overflow-y-auto">
        {activeData.length > 0 ? (
          activeData.map((item, index) => (
            <div
              key={item.keyword}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-xs font-medium">
                  {index + 1}
                </span>
                <span className="font-medium text-gray-900">{item.keyword}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{item.count}回</span>
                <TrendIcon trend={item.trend} />
              </div>
            </div>
          ))
        ) : (
          <div className="py-8 text-center text-gray-400">
            データがありません
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          分析対象: {data.totalPosts}件の投稿
        </p>
      </div>
    </div>
  )
}
