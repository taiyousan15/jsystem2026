import { SnsClient, SnsAccountData } from './types'

export class XClient implements SnsClient {
  readonly platform = 'X' as const
  private readonly bearerToken: string | undefined

  constructor() {
    this.bearerToken = process.env.X_BEARER_TOKEN
  }

  async getAccountData(accountId: string): Promise<SnsAccountData> {
    // When bearer token is configured, use real API
    if (this.bearerToken) {
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
    const cleanAccountId = accountId.replace(/^@/, '')

    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${cleanAccountId}?user.fields=public_metrics,name`,
      {
        headers: {
          Authorization: `Bearer ${this.bearerToken}`,
        },
      }
    )

    if (!response.ok) {
      throw new Error(`X API error: ${response.status}`)
    }

    const data = await response.json()

    if (data.errors) {
      throw new Error(data.errors[0]?.message || 'Account not found')
    }

    const user = data.data
    const metrics = user.public_metrics

    return {
      accountId: user.username,
      displayName: user.name,
      followerCount: metrics.followers_count,
      followingCount: metrics.following_count,
      postCount: metrics.tweet_count,
      metadata: {
        id: user.id,
        verified: user.verified,
      },
    }
  }

  private getMockData(accountId: string): SnsAccountData {
    const cleanAccountId = accountId.replace(/^@/, '')
    const baseFollowers = Math.floor(Math.random() * 10000) + 1000
    const dailyChange = Math.floor(Math.random() * 100) - 20

    return {
      accountId: cleanAccountId,
      displayName: `${cleanAccountId} (Mock)`,
      followerCount: baseFollowers + dailyChange,
      followingCount: Math.floor(baseFollowers * 0.3),
      postCount: Math.floor(Math.random() * 5000) + 100,
      metadata: {
        mock: true,
        generatedAt: new Date().toISOString(),
      },
    }
  }
}

export const xClient = new XClient()
