'use client'

import { useEffect, useState, useCallback } from 'react'

interface AuditLog {
  id: string
  action: string
  entity: string
  entityId: string
  details: Record<string, unknown>
  createdAt: string
  admin: { displayName: string; email: string } | null
}

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-100 text-green-800',
  update: 'bg-blue-100 text-blue-800',
  delete: 'bg-red-100 text-red-800',
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '30' })
      const res = await fetch(`/api/v1/admin/audit-logs?${params}`)
      const json = await res.json()
      if (json.success) {
        setLogs(json.data)
        setTotal(json.meta.total)
      }
    } catch {
      // API not yet implemented
    }
    setLoading(false)
  }, [page])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 30)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">監査ログ</h1>
      </div>

      {loading && logs.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-gray-400">読み込み中...</p>
        </div>
      ) : logs.length === 0 ? (
        <div className="rounded-xl border bg-white p-12 text-center shadow-sm">
          <p className="text-lg font-medium text-gray-500">監査ログがありません</p>
          <p className="mt-2 text-sm text-gray-400">監査ログAPIの実装後に利用可能になります</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">日時</th>
                  <th className="px-4 py-3">管理者</th>
                  <th className="px-4 py-3">操作</th>
                  <th className="px-4 py-3">対象</th>
                  <th className="px-4 py-3">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {new Date(log.createdAt).toLocaleString('ja-JP')}
                    </td>
                    <td className="px-4 py-3">
                      {log.admin ? (
                        <div>
                          <div className="font-medium">{log.admin.displayName}</div>
                          <div className="text-xs text-gray-400">{log.admin.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${ACTION_COLORS[log.action] ?? 'bg-gray-100 text-gray-800'}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs">{log.entity}</span>
                    </td>
                    <td className="px-4 py-3 max-w-xs truncate text-xs text-gray-500">
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
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
        </>
      )}
    </div>
  )
}
