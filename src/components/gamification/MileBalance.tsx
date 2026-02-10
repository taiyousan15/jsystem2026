'use client'

import { TierBadge } from './TierBadge'
import type { Tier } from '@/types/domain'

interface MileBalanceProps {
  readonly totalMiles: number
  readonly lifetimeMiles: number
  readonly tier: Tier
}

export function MileBalance({ totalMiles, lifetimeMiles, tier }: MileBalanceProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500">マイル残高</p>
        <p className="mt-1 text-3xl font-bold text-blue-600">
          {totalMiles.toLocaleString()}
        </p>
        <p className="mt-1 text-xs text-gray-400">
          累計: {lifetimeMiles.toLocaleString()} マイル
        </p>
      </div>
      <TierBadge tier={tier} size="lg" />
    </div>
  )
}
