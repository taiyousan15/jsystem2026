# ADR-002: センチメント分析エンジン選定

## ステータス
Proposed

## 日付
2026-02-03

## コンテキスト

SNS投稿のセンチメント分析（感情分析）を実装する必要がある。日本語・英語の投稿テキストを Positive/Negative/Neutral に分類する（REQ-009）。

### 要件
- 日本語・英語対応
- スコア: -1.0（Negative）〜 1.0（Positive）
- 分類: Positive (>=0.5), Negative (<=-0.5), Neutral (-0.5〜0.5)
- バッチ処理対応（大量投稿の一括分析）

### 制約
- 月間コスト予算: $500以下
- レイテンシ: 1投稿あたり1秒以内
- プライバシー: 外部APIへのデータ送信許容（SNS投稿は公開データ）

## 検討した選択肢

| 選択肢 | 日本語 | コスト | 精度 | 運用負荷 |
|--------|--------|--------|------|---------|
| **OpenAI API (GPT-4o-mini)** | ✅ 優秀 | $0.15/1M tokens | 高 | 低 |
| AWS Comprehend | ✅ 対応 | $0.0001/unit | 中 | 低 |
| Google Cloud NL | ✅ 対応 | $1/1K units | 高 | 低 |
| Hugging Face (自己ホスト) | ✅ 要モデル選定 | インフラ費用 | 中〜高 | 高 |

## 決定

**Phase 1: AWS Comprehend**（初期リリース）
**Phase 2: OpenAI API (GPT-4o-mini) への移行検討**

## 理由

### Phase 1: AWS Comprehend
1. **コスト効率**: 大量バッチ処理に最適（$0.0001/unit）
2. **AWSネイティブ**: 既存インフラとの統合が容易
3. **日本語対応**: 標準で日本語センチメント分析対応
4. **運用負荷低**: マネージドサービス、スケーリング自動

### Phase 2: OpenAI API 検討理由
1. **高精度**: GPT系モデルはニュアンス理解に優れる
2. **柔軟性**: プロンプトで分析観点をカスタマイズ可能
3. **追加分析**: トピック抽出、要約も同時に可能

## 結果

### ポジティブ
- 初期コスト低く、早期リリース可能
- AWSサービス内で完結、ネットワークレイテンシ最小
- Comprehendで精度不足なら段階的にアップグレード可能

### ネガティブ
- Comprehendは文脈理解に限界あり（皮肉、スラング）
- 将来的にAPIクライアント追加実装が必要

### コスト試算
```
想定: 10アカウント × 100投稿/日 × 30日 = 30,000投稿/月

AWS Comprehend: 30,000 × $0.0001 = $3/月
OpenAI (参考): 30,000 × 100 tokens × $0.15/1M = $0.45/月
```

## 実装方針

```typescript
// センチメント分析サービスのインターフェース
interface SentimentAnalyzer {
  analyze(text: string): Promise<{
    score: number;      // -1.0 to 1.0
    label: 'Positive' | 'Negative' | 'Neutral';
    confidence: number; // 0.0 to 1.0
  }>;

  analyzeBatch(texts: string[]): Promise<SentimentResult[]>;
}

// 実装を切り替え可能に設計
class ComprehendAnalyzer implements SentimentAnalyzer { ... }
class OpenAIAnalyzer implements SentimentAnalyzer { ... }
```

## 関連
- 関連要件: REQ-009
- 関連タスク: TASK-014
