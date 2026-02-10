'use client'

import { useEffect, useState, useCallback } from 'react'

interface CatalogItem {
  id: string
  name: string
  description: string
  category: string
  requiredMiles: number
  stock: number | null
  imageUrl: string | null
  isActive: boolean
  createdAt: string
}

type FormData = {
  name: string
  description: string
  category: string
  requiredMiles: number
  stock: number | null
}

const EMPTY_FORM: FormData = {
  name: '',
  description: '',
  category: 'digital',
  requiredMiles: 100,
  stock: null,
}

export default function AdminCatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20', includeInactive: 'true' })
    const res = await fetch(`/api/v1/admin/catalog?${params}`)
    const json = await res.json()
    if (json.success) {
      setItems(json.data)
      setTotal(json.meta.total)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    await fetch('/api/v1/admin/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_FORM)
    load()
  }

  const toggleActive = async (itemId: string, isActive: boolean) => {
    await fetch('/api/v1/admin/catalog', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, isActive }),
    })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">カタログ管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'キャンセル' : '新規追加'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">新しい商品を追加</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="商品名" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border px-3 py-2" />
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="rounded-lg border px-3 py-2">
              <option value="digital">デジタル</option>
              <option value="physical">フィジカル</option>
              <option value="coupon">クーポン</option>
            </select>
            <input type="number" placeholder="必要マイル" value={form.requiredMiles} onChange={(e) => setForm({ ...form, requiredMiles: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="在庫数（空欄=無制限）" value={form.stock ?? ''} onChange={(e) => setForm({ ...form, stock: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border px-3 py-2" />
            <textarea placeholder="説明" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="col-span-full rounded-lg border px-3 py-2" rows={3} />
          </div>
          <button onClick={save} disabled={saving || !form.name || !form.description} className="mt-4 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">商品名</th>
              <th className="px-4 py-3">カテゴリ</th>
              <th className="px-4 py-3">必要マイル</th>
              <th className="px-4 py-3">在庫</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {items.map((item) => (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{item.name}</td>
                <td className="px-4 py-3 capitalize">{item.category}</td>
                <td className="px-4 py-3 font-mono">{item.requiredMiles.toLocaleString()}</td>
                <td className="px-4 py-3">{item.stock !== null ? item.stock : '無制限'}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${item.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {item.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(item.id, !item.isActive)}
                    className={`rounded px-3 py-1 text-xs text-white ${item.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {item.isActive ? '無効化' : '有効化'}
                  </button>
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
