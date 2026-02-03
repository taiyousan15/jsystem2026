'use client'

import { useEffect, useState } from 'react'
import {
  FileText,
  Plus,
  Download,
  Trash2,
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  X,
  AlertCircle,
} from 'lucide-react'

interface Account {
  id: string
  platform: string
  accountId: string
  displayName: string
}

interface Report {
  id: string
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED'
  format: 'PDF' | 'EXCEL'
  fileUrl: string | null
  parameters: {
    accountIds: string[]
    dateRange: string
  }
  createdAt: string
  completedAt: string | null
}

const statusConfig = {
  PENDING: { label: '待機中', icon: Clock, color: 'text-yellow-500 bg-yellow-50' },
  PROCESSING: { label: '処理中', icon: RefreshCw, color: 'text-blue-500 bg-blue-50' },
  COMPLETED: { label: '完了', icon: CheckCircle, color: 'text-green-500 bg-green-50' },
  FAILED: { label: '失敗', icon: XCircle, color: 'text-red-500 bg-red-50' },
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [newReport, setNewReport] = useState({
    accountIds: [] as string[],
    format: 'PDF' as 'PDF' | 'EXCEL',
    dateRange: '30',
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('accessToken')

      const [reportsRes, accountsRes] = await Promise.all([
        fetch('/api/v1/reports', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch('/api/v1/accounts', {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])

      if (reportsRes.ok) {
        const data = await reportsRes.json()
        setReports(data.data || [])
      }

      if (accountsRes.ok) {
        const data = await accountsRes.json()
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateReport = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/reports', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReport),
      })

      if (!res.ok) {
        throw new Error('レポートの作成に失敗しました')
      }

      setMessage({ type: 'success', text: 'レポートの生成を開始しました' })
      setShowModal(false)
      setNewReport({ accountIds: [], format: 'PDF', dateRange: '30' })
      fetchData()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteReport = async (id: string) => {
    if (!confirm('このレポートを削除しますか？')) return

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/v1/reports/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'レポートを削除しました' })
        fetchData()
      }
    } catch (error) {
      setMessage({ type: 'error', text: '削除に失敗しました' })
    }
  }

  const toggleAccountSelection = (accountId: string) => {
    setNewReport((prev) => ({
      ...prev,
      accountIds: prev.accountIds.includes(accountId)
        ? prev.accountIds.filter((id) => id !== accountId)
        : [...prev.accountIds, accountId],
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">レポート</h1>
          <p className="text-gray-500 mt-1">分析レポートの作成・管理</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          レポート作成
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg flex items-center gap-3 ${
            message.type === 'success'
              ? 'bg-green-50 text-green-700'
              : 'bg-red-50 text-red-700'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle className="w-5 h-5" />
          ) : (
            <AlertCircle className="w-5 h-5" />
          )}
          <p>{message.text}</p>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto hover:opacity-70"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Reports list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {reports.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  ステータス
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  形式
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  期間
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  作成日
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {reports.map((report) => {
                const status = statusConfig[report.status]
                return (
                  <tr key={report.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${status.color}`}
                        >
                          <status.icon
                            className={`w-4 h-4 ${
                              report.status === 'PROCESSING' ? 'animate-spin' : ''
                            }`}
                          />
                          {status.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                        {report.format}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {report.parameters?.dateRange || '30'}日間
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(report.createdAt).toLocaleDateString('ja-JP')}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {report.status === 'COMPLETED' && report.fileUrl && (
                          <a
                            href={report.fileUrl}
                            download
                            className="p-2 text-gray-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg transition"
                          >
                            <Download className="w-5 h-5" />
                          </a>
                        )}
                        <button
                          onClick={() => handleDeleteReport(report.id)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p>レポートがありません</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-primary-500 hover:underline"
            >
              最初のレポートを作成
            </button>
          </div>
        )}
      </div>

      {/* Create report modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                レポートを作成
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleCreateReport} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象アカウント
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 rounded-lg p-3">
                  {accounts.map((account) => (
                    <label
                      key={account.id}
                      className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={newReport.accountIds.includes(account.id)}
                        onChange={() => toggleAccountSelection(account.id)}
                        className="w-4 h-4 text-primary-500 rounded"
                      />
                      <span className="text-sm text-gray-700">
                        {account.displayName || account.accountId} ({account.platform})
                      </span>
                    </label>
                  ))}
                  {accounts.length === 0 && (
                    <p className="text-gray-400 text-sm text-center py-4">
                      アカウントがありません
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  出力形式
                </label>
                <select
                  value={newReport.format}
                  onChange={(e) =>
                    setNewReport({
                      ...newReport,
                      format: e.target.value as 'PDF' | 'EXCEL',
                    })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="PDF">PDF</option>
                  <option value="EXCEL">Excel</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  対象期間
                </label>
                <select
                  value={newReport.dateRange}
                  onChange={(e) =>
                    setNewReport({ ...newReport, dateRange: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="7">過去7日間</option>
                  <option value="30">過去30日間</option>
                  <option value="90">過去90日間</option>
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={submitting || newReport.accountIds.length === 0}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? '作成中...' : '作成'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
