# Runbook: sns-research-tool

> インシデント対応手順書。SNSリサーチ分析ツールの障害発生時の対応手順を定義。

## 1. 概要

| 項目 | 値 |
|------|-----|
| 対象サービス | SNS Research Tool |
| オンコール | @sns-research-oncall |
| エスカレーション | @team-lead → @engineering-manager |
| 最終更新 | 2026-02-03 |

## 2. 連絡先

| 役割 | 担当 | 連絡先 | 備考 |
|------|------|--------|------|
| Primary On-call | - | Slack: #sns-research-oncall | 24/7 |
| Secondary On-call | - | Slack: #sns-research-oncall | バックアップ |
| Engineering Manager | - | 電話: 緊急連絡先 | SEV1のみ |
| SRE Lead | - | Slack: @sre-lead | インフラ問題 |
| Security Team | - | Slack: #security | セキュリティインシデント |

## 3. 重要リンク

| リソース | URL |
|---------|-----|
| ダッシュボード（Grafana） | https://grafana.example.com/d/sns-research |
| ログ（CloudWatch） | https://console.aws.amazon.com/cloudwatch/logs |
| アラート（PagerDuty） | https://pagerduty.example.com |
| ステータスページ | https://status.example.com |
| AWS Console | https://console.aws.amazon.com |
| GitHub Repository | https://github.com/example/sns-research-tool |
| CI/CD（GitHub Actions） | https://github.com/example/sns-research-tool/actions |

## 4. Severity定義

| Severity | 定義 | 初動目標 | 解決目標 | 例 |
|----------|------|---------|---------|-----|
| **SEV1** | サービス全停止、データ損失リスク | 15分 | 4時間 | 全ユーザー影響、DBダウン、APIキー漏洩 |
| **SEV2** | 主要機能停止、大規模影響 | 30分 | 8時間 | ログイン不可、レポート生成不可、50%以上影響 |
| **SEV3** | 一部機能停止、限定影響 | 1時間 | 24時間 | 特定SNS連携エラー、10%以下影響 |
| **SEV4** | 軽微な問題、ワークアラウンド可能 | 4時間 | 1週間 | UI不具合、パフォーマンス低下 |

## 5. 共通対応手順

### 5.1 初動対応（全Severity共通）

```
┌─────────────────────────────────────────────────────────────────┐
│ Step 1: アラート確認（1分以内）                                  │
├─────────────────────────────────────────────────────────────────┤
│ □ アラート内容を確認（PagerDuty/Slack）                         │
│ □ 影響範囲を推定（ユーザー数、機能）                             │
│ □ Severity判定（SEV1-4）                                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 2: コミュニケーション開始（5分以内）                        │
├─────────────────────────────────────────────────────────────────┤
│ □ #sns-research-incident チャンネルにスレッド作成               │
│ □ 「[SEVx] 障害発生: 概要」で投稿                               │
│ □ SEV1/2: 電話でエスカレーション                                │
│ □ ステータスページ更新（顧客影響あり）                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 3: 調査・緩和（並行実行）                                   │
├─────────────────────────────────────────────────────────────────┤
│ □ Grafanaダッシュボード確認                                     │
│ □ CloudWatchログ確認                                            │
│ □ 直近の変更確認（デプロイ、設定変更）                          │
│ □ 緩和策実行（ロールバック、スケールアウト等）                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 4: 復旧確認                                                 │
├─────────────────────────────────────────────────────────────────┤
│ □ SLI正常化を確認（可用性99.5%以上、P99<3s）                    │
│ □ 5分間安定を確認                                               │
│ □ ステータスページ更新（復旧）                                  │
│ □ インシデントスレッドクローズ                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Step 5: ポストモーテム（48時間以内）                             │
├─────────────────────────────────────────────────────────────────┤
│ □ タイムライン作成                                              │
│ □ 根本原因分析（RCA）                                           │
│ □ 改善アクション起票（GitHub Issue）                            │
│ □ レビュー会議開催（SEV1/2）                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 5.2 緊急コマンド集

```bash
# ECS タスク一覧確認
aws ecs list-tasks --cluster sns-research-prod --service-name api

# ECS タスク強制再起動
aws ecs update-service --cluster sns-research-prod --service api --force-new-deployment

# ECS ログ確認（直近100行）
aws logs tail /ecs/sns-research-api --follow --since 5m

# RDS 接続確認
psql -h sns-research-prod.xxxxx.ap-northeast-1.rds.amazonaws.com -U app -d sns_research -c "SELECT 1"

# Redis 接続確認
redis-cli -h sns-research-prod.xxxxx.cache.amazonaws.com ping

# デプロイロールバック（GitHub Actions）
gh workflow run rollback.yml -f version=previous

# CloudFront キャッシュ無効化
aws cloudfront create-invalidation --distribution-id XXXXX --paths "/*"
```

## 6. シナリオ別対応

### 6.1 高レイテンシ（P99 > 3秒）

**症状**: ダッシュボード表示が遅い、API応答遅延

**確認手順**:
```bash
# 1. どのエンドポイントが遅いか確認
aws logs filter-log-events \
  --log-group-name /ecs/sns-research-api \
  --filter-pattern "{ $.duration > 3000 }" \
  --start-time $(date -d '5 minutes ago' +%s000)

# 2. DB slow queryログ確認
aws rds describe-db-log-files --db-instance-identifier sns-research-prod

