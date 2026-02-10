'use client'

import { TIER_THRESHOLDS } from '@/types/domain'
import type { Tier } from '@/types/domain'
import { cn } from '@/lib/utils'

interface TierProgressProps {
  readonly lifetimeMiles: number
  readonly currentTier: Tier
}

export function TierProgress({ lifetimeMiles, currentTier }: TierProgressProps) {
  const currentIndex = TIER_THRESHOLDS.findIndex((t) => t.tier === currentTier)
  const nextTier = TIER_THRESHOLDS[currentIndex + 1]

  if (!nextTier) {
    return (
      <div className="text-center">
        <p className="text-sm font-medium text-cyan-700">最高ティア達成!</p>
      </div>
    )
  }

  const currentThreshold = TIER_THRESHOLDS[currentIndex]?.requiredMiles ?? 0
  const range = nextTier.requiredMiles - currentThreshold
  const progress = Math.min(((lifetimeMiles - currentThreshold) / range) * 100, 100)
  const remaining = nextTier.requiredMiles - lifetimeMiles

  return (
    <div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{nextTier.label}まで</span>
        <span>あと {remaining.toLocaleString()} マイル</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-700')}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
