import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight text-gray-900">
        GamiFi Members
      </h1>
      <p className="mt-4 text-lg text-gray-600">
        ゲーミフィケーション会員サイト
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/sign-in"
          className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-500"
        >
          ログイン
        </Link>
        <Link
          href="/sign-up"
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50"
        >
          新規登録
        </Link>
      </div>
      <footer className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-gray-400">
        <Link href="/legal/terms" className="hover:text-gray-600">利用規約</Link>
        <Link href="/legal/privacy" className="hover:text-gray-600">プライバシーポリシー</Link>
        <Link href="/legal/tokushoho" className="hover:text-gray-600">特定商取引法に基づく表記</Link>
      </footer>
    </main>
  )
}
