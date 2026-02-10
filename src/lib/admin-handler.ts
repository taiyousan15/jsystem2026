import { NextResponse } from 'next/server'
import { auth, currentUser } from '@clerk/nextjs/server'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

type AdminHandlerFn = (
  clerkId: string,
  request: Request
) => Promise<NextResponse>

export function withAdmin(handler: AdminHandlerFn) {
  return async (request: Request): Promise<NextResponse> => {
    try {
      const { userId } = await auth()
      if (!userId) {
        return NextResponse.json(
          { success: false, error: '認証が必要です' } satisfies ApiResponse<never>,
          { status: 401 }
        )
      }

      const user = await currentUser()
      const role = user?.publicMetadata?.role as string | undefined
      if (role !== 'admin' && role !== 'super_admin') {
        return NextResponse.json(
          { success: false, error: '管理者権限が必要です' } satisfies ApiResponse<never>,
          { status: 403 }
        )
      }

      return await handler(userId, request)
    } catch (error) {
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
  }
}
