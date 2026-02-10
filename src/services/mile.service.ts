import { mileRepository } from '@/repositories/mile.repository'
import { userRepository } from '@/repositories/user.repository'
import { redis } from '@/lib/redis'
import { AppError, InsufficientMilesError } from '@/lib/errors'
import type { PointBalance, PointTransaction, MileRule } from '@prisma/client'

export interface EarnMilesResult {
  readonly transaction: PointTransaction
  readonly newBalance: number
  readonly tierChanged: boolean
  readonly newTier: string
}

export const mileService = {
  async getBalance(clerkId: string): Promise<PointBalance> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    if (!user.pointBalance) {
      throw new AppError('マイル残高が初期化されていません', 'BALANCE_NOT_FOUND', 500)
    }

    return user.pointBalance
  },

  async earnMiles(
    clerkId: string,
    actionCode: string,
    metadata: Record<string, unknown> = {}
  ): Promise<EarnMilesResult> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const rule = await mileRepository.getRuleByActionCode(actionCode)
    if (!rule || !rule.isActive) {
      throw new AppError('無効なアクションコードです', 'INVALID_ACTION', 400)
    }

    if (rule.dailyLimit) {
      const todayCount = await mileRepository.countTodayEarns(user.id, actionCode)
      if (todayCount >= rule.dailyLimit) {
        throw new AppError('本日の上限に達しました', 'DAILY_LIMIT_REACHED', 429)
      }
    }

    if (rule.cooldownSeconds > 0 && redis) {
      const cooldownKey = `cooldown:${user.id}:${actionCode}`
      const exists = await redis.get(cooldownKey)
      if (exists) {
        throw new AppError('クールダウン中です', 'COOLDOWN_ACTIVE', 429)
      }
      await redis.set(cooldownKey, '1', { ex: rule.cooldownSeconds })
    }

    const oldTier = user.pointBalance?.tier ?? 'bronze'
    const transaction = await mileRepository.earnMiles(
      user.id,
      rule.baseMiles,
      actionCode,
      metadata
    )

    const newBalance = await mileRepository.getBalance(user.id)
    const tierChanged = newBalance !== null && newBalance.tier !== oldTier

    return {
      transaction,
      newBalance: newBalance?.totalMiles ?? 0,
      tierChanged,
      newTier: newBalance?.tier ?? 'bronze',
    }
  },

  async redeemMiles(
    clerkId: string,
    amount: number,
    source: string,
    metadata: Record<string, unknown> = {}
  ): Promise<PointTransaction> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    const balance = await mileRepository.getBalance(user.id)
    if (!balance || balance.totalMiles < amount) {
      throw new InsufficientMilesError()
    }

    return mileRepository.redeemMiles(user.id, amount, source, metadata)
  },

  async getHistory(
    clerkId: string,
    params: { page: number; limit: number; type?: string }
  ): Promise<{ transactions: PointTransaction[]; total: number }> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    return mileRepository.getTransactions(user.id, params)
  },

  async getExpiringMiles(
    clerkId: string,
    withinDays: number = 30
  ): Promise<PointTransaction[]> {
    const user = await userRepository.findByClerkId(clerkId)
    if (!user) {
      throw new AppError('ユーザーが見つかりません', 'USER_NOT_FOUND', 404)
    }

    return mileRepository.getExpiringMiles(user.id, withinDays)
  },

  async getRules(): Promise<MileRule[]> {
    return mileRepository.getActiveRules()
  },
}
