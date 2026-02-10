export type Tier = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond'

export type TransactionType = 'earn' | 'redeem' | 'expire' | 'adjust'

export type BadgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export type EventType = 'group_consult' | 'offline_event' | 'special'

export type EventStatus = 'upcoming' | 'ongoing' | 'completed' | 'cancelled'

export type ExchangeStatus = 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled'

export type CatalogCategory = 'physical' | 'digital' | 'service' | 'permission' | 'discount' | 'experience'

export type UserRole = 'member' | 'admin' | 'super_admin'

export type MissionStatus = 'active' | 'completed' | 'expired'

export type ReferralStatus = 'pending' | 'completed' | 'expired'

export interface TierThreshold {
  readonly tier: Tier
  readonly requiredMiles: number
  readonly label: string
  readonly color: string
}

export const TIER_THRESHOLDS: readonly TierThreshold[] = [
  { tier: 'bronze', requiredMiles: 0, label: 'ブロンズ', color: '#CD7F32' },
  { tier: 'silver', requiredMiles: 1000, label: 'シルバー', color: '#C0C0C0' },
  { tier: 'gold', requiredMiles: 5000, label: 'ゴールド', color: '#FFD700' },
  { tier: 'platinum', requiredMiles: 15000, label: 'プラチナ', color: '#E5E4E2' },
  { tier: 'diamond', requiredMiles: 50000, label: 'ダイヤモンド', color: '#B9F2FF' },
] as const