# 3. Redis メモリ確認
redis-cli -h xxx INFO memory
```

**緩和策**:
1. キャッシュ有効化確認・TTL短縮
2. DB接続プール増加（環境変数 `DB_POOL_SIZE`）
3. 外部APIタイムアウト短縮
4. ECSタスク数スケールアウト

### 6.2 高エラー率（5xx > 1%）

**症状**: API 500エラー、画面エラー表示

**確認手順**:
```bash
# 1. エラーログ確認
aws logs filter-log-events \
  --log-group-name /ecs/sns-research-api \
  --filter-pattern "{ $.level = \"error\" }" \
  --start-time $(date -d '5 minutes ago' +%s000)

# 2. エラー内訳（Grafana）
# クエリ: sum(rate(http_requests_total{status=~"5.."}[5m])) by (status, path)

# 3. 直近デプロイ確認
gh run list --workflow=deploy.yml --limit=5
```

**緩和策**:
1. エラー原因特定 → 該当機能無効化（Feature Flag）
2. ロールバック（直近デプロイ原因の場合）
3. サーキットブレーカー確認（外部API障害の場合）

### 6.3 SNS API連携エラー

**症状**: データ取得失敗、「API制限」エラー

**確認手順**:
```bash
# 1. ジョブステータス確認
redis-cli -h xxx LRANGE bull:data-fetch:failed 0 10

# 2. X API ステータス確認
curl -s https://api.twitterstat.us/api/v1/status

# 3. レート制限残量確認（ログ）
aws logs filter-log-events \
  --log-group-name /ecs/sns-research-worker \
  --filter-pattern "rate_limit_remaining"
```

**緩和策**:
1. レート制限到達 → 次回実行時刻まで待機（自動リトライ設計済み）
2. API障害 → ステータスページで告知、手動リトライボタン無効化
3. 認証エラー → APIキー再発行・再設定

### 6.4 DB接続障害

**症状**: "connection refused"、"too many connections"

**確認手順**:
```bash
# 1. RDS メトリクス確認（CloudWatch）
# - DatabaseConnections
# - CPUUtilization
# - FreeableMemory

# 2. アクティブ接続確認
psql -c "SELECT count(*) FROM pg_stat_activity;"

# 3. 長時間クエリ確認
psql -c "SELECT pid, now() - query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC LIMIT 10;"
```

**緩和策**:
1. アイドル接続強制切断
   ```sql
   SELECT pg_terminate_backend(pid) FROM pg_stat_activity
   WHERE state = 'idle' AND query_start < now() - interval '10 minutes';
   ```
2. ECSタスク再起動（コネクションプールリセット）
3. RDSインスタンスサイズ拡張（垂直スケール）

### 6.5 セキュリティインシデント

**症状**: 不正アクセス検知、APIキー漏洩疑い

**対応手順**:
```
⚠️ セキュリティチームに即時エスカレーション（SEV1扱い）

1. 影響範囲特定
   - 侵害されたアカウント/データの特定
   - 監査ログ(audit_logs)確認
   - CloudTrail確認（AWS操作）

2. 封じ込め
   - 該当ユーザーセッション無効化
   - APIキーローテーション（SNS API）
   - 必要に応じてサービス一時停止

3. 証拠保全
   - ログのS3バックアップ
   - DBスナップショット取得

4. 法務・広報連携（必要に応じて）
5. フォレンジック調査
```

## 7. ロールバック手順

### 7.1 アプリケーションロールバック

```bash
# 1. 現在のデプロイバージョン確認
aws ecs describe-services --cluster sns-research-prod --services api \
  | jq '.services[0].deployments[0].taskDefinition'

# 2. 前バージョンにロールバック（GitHub Actions）
gh workflow run rollback.yml -f version=previous

# または手動でタスク定義指定
aws ecs update-service \
  --cluster sns-research-prod \
  --service api \
  --task-definition sns-research-api:123  # 前バージョン

# 3. ロールバック状況確認
aws ecs describe-services --cluster sns-research-prod --services api \
  | jq '.services[0].deployments'
```

### 7.2 DBマイグレーションロールバック

```bash
# 1. 現在のマイグレーション状態確認
npx prisma migrate status

# 2. ダウンマイグレーション実行（事前に作成必要）
# ⚠️ 本番DBのロールバックは慎重に！必ずバックアップ取得後に実行

# RDSスナップショット取得
aws rds create-db-snapshot \
  --db-instance-identifier sns-research-prod \
  --db-snapshot-identifier pre-rollback-$(date +%Y%m%d-%H%M%S)

# ロールバック実行（手動SQL or Prismaダウンマイグレーション）
```

### 7.3 設定変更ロールバック

```bash
# 1. 環境変数変更のロールバック
# GitHub Secretsまたは Parameter Store から前の値を復元

# 2. ECSサービス更新
aws ecs update-service \
  --cluster sns-research-prod \
  --service api \
  --force-new-deployment
```

## 8. 確認チェックリスト

### 復旧確認チェックリスト

- [ ] エラー率 < 0.5% (5分間)
- [ ] P99レイテンシ < 3000ms (5分間)
- [ ] 可用性 >= 99.5%
- [ ] ヘルスチェック全パス (`/health` 200)
- [ ] データ取得ジョブ正常実行
- [ ] ユーザー報告なし（#support チャンネル）
- [ ] アラートなし（PagerDuty/Slack）

### インシデントクローズチェックリスト

- [ ] ステータスページ更新（解決）
- [ ] #sns-research-incident スレッドクローズ
- [ ] インシデントチケット更新（Jira/GitHub Issue）
- [ ] ポストモーテムスケジュール（SEV1/2: 48時間以内）
- [ ] 一時対応の恒久対応計画作成

## 9. 関連ドキュメント

- [slo.md](./slo.md) - SLO/SLI定義
- [design.md](./design.md) - システム構成
- [threat-model.md](./threat-model.md) - セキュリティ対応
- [requirements.md](./requirements.md) - 要件定義
