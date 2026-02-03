export type SnsPlatform = 'X' | 'INSTAGRAM' | 'TIKTOK'

export interface SnsAccountData {
  accountId: string
  displayName: string
  followerCount: number
  followingCount: number
  postCount: number
  metadata?: Record<string, unknown>
}

export interface SnsClient {
  platform: SnsPlatform
  getAccountData(accountId: string): Promise<SnsAccountData>
  validateAccount(accountId: string): Promise<boolean>
}

export interface FollowerFetchJobData {
  snsAccountId: string
  platform: SnsPlatform
  accountId: string
}

export interface EngagementFetchJobData {
  snsAccountId: string
  platform: SnsPlatform
  accountId: string
  startDate: string
  endDate: string
}
