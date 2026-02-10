'use client'

import { cn } from '@/lib/utils'
import { TIER_THRESHOLDS } from '@/types/domain'
import type { Tier } from '@/types/domain'

interface TierBadgeProps {
  readonly tier: Tier
  readonly size?: 'sm' | 'md' | 'lg'
}

export function TierBadge({ tier, size = 'md' }: TierBadgeProps) {
  const tierInfo = TIER_THRESHOLDS.find((t) => t.tier === tier)
  const label = tierInfo?.label ?? tier

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  } as const

  const tierColors = {
    bronze: 'bg-amber-100 text-amber-800 border-amber-300',
    silver: 'bg-gray-100 text-gray-700 border-gray-300',
    gold: 'bg-yellow-100 text-yellow-800 border-yellow-400',
    platinum: 'bg-slate-100 text-slate-700 border-slate-400',
    diamond: 'bg-cyan-100 text-cyan-800 border-cyan-400',
  } as const

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        sizeClasses[size],
        tierColors[tier]
      )}
    >
      {label}
    </span>
  )
}
