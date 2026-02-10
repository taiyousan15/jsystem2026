import crypto from 'crypto'
import { logger } from '@/lib/logger'

interface ZoomWebhookEvent {
  event: string
  event_ts: number
  payload: {
    account_id: string
    object: Record<string, unknown>
  }
}

interface ZoomUrlValidationEvent {
  event: 'endpoint.url_validation'
  payload: {
    plainToken: string
  }
}

type ZoomWebhookPayload = ZoomWebhookEvent | ZoomUrlValidationEvent

function getWebhookSecret(): string {
  const secret = process.env.ZOOM_WEBHOOK_SECRET_TOKEN
  if (!secret) {
    throw new Error('ZOOM_WEBHOOK_SECRET_TOKEN is not configured')
  }
  return secret
}

export function verifyZoomWebhookSignature(
  rawBody: string,
  signature: string,
  timestamp: string
): boolean {
  const secret = getWebhookSecret()
  const message = `v0:${timestamp}:${rawBody}`
  const expectedSignature = `v0=${crypto.createHmac('sha256', secret).update(message).digest('hex')}`

  const isValid = crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  )

  if (!isValid) {
    logger.warn('Zoom webhook signature verification failed')
  }

  return isValid
}

export function createUrlValidationResponse(plainToken: string): {
  plainToken: string
  encryptedToken: string
} {
  const secret = getWebhookSecret()
  const encryptedToken = crypto
    .createHmac('sha256', secret)
    .update(plainToken)
    .digest('hex')

  return { plainToken, encryptedToken }
}

export function parseZoomWebhook(rawBody: string): ZoomWebhookPayload {
  return JSON.parse(rawBody) as ZoomWebhookPayload
}

export type { ZoomWebhookEvent, ZoomUrlValidationEvent, ZoomWebhookPayload }
