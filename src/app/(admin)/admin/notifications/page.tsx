'use client'

import { useEffect, useState, useCallback } from 'react'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  targetAudience: string
  sentAt: string | null
  createdAt: string
}

const TYPE_LABELS: Record<string, string> = {
  announcement: 'お知らせ',
  promotion: 'プロモーション',
  system: 'システム',
  reminder: 'リマインダー',
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/v1/admin/notifications')
      const json = await res.json()
      if (json.success) setNotifications(json.data)
    } catch {
      // API not yet implemented
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">通知管理</h1>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-gray-500">通知が登録されていません</p>
          <p className="mt-2 text-sm text-gray-400">通知APIの実装後に利用可能になります</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">種類</th>
                <th className="px-4 py-3">対象</th>
                <th className="px-4 py-3">送信日</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {notifications.map((n) => (
                <tr key={n.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{n.title}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
                      {TYPE_LABELS[n.type] ?? n.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{n.targetAudience}</td>
                  <td className="px-4 py-3 text-xs text-gray-400">
                    {n.sentAt ? new Date(n.sentAt).toLocaleDateString('ja-JP') : '未送信'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
