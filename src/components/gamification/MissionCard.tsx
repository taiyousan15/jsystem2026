'use client'

import { cn } from '@/lib/utils'

interface MissionCardProps {
  readonly title: string
  readonly description: string
  readonly currentCount: number
  readonly targetCount: number
  readonly rewardMiles: number
  readonly status: string
}

export function MissionCard({
  title,
  description,
  currentCount,
  targetCount,
  rewardMiles,
  status,
}: MissionCardProps) {
  const progress = Math.min((currentCount / targetCount) * 100, 100)
  const isCompleted = status === 'completed'

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isCompleted ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h4 className="font-medium text-gray-900">
            {isCompleted && <span className="mr-1">&#10003;</span>}
            {title}
          </h4>
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        </div>
        <span className="ml-2 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          +{rewardMiles} マイル
        </span>
      </div>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {currentCount} / {targetCount}
          </span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="mt-1 h-2 overflow-hidden rounded-full bg-gray-100">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isCompleted ? 'bg-green-500' : 'bg-blue-500'
            )}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  )
}
