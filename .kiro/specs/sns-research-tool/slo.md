# SLO/SLI/SLA: sns-research-tool

> Google SREに基づく信頼性目標定義。SNSリサーチ分析ツールの運用可能性を定量的に保証。

## 1. 概要

| 項目 | 値 |
|------|-----|
| 対象サービス | SNS Research Tool |
| 定義日 | 2026-02-03 |
| レビュー周期 | 四半期 |
| 次回レビュー | 2026-05-03 |

## 2. SLI（Service Level Indicators）

### 2.1 可用性（Availability）

| SLI | 定義 | 測定方法 | 目標値 |
|-----|------|---------|--------|
| **リクエスト成功率** | 2xx/3xx レスポンスの割合 | `success_requests / total_requests * 100` | >= 99.5% |
| **ヘルスチェック成功率** | /health 200応答の割合 | Synthetic monitoring (1min間隔) | >= 99.9% |

**計測クエリ（Prometheus）**:
```promql
# 可用性（5分間）
sum(rate(http_requests_total{status=~"2..|3.."}[5m]))
/
sum(rate(http_requests_total[5m]))
* 100
```

### 2.2 レイテンシ（Latency）

| SLI | 定義 | 測定方法 | 目標値 |
|-----|------|---------|--------|
| **P50 レイテンシ** | 50パーセンタイル応答時間 | `histogram_quantile(0.50, ...)` | < 200ms |
| **P95 レイテンシ** | 95パーセンタイル応答時間 | `histogram_quantile(0.95, ...)` | < 1000ms |
| **P99 レイテンシ** | 99パーセンタイル応答時間 | `histogram_quantile(0.99, ...)` | < 3000ms |
| **ダッシュボード初期表示** | First Contentful Paint | RUM / Lighthouse | < 3000ms |

**計測クエリ（Prometheus）**:
```promql
# P99レイテンシ
histogram_quantile(0.99,
  sum(rate(http_request_duration_seconds_bucket[5m])) by (le)
)
```

### 2.3 エラー率（Error Rate）

| SLI | 定義 | 測定方法 | 目標値 |
|-----|------|---------|--------|
| **HTTPエラー率** | 5xx レスポンスの割合 | `error_requests / total_requests * 100` | < 0.5% |
| **データ取得成功率** | SNS APIジョブ成功率 | `successful_jobs / total_jobs * 100` | >= 99% |
| **レポート生成成功率** | レポート完了率 | `completed_reports / requested_reports * 100` | >= 99% |

### 2.4 スループット（Throughput）

| SLI | 定義 | 測定方法 | 目標値 |
|-----|------|---------|--------|
| **同時接続ユーザー** | アクティブセッション数 | WebSocket/Session count | <= 50 |
| **レポート生成時間** | リクエストから完了まで | ジョブキュー計測 | < 60sec |

## 3. SLO（Service Level Objectives）

### 3.1 SLO定義

| ID | SLI | SLO Target | 測定期間 | Error Budget |
|----|-----|------------|---------|--------------|
| SLO-001 | 可用性 | >= 99.5% | 30日間 | 0.5% = 3.6時間/月 |
| SLO-002 | P99レイテンシ | < 3000ms | 30日間 | - |
| SLO-003 | P95レイテンシ | < 1000ms | 30日間 | - |
| SLO-004 | HTTPエラー率 | < 0.5% | 30日間 | 0.5% |
| SLO-005 | データ取得成功率 | >= 99% | 30日間 | 1% |
| SLO-006 | ダッシュボード表示 | < 3000ms | 30日間 | - |

### 3.2 Error Budget計算

```
Error Budget = 100% - SLO Target

例: SLO 99.5% の場合
- Error Budget = 0.5%
- 30日間 = 43,200分
- 許容ダウンタイム = 43,200 × 0.5% = 216分 = 3.6時間
```

| SLO | Target | Error Budget（30日） | Error Budget（1年） |
|-----|--------|---------------------|---------------------|
| 99.9% | 0.1% | 43分 | 8.7時間 |
| **99.5%** | **0.5%** | **216分（3.6時間）** | **43.8時間** |
| 99.0% | 1.0% | 432分（7.2時間） | 87.6時間 |

### 3.3 SLO ダッシュボード

**Grafana Panel設定例**:
```json
{
  "title": "SNS Research Tool - SLO Dashboard",
  "panels": [
    {
      "title": "Availability (30d)",
      "type": "gauge",
      "targets": [
        {
          "expr": "sum(rate(http_requests_total{status=~\"2..|3..\",app=\"sns-research\"}[30d])) / sum(rate(http_requests_total{app=\"sns-research\"}[30d])) * 100"
        }
      ],
      "thresholds": {
        "mode": "absolute",
        "steps": [
          {"color": "red", "value": 99.0},
          {"color": "yellow", "value": 99.5},
          {"color": "green", "value": 99.9}
        ]
      }
    },
    {
      "title": "P99 Latency",
      "type": "stat",
      "targets": [
        {
          "expr": "histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{app=\"sns-research\"}[5m])) by (le)) * 1000"
        }
      ],
      "unit": "ms"
    },
    {
      "title": "Error Budget Remaining",
      "type": "gauge",
      "targets": [
        {
          "expr": "(1 - ((1 - sum(rate(http_requests_total{status=~\"2..|3..\",app=\"sns-research\"}[30d])) / sum(rate(http_requests_total{app=\"sns-research\"}[30d]))) / 0.005)) * 100"
        }
      ]
    }
  ]
}
```

