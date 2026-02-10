/**
 * Zoom グルコン参加マイル計算
 *
 * SDD準拠のマイル計算ロジック:
 *   < 30分参加      → 0pt
 *   30-59分参加     → 50pt
 *   60分以上参加    → 100pt
 *   90%以上参加     → 150pt (フル参加ボーナス)
 */

export interface MileCalculationResult {
  readonly miles: number
  readonly reason: string
  readonly attendanceRate: number
}

export function calculateAttendanceMiles(
  participantDurationMinutes: number,
  meetingDurationMinutes: number
): MileCalculationResult {
  if (meetingDurationMinutes <= 0 || participantDurationMinutes <= 0) {
    return { miles: 0, reason: 'no_duration', attendanceRate: 0 }
  }

  const attendanceRate = Math.min(
    participantDurationMinutes / meetingDurationMinutes,
    1.0
  )

  if (attendanceRate >= 0.9) {
    return { miles: 150, reason: 'full_attendance', attendanceRate }
  }

  if (participantDurationMinutes >= 60) {
    return { miles: 100, reason: 'over_60min', attendanceRate }
  }

  if (participantDurationMinutes >= 30) {
    return { miles: 50, reason: 'over_30min', attendanceRate }
  }

  return { miles: 0, reason: 'under_30min', attendanceRate }
}
