import { SnsClient, SnsAccountData } from './types'

export class InstagramClient implements SnsClient {
  readonly platform = 'INSTAGRAM' as const
  private readonly accessToken: string | undefined

  constructor() {
    this.accessToken = process.env.INSTAGRAM_ACCESS_TOKEN
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
    // Instagram Basic Display API or Graph API
    // This would require app review and business verification
    const response = await fetch(
      `https://graph.instagram.com/v18.0/${accountId}?fields=id,username,name,followers_count,follows_count,media_count&access_token=${this.accessToken}`
    )

    if (!response.ok) {
      throw new Error(`Instagram API error: ${response.status}`)
    }

    const data = await response.json()

    return {
      accountId: data.username,
      displayName: data.name || data.username,
      followerCount: data.followers_count,
      followingCount: data.follows_count,
      postCount: data.media_count,
      metadata: {
        id: data.id,
      },
    }
  }

  private getMockData(accountId: string): SnsAccountData {
    const cleanAccountId = accountId.replace(/^@/, '')
    const baseFollowers = Math.floor(Math.random() * 50000) + 5000
    const dailyChange = Math.floor(Math.random() * 200) - 50

    return {
      accountId: cleanAccountId,
      displayName: `${cleanAccountId} (Mock)`,
      followerCount: baseFollowers + dailyChange,
      followingCount: Math.floor(baseFollowers * 0.2),
      postCount: Math.floor(Math.random() * 2000) + 50,
      metadata: {
        mock: true,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}

export const instagramClient = new InstagramClient()
