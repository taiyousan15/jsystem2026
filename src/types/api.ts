export interface ApiResponse<T> {
  readonly success: boolean
  readonly data?: T
  readonly error?: string
  readonly meta?: {
    readonly total: number
    readonly page: number
    readonly limit: number
  }
}

export interface PaginationParams {
  readonly page?: number
  readonly limit?: number
}

export interface MileBalanceResponse {
  readonly totalMiles: number
  readonly lifetimeMiles: number
  readonly tier: string
}

export interface LeaderboardEntry {
  readonly rank: number
  readonly userId: string
  readonly displayName: string
  readonly avatarUrl: string | null
  readonly lifetimeMiles: number
  readonly tier: string
}
