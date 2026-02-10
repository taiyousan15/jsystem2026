'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { MileBalance } from '@/components/gamification/MileBalance'
import { TierProgress } from '@/components/gamification/TierProgress'
import { apiClient } from '@/lib/api-client'
import type { Tier } from '@/types/domain'

interface Transaction {
  id: string
  amount: number
  type: string
  source: string
  createdAt: string
}

export default function MilesPage() {
  const [balance, setBalance] = useState<{ totalMiles: number; lifetimeMiles: number; tier: Tier } | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const limit = 20

  useEffect(() => {
    async function load() {
      try {
        const [balanceData, historyData] = await Promise.all([
          apiClient.miles.getBalance(),
          apiClient.miles.getHistory(page, limit),
        ])
        setBalance(balanceData as { totalMiles: number; lifetimeMiles: number; tier: Tier })
        setTransactions(historyData.transactions as Transaction[])
        setTotal(historyData.total)
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [page])

  const totalPages = Math.ceil(total / limit)

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">マイル履歴</h1>
        <div className="h-40 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">マイル履歴</h1>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <MileBalance
            totalMiles={balance?.totalMiles ?? 0}
            lifetimeMiles={balance?.lifetimeMiles ?? 0}
            tier={balance?.tier ?? 'bronze'}
          />
          <TierProgress
            lifetimeMiles={balance?.lifetimeMiles ?? 0}
            currentTier={balance?.tier ?? 'bronze'}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>取引履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-400">まだ取引がありません</p>
          ) : (
            <div className="divide-y">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{tx.source}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('ja-JP')}
                    </p>
                  </div>
                  <span
                    className={
                      tx.amount > 0
                        ? 'text-sm font-semibold text-green-600'
                        : 'text-sm font-semibold text-red-600'
                    }
                  >
                    {tx.amount > 0 ? '+' : ''}
                    {tx.amount.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                前へ
              </button>
              <span className="text-sm text-gray-500">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="rounded-lg px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 disabled:opacity-50"
              >
                次へ
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
