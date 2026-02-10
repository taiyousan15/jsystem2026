import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await currentUser()
  if (!user) {
    redirect('/sign-in')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar className="hidden lg:flex" isAdmin />
      <div className="flex flex-1 flex-col">
        <Header isAdmin />
        <main className="flex-1 p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}
