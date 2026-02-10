'use client'

import { useEffect, useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { apiClient } from '@/lib/api-client'

interface ProfileData {
  id: string
  displayName: string
  email: string
  bio: string | null
  avatarUrl: string | null
  role: string
  createdAt: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.profile.get()
        setProfile(data as ProfileData)
        setDisplayName((data as ProfileData).displayName)
        setBio((data as ProfileData).bio ?? '')
      } catch {
        // fallback
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      await apiClient.profile.update({ displayName, bio })
      setProfile((prev) => prev ? { ...prev, displayName, bio } : null)
      setEditing(false)
    } catch {
      // error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
        <div className="h-64 animate-pulse rounded-xl bg-gray-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">プロフィール</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>プロフィール情報</CardTitle>
            {!editing && (
              <Button variant="outline" onClick={() => setEditing(true)}>
                編集
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gray-200">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400">
                  {profile?.displayName?.charAt(0) ?? '?'}
                </div>
              )}
            </div>
            <div className="flex-1 space-y-4">
              {editing ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">表示名</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">自己紹介</label>
                    <textarea
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      maxLength={500}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                    />
                    <p className="mt-1 text-xs text-gray-400">{bio.length}/500</p>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      {saving ? '保存中...' : '保存'}
                    </Button>
                    <Button variant="ghost" onClick={() => setEditing(false)}>
                      キャンセル
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-lg font-semibold text-gray-900">{profile?.displayName}</p>
                    <p className="text-sm text-gray-500">{profile?.email}</p>
                  </div>
                  {profile?.bio && (
                    <p className="text-sm text-gray-700">{profile.bio}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    登録日: {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('ja-JP') : '-'}
                  </p>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
