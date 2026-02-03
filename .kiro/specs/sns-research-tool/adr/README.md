# Architecture Decision Records (ADR)

> SNS Research Tool の技術決定記録。MADR形式で管理。

## 概要

本ディレクトリには、プロジェクトの重要な技術決定を記録したADRを格納します。

## ADR一覧

| ADR ID | タイトル | ステータス | 決定日 |
|--------|---------|-----------|--------|
| ADR-001 | フロントエンド/バックエンドフレームワーク選定 | Proposed | - |
| ADR-002 | センチメント分析エンジン選定 | Proposed | - |
| ADR-003 | データベース・キャッシュ選定 | Proposed | - |

## ステータス定義

| ステータス | 説明 |
|-----------|------|
| **Proposed** | 提案中、レビュー待ち |
| **Accepted** | 承認済み、実装可能 |
| **Deprecated** | 非推奨、新規採用禁止 |
| **Superseded** | 別のADRで置き換え済み |

## ADR作成方法

```bash
# スキルを使用
/sdd-adr "タイトル" sns-research-tool

# または手動作成
cp adr-template.md ADR-XXX-title.md
```

## ADRテンプレート

```markdown
# ADR-XXX: タイトル

## ステータス
Proposed

## コンテキスト
（背景・課題・制約）

## 決定
（選択した技術・方針）

## 理由
（選択理由、比較検討結果）

## 結果
（影響、トレードオフ）

## 関連
- 関連ADR: ADR-YYY
- 関連要件: REQ-ZZZ
```

## 関連ドキュメント

- [requirements.md](../requirements.md) - 要件定義
- [design.md](../design.md) - 技術設計（ADR参照箇所あり）
