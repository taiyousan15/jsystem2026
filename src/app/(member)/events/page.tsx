'use client'

import { useEffect, useState } from 'react'
import { apiClient } from '@/lib/api-client'

interface EventItem {
  id: string
  title: string
  description: string | null
  startAt: string
  endAt: string
  capacity: number
  milesReward: number
  status: string
  attendees: Array<{ userId: string }>
}

interface MyEvent {
  eventId: string
  event: {
    id: string
    title: string
    description: string | null
    startAt: string
    endAt: string
    milesReward: number
    status: string
  }
}

export default function EventsPage() {
  const [events, setEvents] = useState<EventItem[]>([])
  const [myEvents, setMyEvents] = useState<MyEvent[]>([])
  const [tab, setTab] = useState<'upcoming' | 'my'>('upcoming')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [upcoming, my] = await Promise.all([
          apiClient.events.getUpcoming(),
          apiClient.events.getMy(),
        ])
        setEvents(upcoming.events)
        setMyEvents(my)
      } catch {
        // handled by api-client
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const myEventIds = new Set(myEvents.map((e) => e.eventId))

  const handleRegister = async (eventId: string) => {
    try {
      await apiClient.events.register(eventId)
      const my = await apiClient.events.getMy()
      setMyEvents(my)
    } catch (err) {
      alert(err instanceof Error ? err.message : '登録に失敗しました')
    }
  }

  const handleCancel = async (eventId: string) => {
    try {
      await apiClient.events.cancel(eventId)
      const my = await apiClient.events.getMy()
      setMyEvents(my)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'キャンセルに失敗しました')
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return d.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-gray-900">イベント</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 animate-pulse rounded-xl bg-gray-200" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">イベント</h1>

      <div className="flex gap-2">
        <button
          onClick={() => setTab('upcoming')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === 'upcoming'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          開催予定
        </button>
        <button
          onClick={() => setTab('my')}
          className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
            tab === 'my'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          参加予定 ({myEvents.length})
        </button>
      </div>

      {tab === 'upcoming' && (
        <div className="space-y-4">
          {events.map((event) => {
            const registered = event.attendees.length
            const isFull =
              event.capacity > 0 && registered >= event.capacity
            const isRegistered = myEventIds.has(event.id)

            return (
              <div
                key={event.id}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {event.description}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-600">
                      <span>
                        {formatDate(event.startAt)}
                      </span>
                      {event.capacity > 0 && (
                        <span>
                          {registered}/{event.capacity}名
                        </span>
                      )}
                      <span className="font-medium text-blue-600">
                        +{event.milesReward} マイル
                      </span>
                    </div>
                  </div>
                  <div className="ml-4">
                    {isRegistered ? (
                      <button
                        onClick={() => handleCancel(event.id)}
                        className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        キャンセル
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(event.id)}
                        disabled={isFull}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                        {isFull ? '満席' : '参加する'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
          {events.length === 0 && (
            <p className="text-center text-gray-500">
              現在予定されているイベントはありません
            </p>
          )}
        </div>
      )}

      {tab === 'my' && (
        <div className="space-y-4">
          {myEvents.map((myEvent) => (
              <div
                key={myEvent.eventId}
                className="rounded-xl border bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {myEvent.event.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      {formatDate(myEvent.event.startAt)}
                    </p>
                    <span className="mt-2 inline-block text-sm font-medium text-blue-600">
                      +{myEvent.event.milesReward} マイル
                    </span>
                  </div>
                  <button
                    onClick={() => handleCancel(myEvent.eventId)}
                    className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            ))}
          {myEvents.length === 0 && (
            <p className="text-center text-gray-500">
              参加予定のイベントはありません
            </p>
          )}
        </div>
      )}
    </div>
  )
}
