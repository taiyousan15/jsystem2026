# SDD（Software Design Document）

**プロジェクト名**: ゲーミフィケーション会員サイト（GamiFi Members）
**バージョン**: 3.0.0
**作成日**: 2026-02-08
**改訂日**: 2026-02-08（ChatWork/Zoom/n8n統合設計追加）
**対応要件定義書**: REQUIREMENTS_DEFINITION.md v3.0.0

---

## 目次

1. [システムアーキテクチャ](#1-システムアーキテクチャ)
2. [技術スタック詳細](#2-技術スタック詳細)
3. [コンポーネント設計](#3-コンポーネント設計)
4. [データベース設計](#4-データベース設計)
5. [API設計](#5-api設計)
6. [認証・認可設計](#6-認証認可設計)
7. [マイルエンジン設計](#7-マイルエンジン設計)
8. [ゲーミフィケーションエンジン設計](#8-ゲーミフィケーションエンジン設計)
9. [リアルタイム通信設計](#9-リアルタイム通信設計)
10. [キャッシュ設計](#10-キャッシュ設計)
11. [バックグラウンドジョブ設計](#11-バックグラウンドジョブ設計)
12. [UI/UXコンポーネント設計](#12-uiuxコンポーネント設計)
13. [セキュリティ設計](#13-セキュリティ設計)
14. [デプロイ・インフラ設計](#14-デプロイインフラ設計)
15. [テスト設計](#15-テスト設計)
16. [監視・ログ設計](#16-監視ログ設計)
17. [エラーハンドリング設計](#17-エラーハンドリング設計)
18. [パフォーマンス設計](#18-パフォーマンス設計)
19. [移行・マイグレーション設計](#19-移行マイグレーション設計)
20. [ディレクトリ構造](#20-ディレクトリ構造)
21. [ChatWork × Zoom統合設計](#21-chatwork--zoom統合設計)（v3.0追加）

---

## 1. システムアーキテクチャ

### 1.1 全体アーキテクチャ図

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Client Layer                                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Web Browser  │  │ PWA (Mobile) │  │ Admin Dashboard          │  │
│  │ (Next.js SSR)│  │ (Service     │  │ (Next.js /admin routes)  │  │
│  │              │  │  Worker)     │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
└─────────┼──────────────────┼───────────────────────┼────────────────┘
          │                  │                       │
          ▼                  ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     Vercel Edge Network                            │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  CDN + DDoS Protection + SSL Termination + Edge Middleware  │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Application Layer (Vercel Serverless)            │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  Next.js     │  │ API Routes   │  │  Server Actions          │  │
│  │  App Router  │  │ /api/*       │  │  (Server Components)     │  │
│  │  (RSC + SSR) │  │              │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └────────────┬─────────────┘  │
│         │                  │                       │                │
│  ┌──────┴──────────────────┴───────────────────────┴─────────────┐  │
│  │                    Service Layer                              │  │
│  │  ┌────────────┐ ┌────────────┐ ┌──────────┐ ┌─────────────┐  │  │
│  │  │ Mile       │ │ Gamify     │ │ Event    │ │ Exchange    │  │  │
│  │  │ Service    │ │ Service    │ │ Service  │ │ Service     │  │  │
│  │  └─────┬──────┘ └─────┬──────┘ └────┬─────┘ └──────┬──────┘  │  │
│  │        │              │             │              │          │  │
│  │  ┌─────┴──────────────┴─────────────┴──────────────┴──────┐   │  │
│  │  │              Repository Layer (Prisma ORM)            │   │  │
│  │  └───────────────────────────┬────────────────────────────┘   │  │
│  └──────────────────────────────┼────────────────────────────────┘  │
└─────────────────────────────────┼───────────────────────────────────┘
                                  │
          ┌───────────────────────┼───────────────────────┐
          ▼                       ▼                       ▼
┌──────────────────┐  ┌───────────────────┐  ┌──────────────────────┐
│   Supabase       │  │   Upstash Redis   │  │   External Services  │
│   (PostgreSQL)   │  │   (Cache + Queue) │  │                      │
│                  │  │                   │  │  ┌────────────────┐  │
│  ┌────────────┐  │  │  ┌─────────────┐  │  │  │ Clerk (Auth)   │  │
│  │ Tables     │  │  │  │ Leaderboard │  │  │  ├────────────────┤  │
│  │ RLS        │  │  │  │ (Sorted Set)│  │  │  │ Stripe (Pay)   │  │
│  │ Functions  │  │  │  ├─────────────┤  │  │  ├────────────────┤  │
│  │ Triggers   │  │  │  │ Session     │  │  │  │ Postmark (Mail)│  │
│  │ Realtime   │  │  │  │ Cache       │  │  │  ├────────────────┤  │
│  └────────────┘  │  │  ├─────────────┤  │  │  │ FCM (Push)     │  │
│                  │  │  │ Rate Limit  │  │  │  ├────────────────┤  │
│  ┌────────────┐  │  │  ├─────────────┤  │  │  │ Cloudinary     │  │
│  │ Storage    │  │  │  │ Job Queue   │  │  │  │ (Images)       │  │
│  │ (S3)       │  │  │  └─────────────┘  │  │  ├────────────────┤  │
│  └────────────┘  │  │                   │  │  │ Posthog        │  │
│                  │  │                   │  │  │ (Analytics)    │  │
└──────────────────┘  └───────────────────┘  │  ├────────────────┤  │
                                              │  │ ChatWork (Chat)│  │
                                              │  ├────────────────┤  │
                                              │  │ Zoom (Meeting) │  │
                                              │  ├────────────────┤  │
                                              │  │ n8n (Workflow) │  │
                                              │  └────────────────┘  │
                                              └──────────────────────┘
```

### 1.2 アーキテクチャ原則

| 原則 | 説明 |
|------|------|
| **サーバーレスファースト** | Vercel Serverless Functionsを最大活用し、インフラ管理を最小化 |
| **イミュータブルデータ** | マイルトランザクションは追記のみ、更新・削除なし |
| **イベント駆動** | アクション→イベント発火→マイル計算→通知の非同期フロー |
| **レイヤードアーキテクチャ** | Route → Service → Repository の3層分離 |
| **型安全** | TypeScript strict mode + Prisma ORM + Zod でエンドツーエンド型安全 |
| **フェイルセーフ** | 外部サービス障害時もコア機能（ログイン・閲覧）は継続動作 |

### 1.3 通信フロー

```
[ユーザーアクション]
       │
       ▼
[Next.js Server Action / API Route]
       │
       ├──→ [Clerk] 認証検証（JWT）
       │
       ├──→ [Zod] 入力バリデーション
       │
       ├──→ [Mile Service] マイル計算・付与
       │         │
       │         ├──→ [Supabase] トランザクション記録
       │         │
       │         ├──→ [Redis] 残高キャッシュ更新
       │         │
       │         └──→ [Redis] リーダーボード更新
       │
       ├──→ [Gamify Service] バッジ/ティア判定
       │         │
       │         ├──→ [Supabase] バッジ付与記録
       │         │
       │         └──→ [通知キュー] 通知イベント発行
       │
       ├──→ [Posthog] イベント送信（非同期・Self-Host）
       │
       └──→ [Supabase Realtime] クライアントへリアルタイム通知

[ChatWork Webhook]
       │
       ▼
[Next.js API Route: /api/webhooks/chatwork]
       │
       ├──→ [メッセージ解析] 投稿/返信/メンション/ポジティブワード検出
       │
       ├──→ [Botコマンド判定] /マイル /ランキング /バッジ → 自動返信
       │
       └──→ [Mile Service] 活動マイル付与

[Zoom Webhook]
       │
       ▼
[Next.js API Route: /api/webhooks/zoom]
       │
       ├──→ participant_joined/left → 参加時間記録
       │
       ├──→ meeting.ended → Report API呼び出し → マイル一括計算
       │         │
       │         ├──→ 参加時間マイル（50/100/150pt）
       │         ├──→ Poll正答マイル（20pt/問）
       │         ├──→ Q&A貢献マイル（10-15pt）
       │         └──→ Survey回答マイル（5pt）
       │
       ├──→ recording.completed → 見逃し配信URL保存
       │
       └──→ [ChatWork通知] 結果サマリー自動投稿

[n8n Workflow Engine]
       │
       ├──→ 日次ChatWork活動集計（23:00 JST）
       ├──→ 週次レポート自動生成（月曜 9:00 JST）
       └──→ グルコン結果→ChatWork通知の連携
```

---

## 2. 技術スタック詳細

### 2.1 フロントエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js | 15.x | フレームワーク（App Router） |
| React | 19.x | UIライブラリ |
| TypeScript | 5.x | 型安全 |
| Tailwind CSS | 4.x | スタイリング |
| shadcn/ui | latest | UIコンポーネント |
| Framer Motion | 11.x | アニメーション |
| Lucide Icons | latest | アイコン |
| React Hook Form | 7.x | フォーム管理 |
| Zod | 3.x | バリデーション |
| TanStack Query | 5.x | サーバーステート管理 |
| Zustand | 5.x | クライアントステート管理 |
| next-pwa | latest | PWA対応 |

### 2.2 バックエンド

| 技術 | バージョン | 用途 |
|------|-----------|------|
| Next.js API Routes | 15.x | REST API |
| Next.js Server Actions | 15.x | サーバーサイドミューテーション |
| Prisma ORM | 6.x | データベースORM（型安全・エコシステム優位） |
| Zod | 3.x | 入力バリデーション |
| @upstash/redis | latest | Redisクライアント |
| @upstash/ratelimit | latest | レート制限 |

### 2.3 外部サービス

| サービス | プラン | 用途 |
|---------|--------|------|
| Vercel | Pro ($40〜100/月 実測) | ホスティング、CDN、Edge（SSE制限あり、Supabase Realtimeで補完） |
| Supabase | Pro ($50〜100/月 実測) | PostgreSQL、Realtime、Storage（Large Compute推奨） |
| Clerk | Free (50K MAU無料枠) | 認証・ユーザー管理（2026-02改定） |
| Upstash Redis | Pay-as-you-go ($10〜30/月) | キャッシュ、リーダーボード、レート制限、分散ロック |
| Stripe | 従量課金 (3.6% + ¥40/件) | 決済 |
| Postmark | $25〜45/月 | トランザクションメール |
| Cloudinary | Free | 画像最適化・配信 |
| Posthog | Free (Self-Host) または $0 (Cloud 1M events) | アナリティクス（個人情報保護法対応のため Self-Host 推奨） |
| Sentry | Free (5K errors) | エラー監視 |

**v2.0変更点**:
- Clerk: $25/月 → $0（50K MAU無料枠発見）
- Mixpanel → Posthog（Self-Host推奨、個人情報保護法対応）
- Vercel/Supabase: 実測コストに修正（超過料金含む）
- Drizzle → Prisma ORM（型安全性・エコシステム優位性）
- SSE → Supabase Realtime（Vercel SSE 10-60秒タイムアウト制限回避）

---

## 3. コンポーネント設計

### 3.1 サービス層

```typescript
// Service Layer Interface Design

// === Mile Service ===
interface IMileService {
  // マイル付与（原子的トランザクション）
  earnMiles(params: {
    userId: string;
    actionCode: string;
    metadata?: Record<string, unknown>;
  }): Promise<MileTransaction>;

  // マイル消費（交換時）
  redeemMiles(params: {
    userId: string;
    amount: number;
    reason: string;
    exchangeId: string;
  }): Promise<MileTransaction>;

  // 残高照会
  getBalance(userId: string): Promise<MileBalance>;

  // 履歴取得
  getHistory(params: {
    userId: string;
    limit: number;
    offset: number;
    type?: 'earn' | 'redeem' | 'expire';
  }): Promise<PaginatedResult<MileTransaction>>;

  // 手動調整（管理者用）
  adjustMiles(params: {
    userId: string;
    amount: number;
    reason: string;
    adminId: string;
  }): Promise<MileTransaction>;

  // 有効期限切れマイル処理（バッチ）
  processExpiredMiles(): Promise<number>;
}

// === Gamification Service ===
interface IGamificationService {
  // バッジ判定・付与
  checkAndAwardBadges(userId: string, event: GameEvent): Promise<Badge[]>;

  // ティア再計算
  recalculateTier(userId: string): Promise<TierResult>;

  // ストリーク更新
  updateStreak(userId: string): Promise<StreakResult>;

  // ストリークフリーズ使用
  useStreakFreeze(userId: string): Promise<boolean>;

  // デイリーミッション生成
  generateDailyMissions(userId: string): Promise<Mission[]>;

  // ミッション進捗更新
  updateMissionProgress(userId: string, missionId: string, event: GameEvent): Promise<Mission>;

  // ランキング取得
  getLeaderboard(params: {
    period: 'weekly' | 'monthly' | 'alltime';
    limit: number;
    offset: number;
  }): Promise<LeaderboardEntry[]>;
}

// === Event Service ===
interface IEventService {
  // イベント作成
  createEvent(params: CreateEventInput): Promise<Event>;

  // イベント参加登録
  registerAttendance(eventId: string, userId: string): Promise<Attendance>;

  // QRコード生成
  generateQRCode(eventId: string): Promise<string>;

  // QRコード検証 + マイル付与
  verifyQRAndAwardMiles(qrPayload: string, userId: string): Promise<MileTransaction>;

  // イベント一覧
  listEvents(params: ListEventsInput): Promise<PaginatedResult<Event>>;
}

// === Exchange Service ===
interface IExchangeService {
  // カタログ取得
  getCatalog(params: {
    category?: string;
    limit: number;
    offset: number;
  }): Promise<PaginatedResult<CatalogItem>>;

  // 交換申請
  requestExchange(params: {
    userId: string;
    catalogItemId: string;
    shippingAddressId?: string;
  }): Promise<ExchangeRequest>;

  // 交換承認（管理者）
  approveExchange(exchangeId: string, adminId: string): Promise<ExchangeRequest>;

  // 交換キャンセル
  cancelExchange(exchangeId: string, userId: string): Promise<ExchangeRequest>;

  // 発送ステータス更新
  updateShippingStatus(exchangeId: string, status: ShippingStatus): Promise<ExchangeRequest>;
}

// === Notification Service ===
interface INotificationService {
  // 通知送信
  send(params: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;

  // 一括通知
  sendBulk(params: {
    userIds: string[] | 'all';
    type: NotificationType;
    title: string;
    body: string;
  }): Promise<void>;

  // 通知一覧取得
  list(userId: string, limit: number, offset: number): Promise<PaginatedResult<Notification>>;

  // 既読マーク
  markAsRead(notificationId: string, userId: string): Promise<void>;

  // 全既読
  markAllAsRead(userId: string): Promise<void>;
}
```

### 3.2 ドメインモデル

```typescript
// === Core Domain Types ===

// ユーザー関連
interface User {
  readonly id: string;
  readonly email: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly bio: string | null;
  readonly role: 'member' | 'admin' | 'super_admin';
  readonly tier: TierType;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

type TierType = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';

// マイル関連
interface MileBalance {
  readonly userId: string;
  readonly totalMiles: number;        // 現在の有効残高
  readonly lifetimeMiles: number;     // 累計獲得（ティア判定用）
  readonly expiringMiles: number;     // 30日以内失効予定
  readonly updatedAt: Date;
}

interface MileTransaction {
  readonly id: string;
  readonly userId: string;
  readonly amount: number;            // + = 獲得, - = 消費/失効
  readonly type: 'earn' | 'redeem' | 'expire' | 'adjust';
  readonly source: string;            // アクションコード
  readonly metadata: Record<string, unknown>;
  readonly expiresAt: Date | null;    // 獲得の場合は失効日
  readonly createdAt: Date;
}

// マイル獲得ルール
interface MileRule {
  readonly id: string;
  readonly actionCode: string;
  readonly actionName: string;
  readonly baseMiles: number;
  readonly dailyLimit: number | null;
  readonly cooldownSeconds: number;
  readonly isActive: boolean;
  readonly conditions: Record<string, unknown>;
}

// バッジ関連
interface Badge {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly iconUrl: string;
  readonly category: string;
  readonly rarity: 'common' | 'rare' | 'epic' | 'legendary';
  readonly condition: BadgeCondition;
}

interface BadgeCondition {
  readonly type: 'count' | 'streak' | 'tier' | 'manual' | 'special';
  readonly actionCode?: string;
  readonly threshold?: number;
  readonly tierRequired?: TierType;
}

interface UserBadge {
  readonly userId: string;
  readonly badgeId: string;
  readonly earnedAt: Date;
}

// ストリーク
interface UserStreak {
  readonly userId: string;
  readonly currentStreak: number;
  readonly longestStreak: number;
  readonly lastActiveDate: string;   // YYYY-MM-DD (JST)
  readonly freezeRemaining: number;  // 月初に2にリセット
}

// ミッション
interface Mission {
  readonly id: string;
  readonly userId: string;
  readonly title: string;
  readonly description: string;
  readonly actionCode: string;
  readonly targetCount: number;
  readonly currentCount: number;
  readonly rewardMiles: number;
  readonly status: 'active' | 'completed' | 'expired';
  readonly date: string;            // YYYY-MM-DD (JST)
}

// イベント
interface Event {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly type: 'group_consult' | 'offline_event' | 'special';
  readonly startAt: Date;
  readonly endAt: Date;
  readonly location: string | null;
  readonly onlineUrl: string | null;
  readonly capacity: number;
  readonly currentAttendees: number;
  readonly milesReward: number;
  readonly qrCodePayload: string;
  readonly isPaid: boolean;
  readonly price: number | null;
  readonly tierRequired: TierType | null;
  readonly status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
}

// 交換関連
interface CatalogItem {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly imageUrl: string;
  readonly category: 'physical' | 'digital' | 'service' | 'permission' | 'discount' | 'experience';
  readonly requiredMiles: number;
  readonly stock: number | null;     // nullは無制限
  readonly isActive: boolean;
  readonly metadata: Record<string, unknown>;
}

interface ExchangeRequest {
  readonly id: string;
  readonly userId: string;
  readonly catalogItemId: string;
  readonly milesSpent: number;
  readonly status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'cancelled';
  readonly shippingAddressId: string | null;
  readonly trackingNumber: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

// 通知
interface Notification {
  readonly id: string;
  readonly userId: string;
  readonly type: 'mile_earned' | 'badge_earned' | 'tier_up' | 'streak' | 'event' | 'exchange' | 'system';
  readonly title: string;
  readonly body: string;
  readonly isRead: boolean;
  readonly metadata: Record<string, unknown>;
  readonly createdAt: Date;
}

// リーダーボード
interface LeaderboardEntry {
  readonly rank: number;
  readonly userId: string;
  readonly displayName: string;
  readonly avatarUrl: string | null;
  readonly tier: TierType;
  readonly score: number;
  readonly previousRank: number | null;
}

// ページネーション
interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly hasMore: boolean;
}
```

---

## 4. データベース設計

### 4.1 ER図

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   users      │     │ point_balances   │     │ point_transactions│
│──────────────│     │──────────────────│     │──────────────────│
│ id (PK)      │←──┐ │ user_id (PK,FK)  │  ┌─→│ id (PK)          │
│ clerk_id     │   │ │ total_miles      │  │  │ user_id (FK)     │
│ email        │   │ │ lifetime_miles   │  │  │ amount           │
│ display_name │   │ │ tier             │  │  │ type             │
│ avatar_url   │   │ │ updated_at       │  │  │ source           │
│ bio          │   │ └──────────────────┘  │  │ metadata         │
│ role         │   │                       │  │ expires_at       │
│ created_at   │   │                       │  │ created_at       │
│ updated_at   │   │                       │  └──────────────────┘
└──────────────┘   │
       │           │ ┌──────────────────┐     ┌──────────────────┐
       │           │ │ user_badges      │     │ badges           │
       │           ├─│──────────────────│     │──────────────────│
       │           │ │ user_id (PK,FK)  │──→  │ id (PK)          │
       │           │ │ badge_id (PK,FK) │     │ name             │
       │           │ │ earned_at        │     │ description      │
       │           │ └──────────────────┘     │ icon_url         │
       │           │                          │ category         │
       │           │ ┌──────────────────┐     │ rarity           │
       │           │ │ user_streaks     │     │ condition        │
       │           ├─│──────────────────│     └──────────────────┘
       │           │ │ user_id (PK,FK)  │
       │           │ │ current_streak   │     ┌──────────────────┐
       │           │ │ longest_streak   │     │ mile_rules       │
       │           │ │ last_active_date │     │──────────────────│
       │           │ │ freeze_remaining │     │ id (PK)          │
       │           │ └──────────────────┘     │ action_code (UQ) │
       │           │                          │ action_name      │
       │           │ ┌──────────────────┐     │ base_miles       │
       │           │ │ daily_missions   │     │ daily_limit      │
       │           ├─│──────────────────│     │ cooldown_seconds │
       │           │ │ id (PK)          │     │ is_active        │
       │           │ │ user_id (FK)     │     │ conditions       │
       │           │ │ title            │     └──────────────────┘
       │           │ │ action_code      │
       │           │ │ target_count     │     ┌──────────────────┐
       │           │ │ current_count    │     │ events           │
       │           │ │ reward_miles     │     │──────────────────│
       │           │ │ status           │     │ id (PK)          │
       │           │ │ date             │     │ title            │
       │           │ └──────────────────┘     │ description      │
       │           │                          │ type             │
       │           │ ┌──────────────────┐     │ start_at         │
       │           │ │ event_attendees  │     │ end_at           │
       │           ├─│──────────────────│──→  │ location         │
       │           │ │ event_id (PK,FK) │     │ capacity         │
       │           │ │ user_id (PK,FK)  │     │ miles_reward     │
       │           │ │ checked_in       │     │ qr_payload       │
       │           │ │ checked_in_at    │     │ status           │
       │           │ │ registered_at    │     └──────────────────┘
       │           │ └──────────────────┘
       │           │                          ┌──────────────────┐
       │           │ ┌──────────────────┐     │ catalog_items    │
       │           │ │ exchange_requests│     │──────────────────│
       │           ├─│──────────────────│──→  │ id (PK)          │
       │           │ │ id (PK)          │     │ name             │
       │           │ │ user_id (FK)     │     │ description      │
       │           │ │ item_id (FK)     │     │ image_url        │
       │           │ │ miles_spent      │     │ category         │
       │           │ │ status           │     │ required_miles   │
       │           │ │ shipping_addr_id │     │ stock            │
       │           │ │ tracking_number  │     │ is_active        │
       │           │ │ created_at       │     └──────────────────┘
       │           │ │ updated_at       │
       │           │ └──────────────────┘     ┌──────────────────┐
       │           │                          │ notifications    │
       │           │ ┌──────────────────┐     │──────────────────│
       │           ├─│ shipping_addrs   │     │ id (PK)          │
       │           │ │──────────────────│     │ user_id (FK)     │
       │           │ │ id (PK)          │     │ type             │
       │           │ │ user_id (FK)     │     │ title            │
       │           │ │ name             │     │ body             │
       │           │ │ postal_code      │     │ is_read          │
       │           │ │ prefecture       │     │ metadata         │
       │           │ │ city             │     │ created_at       │
       │           │ │ address_line     │     └──────────────────┘
       │           │ │ phone            │
       │           │ └──────────────────┘     ┌──────────────────┐
       │           │                          │ audit_logs       │
       │           │ ┌──────────────────┐     │──────────────────│
       │           └─│ referrals        │     │ id (PK)          │
       │             │──────────────────│     │ admin_id (FK)    │
       │             │ id (PK)          │     │ action           │
       │             │ referrer_id (FK) │     │ target_type      │
       │             │ referred_id (FK) │     │ target_id        │
       │             │ status           │     │ before_value     │
       │             │ created_at       │     │ after_value      │
       │             └──────────────────┘     │ created_at       │
       │                                      └──────────────────┘
       │
       └── notification_settings (user_id FK)
```

### 4.2 テーブル定義（DDL）

```sql
-- ============================================================
-- 1. ユーザーテーブル（Clerkと同期）
-- ============================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  role VARCHAR(20) NOT NULL DEFAULT 'member'
    CHECK (role IN ('member', 'admin', 'super_admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- ============================================================
-- 2. マイル残高テーブル
-- ============================================================
CREATE TABLE point_balances (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  total_miles INTEGER NOT NULL DEFAULT 0 CHECK (total_miles >= 0),
  lifetime_miles INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_miles >= 0),
  tier VARCHAR(20) NOT NULL DEFAULT 'bronze'
    CHECK (tier IN ('bronze', 'silver', 'gold', 'platinum', 'diamond')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3. マイルトランザクションテーブル（追記専用・イミュータブル）
-- ============================================================
CREATE TABLE point_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type VARCHAR(20) NOT NULL
    CHECK (type IN ('earn', 'redeem', 'expire', 'adjust')),
  source VARCHAR(100) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pt_user_id ON point_transactions(user_id);
CREATE INDEX idx_pt_user_created ON point_transactions(user_id, created_at DESC);
CREATE INDEX idx_pt_type ON point_transactions(type);
CREATE INDEX idx_pt_expires ON point_transactions(expires_at)
  WHERE expires_at IS NOT NULL AND type = 'earn';
CREATE INDEX idx_pt_source ON point_transactions(source);

-- ============================================================
-- 4. マイル獲得ルールテーブル
-- ============================================================
CREATE TABLE mile_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_code VARCHAR(50) NOT NULL UNIQUE,
  action_name VARCHAR(100) NOT NULL,
  base_miles INTEGER NOT NULL CHECK (base_miles > 0),
  daily_limit INTEGER,
  cooldown_seconds INTEGER NOT NULL DEFAULT 5,
  is_active BOOLEAN NOT NULL DEFAULT true,
  conditions JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 5. バッジマスターテーブル
-- ============================================================
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  rarity VARCHAR(20) NOT NULL DEFAULT 'common'
    CHECK (rarity IN ('common', 'rare', 'epic', 'legendary')),
  condition JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 6. ユーザーバッジテーブル
-- ============================================================
CREATE TABLE user_badges (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_ub_user ON user_badges(user_id);

-- ============================================================
-- 7. ストリークテーブル
-- ============================================================
CREATE TABLE user_streaks (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_active_date DATE,
  freeze_remaining INTEGER NOT NULL DEFAULT 2,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 8. デイリーミッションテーブル
-- ============================================================
CREATE TABLE daily_missions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  action_code VARCHAR(50) NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  current_count INTEGER NOT NULL DEFAULT 0,
  reward_miles INTEGER NOT NULL DEFAULT 20,
  status VARCHAR(20) NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'expired')),
  date DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dm_user_date ON daily_missions(user_id, date);
CREATE UNIQUE INDEX idx_dm_user_date_action ON daily_missions(user_id, date, action_code);

-- ============================================================
-- 9. イベントテーブル
-- ============================================================
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL
    CHECK (type IN ('group_consult', 'offline_event', 'special')),
  start_at TIMESTAMPTZ NOT NULL,
  end_at TIMESTAMPTZ NOT NULL,
  location TEXT,
  online_url TEXT,
  capacity INTEGER NOT NULL,
  miles_reward INTEGER NOT NULL DEFAULT 0,
  qr_payload VARCHAR(255) NOT NULL UNIQUE,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  price INTEGER,
  tier_required VARCHAR(20),
  status VARCHAR(20) NOT NULL DEFAULT 'upcoming'
    CHECK (status IN ('upcoming', 'ongoing', 'completed', 'cancelled')),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start ON events(start_at);

-- ============================================================
-- 10. イベント参加者テーブル
-- ============================================================
CREATE TABLE event_attendees (
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  checked_in BOOLEAN NOT NULL DEFAULT false,
  checked_in_at TIMESTAMPTZ,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (event_id, user_id)
);

CREATE INDEX idx_ea_user ON event_attendees(user_id);

-- ============================================================
-- 11. 交換カタログテーブル
-- ============================================================
CREATE TABLE catalog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT,
  category VARCHAR(30) NOT NULL
    CHECK (category IN ('physical', 'digital', 'service', 'permission', 'discount', 'experience')),
  required_miles INTEGER NOT NULL CHECK (required_miles > 0),
  stock INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ci_category ON catalog_items(category);
CREATE INDEX idx_ci_active ON catalog_items(is_active) WHERE is_active = true;

-- ============================================================
-- 12. 交換申請テーブル
-- ============================================================
CREATE TABLE exchange_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  catalog_item_id UUID NOT NULL REFERENCES catalog_items(id),
  miles_spent INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'shipped', 'delivered', 'cancelled')),
  shipping_address_id UUID REFERENCES shipping_addresses(id),
  tracking_number VARCHAR(100),
  admin_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_er_user ON exchange_requests(user_id);
CREATE INDEX idx_er_status ON exchange_requests(status);

-- ============================================================
-- 13. 配送先住所テーブル
-- ============================================================
CREATE TABLE shipping_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_name VARCHAR(100) NOT NULL,
  postal_code VARCHAR(10) NOT NULL,
  prefecture VARCHAR(10) NOT NULL,
  city VARCHAR(100) NOT NULL,
  address_line TEXT NOT NULL,
  phone VARCHAR(20) NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sa_user ON shipping_addresses(user_id);

-- ============================================================
-- 14. 通知テーブル
-- ============================================================
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(30) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notif_user_unread ON notifications(user_id, is_read)
  WHERE is_read = false;
CREATE INDEX idx_notif_user_created ON notifications(user_id, created_at DESC);

-- ============================================================
-- 15. 通知設定テーブル
-- ============================================================
CREATE TABLE notification_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  mile_earned BOOLEAN NOT NULL DEFAULT true,
  badge_earned BOOLEAN NOT NULL DEFAULT true,
  tier_change BOOLEAN NOT NULL DEFAULT true,
  streak_reminder BOOLEAN NOT NULL DEFAULT true,
  event_reminder BOOLEAN NOT NULL DEFAULT true,
  exchange_update BOOLEAN NOT NULL DEFAULT true,
  email_enabled BOOLEAN NOT NULL DEFAULT true,
  push_enabled BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 16. 友達招待テーブル
-- ============================================================
CREATE TABLE referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id UUID REFERENCES users(id) ON DELETE SET NULL,
  referral_code VARCHAR(20) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_ref_referrer ON referrals(referrer_id);
CREATE INDEX idx_ref_code ON referrals(referral_code);

-- ============================================================
-- 17. 監査ログテーブル
-- ============================================================
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  target_type VARCHAR(50) NOT NULL,
  target_id VARCHAR(255),
  before_value JSONB,
  after_value JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_al_admin ON audit_logs(admin_id);
CREATE INDEX idx_al_target ON audit_logs(target_type, target_id);
CREATE INDEX idx_al_created ON audit_logs(created_at DESC);

-- ============================================================
-- 18. マイルボーナスキャンペーンテーブル
-- ============================================================
CREATE TABLE mile_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  multiplier DECIMAL(3,1) NOT NULL DEFAULT 1.0,
  action_codes TEXT[],
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE point_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_missions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipping_addresses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

-- ユーザーは自分のデータのみ読み取り可能
CREATE POLICY users_select_own ON users
  FOR SELECT USING (clerk_id = auth.jwt() ->> 'sub');

CREATE POLICY balances_select_own ON point_balances
  FOR SELECT USING (user_id = (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

CREATE POLICY transactions_select_own ON point_transactions
  FOR SELECT USING (user_id = (
    SELECT id FROM users WHERE clerk_id = auth.jwt() ->> 'sub'
  ));

-- ============================================================
-- PostgreSQL Functions
-- ============================================================

-- マイル付与関数（原子的トランザクション）
CREATE OR REPLACE FUNCTION earn_miles(
  p_user_id UUID,
  p_amount INTEGER,
  p_source VARCHAR,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_tx_id UUID;
  v_expires_at TIMESTAMPTZ;
BEGIN
  v_expires_at := NOW() + INTERVAL '12 months';

  -- トランザクション記録
  INSERT INTO point_transactions (user_id, amount, type, source, metadata, expires_at)
  VALUES (p_user_id, p_amount, 'earn', p_source, p_metadata, v_expires_at)
  RETURNING id INTO v_tx_id;

  -- 残高更新
  UPDATE point_balances
  SET total_miles = total_miles + p_amount,
      lifetime_miles = lifetime_miles + p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- マイル消費関数
CREATE OR REPLACE FUNCTION redeem_miles(
  p_user_id UUID,
  p_amount INTEGER,
  p_source VARCHAR,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_tx_id UUID;
  v_current_balance INTEGER;
BEGIN
  -- 残高確認（FOR UPDATEでロック）
  SELECT total_miles INTO v_current_balance
  FROM point_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient miles balance: have %, need %',
      v_current_balance, p_amount;
  END IF;

  -- トランザクション記録
  INSERT INTO point_transactions (user_id, amount, type, source, metadata)
  VALUES (p_user_id, -p_amount, 'redeem', p_source, p_metadata)
  RETURNING id INTO v_tx_id;

  -- 残高更新
  UPDATE point_balances
  SET total_miles = total_miles - p_amount,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- v2.0追加: 冪等性キーによるリプレイ防止テーブル
CREATE TABLE IF NOT EXISTS idempotency_keys (
  key VARCHAR(64) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id),
  result JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '24 hours'
);
CREATE INDEX idx_idempotency_expires ON idempotency_keys(expires_at);

-- v2.0追加: Optimistic Lockingバージョンカラム
-- point_balancesテーブルに version カラムを追加
-- ALTER TABLE point_balances ADD COLUMN version INTEGER DEFAULT 0;

-- v2.0追加: Race Condition防御を強化した redeem_miles_v2
CREATE OR REPLACE FUNCTION redeem_miles_v2(
  p_user_id UUID,
  p_amount INTEGER,
  p_source VARCHAR,
  p_idempotency_key VARCHAR,
  p_expected_version INTEGER DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_tx_id UUID;
  v_current_balance INTEGER;
  v_current_version INTEGER;
  v_existing_key VARCHAR;
BEGIN
  -- Layer 1: 冪等性キーチェック（リプレイ防止）
  SELECT key INTO v_existing_key
  FROM idempotency_keys
  WHERE key = p_idempotency_key AND user_id = p_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'Duplicate request: idempotency key already used';
  END IF;

  -- Layer 2: SELECT FOR UPDATE（行レベルロック）
  SELECT total_miles, version INTO v_current_balance, v_current_version
  FROM point_balances
  WHERE user_id = p_user_id
  FOR UPDATE;

  -- Layer 3: Optimistic Locking（バージョンチェック）
  IF p_expected_version IS NOT NULL AND v_current_version != p_expected_version THEN
    RAISE EXCEPTION 'Optimistic lock conflict: expected version %, got %',
      p_expected_version, v_current_version;
  END IF;

  IF v_current_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient miles balance: have %, need %',
      v_current_balance, p_amount;
  END IF;

  -- トランザクション記録
  INSERT INTO point_transactions (user_id, amount, type, source, metadata)
  VALUES (p_user_id, -p_amount, 'redeem', p_source, p_metadata)
  RETURNING id INTO v_tx_id;

  -- 残高更新（バージョンインクリメント）
  UPDATE point_balances
  SET total_miles = total_miles - p_amount,
      version = version + 1,
      updated_at = NOW()
  WHERE user_id = p_user_id;

  -- 冪等性キー記録
  INSERT INTO idempotency_keys (key, user_id, result)
  VALUES (p_idempotency_key, p_user_id, jsonb_build_object('tx_id', v_tx_id));

  RETURN v_tx_id;
END;
$$ LANGUAGE plpgsql;

-- ティア判定関数
CREATE OR REPLACE FUNCTION calculate_tier(p_lifetime_miles INTEGER)
RETURNS VARCHAR AS $$
BEGIN
  RETURN CASE
    WHEN p_lifetime_miles >= 50000 THEN 'diamond'
    WHEN p_lifetime_miles >= 15000 THEN 'platinum'
    WHEN p_lifetime_miles >= 5000 THEN 'gold'
    WHEN p_lifetime_miles >= 1000 THEN 'silver'
    ELSE 'bronze'
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ティア自動更新トリガー
CREATE OR REPLACE FUNCTION update_tier_trigger()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tier VARCHAR;
BEGIN
  v_new_tier := calculate_tier(NEW.lifetime_miles);
  IF v_new_tier != NEW.tier THEN
    NEW.tier := v_new_tier;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_tier
  BEFORE UPDATE ON point_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_tier_trigger();
```

### 4.3 インデックス戦略

| テーブル | インデックス | 用途 |
|---------|------------|------|
| point_transactions | (user_id, created_at DESC) | ユーザー別履歴取得 |
| point_transactions | (expires_at) WHERE type='earn' | 期限切れマイル検索 |
| point_transactions | (source) | アクション別集計 |
| notifications | (user_id, is_read) WHERE is_read=false | 未読通知取得 |
| events | (status, start_at) | 今後のイベント一覧 |
| daily_missions | (user_id, date) | 日別ミッション取得 |

---

## 5. API設計

### 5.1 RESTful API エンドポイント一覧

```
BASE URL: /api/v1

=== 認証系 ===
POST   /api/v1/auth/webhook          # Clerk Webhook（ユーザー同期）

=== マイル系 ===
GET    /api/v1/miles/balance          # 残高照会
GET    /api/v1/miles/history          # 履歴一覧
POST   /api/v1/miles/earn             # マイル獲得（内部API）
GET    /api/v1/miles/expiring         # 失効予定マイル

=== ランキング系 ===
GET    /api/v1/rankings/weekly        # 週間ランキング
GET    /api/v1/rankings/monthly       # 月間ランキング
GET    /api/v1/rankings/alltime       # 全期間ランキング

=== バッジ系 ===
GET    /api/v1/badges                 # 全バッジ一覧
GET    /api/v1/badges/my              # 獲得済みバッジ

=== ストリーク系 ===
GET    /api/v1/streaks                # ストリーク情報
POST   /api/v1/streaks/freeze         # フリーズ使用

=== ミッション系 ===
GET    /api/v1/missions/today         # 今日のミッション

=== 交換系 ===
GET    /api/v1/exchange/catalog       # カタログ一覧
POST   /api/v1/exchange/request       # 交換申請
GET    /api/v1/exchange/history       # 交換履歴
DELETE /api/v1/exchange/:id           # 交換キャンセル

=== イベント系 ===
GET    /api/v1/events                 # イベント一覧
GET    /api/v1/events/:id             # イベント詳細
POST   /api/v1/events/:id/register    # 参加登録
POST   /api/v1/events/checkin         # QRチェックイン

=== 招待系 ===
GET    /api/v1/referrals/link         # 招待リンク取得
GET    /api/v1/referrals/stats        # 招待実績

=== 通知系 ===
GET    /api/v1/notifications          # 通知一覧
PUT    /api/v1/notifications/:id/read # 既読マーク
PUT    /api/v1/notifications/read-all # 全既読
GET    /api/v1/notifications/stream   # SSEストリーム

=== プロフィール系 ===
GET    /api/v1/profile                # プロフィール取得
PUT    /api/v1/profile                # プロフィール更新
GET    /api/v1/profile/:userId        # 他ユーザープロフィール

=== 設定系 ===
GET    /api/v1/settings/notifications # 通知設定取得
PUT    /api/v1/settings/notifications # 通知設定更新

=== 管理者API ===
GET    /api/v1/admin/dashboard        # KPIダッシュボード
GET    /api/v1/admin/members          # 会員一覧
GET    /api/v1/admin/members/:id      # 会員詳細
POST   /api/v1/admin/miles/adjust     # マイル手動調整
CRUD   /api/v1/admin/events           # イベント管理
CRUD   /api/v1/admin/catalog          # カタログ管理
CRUD   /api/v1/admin/badges           # バッジ管理
GET    /api/v1/admin/exchanges        # 交換申請一覧
PUT    /api/v1/admin/exchanges/:id    # 交換ステータス更新
GET    /api/v1/admin/audit-logs       # 監査ログ
PUT    /api/v1/admin/mile-rules       # マイルルール更新
POST   /api/v1/admin/notifications    # 一括通知送信

=== Webhook受信系 ===
POST   /api/v1/webhooks/chatwork       # ChatWork Webhook受信
POST   /api/v1/webhooks/zoom           # Zoom Webhook受信
POST   /api/v1/webhooks/zoom/validate  # Zoom URL Validation

=== ChatWork連携系 ===
GET    /api/v1/chatwork/activity       # 活動量サマリー
GET    /api/v1/chatwork/activity/:userId # ユーザー別活動量
GET    /api/v1/chatwork/bot/status     # Bot稼働状況
POST   /api/v1/chatwork/bot/send       # Bot手動メッセージ送信（管理者）
PUT    /api/v1/admin/chatwork/rooms    # 監視対象ルーム設定
GET    /api/v1/admin/chatwork/mapping  # account_id↔userId マッピング一覧
PUT    /api/v1/admin/chatwork/mapping  # マッピング更新

=== Zoom連携系 ===
GET    /api/v1/zoom/meetings           # グルコン一覧
GET    /api/v1/zoom/meetings/:id       # グルコン詳細（参加者・投票結果等）
POST   /api/v1/admin/zoom/meetings     # グルコン作成（→Zoom API連携）
GET    /api/v1/zoom/recordings         # 見逃し配信一覧
GET    /api/v1/zoom/recordings/:id     # 見逃し配信詳細
GET    /api/v1/admin/zoom/mapping      # email↔userId マッピング一覧
PUT    /api/v1/admin/zoom/mapping      # マッピング更新
GET    /api/v1/admin/zoom/reports      # Zoom参加レポート
```

### 5.2 API レスポンス形式

```typescript
// 成功レスポンス
interface ApiSuccessResponse<T> {
  readonly success: true;
  readonly data: T;
  readonly meta?: {
    readonly total: number;
    readonly limit: number;
    readonly offset: number;
    readonly hasMore: boolean;
  };
}

// エラーレスポンス
interface ApiErrorResponse {
  readonly success: false;
  readonly error: {
    readonly code: string;         // 'INSUFFICIENT_MILES'
    readonly message: string;      // ユーザー向けメッセージ
    readonly details?: unknown;    // 開発者向け詳細（本番では省略）
  };
}

type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse;
```

### 5.3 バリデーションスキーマ（Zod）

```typescript
import { z } from 'zod';

// マイル獲得リクエスト
const earnMilesSchema = z.object({
  actionCode: z.string().min(1).max(50),
  metadata: z.record(z.unknown()).optional(),
});

// 交換申請リクエスト
const exchangeRequestSchema = z.object({
  catalogItemId: z.string().uuid(),
  shippingAddressId: z.string().uuid().optional(),
});

// イベント作成リクエスト（管理者）
const createEventSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['group_consult', 'offline_event', 'special']),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  location: z.string().optional(),
  onlineUrl: z.string().url().optional(),
  capacity: z.number().int().min(1).max(10000),
  milesReward: z.number().int().min(0),
  isPaid: z.boolean().default(false),
  price: z.number().int().min(0).optional(),
  tierRequired: z.enum(['bronze', 'silver', 'gold', 'platinum', 'diamond']).optional(),
});

// プロフィール更新リクエスト
const updateProfileSchema = z.object({
  displayName: z.string().min(1).max(100),
  bio: z.string().max(500).optional(),
  avatarUrl: z.string().url().optional(),
});

// マイル手動調整リクエスト（管理者）
const adjustMilesSchema = z.object({
  userId: z.string().uuid(),
  amount: z.number().int().refine(v => v !== 0, 'Amount must not be zero'),
  reason: z.string().min(10).max(500),
});

// 配送先住所
const shippingAddressSchema = z.object({
  recipientName: z.string().min(1).max(100),
  postalCode: z.string().regex(/^\d{3}-?\d{4}$/),
  prefecture: z.string().min(1).max(10),
  city: z.string().min(1).max(100),
  addressLine: z.string().min(1).max(200),
  phone: z.string().regex(/^0\d{9,10}$/),
});
```

---

## 6. 認証・認可設計

### 6.1 Clerk統合フロー

```
[ユーザー] → [Clerk UI Component] → [Clerk Server]
                                          │
                                          ▼
                                    [JWT発行]
                                          │
                    ┌─────────────────────┤
                    ▼                     ▼
            [Clerk Webhook]        [Next.js Middleware]
            (ユーザー同期)         (JWT検証)
                    │                     │
                    ▼                     ▼
            [Supabase users]       [API Route / Server Action]
            (INSERT/UPDATE)        (認証済みリクエスト処理)
```

### 6.2 ミドルウェア認証チェック

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

const isPublicRoute = createRouteMatcher([
  '/',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/v1/auth/webhook',
]);

const isAdminRoute = createRouteMatcher([
  '/admin(.*)',
  '/api/v1/admin(.*)',
]);

export default clerkMiddleware(async (auth, req) => {
  if (isPublicRoute(req)) return;

  const { userId, sessionClaims } = await auth.protect();

  if (isAdminRoute(req)) {
    const role = sessionClaims?.metadata?.role;
    if (role !== 'admin' && role !== 'super_admin') {
      return new Response('Forbidden', { status: 403 });
    }
  }
});

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)'],
};
```

### 6.3 ロール別権限マトリックス

| 機能 | member | admin | super_admin |
|------|--------|-------|-------------|
| マイル照会（自分） | ○ | ○ | ○ |
| マイル手動調整 | ✗ | ○ | ○ |
| 交換申請 | ○ | ○ | ○ |
| 交換承認 | ✗ | ○ | ○ |
| イベント参加 | ○ | ○ | ○ |
| イベント作成 | ✗ | ○ | ○ |
| カタログ管理 | ✗ | ○ | ○ |
| バッジ管理 | ✗ | ○ | ○ |
| 会員BAN | ✗ | ✗ | ○ |
| マイルルール変更 | ✗ | ✗ | ○ |
| 管理者権限付与 | ✗ | ✗ | ○ |
| 監査ログ閲覧 | ✗ | ○ | ○ |

---

## 7. マイルエンジン設計

### 7.1 マイル付与フロー

```
[ユーザーアクション]
       │
       ▼
[Server Action: trackAction]
       │
       ├──1. JWT認証チェック
       │
       ├──2. アクションコード検証（mile_rulesテーブル）
       │      └── is_active=true チェック
       │
       ├──3. レート制限チェック（Redis）
       │      ├── クールダウン（5秒以内の同一アクション拒否）
       │      └── 日次上限チェック
       │
       ├──4. ボーナス倍率チェック（mile_campaigns）
       │      └── 該当キャンペーンの multiplier 適用
       │
       ├──5. マイル付与（earn_miles関数 - 原子的トランザクション）
       │      ├── point_transactions INSERT
       │      └── point_balances UPDATE
       │
       ├──6. ティア再計算（トリガーで自動実行）
       │
       ├──7. バッジ判定
       │      └── 条件マッチ時にuser_badges INSERT
       │
       ├──8. ミッション進捗更新
       │      └── daily_missions.current_count INCREMENT
       │
       ├──9. リーダーボード更新（Redis ZINCRBY）
       │
       ├──10. 通知送信
       │       ├── アプリ内通知（DB INSERT）
       │       └── SSE配信（リアルタイム）
       │
       └──11. Posthogイベント送信（非同期）
```

### 7.2 残高整合性保証

```typescript
// 残高整合性チェック（日次バッチ）
async function verifyBalanceIntegrity(): Promise<IntegrityReport> {
  const results = await db.execute(sql`
    SELECT
      pb.user_id,
      pb.total_miles AS recorded_balance,
      COALESCE(SUM(pt.amount), 0) AS calculated_balance,
      pb.total_miles - COALESCE(SUM(pt.amount), 0) AS discrepancy
    FROM point_balances pb
    LEFT JOIN point_transactions pt ON pb.user_id = pt.user_id
    GROUP BY pb.user_id, pb.total_miles
    HAVING pb.total_miles != COALESCE(SUM(pt.amount), 0)
  `);

  if (results.length > 0) {
    // 不整合をアラート
    await sendAlertToAdmin({
      type: 'balance_integrity_failure',
      count: results.length,
      details: results,
    });
  }

  return {
    checkedAt: new Date(),
    totalUsers: await countUsers(),
    discrepancies: results.length,
    details: results,
  };
}
```

---

## 8. ゲーミフィケーションエンジン設計

### 8.1 バッジ判定エンジン

```typescript
// Badge Evaluation Engine
async function evaluateBadges(
  userId: string,
  event: { actionCode: string; metadata: Record<string, unknown> }
): Promise<Badge[]> {
  const awardedBadges: Badge[] = [];

  // 未獲得のアクティブバッジを取得
  const unearned = await getUnearnedBadges(userId);

  for (const badge of unearned) {
    const { condition } = badge;
    let earned = false;

    switch (condition.type) {
      case 'count': {
        // アクション回数ベースのバッジ
        const count = await getActionCount(userId, condition.actionCode!);
        earned = count >= condition.threshold!;
        break;
      }
      case 'streak': {
        // ストリークベースのバッジ
        const streak = await getUserStreak(userId);
        earned = streak.currentStreak >= condition.threshold!;
        break;
      }
      case 'tier': {
        // ティアベースのバッジ
        const balance = await getBalance(userId);
        earned = balance.tier === condition.tierRequired;
        break;
      }
      case 'special': {
        // 特殊条件（カスタムロジック）
        earned = await evaluateSpecialCondition(userId, condition);
        break;
      }
    }

    if (earned) {
      await awardBadge(userId, badge.id);
      awardedBadges.push(badge);
    }
  }

  return awardedBadges;
}
```

### 8.2 ストリーク判定ロジック

```typescript
async function updateStreak(userId: string): Promise<StreakResult> {
  const streak = await getUserStreak(userId);
  const todayJST = formatDateJST(new Date()); // 'YYYY-MM-DD'
  const yesterdayJST = formatDateJST(subDays(new Date(), 1));

  // すでに今日更新済み
  if (streak.lastActiveDate === todayJST) {
    return { ...streak, changed: false };
  }

  let newStreak: number;
  let freezeUsed = false;

  if (streak.lastActiveDate === yesterdayJST) {
    // 昨日もアクティブ → ストリーク継続
    newStreak = streak.currentStreak + 1;
  } else if (streak.freezeRemaining > 0 && streak.lastActiveDate) {
    // 昨日未アクティブだがフリーズ残あり → フリーズ使用
    const daysMissed = diffDays(todayJST, streak.lastActiveDate);
    if (daysMissed <= 2 && streak.freezeRemaining >= daysMissed - 1) {
      newStreak = streak.currentStreak + 1;
      freezeUsed = true;
    } else {
      newStreak = 1; // リセット
    }
  } else {
    // ストリークリセット
    newStreak = 1;
  }

  const longestStreak = Math.max(streak.longestStreak, newStreak);

  const updated = await db.update(userStreaks).set({
    currentStreak: newStreak,
    longestStreak,
    lastActiveDate: todayJST,
    freezeRemaining: freezeUsed
      ? streak.freezeRemaining - 1
      : streak.freezeRemaining,
    updatedAt: new Date(),
  }).where(eq(userStreaks.userId, userId)).returning();

  // ストリークマイルストーンチェック
  const milestones = [7, 30, 100, 365];
  for (const milestone of milestones) {
    if (newStreak === milestone) {
      await earnStreakBonus(userId, milestone);
    }
  }

  return { ...updated[0], changed: true, freezeUsed };
}
```

### 8.3 デイリーミッション生成

```typescript
const MISSION_POOL = [
  { title: '今日のおすすめ記事を読もう', actionCode: 'content_view', targetCount: 1 },
  { title: 'コメントを1つ投稿しよう', actionCode: 'comment_post', targetCount: 1 },
  { title: '誰かの質問に回答しよう', actionCode: 'help_answer', targetCount: 1 },
  { title: 'プロフィールを更新しよう', actionCode: 'profile_update', targetCount: 1 },
  { title: '3つのコンテンツを閲覧しよう', actionCode: 'content_view', targetCount: 3 },
  { title: 'イベントページをチェックしよう', actionCode: 'event_page_view', targetCount: 1 },
  { title: '友達に招待リンクを送ろう', actionCode: 'referral_share', targetCount: 1 },
];

async function generateDailyMissions(userId: string): Promise<Mission[]> {
  const todayJST = formatDateJST(new Date());

  // すでに今日のミッションがある場合はそれを返す
  const existing = await getDailyMissions(userId, todayJST);
  if (existing.length > 0) return existing;

  // ランダムに3つ選出（重複なし）
  const shuffled = [...MISSION_POOL].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 3);

  const missions = await db.insert(dailyMissions).values(
    selected.map(m => ({
      userId,
      title: m.title,
      actionCode: m.actionCode,
      targetCount: m.targetCount,
      rewardMiles: 20,
      date: todayJST,
    }))
  ).returning();

  return missions;
}
```

---

## 9. リアルタイム通信設計（v2.0改訂）

> **v2.0変更**: SSE（Server-Sent Events）から **Supabase Realtime** に変更。
> 理由: Vercel Serverless FunctionsのSSEタイムアウト制限（10〜60秒）により、
> 安定したリアルタイム通信が不可能なため。Supabase Realtimeは
> PostgreSQLのLISTEN/NOTIFYをWebSocket経由で直接クライアントに配信可能。

### 9.1 Supabase Realtime設計

```typescript
// lib/supabase/realtime.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// 通知チャネルのサブスクリプション
export function subscribeToNotifications(userId: string, onNotification: (payload: any) => void) {
  const channel = supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onNotification(payload.new)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

// マイル残高のリアルタイム更新
export function subscribeToMileBalance(userId: string, onUpdate: (balance: number) => void) {
  const channel = supabase
    .channel(`mile_balance:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'mile_balances',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => onUpdate(payload.new.balance)
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
```

### 9.2 クライアント側Realtimeフック

```typescript
// hooks/useNotificationStream.ts
import { subscribeToNotifications } from '@/lib/supabase/realtime';

export function useNotificationStream() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user } = useUser(); // Clerk

  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = subscribeToNotifications(user.id, (notification) => {
      setNotifications(prev => [notification, ...prev]);
      showToast(notification);
    });

    return unsubscribe;
  }, [user?.id]);

  return { notifications };
}
```

---

## 10. キャッシュ設計

### 10.1 Redis キー設計

| キーパターン | データ型 | TTL | 用途 |
|-------------|---------|-----|------|
| `balance:{userId}` | String (JSON) | 5分 | マイル残高キャッシュ |
| `leaderboard:weekly` | Sorted Set | - | 週間ランキング |
| `leaderboard:monthly` | Sorted Set | - | 月間ランキング |
| `leaderboard:alltime` | Sorted Set | - | 全期間ランキング |
| `streak:{userId}` | String (JSON) | 1時間 | ストリーク情報キャッシュ |
| `rate:{userId}:{action}` | String | 5秒 | レート制限（クールダウン） |
| `daily_count:{userId}:{action}:{date}` | String (int) | 24時間 | 日次アクション回数 |
| `missions:{userId}:{date}` | String (JSON) | 24時間 | デイリーミッションキャッシュ |
| `session:{sessionId}` | String (JSON) | 30日 | セッションデータ |

### 10.2 キャッシュ戦略

```
Write-Through（マイル残高）:
  DB書き込み → Redis更新 → レスポンス返却

Cache-Aside（ランキング以外）:
  1. Redis確認 → ヒット → 返却
  2. ミス → DB取得 → Redis書き込み → 返却

Write-Behind（リーダーボード）:
  Redis ZINCRBY → 非同期でDB反映（5分間隔）
```

---

## 11. バックグラウンドジョブ設計

### 11.1 ジョブ一覧

| ジョブ名 | スケジュール | 処理内容 |
|---------|------------|---------|
| `expireMiles` | 毎日 1:00 JST | 有効期限切れマイルの失効処理 |
| `resetDailyMissions` | 毎日 0:00 JST | 前日ミッションのexpired処理 |
| `weeklyLeaderboardReset` | 毎月曜 0:00 JST | 週間ランキングリセット |
| `monthlyLeaderboardReset` | 毎月1日 0:00 JST | 月間ランキングリセット |
| `resetStreakFreezes` | 毎月1日 0:00 JST | ストリークフリーズ回数を2にリセット |
| `balanceIntegrityCheck` | 毎日 3:00 JST | 残高整合性検証 |
| `expireNotifications` | 毎日 2:00 JST | 90日以上前の通知削除 |
| `sendExpirationWarnings` | 毎日 10:00 JST | マイル失効30日前通知送信 |
| `streakReminder` | 毎日 21:00 JST | 未ログインユーザーへのリマインド |
| `monthlyRankingRewards` | 毎月1日 9:00 JST | 月間Top10への報酬マイル付与 |

### 11.2 Vercel Cron Jobs設定

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/expire-miles",
      "schedule": "0 16 * * *"
    },
    {
      "path": "/api/cron/reset-daily-missions",
      "schedule": "0 15 * * *"
    },
    {
      "path": "/api/cron/weekly-leaderboard-reset",
      "schedule": "0 15 * * 1"
    },
    {
      "path": "/api/cron/monthly-reset",
      "schedule": "0 15 1 * *"
    },
    {
      "path": "/api/cron/balance-integrity-check",
      "schedule": "0 18 * * *"
    },
    {
      "path": "/api/cron/expire-notifications",
      "schedule": "0 17 * * *"
    },
    {
      "path": "/api/cron/streak-reminder",
      "schedule": "0 12 * * *"
    }
  ]
}
```

---

## 12. UI/UXコンポーネント設計

### 12.1 コンポーネントツリー

```
app/
├── (auth)/
│   ├── sign-in/ → ClerkSignIn
│   └── sign-up/ → ClerkSignUp
├── (member)/
│   ├── layout.tsx → MemberLayout
│   │   ├── Sidebar (desktop)
│   │   ├── BottomNav (mobile)
│   │   └── NotificationBell
│   ├── dashboard/ → DashboardPage
│   │   ├── MileBalanceCard
│   │   ├── TierProgressCard
│   │   ├── StreakCard
│   │   ├── DailyMissionsCard
│   │   └── RecentActivityFeed
│   ├── miles/
│   │   └── history/ → MileHistoryPage
│   │       └── TransactionList
│   ├── rankings/ → RankingPage
│   │   ├── PeriodTabs (weekly/monthly/alltime)
│   │   └── LeaderboardTable
│   ├── badges/ → BadgeCollectionPage
│   │   └── BadgeGrid
│   ├── exchange/
│   │   ├── catalog/ → CatalogPage
│   │   │   ├── CategoryFilter
│   │   │   └── CatalogGrid
│   │   └── history/ → ExchangeHistoryPage
│   ├── events/ → EventsPage
│   │   ├── EventCalendar
│   │   ├── EventList
│   │   └── [id]/ → EventDetailPage
│   ├── scan/ → QRScannerPage
│   ├── profile/ → ProfilePage
│   │   ├── [userId]/ → PublicProfilePage
│   │   └── edit/ → ProfileEditPage
│   ├── referral/ → ReferralPage
│   ├── notifications/ → NotificationsPage
│   └── settings/ → SettingsPage
└── (admin)/
    └── admin/
        ├── layout.tsx → AdminLayout
        ├── dashboard/ → AdminDashboardPage
        ├── members/ → MemberManagementPage
        ├── events/ → EventManagementPage
        ├── exchanges/ → ExchangeManagementPage
        ├── catalog/ → CatalogManagementPage
        ├── badges/ → BadgeManagementPage
        ├── mile-rules/ → MileRulesPage
        ├── notifications/ → NotificationSendPage
        └── audit-logs/ → AuditLogPage
```

### 12.2 共通コンポーネント

```typescript
// 設計パターン: Compound Components + Composition

// === MileDisplay ===
// マイル表示（カウントアップアニメーション付き）
interface MileDisplayProps {
  amount: number;
  animated?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// === TierBadge ===
// ティアバッジ表示
interface TierBadgeProps {
  tier: TierType;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

// === ProgressBar ===
// プログレスバー（ティア進捗等）
interface ProgressBarProps {
  current: number;
  max: number;
  label?: string;
  color?: string;
  animated?: boolean;
}

// === BadgeIcon ===
// バッジアイコン（獲得/未獲得表示）
interface BadgeIconProps {
  badge: Badge;
  earned: boolean;
  size?: 'sm' | 'md' | 'lg';
  onClick?: () => void;
}

// === StreakDisplay ===
// ストリーク表示（炎アニメーション）
interface StreakDisplayProps {
  currentStreak: number;
  longestStreak: number;
  freezeRemaining: number;
}

// === LeaderboardRow ===
// ランキング行
interface LeaderboardRowProps {
  entry: LeaderboardEntry;
  isCurrentUser: boolean;
}

// === MileEarnedToast ===
// マイル獲得トースト通知
interface MileEarnedToastProps {
  amount: number;
  source: string;
}

// === BadgeEarnedModal ===
// バッジ獲得モーダル（パーティクルエフェクト付き）
interface BadgeEarnedModalProps {
  badge: Badge;
  onClose: () => void;
}

// === TierUpModal ===
// ティア昇格モーダル
interface TierUpModalProps {
  previousTier: TierType;
  newTier: TierType;
  onClose: () => void;
}
```

---

## 13. セキュリティ設計

### 13.1 セキュリティヘッダー

```typescript
// next.config.ts
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(self), microphone=()' },
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.clerk.dev",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https://res.cloudinary.com https://img.clerk.com",
      "font-src 'self'",
      "connect-src 'self' https://*.clerk.dev https://*.supabase.co wss://*.supabase.co https://posthog.example.com",
      "frame-src 'self' https://js.stripe.com",
    ].join('; '),
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
];
```

### 13.2 レート制限実装

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export const rateLimiters = {
  // API全般
  api: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, '1 m'),
    prefix: 'ratelimit:api',
  }),

  // マイル獲得（アクション別クールダウン）
  mileEarn: new Ratelimit({
    redis,
    limiter: Ratelimit.fixedWindow(1, '5 s'),
    prefix: 'ratelimit:mile',
  }),

  // 交換申請
  exchange: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
    prefix: 'ratelimit:exchange',
  }),

  // 認証試行
  auth: new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(5, '15 m'),
    prefix: 'ratelimit:auth',
  }),
};
```

### 13.3 入力サニタイゼーション

```typescript
// lib/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function sanitizeText(input: string): string {
  return input
    .replace(/[<>]/g, '')
    .trim()
    .slice(0, 10000);
}
```

---

## 14. デプロイ・インフラ設計

### 14.1 環境構成

| 環境 | URL | 用途 |
|------|-----|------|
| Development | localhost:3000 | ローカル開発 |
| Preview | *.vercel.app | PRプレビュー |
| Staging | staging.example.com | 本番前テスト |
| Production | app.example.com | 本番 |

### 14.2 環境変数

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_xxx
CLERK_SECRET_KEY=sk_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx
SUPABASE_SERVICE_ROLE_KEY=eyJxxx
DATABASE_URL=postgresql://xxx

# Upstash Redis
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx

# Stripe
STRIPE_SECRET_KEY=sk_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_xxx

# Postmark
POSTMARK_API_TOKEN=xxx

# Cloudinary
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=xxx
CLOUDINARY_API_KEY=xxx
CLOUDINARY_API_SECRET=xxx

# Posthog (Self-Host推奨)
NEXT_PUBLIC_POSTHOG_KEY=xxx
NEXT_PUBLIC_POSTHOG_HOST=https://posthog.example.com  # Self-Host URL

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx

# App
NEXT_PUBLIC_APP_URL=https://app.example.com
CRON_SECRET=xxx
```

### 14.3 CI/CD パイプライン

```
[Git Push] → [GitHub Actions]
                    │
                    ├── Lint (ESLint + Prettier)
                    ├── Type Check (tsc --noEmit)
                    ├── Unit Tests (Vitest)
                    ├── Integration Tests (Vitest + Supabase local)
                    ├── Build (next build)
                    │
                    └── [Vercel Deploy]
                           ├── Preview (PRs)
                           └── Production (main merge)
```

---

## 15. テスト設計

### 15.1 テスト戦略

| テスト種別 | ツール | カバレッジ目標 | 対象 |
|-----------|--------|--------------|------|
| Unit | Vitest | 80%+ | Service層、ユーティリティ関数 |
| Integration | Vitest + Supabase local | 70%+ | API Routes、DB操作 |
| E2E | Playwright | 主要フロー100% | ユーザーフロー10パターン |
| Visual | Storybook + Chromatic | 主要コンポーネント | UIコンポーネント |

### 15.2 E2Eテストシナリオ

| ID | シナリオ | ステップ |
|----|---------|---------|
| E2E-001 | 新規登録→初回ログイン→マイル獲得 | サインアップ→プロフィール入力→コンテンツ閲覧→マイル確認 |
| E2E-002 | デイリーログイン→ストリーク更新 | ログイン→ダッシュボード確認→ストリーク表示確認 |
| E2E-003 | マイル交換フロー | カタログ閲覧→商品選択→住所入力→交換確定→履歴確認 |
| E2E-004 | イベント参加→QRチェックイン | イベント一覧→参加登録→QRスキャン→マイル付与確認 |
| E2E-005 | ランキング表示 | ランキングページ→タブ切替→自分の順位確認 |
| E2E-006 | 管理者：マイル調整 | 管理画面→会員検索→マイル調整→確認 |
| E2E-007 | 管理者：イベント作成 | 管理画面→イベント作成→QRコード確認 |
| E2E-008 | 管理者：交換承認 | 管理画面→交換一覧→承認→ステータス更新 |
| E2E-009 | バッジ獲得フロー | 条件達成アクション→バッジ獲得モーダル→コレクション確認 |
| E2E-010 | 友達招待フロー | 招待リンク生成→リンク経由登録→両者マイル付与確認 |

---

## 16. 監視・ログ設計

### 16.1 構造化ログ

```typescript
// lib/logger.ts
interface LogEntry {
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  action?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
  timestamp: string;
}

export function log(entry: Omit<LogEntry, 'timestamp'>): void {
  const logEntry: LogEntry = {
    ...entry,
    timestamp: new Date().toISOString(),
  };

  if (entry.level === 'error') {
    console.error(JSON.stringify(logEntry));
    // Sentryにも送信
    Sentry.captureMessage(entry.message, {
      level: 'error',
      extra: entry.metadata,
    });
  } else {
    console.log(JSON.stringify(logEntry));
  }
}
```

### 16.2 アラート設定

| アラート | 条件 | 通知先 |
|---------|------|--------|
| サーバーエラー急増 | 5xx率 > 1% (5分間) | Slack + メール |
| マイル残高不整合 | 日次チェックで検出 | Slack + メール |
| 不審なマイル獲得 | 1時間に100マイル以上 | Slack |
| API応答遅延 | P95 > 500ms (10分間) | Slack |
| ストレージ容量 | DB使用量 > 80% | メール |
| 認証失敗急増 | 10分間に50回以上 | Slack + メール |

---

## 17. エラーハンドリング設計

### 17.1 エラーコード体系

```typescript
// lib/errors.ts
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 400,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

// エラーコード定義
export const ErrorCodes = {
  // 認証系 (1xxx)
  UNAUTHORIZED: { code: 'AUTH_1001', status: 401, message: '認証が必要です' },
  FORBIDDEN: { code: 'AUTH_1002', status: 403, message: 'アクセス権限がありません' },
  SESSION_EXPIRED: { code: 'AUTH_1003', status: 401, message: 'セッションが期限切れです' },

  // マイル系 (2xxx)
  INSUFFICIENT_MILES: { code: 'MILE_2001', status: 400, message: 'マイル残高が不足しています' },
  DAILY_LIMIT_REACHED: { code: 'MILE_2002', status: 429, message: '本日の獲得上限に達しました' },
  ACTION_COOLDOWN: { code: 'MILE_2003', status: 429, message: 'しばらく待ってから再度お試しください' },
  INVALID_ACTION: { code: 'MILE_2004', status: 400, message: '無効なアクションです' },

  // 交換系 (3xxx)
  OUT_OF_STOCK: { code: 'EX_3001', status: 400, message: '在庫切れです' },
  ALREADY_CANCELLED: { code: 'EX_3002', status: 400, message: 'すでにキャンセル済みです' },
  CANNOT_CANCEL: { code: 'EX_3003', status: 400, message: '発送済みのためキャンセルできません' },

  // イベント系 (4xxx)
  EVENT_FULL: { code: 'EVT_4001', status: 400, message: '定員に達しています' },
  ALREADY_REGISTERED: { code: 'EVT_4002', status: 400, message: 'すでに参加登録済みです' },
  INVALID_QR: { code: 'EVT_4003', status: 400, message: '無効なQRコードです' },
  TIER_REQUIRED: { code: 'EVT_4004', status: 403, message: '対象ティアの会員のみ参加可能です' },

  // 汎用 (9xxx)
  VALIDATION_ERROR: { code: 'GEN_9001', status: 400, message: '入力内容に誤りがあります' },
  NOT_FOUND: { code: 'GEN_9002', status: 404, message: '見つかりません' },
  RATE_LIMITED: { code: 'GEN_9003', status: 429, message: 'リクエストが多すぎます' },
  INTERNAL_ERROR: { code: 'GEN_9999', status: 500, message: 'システムエラーが発生しました' },
} as const;
```

---

## 18. パフォーマンス設計

### 18.1 最適化戦略

| 領域 | 戦略 | 詳細 |
|------|------|------|
| フロントエンド | Next.js App Router SSR/SSG | 静的ページはSSG、動的ページはSSR+ISR |
| 画像 | Next.js Image + Cloudinary | 自動WebP変換、遅延読み込み |
| バンドル | Tree Shaking + Dynamic Import | 不要コードの除去、ルートごとのコード分割 |
| DB | クエリ最適化 + 接続プーリング | インデックス活用、Supabase接続プール |
| キャッシュ | Redis（残高・ランキング） | 頻繁にアクセスされるデータをキャッシュ |
| CDN | Vercel Edge Network | 静的アセットのエッジキャッシュ |
| API | レスポンス圧縮 + ページネーション | gzip/brotli圧縮、デフォルト20件/ページ |

### 18.2 Core Web Vitals 目標

| 指標 | 目標値 | 対策 |
|------|--------|------|
| LCP | < 2.5秒 | SSR + 画像最適化 + フォント最適化 |
| FID | < 100ms | コード分割 + Web Worker活用 |
| CLS | < 0.1 | 画像サイズ明示 + フォントfallback |
| TTFB | < 800ms | Edge Runtime + CDN |

---

## 19. 移行・マイグレーション設計

### 19.1 データベースマイグレーション

```
Prisma Migrate を使用:

npx prisma migrate dev   → 開発環境でマイグレーション作成・実行
npx prisma migrate deploy → 本番環境でマイグレーション適用
npx prisma generate       → Prisma Client再生成
npx prisma studio         → GUI管理ツール起動
```

### 19.2 初期データシード

```typescript
// db/seed.ts
async function seed() {
  // 1. マイル獲得ルール
  await db.insert(mileRules).values([
    { actionCode: 'daily_login', actionName: 'デイリーログイン', baseMiles: 5, dailyLimit: 1, cooldownSeconds: 0 },
    { actionCode: 'content_view', actionName: 'コンテンツ閲覧', baseMiles: 10, dailyLimit: 10, cooldownSeconds: 5 },
    { actionCode: 'comment_post', actionName: 'コメント投稿', baseMiles: 15, dailyLimit: 10, cooldownSeconds: 5 },
    // ... 全14ルール
  ]);

  // 2. バッジ定義（30種）
  await db.insert(badges).values([
    { name: 'ファーストステップ', category: 'beginner', rarity: 'common', condition: { type: 'count', actionCode: 'daily_login', threshold: 1 } },
    // ... 全30バッジ
  ]);

  // 3. サンプルカタログ
  await db.insert(catalogItems).values([
    { name: 'オリジナルTシャツ', category: 'physical', requiredMiles: 2000, stock: 100 },
    // ... サンプル商品
  ]);
}
```

---

## 20. ディレクトリ構造

```
gamifi-members/
├── .env.local                    # 環境変数（gitignore）
├── .env.example                  # 環境変数テンプレート
├── next.config.ts                # Next.js設定
├── tailwind.config.ts            # Tailwind設定
├── prisma/schema.prisma           # Prisma スキーマ定義
├── vercel.json                   # Vercel設定（Cron含む）
├── tsconfig.json                 # TypeScript設定
├── vitest.config.ts              # Vitest設定
├── playwright.config.ts          # Playwright設定
│
├── public/
│   ├── manifest.json             # PWAマニフェスト
│   ├── sw.js                     # Service Worker
│   └── icons/                    # PWAアイコン
│
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # ルートレイアウト
│   │   ├── (auth)/               # 認証ページ
│   │   │   ├── sign-in/
│   │   │   └── sign-up/
│   │   ├── (member)/             # 会員ページ
│   │   │   ├── layout.tsx        # 会員レイアウト（Sidebar等）
│   │   │   ├── dashboard/
│   │   │   ├── miles/
│   │   │   ├── rankings/
│   │   │   ├── badges/
│   │   │   ├── exchange/
│   │   │   ├── events/
│   │   │   ├── scan/
│   │   │   ├── profile/
│   │   │   ├── referral/
│   │   │   ├── notifications/
│   │   │   └── settings/
│   │   ├── (admin)/              # 管理者ページ
│   │   │   └── admin/
│   │   │       ├── layout.tsx
│   │   │       ├── dashboard/
│   │   │       ├── members/
│   │   │       ├── events/
│   │   │       ├── exchanges/
│   │   │       ├── catalog/
│   │   │       ├── badges/
│   │   │       ├── mile-rules/
│   │   │       ├── notifications/
│   │   │       └── audit-logs/
│   │   └── api/                  # API Routes
│   │       ├── v1/
│   │       │   ├── auth/
│   │       │   ├── miles/
│   │       │   ├── rankings/
│   │       │   ├── badges/
│   │       │   ├── streaks/
│   │       │   ├── missions/
│   │       │   ├── exchange/
│   │       │   ├── events/
│   │       │   ├── referrals/
│   │       │   ├── notifications/
│   │       │   ├── profile/
│   │       │   ├── settings/
│   │       │   └── admin/
│   │       └── cron/             # Cronジョブ
│   │           ├── expire-miles/
│   │           ├── reset-daily-missions/
│   │           ├── weekly-leaderboard-reset/
│   │           ├── monthly-reset/
│   │           ├── balance-integrity-check/
│   │           ├── expire-notifications/
│   │           └── streak-reminder/
│   │
│   ├── components/               # UIコンポーネント
│   │   ├── ui/                   # shadcn/ui ベース
│   │   ├── gamification/         # ゲーミフィケーション専用
│   │   │   ├── MileDisplay.tsx
│   │   │   ├── TierBadge.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── BadgeIcon.tsx
│   │   │   ├── StreakDisplay.tsx
│   │   │   ├── LeaderboardRow.tsx
│   │   │   ├── MileEarnedToast.tsx
│   │   │   ├── BadgeEarnedModal.tsx
│   │   │   ├── TierUpModal.tsx
│   │   │   └── DailyMissionCard.tsx
│   │   ├── layout/               # レイアウト
│   │   │   ├── Sidebar.tsx
│   │   │   ├── BottomNav.tsx
│   │   │   ├── Header.tsx
│   │   │   └── NotificationBell.tsx
│   │   └── shared/               # 共通
│   │       ├── Avatar.tsx
│   │       ├── Pagination.tsx
│   │       └── EmptyState.tsx
│   │
│   ├── lib/                      # ユーティリティ
│   │   ├── db/                   # データベース
│   │   │   ├── index.ts          # Prisma クライアント
│   │   │   ├── schema.ts         # スキーマ定義
│   │   │   └── migrations/       # マイグレーション
│   │   ├── redis.ts              # Redisクライアント
│   │   ├── rate-limit.ts         # レート制限
│   │   ├── errors.ts             # エラー定義
│   │   ├── logger.ts             # ロガー
│   │   ├── date.ts               # 日付ユーティリティ（JST対応）
│   │   ├── sanitize.ts           # 入力サニタイゼーション
│   │   └── validations/          # Zodスキーマ
│   │       ├── mile.ts
│   │       ├── exchange.ts
│   │       ├── event.ts
│   │       └── profile.ts
│   │
│   ├── services/                 # ビジネスロジック
│   │   ├── mile.service.ts
│   │   ├── gamification.service.ts
│   │   ├── event.service.ts
│   │   ├── exchange.service.ts
│   │   ├── notification.service.ts
│   │   ├── referral.service.ts
│   │   └── admin.service.ts
│   │
│   ├── repositories/             # データアクセス
│   │   ├── user.repository.ts
│   │   ├── mile.repository.ts
│   │   ├── badge.repository.ts
│   │   ├── event.repository.ts
│   │   ├── exchange.repository.ts
│   │   └── notification.repository.ts
│   │
│   ├── hooks/                    # カスタムフック
│   │   ├── useMileBalance.ts
│   │   ├── useStreak.ts
│   │   ├── useLeaderboard.ts
│   │   ├── useNotificationStream.ts
│   │   ├── useDailyMissions.ts
│   │   └── useQRScanner.ts
│   │
│   ├── stores/                   # クライアントステート
│   │   ├── notification.store.ts
│   │   └── ui.store.ts
│   │
│   └── types/                    # 型定義
│       ├── domain.ts             # ドメイン型
│       ├── api.ts                # APIレスポンス型
│       └── common.ts             # 共通型
│
├── tests/
│   ├── unit/                     # ユニットテスト
│   ├── integration/              # 統合テスト
│   └── e2e/                      # E2Eテスト
│
├── db/
│   ├── seed.ts                   # 初期データ
│   └── migrations/               # マイグレーションファイル
│
└── docs/
    ├── REQUIREMENTS_DEFINITION.md
    ├── SDD_SOFTWARE_DESIGN.md
    └── API_REFERENCE.md
```

---

## 21. ChatWork × Zoom統合設計

### 21.1 ChatWork連携アーキテクチャ

#### 21.1.1 Webhook受信フロー

```typescript
// /api/v1/webhooks/chatwork/route.ts
interface ChatWorkWebhookPayload {
  readonly webhook_setting_id: string;
  readonly webhook_event_type: 'message_created';
  readonly webhook_event_time: number;
  readonly webhook_event: {
    readonly from_account_id: number;
    readonly to_account_id: number;
    readonly room_id: number;
    readonly message_id: string;
    readonly body: string;
    readonly send_time: number;
    readonly update_time: number;
  };
}
```

#### 21.1.2 メッセージ解析エンジン

```typescript
interface MessageAnalysis {
  readonly messageId: string;
  readonly accountId: number;
  readonly roomId: number;
  readonly metrics: {
    readonly isReply: boolean;           // [rp] タグ検出
    readonly replyToAccountId?: number;  // 返信先
    readonly mentions: readonly number[]; // [To:xxx] パース結果
    readonly hasQuote: boolean;          // [qt] タグ検出
    readonly hasUrl: boolean;            // URL検出
    readonly hasFile: boolean;           // ファイル添付
    readonly positiveWords: readonly string[]; // ポジティブワード
    readonly wordCount: number;          // 文字数
    readonly hasInfoTag: boolean;        // [info] 情報整理
  };
  readonly botCommand?: string;          // /マイル, /ランキング 等
}

// ChatWork記法パーサー
function parseMessage(body: string): MessageAnalysis['metrics'] {
  return {
    isReply: /\[rp\s+aid=\d+/.test(body),
    replyToAccountId: body.match(/\[rp\s+aid=(\d+)/)?.[1]
      ? Number(body.match(/\[rp\s+aid=(\d+)/)![1])
      : undefined,
    mentions: [...body.matchAll(/\[To:(\d+)\]/g)].map(m => Number(m[1])),
    hasQuote: /\[qt\]/.test(body),
    hasUrl: /https?:\/\/\S+/.test(body),
    hasFile: false, // Webhookからは判定不可、Files APIで別途取得
    positiveWords: POSITIVE_PATTERNS.filter(p => body.includes(p)),
    wordCount: body.replace(/\[.*?\]/g, '').trim().length,
    hasInfoTag: /\[info\]/.test(body),
  };
}

const POSITIVE_PATTERNS = [
  'ありがとう', '参考になりました', '助かりました',
  '勉強になりました', 'すごい', '素晴らしい', '感謝',
] as const;
```

#### 21.1.3 ChatWork Bot設計

```typescript
interface BotCommand {
  readonly command: string;
  readonly handler: (accountId: number) => Promise<string>;
}

const BOT_COMMANDS: readonly BotCommand[] = [
  {
    command: '/マイル',
    handler: async (accountId) => {
      const user = await findUserByChatworkId(accountId);
      const balance = await mileService.getBalance(user.id);
      const tier = await gamifyService.getTier(user.id);
      return `${user.name}さんの現在のマイル: ${balance.toLocaleString()}pt（${tier.name}）\n次のランクまで: あと${tier.nextThreshold - balance}pt`;
    },
  },
  {
    command: '/ランキング',
    handler: async () => {
      const top10 = await rankingService.getMonthlyTop(10);
      return `📊 月間ランキング\n${top10.map((r, i) => `${i + 1}位: ${r.name} (${r.miles}pt)`).join('\n')}`;
    },
  },
  {
    command: '/バッジ',
    handler: async (accountId) => {
      const user = await findUserByChatworkId(accountId);
      const badges = await badgeService.getUserBadges(user.id);
      return `🏅 獲得バッジ (${badges.length}個)\n${badges.map(b => `・${b.name}`).join('\n')}`;
    },
  },
  {
    command: '/ミッション',
    handler: async (accountId) => {
      const user = await findUserByChatworkId(accountId);
      const missions = await missionService.getToday(user.id);
      return `📋 今日のミッション\n${missions.map(m => `${m.completed ? '✅' : '⬜'} ${m.title} (+${m.miles}pt)`).join('\n')}`;
    },
  },
];
```

#### 21.1.4 ChatWork APIクライアント

```typescript
// lib/integrations/chatwork-client.ts
class ChatWorkClient {
  private readonly baseUrl = 'https://api.chatwork.com/v2';
  private readonly token: string;

  constructor(token: string) {
    this.token = token;
  }

  async getRoomMessages(roomId: number, force?: boolean): Promise<readonly ChatWorkMessage[]> {
    const params = force ? '?force=1' : '';
    return this.get(`/rooms/${roomId}/messages${params}`);
  }

  async postMessage(roomId: number, body: string): Promise<{ message_id: string }> {
    return this.post(`/rooms/${roomId}/messages`, { body });
  }

  async getRoomTasks(roomId: number, status?: 'open' | 'done'): Promise<readonly ChatWorkTask[]> {
    const params = status ? `?status=${status}` : '';
    return this.get(`/rooms/${roomId}/tasks${params}`);
  }

  async getRoomFiles(roomId: number): Promise<readonly ChatWorkFile[]> {
    return this.get(`/rooms/${roomId}/files`);
  }

  async getRoomMembers(roomId: number): Promise<readonly ChatWorkMember[]> {
    return this.get(`/rooms/${roomId}/members`);
  }

  private async get<T>(path: string): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { 'X-ChatWorkToken': this.token },
    });
    if (!res.ok) throw new Error(`ChatWork API error: ${res.status}`);
    return res.json();
  }

  private async post<T>(path: string, body: Record<string, string>): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        'X-ChatWorkToken': this.token,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(body),
    });
    if (!res.ok) throw new Error(`ChatWork API error: ${res.status}`);
    return res.json();
  }
}
```

### 21.2 Zoom連携アーキテクチャ

#### 21.2.1 Zoom OAuth 2.0 + Server-to-Server設計

```typescript
// lib/integrations/zoom-auth.ts
interface ZoomTokenResponse {
  readonly access_token: string;
  readonly token_type: 'bearer';
  readonly expires_in: number;
}

class ZoomAuth {
  private token: string | null = null;
  private expiresAt: number = 0;

  async getAccessToken(): Promise<string> {
    if (this.token && Date.now() < this.expiresAt) {
      return this.token;
    }

    const credentials = Buffer.from(
      `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`
    ).toString('base64');

    const res = await fetch('https://zoom.us/oauth/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'account_credentials',
        account_id: process.env.ZOOM_ACCOUNT_ID!,
      }),
    });

    const data: ZoomTokenResponse = await res.json();
    this.token = data.access_token;
    this.expiresAt = Date.now() + (data.expires_in - 60) * 1000;
    return this.token;
  }
}
```

#### 21.2.2 Zoom Webhook検証・処理

```typescript
// /api/v1/webhooks/zoom/route.ts
import crypto from 'crypto';

function verifyZoomWebhook(
  payload: string,
  signature: string,
  timestamp: string
): boolean {
  const message = `v0:${timestamp}:${payload}`;
  const hash = crypto
    .createHmac('sha256', process.env.ZOOM_WEBHOOK_SECRET_TOKEN!)
    .update(message)
    .digest('hex');
  return `v0=${hash}` === signature;
}

// Webhook Event Router
type ZoomEventHandler = {
  readonly 'meeting.participant_joined': (data: ParticipantEvent) => Promise<void>;
  readonly 'meeting.participant_left': (data: ParticipantEvent) => Promise<void>;
  readonly 'meeting.ended': (data: MeetingEndedEvent) => Promise<void>;
  readonly 'recording.completed': (data: RecordingEvent) => Promise<void>;
};

interface ParticipantEvent {
  readonly object: {
    readonly id: string;
    readonly uuid: string;
    readonly participant: {
      readonly user_id: string;
      readonly user_name: string;
      readonly email: string;
      readonly join_time: string;
      readonly leave_time?: string;
    };
  };
}

interface MeetingEndedEvent {
  readonly object: {
    readonly id: string;
    readonly uuid: string;
    readonly topic: string;
    readonly start_time: string;
    readonly end_time: string;
    readonly duration: number;
  };
}
```

#### 21.2.3 参加マイル計算エンジン

```typescript
// services/zoom-mile-calculator.ts
interface ZoomMileResult {
  readonly userId: string;
  readonly meetingId: string;
  readonly breakdown: {
    readonly attendanceMiles: number;    // 参加時間マイル
    readonly pollMiles: number;          // Poll正答マイル
    readonly qaMiles: number;            // Q&A貢献マイル
    readonly breakoutMiles: number;      // BR参加マイル
    readonly surveyMiles: number;        // アンケート回答マイル
    readonly totalMiles: number;
  };
}

function calculateAttendanceMiles(
  durationMinutes: number,
  meetingDurationMinutes: number
): number {
  if (durationMinutes < 30) return 0;
  if (durationMinutes >= meetingDurationMinutes * 0.9) return 150; // 全時間
  if (durationMinutes >= 60) return 100;
  return 50; // 30-59分
}

function calculatePollMiles(
  pollResults: readonly PollAnswer[],
  correctAnswers: ReadonlyMap<string, string>
): number {
  let miles = pollResults.length > 0 ? 10 : 0; // 参加ボーナス
  let correctCount = 0;

  for (const answer of pollResults) {
    if (correctAnswers.get(answer.questionId) === answer.answer) {
      miles += 20;
      correctCount++;
    }
  }

  if (correctCount === correctAnswers.size && correctAnswers.size > 0) {
    miles += 50; // 全問正解ボーナス
  }

  return miles;
}
```

#### 21.2.4 Zoom Report APIクライアント

```typescript
// lib/integrations/zoom-client.ts
class ZoomClient {
  private readonly auth: ZoomAuth;
  private readonly baseUrl = 'https://api.zoom.us/v2';

  async getMeetingParticipants(meetingId: string): Promise<readonly ZoomParticipant[]> {
    return this.get(`/report/meetings/${meetingId}/participants`);
  }

  async getMeetingPolls(meetingId: string): Promise<ZoomPollReport> {
    return this.get(`/report/meetings/${meetingId}/polls`);
  }

  async getMeetingQA(meetingId: string): Promise<ZoomQAReport> {
    return this.get(`/report/meetings/${meetingId}/qa`);
  }

  async getMeetingSurveys(meetingId: string): Promise<ZoomSurveyReport> {
    return this.get(`/report/meetings/${meetingId}/surveys`);
  }

  async getMeetingRecordings(meetingId: string): Promise<ZoomRecordingList> {
    return this.get(`/meetings/${meetingId}/recordings`);
  }

  async getMeetingSummary(meetingId: string): Promise<ZoomMeetingSummary> {
    return this.get(`/meetings/${meetingId}/meeting_summary`);
  }

  async createMeeting(userId: string, params: CreateMeetingParams): Promise<ZoomMeeting> {
    return this.post(`/users/${userId}/meetings`, params);
  }

  private async get<T>(path: string): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Zoom API error: ${res.status}`);
    return res.json();
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    const token = await this.auth.getAccessToken();
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Zoom API error: ${res.status}`);
    return res.json();
  }
}
```

### 21.3 データベース拡張設計

```sql
-- ChatWork連携テーブル
CREATE TABLE chatwork_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  chatwork_account_id BIGINT NOT NULL UNIQUE,
  chatwork_name TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE chatwork_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  room_id BIGINT NOT NULL,
  message_id TEXT NOT NULL UNIQUE,
  activity_type TEXT NOT NULL, -- 'message', 'reply', 'mention', 'task_complete', 'file_share'
  metadata JSONB DEFAULT '{}',
  miles_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chatwork_activity_user_date
  ON chatwork_activity_logs(user_id, created_at DESC);

-- Zoom連携テーブル
CREATE TABLE zoom_user_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  zoom_email TEXT NOT NULL UNIQUE,
  zoom_user_id TEXT,
  verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zoom_meeting_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  zoom_meeting_id TEXT NOT NULL,
  zoom_meeting_uuid TEXT NOT NULL UNIQUE,
  topic TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  event_id UUID REFERENCES events(id),
  recording_url TEXT,
  summary TEXT,
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'in_progress', 'ended'
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE zoom_participation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  meeting_record_id UUID NOT NULL REFERENCES zoom_meeting_records(id),
  join_time TIMESTAMPTZ NOT NULL,
  leave_time TIMESTAMPTZ,
  duration_minutes INTEGER,
  joined_breakout BOOLEAN DEFAULT false,
  poll_correct_count INTEGER DEFAULT 0,
  poll_total_count INTEGER DEFAULT 0,
  qa_question_count INTEGER DEFAULT 0,
  qa_answer_count INTEGER DEFAULT 0,
  survey_completed BOOLEAN DEFAULT false,
  miles_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, meeting_record_id)
);

CREATE INDEX idx_zoom_participation_user
  ON zoom_participation_logs(user_id, created_at DESC);

-- 見逃し配信視聴追跡
CREATE TABLE recording_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  meeting_record_id UUID NOT NULL REFERENCES zoom_meeting_records(id),
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  progress_percent INTEGER DEFAULT 0,
  miles_awarded INTEGER DEFAULT 0,
  UNIQUE(user_id, meeting_record_id)
);
```

### 21.4 n8nワークフロー設計

#### 21.4.1 デプロイ構成

```yaml
# docker-compose.n8n.yml
services:
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=${N8N_USER}
      - N8N_BASIC_AUTH_PASSWORD=${N8N_PASSWORD}
      - N8N_HOST=${N8N_HOST}
      - N8N_PROTOCOL=https
      - WEBHOOK_URL=https://${N8N_HOST}/
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=${DB_HOST}
      - DB_POSTGRESDB_DATABASE=n8n
    volumes:
      - n8n_data:/home/node/.n8n
    restart: unless-stopped

volumes:
  n8n_data:
```

#### 21.4.2 ワークフロー定義

```
ワークフロー1: グルコン自動管理
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
トリガー: Zoom Webhook (meeting.ended)
  → Code Node: 参加者データ整形
  → HTTP Request: Zoom Report API（参加者・Poll・Q&A取得）
  → Code Node: マイル計算エンジン
  → Supabase Node: mile_transactions 一括INSERT
  → Supabase Node: zoom_participation_logs INSERT
  → Code Node: ChatWork通知メッセージ生成
  → HTTP Request: ChatWork API（結果通知送信）

ワークフロー2: ChatWork活動量日次集計
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
トリガー: Schedule (毎日 23:00 JST)
  → HTTP Request: ChatWork API（全ルームのメッセージ取得）
  → Code Node: メンバー別投稿数・返信数・メンション数集計
  → Code Node: マイル計算（日次上限チェック含む）
  → Supabase Node: chatwork_activity_logs 一括INSERT
  → Supabase Node: mile_transactions INSERT
  → Code Node: 日次ランキング生成
  → HTTP Request: ChatWork API（ランキング投稿）

ワークフロー3: 見逃し配信自動公開
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
トリガー: Zoom Webhook (recording.completed)
  → HTTP Request: Zoom API（レコーディングURL取得）
  → Supabase Node: zoom_meeting_records.recording_url UPDATE
  → Code Node: ChatWork通知メッセージ生成
  → HTTP Request: ChatWork API（通知送信）

ワークフロー4: 週次レポート自動生成
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
トリガー: Schedule (毎週月曜 9:00 JST)
  → Supabase Node: 週間集計クエリ
  → Code Node: レポート生成（Top10・活動統計・グルコン参加率）
  → HTTP Request: ChatWork API（全体チャットへ投稿）
```

### 21.5 セキュリティ設計

#### 21.5.1 Webhook認証

| Webhook | 検証方法 | 実装 |
|---------|---------|------|
| ChatWork | Token検証 | `X-ChatWorkWebhookSignature` ヘッダーをHMAC-SHA256で検証 |
| Zoom | Signature検証 | `x-zm-signature` ヘッダーを `v0:timestamp:body` のHMAC-SHA256で検証 |

#### 21.5.2 API認証情報管理

| サービス | 認証方式 | 保管場所 |
|---------|---------|---------|
| ChatWork | API Token | Vercel Environment Variables (encrypted) |
| Zoom | OAuth 2.0 Server-to-Server | Vercel Environment Variables (encrypted) |
| n8n | Basic Auth + HTTPS | Docker secrets |

#### 21.5.3 レート制限対策

| API | 制限 | 対策 |
|-----|------|------|
| ChatWork | 300 req/5min | n8nで集約実行、個別API呼び出し最小化 |
| Zoom | 30 req/sec (Heavy) / 100 req/sec (Medium) | Report APIは会議終了後にバッチ実行 |

### 21.6 環境変数一覧

```env
# ChatWork
CHATWORK_API_TOKEN=xxxxxxxxxxxx
CHATWORK_WEBHOOK_TOKEN=xxxxxxxxxxxx
CHATWORK_BOT_ROOM_IDS=123456789,987654321
CHATWORK_ANNOUNCE_ROOM_ID=123456789

# Zoom
ZOOM_CLIENT_ID=xxxxxxxxxxxx
ZOOM_CLIENT_SECRET=xxxxxxxxxxxx
ZOOM_ACCOUNT_ID=xxxxxxxxxxxx
ZOOM_WEBHOOK_SECRET_TOKEN=xxxxxxxxxxxx

# n8n
N8N_HOST=n8n.example.com
N8N_USER=admin
N8N_PASSWORD=xxxxxxxxxxxx
N8N_WEBHOOK_SECRET=xxxxxxxxxxxx
```

---

## 変更履歴

| バージョン | 日付 | 変更者 | 変更内容 |
|-----------|------|--------|---------|
| 1.0.0 | 2026-02-08 | AI | 初版作成 |
| 2.0.0 | 2026-02-08 | AI | 技術スタック修正、セキュリティ強化、リアルタイム設計変更 |
| 3.0.0 | 2026-02-08 | AI | ChatWork連携（Bot・活動計測・メッセージ解析）、Zoom連携（参加追跡・Poll・Q&A・録画）、n8nワークフロー自動化、DB拡張設計、Webhook/APIエンドポイント追加 |
