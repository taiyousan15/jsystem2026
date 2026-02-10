'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Coins,
  Trophy,
  Award,
  ShoppingBag,
  Calendar,
  QrCode,
  User,
  Users,
  Bell,
  Settings,
  Shield,
  Video,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const memberLinks = [
  { href: '/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/miles', label: 'マイル', icon: Coins },
  { href: '/rankings', label: 'ランキング', icon: Trophy },
  { href: '/badges', label: 'バッジ', icon: Award },
  { href: '/exchange', label: '交換', icon: ShoppingBag },
  { href: '/events', label: 'イベント', icon: Calendar },
  { href: '/zoom', label: 'グルコン', icon: Video },
  { href: '/scan', label: 'QRスキャン', icon: QrCode },
  { href: '/profile', label: 'プロフィール', icon: User },
  { href: '/referral', label: '友達招待', icon: Users },
  { href: '/notifications', label: '通知', icon: Bell },
  { href: '/settings', label: '設定', icon: Settings },
]

const adminLinks = [
  { href: '/admin/dashboard', label: 'ダッシュボード', icon: LayoutDashboard },
  { href: '/admin/members', label: '会員管理', icon: Users },
  { href: '/admin/events', label: 'イベント管理', icon: Calendar },
  { href: '/admin/exchanges', label: '交換管理', icon: ShoppingBag },
  { href: '/admin/catalog', label: 'カタログ管理', icon: ShoppingBag },
  { href: '/admin/badges', label: 'バッジ管理', icon: Award },
  { href: '/admin/mile-rules', label: 'マイルルール', icon: Coins },
  { href: '/admin/notifications', label: '通知管理', icon: Bell },
  { href: '/admin/zoom', label: 'Zoom管理', icon: Video },
  { href: '/admin/audit-logs', label: '監査ログ', icon: Shield },
]

interface SidebarProps {
  className?: string
  isAdmin?: boolean
}

export function Sidebar({ className, isAdmin = false }: SidebarProps) {
  const pathname = usePathname()
  const links = isAdmin ? adminLinks : memberLinks

  return (
    <aside className={cn('w-64 border-r bg-white', className)}>
      <div className="flex h-16 items-center border-b px-6">
        <Link href={isAdmin ? '/admin/dashboard' : '/dashboard'} className="text-xl font-bold text-blue-600">
          GamiFi
        </Link>
      </div>
      <nav className="flex flex-col gap-1 p-4">
        {links.map((link) => {
          const Icon = link.icon
          const isActive = pathname === link.href
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
              )}
            >
              <Icon className="h-5 w-5" />
              {link.label}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
