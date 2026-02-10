'use client'

import { useEffect, useState, useCallback } from 'react'

interface MileRule {
  id: string
  actionCode: string
  actionName: string
  baseMiles: number
  dailyLimit: number | null
  cooldownSeconds: number
  isActive: boolean
}

type FormData = {
  actionCode: string
  actionName: string
  baseMiles: number
  dailyLimit: number | null
  cooldownSeconds: number
}

const EMPTY_FORM: FormData = {
  actionCode: '',
  actionName: '',
  baseMiles: 10,
  dailyLimit: null,
  cooldownSeconds: 5,
}

export default function AdminMileRulesPage() {
  const [rules, setRules] = useState<MileRule[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20', includeInactive: 'true' })
    const res = await fetch(`/api/v1/admin/mile-rules?${params}`)
    const json = await res.json()
    if (json.success) {
      setRules(json.data)
      setTotal(json.meta.total)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    await fetch('/api/v1/admin/mile-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_FORM)
    load()
  }

  const toggleActive = async (ruleId: string, isActive: boolean) => {
    await fetch('/api/v1/admin/mile-rules', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ruleId, isActive }),
    })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マイルルール管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'キャンセル' : '新規追加'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">新しいマイルルール</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="アクションコード (例: daily_login)" value={form.actionCode} onChange={(e) => setForm({ ...form, actionCode: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input placeholder="アクション名 (例: デイリーログイン)" value={form.actionName} onChange={(e) => setForm({ ...form, actionName: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="基本マイル" value={form.baseMiles} onChange={(e) => setForm({ ...form, baseMiles: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="1日の上限（空欄=無制限）" value={form.dailyLimit ?? ''} onChange={(e) => setForm({ ...form, dailyLimit: e.target.value ? Number(e.target.value) : null })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="クールダウン（秒）" value={form.cooldownSeconds} onChange={(e) => setForm({ ...form, cooldownSeconds: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
          </div>
          <button onClick={save} disabled={saving || !form.actionCode || !form.actionName} className="mt-4 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">アクションコード</th>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">基本マイル</th>
              <th className="px-4 py-3">日次上限</th>
              <th className="px-4 py-3">クールダウン</th>
              <th className="px-4 py-3">状態</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {rules.map((rule) => (
              <tr key={rule.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{rule.actionCode}</td>
                <td className="px-4 py-3 font-medium">{rule.actionName}</td>
                <td className="px-4 py-3 font-mono">{rule.baseMiles}</td>
                <td className="px-4 py-3">{rule.dailyLimit ?? '無制限'}</td>
                <td className="px-4 py-3">{rule.cooldownSeconds}秒</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${rule.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {rule.isActive ? '有効' : '無効'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => toggleActive(rule.id, !rule.isActive)}
                    className={`rounded px-3 py-1 text-xs text-white ${rule.isActive ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                  >
                    {rule.isActive ? '無効化' : '有効化'}
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
