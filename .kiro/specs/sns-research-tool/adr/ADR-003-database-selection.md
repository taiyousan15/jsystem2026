# ADR-003: データベース・キャッシュ選定

## ステータス
Accepted

## 日付
2026-02-03

## コンテキスト

SNSリサーチ分析ツールのデータ永続化層を選定する必要がある。

### データ特性
- ユーザー・チーム・アカウント: リレーショナル（1:N, N:N）
- フォロワーメトリクス: 時系列データ（日次蓄積、2年保持）
- 投稿データ: 半構造化（プラットフォームごとに異なるメタデータ）
- レポート: バイナリ（PDF/Excel）+ メタデータ

### 要件
- 2年間のデータ保持（REQ-903）
- 同時接続50ユーザー（REQ-904）
- 日次バッチ + オンデマンドクエリ
- トランザクション整合性（ユーザー・チーム管理）

### 制約
- AWSインフラ使用
- 初期コストを抑えたい
- 運用負荷を最小化（マネージドサービス優先）

## 検討した選択肢

### データベース

| 選択肢 | 適性 | コスト | 運用 | 備考 |
|--------|------|--------|------|------|
| **PostgreSQL (RDS)** | ◎ | 中 | 低 | JSONB、拡張性、実績 |
| MySQL (RDS) | ○ | 中 | 低 | JSON対応弱い |
| DynamoDB | △ | 変動 | 低 | リレーション苦手 |
| MongoDB Atlas | ○ | 中〜高 | 低 | スキーマ柔軟 |
| TimescaleDB | ◎ (時系列) | 高 | 中 | 時系列特化 |

### キャッシュ・キュー

| 選択肢 | 用途 | コスト | 運用 |
|--------|------|--------|------|
| **Redis (ElastiCache)** | キャッシュ + キュー | 中 | 低 |
| Memcached | キャッシュのみ | 低 | 低 |
| SQS | キューのみ | 低 | 低 |

## 決定

**データベース: PostgreSQL 15 (Amazon RDS)**
**キャッシュ/キュー: Redis 7 (Amazon ElastiCache)**

## 理由

### PostgreSQL 15
1. **JSONB**: 投稿メタデータの柔軟な保存（プラットフォーム差異吸収）
2. **リレーション**: ユーザー/チーム/アカウントの整合性保証
3. **時系列対応**: パーティショニング + インデックスで時系列クエリ高速化
4. **Prisma統合**: TypeScriptとの相性良好、マイグレーション管理
5. **実績**: 大規模システムでの実績豊富、トラブルシューティング情報多い

### Redis 7
1. **マルチユースケース**: セッション、APIキャッシュ、ジョブキュー（BullMQ）
2. **高速**: インメモリ、ダッシュボード表示高速化に貢献
3. **Pub/Sub**: 将来的なリアルタイム通知基盤
4. **ElastiCache**: マネージド、Multi-AZ、バックアップ自動

## 結果

### ポジティブ
- 単一DBで全データモデルをカバー（運用シンプル）
- JOINによる複雑な分析クエリが可能
- Redisで読み取り負荷をオフロード
- Prismaによる型安全なデータアクセス

### ネガティブ
- 大規模時系列データはTimescaleDBの方が効率的
- Write負荷が高くなった場合、Read Replica追加が必要

### リスク緩和
- パーティショニング: `follower_metrics` テーブルを月別パーティション
- インデックス: 高頻度クエリパターンに最適化したインデックス設計
- 監視: CloudWatch + pg_stat_statements でクエリ性能監視

## スキーマ設計方針

```sql
-- 時系列データのパーティショニング
CREATE TABLE follower_metrics (
    id UUID PRIMARY KEY,
    account_id UUID REFERENCES sns_accounts(id),
    recorded_date DATE NOT NULL,
    follower_count INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
) PARTITION BY RANGE (recorded_date);

-- 月別パーティション作成（自動化推奨）
CREATE TABLE follower_metrics_2026_01
    PARTITION OF follower_metrics
    FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

-- 高頻度クエリ用インデックス
CREATE INDEX idx_follower_metrics_account_date
    ON follower_metrics(account_id, recorded_date DESC);
```

## コスト試算（月額）

| リソース | スペック | コスト |
|---------|---------|--------|
| RDS PostgreSQL | db.t3.medium, Multi-AZ | ~$100 |
| ElastiCache Redis | cache.t3.micro, 1ノード | ~$15 |
| 合計 | - | ~$115/月 |

## 関連
- 関連要件: REQ-903, REQ-904
- 関連ADR: ADR-001（フレームワーク選定）
- 関連タスク: TASK-002
