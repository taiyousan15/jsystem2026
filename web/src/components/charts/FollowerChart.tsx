'use client'

import { useEffect, useState } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { RefreshCw } from 'lucide-react'

interface FollowerChartProps {
  accountId: string
  days?: number
}

interface DataPoint {
  date: string
  count: number
  change: number
}

export function FollowerChart({ accountId, days = 30 }: FollowerChartProps) {
  const [data, setData] = useState<DataPoint[]>([])
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
        `/api/v1/analytics/followers/${accountId}?days=${days}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      if (!res.ok) {
        throw new Error('データの取得に失敗しました')
      }

      const json = await res.json()
      setData(json.data || [])
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

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-400">
        <p>データがありません</p>
      </div>
    )
  }

  // Format data for chart
  const chartData = data.map((d) => ({
    date: new Date(d.date).toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    }),
    followers: d.count,
    change: d.change,
  }))

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => value.toLocaleString()}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            }}
            formatter={(value: number, name: string) => [
              value.toLocaleString(),
              name === 'followers' ? 'フォロワー' : '増減',
            ]}
          />
          <Line
            type="monotone"
            dataKey="followers"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#3b82f6' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
