import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { BottomNav } from '@/components/layout/BottomNav'

export default function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:flex" />
      <div className="flex flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 pb-20 lg:p-8 lg:pb-8">
          {children}
        </main>
        <BottomNav className="lg:hidden" />
      </div>
    </div>
  )
}
