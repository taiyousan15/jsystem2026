'use client'

import { useEffect, useState, useCallback } from 'react'

interface ExchangeRequest {
  id: string
  milesSpent: number
  status: string
  trackingNumber: string | null
  adminNote: string | null
  createdAt: string
  user: { id: string; displayName: string; email: string }
  catalogItem: { id: string; name: string; category: string }
}

interface PaginatedResponse {
  success: boolean
  data: ExchangeRequest[]
  meta: { total: number; page: number; limit: number }
}

const STATUS_LABELS: Record<string, string> = {
  pending: '審査中',
  approved: '承認済',
  rejected: '却下',
  shipped: '発送済',
  completed: '完了',
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  shipped: 'bg-blue-100 text-blue-800',
  completed: 'bg-gray-100 text-gray-800',
}

export default function AdminExchangesPage() {
  const [data, setData] = useState<PaginatedResponse | null>(null)
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState('')
  const [updating, setUpdating] = useState<string | null>(null)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch(`/api/v1/admin/exchanges?${params}`)
    const json = await res.json()
    if (json.success) setData(json)
  }, [page, statusFilter])

  useEffect(() => { load() }, [load])

  const updateStatus = async (exchangeId: string, status: string) => {
    setUpdating(exchangeId)
    await fetch('/api/v1/admin/exchanges', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ exchangeId, status }),
    })
    setUpdating(null)
    load()
  }

  const totalPages = data ? Math.ceil(data.meta.total / data.meta.limit) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">交換管理</h1>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">全てのステータス</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">申請日</th>
              <th className="px-4 py-3">会員</th>
              <th className="px-4 py-3">商品</th>
              <th className="px-4 py-3">消費マイル</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data?.data.map((req) => (
              <tr key={req.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500">
                  {new Date(req.createdAt).toLocaleDateString('ja-JP')}
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{req.user.displayName}</div>
                  <div className="text-xs text-gray-400">{req.user.email}</div>
                </td>
                <td className="px-4 py-3">{req.catalogItem.name}</td>
                <td className="px-4 py-3 font-mono">{req.milesSpent.toLocaleString()}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[req.status] ?? ''}`}>
                    {STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => updateStatus(req.id, 'approved')}
                        disabled={updating === req.id}
                        className="rounded bg-green-600 px-3 py-1 text-xs text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        承認
                      </button>
                      <button
                        onClick={() => updateStatus(req.id, 'rejected')}
                        disabled={updating === req.id}
                        className="rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        却下
                      </button>
                    </div>
                  )}
                  {req.status === 'approved' && (
                    <button
                      onClick={() => updateStatus(req.id, 'shipped')}
                      disabled={updating === req.id}
                      className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      発送済
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {data?.data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  交換申請がありません
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="rounded border px-3 py-1 text-sm disabled:opacity-50">前へ</button>
          <span className="text-sm text-gray-500">{page} / {totalPages}</span>
          <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="rounded border px-3 py-1 text-sm disabled:opacity-50">次へ</button>
        </div>
      )}
    </div>
  )
}
