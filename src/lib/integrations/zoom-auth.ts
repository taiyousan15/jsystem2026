import { logger } from '@/lib/logger'

interface ZoomTokenResponse {
  access_token: string
  token_type: string
  expires_in: number
  scope: string
}

interface CachedToken {
  accessToken: string
  expiresAt: number
}

let cachedToken: CachedToken | null = null

function getZoomCredentials(): { clientId: string; clientSecret: string; accountId: string } {
  const clientId = process.env.ZOOM_CLIENT_ID
  const clientSecret = process.env.ZOOM_CLIENT_SECRET
  const accountId = process.env.ZOOM_ACCOUNT_ID

  if (!clientId || !clientSecret || !accountId) {
    throw new Error('Zoom credentials not configured: ZOOM_CLIENT_ID, ZOOM_CLIENT_SECRET, ZOOM_ACCOUNT_ID required')
  }

  return { clientId, clientSecret, accountId }
}

export async function getZoomAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.accessToken
  }

  const { clientId, clientSecret, accountId } = getZoomCredentials()
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')

  const response = await fetch('https://zoom.us/oauth/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'account_credentials',
      account_id: accountId,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Zoom OAuth token request failed', { status: response.status, body: errorText })
    throw new Error(`Zoom OAuth failed: ${response.status}`)
  }

  const data: ZoomTokenResponse = await response.json()

  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000,
  }

  logger.info('Zoom OAuth token acquired', { expiresIn: data.expires_in })
  return data.access_token
}

export function clearZoomTokenCache(): void {
  cachedToken = null
}