## 4. SLA（Service Level Agreement）

> SLAは顧客との契約。SLOより緩く設定し、バッファを持たせる。

### 4.1 SLA定義

| 項目 | SLA保証 | ペナルティ |
|------|--------|-----------|
| 可用性 | >= 99.0%/月 | 下回った場合、月額の10%クレジット |
| 計画メンテナンス | 月4時間以内 | 超過1時間ごとに5%クレジット |
| インシデント初動 | P1: 15分以内 | 超過で1%クレジット |
| インシデント解決 | P1: 4時間以内 | 超過で5%クレジット |

### 4.2 除外事項

以下はSLA計算から除外:
- 計画メンテナンス（事前通知48時間以上）
- 顧客起因の障害（API誤用、過剰リクエスト）
- 不可抗力（天災、法規制）
- 第三者サービス障害（AWS、X API、Instagram API等）

## 5. Error Budget Policy

### 5.1 消費率に応じたアクション

| Error Budget消費 | ステータス | アクション |
|-----------------|-----------|-----------|
| 0-50% | 🟢 Healthy | 通常開発継続、新機能リリース可 |
| 50-75% | 🟡 Warning | リスク高い変更は保留、監視強化 |
| 75-100% | 🟠 Critical | 新機能開発停止、信頼性改善優先 |
| 100%+ | 🔴 Exhausted | インシデント対応モード、緊急修正のみ |

### 5.2 アラート設定

```yaml
# Prometheus Alerting Rules
groups:
  - name: sns-research-slo-alerts
    rules:
      # Error Budget Burn Rate (1時間で1日分消費)
      - alert: ErrorBudgetBurnRateHigh
        expr: |
          (1 - (
            sum(rate(http_requests_total{status=~"2..|3..",app="sns-research"}[1h]))
            /
            sum(rate(http_requests_total{app="sns-research"}[1h]))
          )) > (0.005 / 24)
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error budget burning at 24x rate"
          description: "At this rate, monthly error budget will be exhausted in 1 day"

      # SLO Violation (30日で99.5%未満)
      - alert: SLOViolation
        expr: |
          (
            sum(rate(http_requests_total{status=~"2..|3..",app="sns-research"}[30d]))
            /
            sum(rate(http_requests_total{app="sns-research"}[30d]))
          ) < 0.995
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "SLO violation: availability below 99.5%"

      # P99 Latency High
      - alert: P99LatencyHigh
        expr: |
          histogram_quantile(0.99,
            sum(rate(http_request_duration_seconds_bucket{app="sns-research"}[5m])) by (le)
          ) > 3
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "P99 latency exceeds 3 seconds"

      # Data Fetch Job Failure Rate
      - alert: DataFetchJobFailureRateHigh
        expr: |
          (
            sum(rate(job_failed_total{app="sns-research",job_type="data_fetch"}[1h]))
            /
            sum(rate(job_total{app="sns-research",job_type="data_fetch"}[1h]))
          ) > 0.01
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Data fetch job failure rate exceeds 1%"
```

## 6. 測定・レポート

### 6.1 日次レポート（自動生成）

- Error Budget残量（%）
- 前日のSLI値（可用性、P99、エラー率）
- インシデント発生有無
- データ取得ジョブ成功率

### 6.2 週次レビュー

- SLI/SLOトレンド分析
- Error Budget消費率推移
- 改善アクション進捗
- 来週のリリース計画とリスク評価

### 6.3 月次レポート

- SLO達成状況（達成/未達成）
- Error Budget消費内訳（インシデント別）
- 根本原因分析（RCA）サマリー
- 次月の改善計画
- SLA準拠状況

## 7. 関連要件（requirements.md参照）

以下の要件がSLOに直接関連:

| 要件ID | 内容 | 関連SLO |
|--------|------|---------|
| REQ-901 | ダッシュボード3秒以内表示 | SLO-006 |
| REQ-902 | 月間可用性99.5%以上 | SLO-001 |
| REQ-903 | データ2年間保持 | - |
| REQ-904 | 50名同時接続対応 | - |
| REQ-OPS-001 | 5xxエラー10回/5分でアラート | SLO-004 |

## 8. 関連ドキュメント

- [requirements.md](./requirements.md) - 非機能要件
- [runbook.md](./runbook.md) - インシデント対応
- [design.md](./design.md) - 可観測性設計
- [threat-model.md](./threat-model.md) - セキュリティSLI
