import { UserButton } from '@clerk/nextjs'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface HeaderProps {
  isAdmin?: boolean
}

export function Header({ isAdmin = false }: HeaderProps) {
  return (
    <header className="flex h-16 items-center justify-between border-b bg-white px-4 lg:px-8">
      <div className="flex items-center gap-4 lg:hidden">
        <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="text-xl font-bold text-blue-600">
          GamiFi
        </Link>
      </div>
      <div className="ml-auto flex items-center gap-4">
        <Link
          href="/notifications"
          className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Bell className="h-5 w-5" />
        </Link>
        <UserButton afterSignOutUrl="/" />
      </div>
    </header>
  )
}
