import { NextResponse } from 'next/server'
import { withAdmin } from '@/lib/admin-handler'
import { zoomRepository } from '@/repositories/zoom.repository'

export const GET = withAdmin(async (_clerkId, request) => {
  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
  const limit = Math.min(50, Math.max(1, Number(searchParams.get('limit') ?? '20')))

  const { mappings, total } = await zoomRepository.getAllMappings({ page, limit })
  return NextResponse.json({
    success: true,
    data: mappings,
    meta: { total, page, limit },
  })
})

export const PUT = withAdmin(async (_clerkId, request) => {
  const body = await request.json()
  const { userId, zoomEmail, zoomUserId } = body as {
    userId: string
    zoomEmail: string
    zoomUserId?: string
  }

  if (!userId || !zoomEmail) {
    return NextResponse.json(
      { success: false, error: 'userId と zoomEmail は必須です' },
      { status: 400 }
    )
  }

  const existing = await zoomRepository.findMappingByEmail(zoomEmail)
  if (existing) {
    const updated = await zoomRepository.updateMapping(existing.id, {
      userId,
      zoomUserId,
      verified: true,
    })
    return NextResponse.json({ success: true, data: updated })
  }

  const mapping = await zoomRepository.createMapping({
    userId,
    zoomEmail,
    zoomUserId,
    verified: true,
  })
  return NextResponse.json({ success: true, data: mapping }, { status: 201 })
})
