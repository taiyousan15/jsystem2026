import { getZoomAccessToken } from '@/lib/integrations/zoom-auth'
import { logger } from '@/lib/logger'

const ZOOM_API_BASE = 'https://api.zoom.us/v2'

interface ZoomMeetingDetail {
  id: number
  uuid: string
  topic: string
  start_time: string
  end_time?: string
  duration: number
  type: number
  status: string
}

interface ZoomParticipant {
  id: string
  user_id: string
  name: string
  user_email: string
  join_time: string
  leave_time: string
  duration: number
}

interface ZoomParticipantsResponse {
  page_count: number
  page_size: number
  total_records: number
  next_page_token: string
  participants: ZoomParticipant[]
}

async function zoomFetch<T>(path: string): Promise<T> {
  const token = await getZoomAccessToken()

  const response = await fetch(`${ZOOM_API_BASE}${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    logger.error('Zoom API request failed', { path, status: response.status, body: errorText })
    throw new Error(`Zoom API error: ${response.status} ${path}`)
  }

  return response.json() as Promise<T>
}

export const zoomClient = {
  async getMeetingDetails(meetingId: string): Promise<ZoomMeetingDetail> {
    const encodedId = encodeURIComponent(encodeURIComponent(meetingId))
    return zoomFetch<ZoomMeetingDetail>(`/past_meetings/${encodedId}`)
  },

  async getMeetingParticipants(meetingId: string): Promise<ZoomParticipant[]> {
    const encodedId = encodeURIComponent(encodeURIComponent(meetingId))
    const allParticipants: ZoomParticipant[] = []
    let nextPageToken = ''

    do {
      const query = nextPageToken ? `?next_page_token=${nextPageToken}` : ''
      const response = await zoomFetch<ZoomParticipantsResponse>(
        `/report/meetings/${encodedId}/participants${query}`
      )
      allParticipants.push(...response.participants)
      nextPageToken = response.next_page_token
    } while (nextPageToken)

    logger.info('Zoom participants fetched', {
      meetingId,
      count: allParticipants.length,
    })

    return allParticipants
  },
}

export type { ZoomMeetingDetail, ZoomParticipant }
