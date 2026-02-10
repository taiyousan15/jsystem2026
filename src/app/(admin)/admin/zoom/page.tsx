'use client'

import { useEffect, useState, useCallback } from 'react'

interface MeetingReport {
  id: string
  topic: string
  startTime: string
  endTime: string | null
  durationMinutes: number | null
  status: string
  _count: { participations: number }
}

interface Mapping {
  id: string
  userId: string
  zoomEmail: string
  verified: boolean
  user: { id: string; name: string; email: string }
}

type Tab = 'reports' | 'mapping'

const STATUS_LABELS: Record<string, string> = {
  scheduled: '予定',
  started: '開催中',
  ended: '終了',
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-blue-100 text-blue-800',
  started: 'bg-green-100 text-green-800',
  ended: 'bg-gray-100 text-gray-800',
}

export default function AdminZoomPage() {
  const [tab, setTab] = useState<Tab>('reports')
  const [meetings, setMeetings] = useState<MeetingReport[]>([])
  const [meetingTotal, setMeetingTotal] = useState(0)
  const [meetingPage, setMeetingPage] = useState(1)

  const [mappings, setMappings] = useState<Mapping[]>([])
  const [mappingTotal, setMappingTotal] = useState(0)
  const [mappingPage, setMappingPage] = useState(1)

  const [newMapping, setNewMapping] = useState({ userId: '', zoomEmail: '' })
  const [saving, setSaving] = useState(false)

  const loadMeetings = useCallback(async () => {
    const params = new URLSearchParams({ page: String(meetingPage), limit: '20' })
    const res = await fetch(`/api/v1/admin/zoom/reports?${params}`)
    const json = await res.json()
    if (json.success) {
      setMeetings(json.data)
      setMeetingTotal(json.meta.total)
    }
  }, [meetingPage])

  const loadMappings = useCallback(async () => {
    const params = new URLSearchParams({ page: String(mappingPage), limit: '20' })
    const res = await fetch(`/api/v1/admin/zoom/mapping?${params}`)
    const json = await res.json()
    if (json.success) {
      setMappings(json.data)
      setMappingTotal(json.meta.total)
    }
  }, [mappingPage])

  useEffect(() => {
    if (tab === 'reports') loadMeetings()
    else loadMappings()
  }, [tab, loadMeetings, loadMappings])

  const saveMapping = async () => {
    if (!newMapping.userId || !newMapping.zoomEmail) return
    setSaving(true)
    await fetch('/api/v1/admin/zoom/mapping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newMapping),
    })
    setSaving(false)
    setNewMapping({ userId: '', zoomEmail: '' })
    loadMappings()
  }

  const meetingPages = Math.ceil(meetingTotal / 20)
  const mappingPages = Math.ceil(mappingTotal / 20)

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Zoom管理</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('reports')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'reports' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          参加レポート
        </button>
        <button
          onClick={() => setTab('mapping')}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${
            tab === 'mapping' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
          }`}
        >
          メール紐付け
        </button>
      </div>

      {tab === 'reports' && (
        <>
          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">トピック</th>
                  <th className="px-4 py-3">日時</th>
                  <th className="px-4 py-3">時間</th>
                  <th className="px-4 py-3">参加者</th>
                  <th className="px-4 py-3">ステータス</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {meetings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.topic}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(m.startTime).toLocaleString('ja-JP', {
                        month: 'short', day: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">{m.durationMinutes ?? '-'}分</td>
                    <td className="px-4 py-3">{m._count.participations}人</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[m.status] ?? ''}`}>
                        {STATUS_LABELS[m.status] ?? m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {meetingPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setMeetingPage(Math.max(1, meetingPage - 1))} disabled={meetingPage === 1} className="rounded border px-3 py-1 text-sm disabled:opacity-50">前へ</button>
              <span className="text-sm text-gray-500">{meetingPage} / {meetingPages}</span>
              <button onClick={() => setMeetingPage(Math.min(meetingPages, meetingPage + 1))} disabled={meetingPage === meetingPages} className="rounded border px-3 py-1 text-sm disabled:opacity-50">次へ</button>
            </div>
          )}
        </>
      )}

      {tab === 'mapping' && (
        <>
          <div className="rounded-xl border bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">新しい紐付け</h2>
            <div className="flex gap-3">
              <input
                placeholder="ユーザーID"
                value={newMapping.userId}
                onChange={(e) => setNewMapping({ ...newMapping, userId: e.target.value })}
                className="flex-1 rounded-lg border px-3 py-2"
              />
              <input
                placeholder="Zoom メールアドレス"
                value={newMapping.zoomEmail}
                onChange={(e) => setNewMapping({ ...newMapping, zoomEmail: e.target.value })}
                className="flex-1 rounded-lg border px-3 py-2"
              />
              <button
                onClick={saveMapping}
                disabled={saving || !newMapping.userId || !newMapping.zoomEmail}
                className="rounded-lg bg-green-600 px-6 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? '保存中...' : '保存'}
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border bg-white shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">会員名</th>
                  <th className="px-4 py-3">会員メール</th>
                  <th className="px-4 py-3">Zoomメール</th>
                  <th className="px-4 py-3">確認済み</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {mappings.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{m.user.name}</td>
                    <td className="px-4 py-3 text-gray-500">{m.user.email}</td>
                    <td className="px-4 py-3">{m.zoomEmail}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${
                        m.verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {m.verified ? '確認済み' : '未確認'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {mappingPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button onClick={() => setMappingPage(Math.max(1, mappingPage - 1))} disabled={mappingPage === 1} className="rounded border px-3 py-1 text-sm disabled:opacity-50">前へ</button>
              <span className="text-sm text-gray-500">{mappingPage} / {mappingPages}</span>
              <button onClick={() => setMappingPage(Math.min(mappingPages, mappingPage + 1))} disabled={mappingPage === mappingPages} className="rounded border px-3 py-1 text-sm disabled:opacity-50">次へ</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
