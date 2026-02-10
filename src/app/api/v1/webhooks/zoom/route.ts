import { NextResponse } from 'next/server'
import { verifyZoomWebhookSignature, createUrlValidationResponse, parseZoomWebhook } from '@/lib/integrations/zoom-webhook'
import { zoomService } from '@/services/zoom.service'
import { logger } from '@/lib/logger'

export async function POST(request: Request) {
  const rawBody = await request.text()
  const timestamp = request.headers.get('x-zm-request-timestamp') ?? ''
  const signature = request.headers.get('x-zm-signature') ?? ''

  const payload = parseZoomWebhook(rawBody)

  if (payload.event === 'endpoint.url_validation') {
    const { plainToken } = payload.payload as { plainToken: string }
    const response = createUrlValidationResponse(plainToken)
    return NextResponse.json(response)
  }

  if (!verifyZoomWebhookSignature(rawBody, signature, timestamp)) {
    logger.warn('Zoom webhook signature invalid')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  logger.info('Zoom webhook received', { event: payload.event })

  try {
    switch (payload.event) {
      case 'meeting.ended': {
        const obj = payload.payload.object as { uuid: string }
        await zoomService.processMeetingEnded(obj.uuid)
        break
      }
      case 'meeting.started': {
        const obj = payload.payload.object as {
          id: string
          uuid: string
          topic: string
          start_time: string
        }
        await zoomService.processMeetingStarted(
          String(obj.id),
          obj.uuid,
          obj.topic,
          obj.start_time
        )
        break
      }
      default:
        logger.info('Unhandled Zoom webhook event', { event: payload.event })
    }
  } catch (error) {
    logger.error('Zoom webhook processing error', { error: String(error) })
  }

  return NextResponse.json({ received: true })
}
