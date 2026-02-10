import { Ratelimit, type Duration } from '@upstash/ratelimit'
import { redis } from './redis'

export function createRateLimit(
  requests: number,
  window: Duration
): Ratelimit | null {
  if (!redis) {
    return null
  }

  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    analytics: true,
  })
}

export const apiRateLimit = createRateLimit(60, '1 m')
export const authRateLimit = createRateLimit(10, '1 m')
