import { SnsClient, SnsPlatform } from './types'
import { xClient } from './xClient'
import { instagramClient } from './instagramClient'
import { tiktokClient } from './tiktokClient'

export * from './types'

const clients: Record<SnsPlatform, SnsClient> = {
  X: xClient,
  INSTAGRAM: instagramClient,
  TIKTOK: tiktokClient,
}

export function getSnsClient(platform: SnsPlatform): SnsClient {
  const client = clients[platform]
  if (!client) {
    throw new Error(`Unsupported platform: ${platform}`)
  }
  return client
}

export { xClient, instagramClient, tiktokClient }
