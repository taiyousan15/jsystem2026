import { SnsClient, SnsAccountData } from './types'

export class TikTokClient implements SnsClient {
  readonly platform = 'TIKTOK' as const
  private readonly accessToken: string | undefined

  constructor() {
    this.accessToken = process.env.TIKTOK_ACCESS_TOKEN
  }

  async getAccountData(accountId: string): Promise<SnsAccountData> {
    // When access token is configured, use real API
    if (this.accessToken) {
      return this.fetchRealData(accountId)
    }

    // Return mock data for development
    return this.getMockData(accountId)
  }

  async validateAccount(accountId: string): Promise<boolean> {
    try {
      await this.getAccountData(accountId)
      return true
    } catch {
      return false
    }
  }

  private async fetchRealData(accountId: string): Promise<SnsAccountData> {
    // TikTok Display API
    const response = await fetch(
      'https://open.tiktokapis.com/v2/user/info/',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: ['display_name', 'follower_count', 'following_count', 'video_count'],
        }),
      }
    )

    if (!response.ok) {
      throw new Error(`TikTok API error: ${response.status}`)
    }

    const result = await response.json()
    const data = result.data.user

    return {
      accountId: accountId,
      displayName: data.display_name,
      followerCount: data.follower_count,
      followingCount: data.following_count,
      postCount: data.video_count,
      metadata: {
        open_id: data.open_id,
      },
    }
  }

  private getMockData(accountId: string): SnsAccountData {
    const cleanAccountId = accountId.replace(/^@/, '')
    const baseFollowers = Math.floor(Math.random() * 100000) + 10000
    const dailyChange = Math.floor(Math.random() * 500) - 100

    return {
      accountId: cleanAccountId,
      displayName: `${cleanAccountId} (Mock)`,
      followerCount: baseFollowers + dailyChange,
      followingCount: Math.floor(baseFollowers * 0.1),
      postCount: Math.floor(Math.random() * 500) + 20,
      metadata: {
        mock: true,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}

export const tiktokClient = new TikTokClient()
