'use client'

import { useEffect, useState, useCallback } from 'react'

interface Badge {
  id: string
  name: string
  description: string
  iconUrl: string | null
  criteria: string
  isActive: boolean
  createdAt: string
  _count: { userBadges: number }
}

export default function AdminBadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/badges')
      const json = await res.json()
      if (json.success) setBadges(json.data)
    } catch {
      // API not yet implemented
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">バッジ管理</h1>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      ) : badges.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-gray-500">バッジが登録されていません</p>
          <p className="mt-2 text-sm text-gray-400">バッジAPIの実装後に利用可能になります</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <div key={badge.id} className="rounded-xl border bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{badge.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{badge.description}</p>
                </div>
                <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${badge.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                  {badge.isActive ? '有効' : '無効'}
                </span>
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
                <span>取得者: {badge._count.userBadges}人</span>
                <span>{new Date(badge.createdAt).toLocaleDateString('ja-JP')}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
