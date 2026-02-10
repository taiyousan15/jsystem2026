'use client'

import { useEffect, useState, useCallback } from 'react'

interface EventData {
  id: string
  title: string
  type: string
  startAt: string
  endAt: string
  capacity: number
  milesReward: number
  status: string
  location: string | null
  onlineUrl: string | null
  _count: { attendees: number }
}

type FormData = {
  title: string
  type: string
  startAt: string
  endAt: string
  capacity: number
  milesReward: number
  location: string
  onlineUrl: string
}

const EMPTY_FORM: FormData = {
  title: '',
  type: 'online',
  startAt: '',
  endAt: '',
  capacity: 30,
  milesReward: 0,
  location: '',
  onlineUrl: '',
}

const STATUS_LABELS: Record<string, string> = {
  upcoming: '開催予定',
  ongoing: '開催中',
  completed: '終了',
  cancelled: '中止',
}

const STATUS_COLORS: Record<string, string> = {
  upcoming: 'bg-blue-100 text-blue-800',
  ongoing: 'bg-green-100 text-green-800',
  completed: 'bg-gray-100 text-gray-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventData[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<FormData>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    const params = new URLSearchParams({ page: String(page), limit: '20' })
    const res = await fetch(`/api/v1/admin/events?${params}`)
    const json = await res.json()
    if (json.success) {
      setEvents(json.data)
      setTotal(json.meta.total)
    }
  }, [page])

  useEffect(() => { load() }, [load])

  const save = async () => {
    setSaving(true)
    await fetch('/api/v1/admin/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        location: form.location || null,
        onlineUrl: form.onlineUrl || null,
      }),
    })
    setSaving(false)
    setShowForm(false)
    setForm(EMPTY_FORM)
    load()
  }

  const updateStatus = async (eventId: string, status: string) => {
    await fetch('/api/v1/admin/events', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, status }),
    })
    load()
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">イベント管理</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {showForm ? 'キャンセル' : '新規作成'}
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">新しいイベント</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <input placeholder="タイトル" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="col-span-full rounded-lg border px-3 py-2" />
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="rounded-lg border px-3 py-2">
              <option value="online">オンライン</option>
              <option value="offline">オフライン</option>
              <option value="hybrid">ハイブリッド</option>
            </select>
            <input type="number" placeholder="定員" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
            <input type="datetime-local" placeholder="開始日時" value={form.startAt} onChange={(e) => setForm({ ...form, startAt: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input type="datetime-local" placeholder="終了日時" value={form.endAt} onChange={(e) => setForm({ ...form, endAt: e.target.value })} className="rounded-lg border px-3 py-2" />
            <input type="number" placeholder="マイル報酬" value={form.milesReward} onChange={(e) => setForm({ ...form, milesReward: Number(e.target.value) })} className="rounded-lg border px-3 py-2" />
            <input placeholder="場所（任意）" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} className="rounded-lg border px-3 py-2" />
          </div>
          <button onClick={save} disabled={saving || !form.title || !form.startAt || !form.endAt} className="mt-4 rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50">
            {saving ? '作成中...' : '作成'}
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">タイトル</th>
              <th className="px-4 py-3">種類</th>
              <th className="px-4 py-3">日時</th>
              <th className="px-4 py-3">参加者</th>
              <th className="px-4 py-3">報酬</th>
              <th className="px-4 py-3">ステータス</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {events.map((ev) => (
              <tr key={ev.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{ev.title}</td>
                <td className="px-4 py-3 capitalize">{ev.type}</td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(ev.startAt).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </td>
                <td className="px-4 py-3">
                  {ev._count.attendees} / {ev.capacity}
                </td>
                <td className="px-4 py-3 font-mono">{ev.milesReward}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[ev.status] ?? ''}`}>
                    {STATUS_LABELS[ev.status] ?? ev.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {ev.status === 'upcoming' && (
                    <button onClick={() => updateStatus(ev.id, 'cancelled')} className="rounded bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600">
                      中止
                    </button>
                  )}
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
