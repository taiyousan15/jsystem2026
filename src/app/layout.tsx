import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { jaJP } from '@clerk/localizations'
import { CookieBanner } from '@/components/legal/CookieBanner'
import './globals.css'

export const metadata: Metadata = {
  title: 'GamiFi Members',
  description: 'ゲーミフィケーション会員サイト',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider localization={jaJP}>
      <html lang="ja">
        <body className="min-h-screen bg-gray-50 antialiased">
          {children}
          <CookieBanner />
        </body>
      </html>
    </ClerkProvider>
  )
}
