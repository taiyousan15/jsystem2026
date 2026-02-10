'use client'

import { useEffect, useState, useCallback } from 'react'

interface Member {
  id: string
  clerkId: string
  email: string
  displayName: string
  role: string
  createdAt: string
  pointBalance: { totalMiles: number; lifetimeMiles: number; tier: string } | null
}

const TIER_COLORS: Record<string, string> = {
  bronze: 'bg-amber-100 text-amber-800',
  silver: 'bg-gray-100 text-gray-800',
  gold: 'bg-yellow-100 text-yellow-800',
  platinum: 'bg-blue-100 text-blue-800',
  diamond: 'bg-purple-100 text-purple-800',
}

export default function AdminMembersPage() {
  const [members, setMembers] = useState<Member[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [roleFilter, setRoleFilter] = useState('')

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    if (roleFilter) params.set('role', roleFilter)
    const res = await fetch(`/api/v1/admin/users?${params}`)
    const json = await res.json()
    if (json.success) {
      setMembers(json.data)
      setTotal(json.meta.total)
    }
  }, [page, roleFilter])

  useEffect(() => { load() }, [load])

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">会員管理</h1>
        <select
          value={roleFilter}
          onChange={(e) => { setRoleFilter(e.target.value); setPage(1) }}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="">全ての権限</option>
          <option value="member">メンバー</option>
          <option value="admin">管理者</option>
          <option value="super_admin">スーパー管理者</option>
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">メール</th>
              <th className="px-4 py-3">権限</th>
              <th className="px-4 py-3">ティア</th>
              <th className="px-4 py-3">保有マイル</th>
              <th className="px-4 py-3">累計マイル</th>
              <th className="px-4 py-3">登録日</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.displayName}</td>
                <td className="px-4 py-3 text-gray-500">{m.email}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${m.role === 'admin' || m.role === 'super_admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-600'}`}>
                    {m.role}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {m.pointBalance && (
                    <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium capitalize ${TIER_COLORS[m.pointBalance.tier] ?? ''}`}>
                      {m.pointBalance.tier}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono">{m.pointBalance?.totalMiles.toLocaleString() ?? 0}</td>
                <td className="px-4 py-3 font-mono">{m.pointBalance?.lifetimeMiles.toLocaleString() ?? 0}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(m.createdAt).toLocaleDateString('ja-JP')}
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
    </div>
  )
}
