import { NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

type HandlerFn = (
  clerkId: string,
  request: Request
) => Promise<NextResponse>

export function withAuth(handler: HandlerFn) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: '認証が必要です' } satisfies ApiResponse<never>,
          { status: 401 }
        )
      }
      return await handler(userId, request)
    } catch (error) {
      return handleError(error)
    }
  }
}

export function handleError(error: unknown): NextResponse {
  if (error instanceof AppError) {
    logger.warn('AppError', { code: error.code, message: error.message })
    return NextResponse.json(
      { success: false, error: error.message } satisfies ApiResponse<never>,
      { status: error.statusCode }
    )
  }

  logger.error('Unexpected error', { error: String(error) })
  return NextResponse.json(
    { success: false, error: 'サーバーエラーが発生しました' } satisfies ApiResponse<never>,
    { status: 500 }
  )
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(
    { success: true, data } satisfies ApiResponse<T>,
    { status }
  )
}

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: { total, page, limit },
    } satisfies ApiResponse<T[]>,
    { status: 200 }
  )
}
