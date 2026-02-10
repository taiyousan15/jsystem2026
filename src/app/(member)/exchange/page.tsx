'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface CatalogItem {
  id: string
  name: string
  description: string
  category: string
  requiredMiles: number
  stock: number
  imageUrl: string | null
}

export default function ExchangePage() {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [balance, setBalance] = useState(0)
  const [category, setCategory] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [exchanging, setExchanging] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const [catalog, bal] = await Promise.all([
          apiClient.exchange.getCatalog(1, 50, category || undefined),
          apiClient.miles.getBalance(),
        ])
        setItems(catalog.items)
        setBalance(bal.totalMiles)
      } catch {
        // handled by api-client
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [category])

  const handleExchange = async (itemId: string) => {
    if (exchanging) return
    setExchanging(itemId)
    try {
      await apiClient.exchange.request(itemId)
      const bal = await apiClient.miles.getBalance()
      setBalance(bal.totalMiles)
      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, stock: item.stock - 1 } : item
        )
      )
    } catch (err) {
      alert(err instanceof Error ? err.message : '交換に失敗しました')
    } finally {
      setExchanging(null)
    }
  }

  const categories = ['', 'digital', 'physical', 'experience']

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">マイル交換</h1>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-gray-200" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">マイル交換</h1>
        <p className="text-lg font-semibold text-blue-600">
          保有: {balance.toLocaleString()} マイル
        </p>
      </div>

      <div className="flex gap-2">
        {categories.map((cat) => (
          <button
            key={cat || 'all'}
            onClick={() => setCategory(cat)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              category === cat
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat === '' ? 'すべて' : cat === 'digital' ? 'デジタル' : cat === 'physical' ? '物品' : '体験'}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="overflow-hidden rounded-xl border bg-white shadow-sm"
          >
            <div className="flex h-40 items-center justify-center bg-gray-100">
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-4xl">🎁</span>
              )}
            </div>
            <div className="p-4">
              <h3 className="font-semibold text-gray-900">{item.name}</h3>
              <p className="mt-1 text-sm text-gray-500">{item.description}</p>
              <div className="mt-3 flex items-center justify-between">
                <span className="text-lg font-bold text-blue-600">
                  {item.requiredMiles.toLocaleString()} マイル
                </span>
                <span className="text-sm text-gray-400">
                  残り {item.stock}
                </span>
              </div>
              <button
                onClick={() => handleExchange(item.id)}
                disabled={
                  balance < item.requiredMiles ||
                  item.stock <= 0 ||
                  exchanging === item.id
                }
                className="mt-3 w-full rounded-lg bg-blue-600 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {exchanging === item.id
                  ? '処理中...'
                  : item.stock <= 0
                    ? '在庫なし'
                    : balance < item.requiredMiles
                      ? 'マイル不足'
                      : '交換する'}
              </button>
            </div>
          </div>
        ))}
      </div>

      {items.length === 0 && (
        <p className="text-center text-gray-500">
          このカテゴリには商品がありません
        </p>
      )}
    </div>
  )
}
