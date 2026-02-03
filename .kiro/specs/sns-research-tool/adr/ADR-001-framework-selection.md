# ADR-001: フロントエンド/バックエンドフレームワーク選定

## ステータス
Accepted

## 日付
2026-02-03

## コンテキスト

SNSリサーチ分析ツールの開発において、フロントエンド・バックエンドのフレームワークを選定する必要がある。

### 要件
- ダッシュボード初期表示3秒以内（REQ-901）
- 同時接続50ユーザー対応（REQ-904）
- マルチユーザー認証・チーム機能（REQ-001, REQ-010）
- PDF/Excelレポート生成（REQ-007）

### 制約
- 開発チームはTypeScript/JavaScript経験者
- AWSインフラを使用
- 初期リリースまでの開発期間は限定的

## 検討した選択肢

### フロントエンド

| 選択肢 | メリット | デメリット |
|--------|---------|-----------|
| **Next.js 14** | SSR/SSG、App Router、Vercel連携、React Server Components | 学習コスト（App Router） |
| Remix | SSR、ローダー/アクション、Nested Routes | エコシステムが小さい |
| Vue/Nuxt | 直感的なAPI、学習コスト低 | チーム経験少ない |

### バックエンド

| 選択肢 | メリット | デメリット |
|--------|---------|-----------|
| **Express + TypeScript** | 軽量、エコシステム充実、柔軟 | 構造化が必要 |
| NestJS | 構造化、DI、デコレータ | 学習コスト、オーバーヘッド |
| Fastify | 高速、スキーマ検証 | Express互換性 |

## 決定

**フロントエンド: Next.js 14 (App Router)**
**バックエンド: Express + TypeScript**

## 理由

### Next.js 14
1. **Server Components**: ダッシュボードの初期表示高速化（REQ-901対応）
2. **App Router**: レイアウト共有、ローディングUI、エラーハンドリングが宣言的
3. **Vercel連携**: 開発・Stagingデプロイが容易
4. **チーム経験**: React経験者が多く、移行コスト低

### Express + TypeScript
1. **軽量**: ワーカージョブ（BullMQ）との統合が容易
2. **エコシステム**: Prisma、JWT、Zodとの連携実績豊富
3. **柔軟性**: プロジェクト構造を要件に合わせて設計可能
4. **デバッグ**: 薄い抽象化でトラブルシューティングが容易

## 結果

### ポジティブ
- フロント/バックでTypeScript統一、型定義共有可能
- Server Componentsでバンドルサイズ削減、初期表示高速化
- 豊富なライブラリ・ドキュメント

### ネガティブ
- App Routerの学習コスト（従来のPages Routerとの違い）
- Expressは構造化を自前で行う必要あり（Controller/Service/Repository）

### リスク緩和
- コーディング規約・ディレクトリ構造を事前定義（design.md参照）
- ESLint/Prettierで一貫性を強制

## 関連
- 関連要件: REQ-901, REQ-904
- 関連ADR: ADR-003（データベース選定）
