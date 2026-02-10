'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

const COOKIE_CONSENT_KEY = 'gamifi-cookie-consent'

type ConsentStatus = 'accepted' | 'rejected' | null

function getStoredConsent(): ConsentStatus {
  if (typeof window === 'undefined') return null
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY)
  if (stored === 'accepted' || stored === 'rejected') return stored
  return null
}

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = getStoredConsent()
    if (consent === null) {
      setVisible(true)
    }
  }, [])

  const handleAccept = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setVisible(false)
  }, [])

  const handleReject = useCallback(() => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'rejected')
    setVisible(false)
  }, [])

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie同意"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white p-4 shadow-lg sm:p-6"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-700">
            本サイトでは、サービス提供に必要なCookie（認証・設定）と、
            サービス改善のための分析Cookieを使用しています。
            詳しくは
            <Link
              href="/legal/privacy"
              className="text-blue-600 underline hover:text-blue-800"
            >
              プライバシーポリシー
            </Link>
            をご確認ください。
          </p>
        </div>
        <div className="flex shrink-0 gap-3">
          <button
            type="button"
            onClick={handleReject}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            必須のみ
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
          >
            すべて許可
          </button>
        </div>
      </div>
    </div>
  )
}
