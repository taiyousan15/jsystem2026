'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Coins, Trophy, QrCode, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { href: '/dashboard', label: 'ホーム', icon: LayoutDashboard },
  { href: '/miles', label: 'マイル', icon: Coins },
  { href: '/scan', label: 'スキャン', icon: QrCode },
  { href: '/rankings', label: 'ランキング', icon: Trophy },
  { href: '/profile', label: 'マイページ', icon: User },
]

interface BottomNavProps {
  className?: string
}

export function BottomNav({ className }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav className={cn('fixed bottom-0 left-0 right-0 z-50 border-t bg-white', className)}>
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center gap-1 px-3 py-1',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
