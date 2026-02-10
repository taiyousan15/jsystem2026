import { NextResponse } from 'next/server'

export function verifyCronSecret(request: Request): boolean {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    return false
  }

  return authHeader === `Bearer ${cronSecret}`
}

type CronHandler = (request: Request) => Promise<{ processed: number; details?: string }>

export function withCron(handler: CronHandler) {
  return async (request: Request): Promise<NextResponse> => {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const result = await handler(request)
      return NextResponse.json({
        success: true,
        ...result,
        timestamp: new Date().toISOString(),
      })
    } catch (error) {
      console.error('[CRON ERROR]', error)
      return NextResponse.json(
        {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        },
        { status: 500 }
      )
    }
  }
}
