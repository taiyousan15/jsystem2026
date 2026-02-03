'use client'

import { useEffect, useState } from 'react'
import {
  Plus,
  Trash2,
  RefreshCw,
  Search,
  AlertCircle,
  CheckCircle,
  X,
} from 'lucide-react'

interface Account {
  id: string
  platform: 'X' | 'INSTAGRAM' | 'TIKTOK'
  accountId: string
  displayName: string
  createdAt: string
}

const platformLabels = {
  X: 'X (Twitter)',
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
}

const platformColors = {
  X: 'bg-black',
  INSTAGRAM: 'bg-gradient-to-r from-purple-500 to-pink-500',
  TIKTOK: 'bg-black',
}

export default function AccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [newAccount, setNewAccount] = useState({ platform: 'X', accountId: '' })
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<{
    type: 'success' | 'error'
    text: string
  } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAccounts()
  }, [])

  const fetchAccounts = async () => {
    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/accounts', {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        setAccounts(data.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setMessage(null)

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch('/api/v1/accounts', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newAccount),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || '登録に失敗しました')
      }

      setMessage({ type: 'success', text: 'アカウントを登録しました' })
      setShowModal(false)
      setNewAccount({ platform: 'X', accountId: '' })
      fetchAccounts()
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'エラーが発生しました',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteAccount = async (id: string) => {
    if (!confirm('このアカウントを削除しますか？')) return

    try {
      const token = localStorage.getItem('accessToken')
      const res = await fetch(`/api/v1/accounts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        setMessage({ type: 'success', text: 'アカウントを削除しました' })
        fetchAccounts()
      }
    } catch (error) {
      setMessage({ type: 'error', text: '削除に失敗しました' })
    }
  }

  const filteredAccounts = accounts.filter(
    (a) =>
      a.accountId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <h1 className="text-2xl font-bold text-gray-900">アカウント管理</h1>
          <p className="text-gray-500 mt-1">
            分析対象のSNSアカウントを管理します
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition"
        >
          <Plus className="w-5 h-5" />
          アカウント追加
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

      {/* Search */}
      <div className="relative">
        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="アカウントを検索..."
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Accounts list */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {filteredAccounts.length > 0 ? (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  アカウント
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  プラットフォーム
                </th>
                <th className="px-6 py-4 text-left text-sm font-medium text-gray-500">
                  登録日
                </th>
                <th className="px-6 py-4 text-right text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAccounts.map((account) => (
                <tr key={account.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 ${
                          platformColors[account.platform]
                        } rounded-full flex items-center justify-center text-white font-bold`}
                      >
                        {account.platform.charAt(0)}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {account.displayName || account.accountId}
                        </p>
                        <p className="text-sm text-gray-500">
                          @{account.accountId}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-gray-100 rounded-full text-sm text-gray-700">
                      {platformLabels[account.platform]}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(account.createdAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDeleteAccount(account.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <p>アカウントがありません</p>
            <button
              onClick={() => setShowModal(true)}
              className="mt-4 text-primary-500 hover:underline"
            >
              最初のアカウントを追加
            </button>
          </div>
        )}
      </div>

      {/* Add account modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">
                アカウントを追加
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleAddAccount} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  プラットフォーム
                </label>
                <select
                  value={newAccount.platform}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, platform: e.target.value })
                  }
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                >
                  <option value="X">X (Twitter)</option>
                  <option value="INSTAGRAM">Instagram</option>
                  <option value="TIKTOK">TikTok</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  アカウントID
                </label>
                <input
                  type="text"
                  value={newAccount.accountId}
                  onChange={(e) =>
                    setNewAccount({ ...newAccount, accountId: e.target.value })
                  }
                  placeholder="@username または ID"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                  required
                />
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
                  disabled={submitting}
                  className="flex-1 px-4 py-3 bg-primary-500 hover:bg-primary-600 text-white rounded-lg transition disabled:opacity-50"
                >
                  {submitting ? '登録中...' : '追加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
