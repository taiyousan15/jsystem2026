# AI Agent Guardrails: sns-research-tool

> AIエージェント（Claude Code等）がSNSリサーチ分析ツール開発時に安全に動作するためのガードレール定義。

## 1. 概要

| 項目 | 値 |
|------|-----|
| 対象プロジェクト | SNS Research Tool |
| 定義日 | 2026-02-03 |
| バージョン | 1.0 |

## 2. Permission Boundaries（権限境界）

### 2.1 ファイルシステム

| パス | Read | Write | Delete | 理由 |
|------|------|-------|--------|------|
| `.kiro/specs/` | ✅ | ✅ | ❌ | 仕様ファイル管理 |
| `src/` | ✅ | ✅ | ✅ | ソースコード |
| `api/src/` | ✅ | ✅ | ✅ | APIソースコード |
| `web/src/` | ✅ | ✅ | ✅ | フロントエンドソースコード |
| `tests/` | ✅ | ✅ | ✅ | テストコード |
| `prisma/` | ✅ | ✅ | ❌ | スキーマ・マイグレーション |
| `docs/` | ✅ | ✅ | ❌ | ドキュメント |
| `.env` | ❌ | ❌ | ❌ | 機密情報 |
| `.env.*` | ❌ | ❌ | ❌ | 機密情報 |
| `secrets/` | ❌ | ❌ | ❌ | 機密情報 |
| `node_modules/` | ❌ | ❌ | ❌ | 依存関係（不要） |
| `dist/` | ❌ | ❌ | ❌ | ビルド成果物 |
| `~/.ssh/` | ❌ | ❌ | ❌ | SSH鍵 |
| `~/.aws/` | ❌ | ❌ | ❌ | AWS認証情報 |

### 2.2 コマンド実行

| カテゴリ | 許可 | ブロック | 備考 |
|---------|------|---------|------|
| **ビルド** | `npm run build`, `tsc`, `next build` | - | 常時許可 |
| **テスト** | `npm test`, `jest`, `playwright test` | - | 常時許可 |
| **Lint** | `npm run lint`, `eslint`, `prettier` | - | 常時許可 |
| **開発サーバー** | `npm run dev` | - | 常時許可 |
| **Prisma** | `prisma generate`, `prisma migrate dev` | `prisma migrate deploy` (本番) | 開発環境のみ |
| **Git (Read)** | `git status`, `git log`, `git diff` | - | 常時許可 |
| **Git (Write)** | `git add`, `git commit` | `git push --force`, `git reset --hard` | 危険操作はブロック |
| **Docker** | `docker-compose up`, `docker ps` | `docker rm -f`, `docker system prune` | 読み取り中心 |
| **DB (Dev)** | `psql` (localhost) | - | 開発DBのみ |
| **DB (Prod)** | - | すべて | 本番DB操作禁止 |
| **AWS CLI** | `aws s3 ls`, `aws logs` (Read) | `aws rds delete`, `aws ec2 terminate` | 読み取りのみ |
| **システム** | - | `rm -rf /`, `sudo`, `chmod 777` | 常時ブロック |

### 2.3 環境変数アクセス

| 変数パターン | アクセス | 理由 |
|-------------|---------|------|
| `NODE_ENV` | ✅ Read | 環境判定 |
| `DATABASE_URL` | ❌ | 本番DB接続情報 |
| `*_API_KEY` | ❌ | SNS APIキー |
| `*_SECRET` | ❌ | 秘密情報 |
| `JWT_*` | ❌ | JWT署名鍵 |
| `AWS_*` | ❌ | AWS認証情報 |

## 3. Resource Limits（リソース制限）

| リソース | 制限値 | 理由 |
|---------|--------|------|
| **最大実行時間** | 10分/タスク | 無限ループ防止 |
| **最大ファイルサイズ** | 10MB | メモリ保護 |
| **最大出力行数** | 1000行 | コンテキスト保護 |
| **最大API呼び出し** | 100回/タスク | レート制限 |
| **最大同時実行** | 5並列 | リソース保護 |
| **最大ファイル作成** | 50ファイル/タスク | ディスク保護 |

## 4. Human-in-the-Loop Gates（承認ゲート）

### 4.1 必須承認（常に人間の承認が必要）

| アクション | 理由 | 承認者 |
|-----------|------|--------|
| 本番デプロイ | 不可逆、影響大 | Tech Lead |
| DB本番書き込み | データ整合性 | DBA |
| APIキー設定変更 | セキュリティ | Security |
| `.env`ファイル編集 | 機密情報 | Tech Lead |
| 依存関係メジャーアップデート | 互換性リスク | Tech Lead |
| 大規模リファクタリング（10ファイル以上） | 品質リスク | Tech Lead |
| セキュリティ関連コード変更 | 脆弱性リスク | Security |

### 4.2 条件付き承認（特定条件で承認が必要）

| アクション | 条件 | 承認者 |
|-----------|------|--------|
| ファイル削除 | 5ファイル以上 | 開発者 |
| テストスキップ | `--no-verify` 使用時 | 開発者 |
| 外部API呼び出し | 新規エンドポイント | 開発者 |
| DBマイグレーション | スキーマ変更時 | 開発者 |
| npm install | 新規パッケージ追加時 | 開発者 |

### 4.3 自動許可（承認不要）

| アクション | 条件 |
|-----------|------|
| ソースコード編集 | `src/`, `api/src/`, `web/src/` 内 |
| テストコード編集 | `tests/`, `__tests__/` 内 |
| 仕様ドキュメント編集 | `.kiro/specs/` 内 |
| ビルド・テスト実行 | 常時 |
| Git status/log/diff | 常時 |
| Lintエラー修正 | 常時 |
| TypeScriptエラー修正 | 常時 |
| コメント・ドキュメント追加 | 常時 |

