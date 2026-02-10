'use client'

import { cn } from '@/lib/utils'

interface StreakDisplayProps {
  readonly currentStreak: number
  readonly longestStreak: number
  readonly freezeRemaining: number
}

export function StreakDisplay({
  currentStreak,
  longestStreak,
  freezeRemaining,
}: StreakDisplayProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex flex-col items-center">
        <span className={cn(
          'text-3xl font-bold',
          currentStreak >= 7 ? 'text-orange-500' : 'text-green-600'
        )}>
          {currentStreak}
        </span>
        <span className="text-xs text-gray-500">連続日数</span>
      </div>
      <div className="h-10 w-px bg-gray-200" />
      <div className="flex flex-col items-center">
        <span className="text-xl font-semibold text-gray-700">{longestStreak}</span>
        <span className="text-xs text-gray-500">最長記録</span>
      </div>
      <div className="h-10 w-px bg-gray-200" />
      <div className="flex flex-col items-center">
        <span className="text-xl font-semibold text-blue-600">{freezeRemaining}</span>
        <span className="text-xs text-gray-500">フリーズ</span>
      </div>
    </div>
  )
}
