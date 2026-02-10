import Link from 'next/link'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <nav className="mb-8 flex items-center gap-4 text-sm text-gray-500">
        <Link href="/" className="hover:text-gray-900">ホーム</Link>
        <span>/</span>
        <span>法的情報</span>
      </nav>
      {children}
      <footer className="mt-12 border-t pt-8 text-sm text-gray-400">
        <div className="flex flex-wrap gap-6">
          <Link href="/legal/terms" className="hover:text-gray-600">利用規約</Link>
          <Link href="/legal/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
          <Link href="/legal/tokushoho" className="hover:text-gray-600">特定商取引法に基づく表記</Link>
        </div>
        <p className="mt-4">GamiFi Members</p>
      </footer>
    </div>
  )
}