## 5. Audit Trail Requirements（監査証跡）

### 5.1 ログ必須項目

| イベント | 記録内容 | 保持期間 |
|---------|---------|---------|
| Tool呼び出し | ツール名、パラメータ、結果 | 30日 |
| ファイル変更 | パス、変更前後のハッシュ、diff | 90日 |
| 承認/却下 | アクション、判定、理由 | 1年 |
| エラー | エラー内容、スタックトレース | 30日 |
| セッション | 開始/終了時刻、タスク一覧 | 90日 |
| Git操作 | コミット、ブランチ操作 | 90日 |

### 5.2 ログフォーマット

```json
{
  "timestamp": "2026-02-03T10:30:00Z",
  "session_id": "sess_xxx",
  "event_type": "tool_call",
  "tool": "Edit",
  "parameters": {
    "file_path": "/src/services/analytics.ts",
    "operation": "replace"
  },
  "result": "success",
  "duration_ms": 150,
  "user": "claude-code",
  "approval": {
    "required": false
  }
}
```

### 5.3 セッションサマリー

各セッション終了時に自動生成:

```markdown
## Session Summary

- **Duration**: 45 minutes
- **Tasks Completed**: 5
- **Files Modified**: 12
- **Files Created**: 3
- **Tests Run**: 48 (all passed)
- **Approvals Requested**: 2 (2 approved)
- **Errors**: 0

### Changes Made
1. api/src/services/analytics.ts - Added engagement rate calculation
2. api/src/routes/analytics.ts - New endpoint for follower trends
3. tests/services/analytics.test.ts - Added unit tests
...

### Related Requirements
- REQ-005: フォロワー推移グラフ表示
- REQ-006: エンゲージメント率計算・表示
```

## 6. Error Handling（エラー処理）

### 6.1 エラー時の動作

| エラー種別 | 動作 | 通知 |
|-----------|------|------|
| 権限エラー（ファイルアクセス） | 即時停止、ユーザーに報告 | 必須 |
| リソース制限超過 | 即時停止、サマリー出力 | 必須 |
| 外部API障害（npm等） | リトライ(3回)、失敗時停止 | 任意 |
| ファイル不在 | スキップ、続行 | 任意 |
| TypeScriptエラー（生成コード） | 修正試行(3回)、失敗時停止 | 必須 |
| テスト失敗 | 停止、原因報告 | 必須 |

### 6.2 ロールバック

| 条件 | アクション |
|------|-----------|
| テスト失敗 | 変更を`git stash`で退避、報告 |
| ビルドエラー | 直前のコミットに戻す提案 |
| 承認却下 | 該当変更を破棄 |
| 複数ファイル変更後のエラー | 変更を個別に検証、問題箇所特定 |

## 7. Workflow Rules（ワークフロールール）

### 7.1 開発フェーズ制約

| フェーズ | 許可操作 | ブロック操作 |
|---------|---------|-------------|
| 要件定義 | `.kiro/specs/` 編集、リサーチ | コード実装 |
| 設計 | 設計ドキュメント、ADR作成 | コード実装 |
| 実装 | コード編集、テスト作成 | 本番デプロイ |
| テスト | テスト実行、バグ修正 | 新機能追加 |
| デプロイ | デプロイスクリプト実行 | コード変更（ホットフィックス除く） |

### 7.2 TDD強制ルール

```markdown
1. 新機能実装時:
   - テストファイル作成が先
   - テスト失敗確認（RED）
   - 実装（GREEN）
   - リファクタリング（REFACTOR）

2. バグ修正時:
   - 再現テスト作成が先
   - テスト失敗確認
   - 修正実装
   - テスト成功確認

3. カバレッジ要件:
   - 新規コード: 80%以上
   - 変更コード: 既存カバレッジ維持または向上
```

### 7.3 品質ゲート

| ゲート | 条件 | 次フェーズ移行 |
|--------|------|---------------|
| 要件承認 | C.U.T.E. >= 98 | 設計フェーズへ |
| 設計レビュー | 設計ドキュメント完備 | 実装フェーズへ |
| 実装完了 | テストカバレッジ >= 80%, 全テストパス | テストフェーズへ |
| テスト完了 | E2Eテストパス, 負荷テスト完了 | デプロイフェーズへ |
| セキュリティ | 脆弱性スキャン完了, 指摘事項修正 | 本番デプロイへ |

## 8. SNS Research Tool 固有ルール

### 8.1 SNS APIクライアント実装

```markdown
- レート制限ハンドリング必須
- エクスポネンシャルバックオフ実装必須
- APIキーは環境変数から取得（ハードコード禁止）
- レスポンスログにAPIキー/トークンを含めない
- モック/スタブを必ず用意（テスト用）
```

### 8.2 データ処理ルール

```markdown
- PII（メールアドレス等）のログ出力禁止
- センチメントスコアは-1.0〜1.0の範囲を強制
- 2年以上前のデータは自動削除対象（REQ-903）
- バッチジョブは冪等性を保証
```

### 8.3 フロントエンド実装

```markdown
- Server Components優先（Next.js App Router）
- クライアントサイドでのAPIキー露出禁止
- XSS対策: dangerouslySetInnerHTML禁止
- CSRF対策: トークン検証必須
```

## 9. 関連ドキュメント

- [CLAUDE.md](../../CLAUDE.md) - グローバルルール
- [requirements.md](./requirements.md) - 要件定義
- [threat-model.md](./threat-model.md) - 脅威モデル
- [design.md](./design.md) - 技術設計
- [tasks.md](./tasks.md) - 実装タスク
