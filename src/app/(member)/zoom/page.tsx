'use client'

import { useEffect, useState, useCallback } from 'react'

interface Participation {
  id: string
  zoomEmail: string
  joinTime: string
  durationMinutes: number | null
  milesAwarded: number
  meetingRecord: {
    topic: string
    startTime: string
    durationMinutes: number | null
  }
}

export default function ZoomPage() {
  const [participations, setParticipations] = useState<Participation[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '20' })
      const res = await fetch(`/api/v1/zoom/meetings?${params}`)
      const json = await res.json()
      if (json.success) {
        setParticipations(json.data)
        setTotal(json.meta.total)
      }
    } finally {
      setLoading(false)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  if (loading && participations.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">グルコン参加履歴</h1>
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-100" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">グルコン参加履歴</h1>
        <span className="text-sm text-gray-500">全{total}件</span>
      </div>

      {participations.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center">
          <p className="text-gray-500">まだグルコンに参加していません</p>
        </div>
      ) : (
        <div className="space-y-3">
          {participations.map((p) => (
            <div key={p.id} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{p.meetingRecord.topic}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(p.meetingRecord.startTime).toLocaleString('ja-JP', {
                      year: 'numeric', month: 'short', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                  <p className="text-xs text-gray-400">
                    参加時間: {p.durationMinutes ?? 0}分
                    {p.meetingRecord.durationMinutes
                      ? ` / ${p.meetingRecord.durationMinutes}分`
                      : ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-blue-600">
                    +{p.milesAwarded}
                  </span>
                  <p className="text-xs text-gray-400">マイル</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            前へ
          </button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button
            onClick={() => setPage(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="rounded border px-3 py-1 text-sm disabled:opacity-50"
          >
            次へ
          </button>
        </div>
      )}
    </div>
  )
}
