import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin-handler'
import { zoomService } from '@/services/zoom.service'

export const GET = withAdmin(async (_clerkId, request) => {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))
  const status = searchParams.get('status') ?? undefined

  const { meetings, total } = await zoomService.getMeetings(page, limit, status)
  return NextResponse.json({
    success: true,
    data: meetings,
    meta: { total, page, limit },
  })
})
