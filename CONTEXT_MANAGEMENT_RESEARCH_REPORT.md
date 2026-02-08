# Claude Code コンテキストウィンドウ枯渇問題 - 包括的調査レポート

**調査日**: 2026-02-08
**調査範囲**: 世界中のSNS、論文、コミュニティ、MCPマーケット、スキルマーケット、Apifyストア、Redditなど
**調査エージェント数**: 6並列エージェント

---

## 1. 問題の根本原因分析

### 今回発生した問題
- 大規模実装タスクを1セッションで実行しようとした
- 5つ以上のバックグラウンドエージェントが大量の出力を返した
- エージェント出力がメインコンテキストに蓄積
- `/compact`実行時には既に手遅れ（`Conversation too long`エラー）

### 構造的な問題
1. **CLAUDE_AUTOCOMPACT_PCT_OVERRIDE未設定**: デフォルト95%では手遅れ
2. **MCPツール定義のトークン消費**: 起動時に66,000+トークン消費（全体の33%）
3. **エージェント出力の非圧縮**: サブエージェントの出力がそのままコンテキストに追加
4. **フェーズ間の未コンパクション**: 探索→実装の境界でcompactされない
5. **strategic-compactスキルの致命的バグ**: `$$`（PID）がフック呼び出しごとに変わり、カウンターが機能しない

---

## 2. 発見された解決策（優先度順）

### Tier 1: 即座に適用すべき対策（予防的）

#### A. 環境変数 `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- **効果**: 自動コンパクションを70%で発動（デフォルト95%→70%）
- **実装**: `export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70`
- **出典**: Anthropic公式ドキュメント

#### B. Tool Search有効化（MCP遅延読み込み）
- **効果**: 起動時トークン 66,000 → 8,500（**87%削減**）、実行時46.9%削減
- **実装**: Claude Code設定で有効化
- **出典**: [Medium - Joe Njenga](https://medium.com/@joe.njenga/claude-code-just-cut-mcp-context-bloat-by-46-9-51k-tokens-down-to-8-5k-with-new-tool-search-ddf9e905f734)

#### C. セッション分割ルール
- **効果**: 1セッション=1フェーズを徹底
- **ルール**:
  - 探索/計画フェーズ → compact → 実装フェーズ
  - 各フェーズ完了時に必ず`/compact`
  - 70%到達で自動アラート
- **出典**: [claudefa.st](https://claudefa.st/blog/guide/mechanics/context-management)

#### D. サブエージェント活用の最適化
- **効果**: メインコンテキストの汚染防止
- **ルール**:
  - 重い処理はすべてサブエージェントに委譲
  - サブエージェントは要約のみを返す
  - メインは最終結果の統合のみ担当
- **出典**: Anthropic公式ドキュメント、[blog.sshh.io](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)

### Tier 2: MCP/スキルで強化する対策

#### E. Praetorian MCP Server
- **効果**: 90%+のトークン節約（TOON形式圧縮）
- **GitHub**: https://github.com/vvkmnn/claude-praetorian-mcp
- **Stars**: 25
- **機能**: `praetorian_compact`と`praetorian_restore`でコンテキスト圧縮・復元

#### F. Claude Gateway MCP Server
- **効果**: MCP初期ロードトークンを95%削減
- **機能**: 3つの基本ツールのみ初期ロード、必要時に動的ロード

#### G. Claude Historian MCP Server
- **効果**: 過去セッション検索で再調査不要
- **GitHub**: https://github.com/vvkmnn/claude-historian-mcp
- **Stars**: 217
- **機能**: 過去のソリューション、エラー解決、ツール使用パターンの検索

#### H. MCP Memory Keeper
- **効果**: セッション間の永続的コンテキスト管理
- **GitHub**: https://github.com/mkreyman/mcp-memory-keeper
- **機能**: SQLite永続ストレージ、マルチセッション共有メモリ

#### I. Context Portal MCP Server
- **効果**: プロジェクト固有のナレッジグラフ+RAG
- **機能**: ベクトル埋め込みによるセマンティック検索

### Tier 3: ワークフロー改善

#### J. CLAUDE.mdの最適化
- **効果**: 起動時コンテキスト消費を最小化
- **ルール**: 5,000トークン以下に制限
- **手法**: 詳細情報はdocs/に分離、必要時のみ読み込み

#### K. `/context`コマンドによるモニタリング
- **効果**: リアルタイムでトークン消費を把握
- **手法**: フェーズ切り替え前に必ず実行

#### L. フェーズベース実装パターン
```
Phase 1: 計画（compact後に開始）
  → /compact
Phase 2: 基盤構築（compact後に開始）
  → /compact
Phase 3: 機能実装（compact後に開始）
  → /compact
Phase 4: テスト（compact後に開始）
  → /compact
Phase 5: デプロイ
```

---

## 3. taisun_agentリポジトリの現状分析

### 全リポジトリ一覧（taiyousan15アカウント）
- **taisun_agent**: 84エージェント、21フック、36MCPサーバー
  - 総合監査スコア: 88/100
  - hierarchical-memoryスキル保有（Mem0研究ベース）
  - workflow-sessionstart-injector.js: セッション開始時の状態注入
  - session-handoff-generator.js: セッション終了時のハンドオフ
  - context-monitor.js: コンテキスト監視フック
  - **問題**: Tool Search未適用（MCP遅延読み込み未設定）

- **taisun**: マーケティング自動化システム
  - 10スキル（コピーライティング系）
  - コンテキスト管理の設定なし

- **jsystem2026**: 現在のプロジェクト
  - コンテキスト管理の設定なし（今回修正対象）

### 共通の問題
1. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`がどのリポジトリにも設定されていない
2. `strategic-compact`スキルのカウンターバグが修正されていない
3. MCP Tool Searchが全リポジトリで未適用
4. セッション分割ルールが文書化されていない
5. CLAUDE.mdのサイズ制限が設定されていない

---

## 4. 調査ソース一覧

### 公式ドキュメント
- [Anthropic - Subagents](https://code.claude.com/docs/en/subagents)
- [Anthropic - Best Practices](https://code.claude.com/docs/en/best-practices)
- [Anthropic - Costs](https://code.claude.com/docs/en/costs)
- [Anthropic - Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows)

### コミュニティ・ブログ
- [claudefa.st - Context Management](https://claudefa.st/blog/guide/mechanics/context-management)
- [blog.sshh.io - How I Use Every Feature](https://blog.sshh.io/p/how-i-use-every-claude-code-feature)
- [aslamdoctor.com - 12 Proven Techniques](https://aslamdoctor.com/12-proven-techniques-to-save-tokens-in-claude-code/)
- [GitHub - ykdojo/claude-code-tips](https://github.com/ykdojo/claude-code-tips)（45 Tips）
- [Scott Spence - MCP Context Optimization](https://scottspence.com/posts/optimising-mcp-server-context-usage-in-claude-code)
- [artemgetmann Gist - Token Reduction Workflow](https://gist.github.com/artemgetmann/74f28d2958b53baf50597b669d4bce43)
- [Medium - Stop Wasting Tokens](https://medium.com/@jpranav97/stop-wasting-tokens-how-to-optimize-claude-code-context-by-60-bfad6fd477e5)

### 論文・リサーチ
- [JetBrains Research - Efficient Context Management (2025)](https://blog.jetbrains.com/research/2025/12/efficient-context-management/) - 50%+コスト削減
- [Mem0 Research Paper](https://arxiv.org/abs/2504.19413) - 26%精度向上、90%トークン削減
- [Getmaxim.ai - 9 Strategies](https://www.getmaxim.ai/articles/context-window-management-strategies-for-long-context-ai-agents-and-chatbots)

### MCPマーケット
- [mcpmarket.com](https://mcpmarket.com/ja) - 22関連MCPサーバー発見
- [skillsmp.com](https://skillsmp.com/ja) - 164,640+スキル

### Apifyストア
- [Apify Open Source](https://console.apify.com/store-search?category=OPEN_SOURCE) - 814 OSS Actors
- Apify MCP Server: Claude Code直接統合

### Reddit
- r/ClaudeAI: コンテキスト管理に関する複数のディスカッション
- サブエージェント活用、/compact戦略、CLAUDE.md最適化の議論

---

## 5. 推奨アクションプラン

### 即時対応（全リポジトリ共通）
1. `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` を全環境で設定
2. `strategic-compact`スキルのPIDバグ修正
3. セッション分割ルールをCLAUDE.mdに追加
4. MCP Tool Search有効化

### 短期対応（1週間以内）
5. Praetorian MCP Serverの導入
6. Claude Historian MCP Serverの導入
7. Context Monitor hookの全リポジトリ展開
8. CLAUDE.mdの5,000トークン制限適用

### 中期対応（1ヶ月以内）
9. Claude Gateway MCP Serverの導入（MCP遅延ロード）
10. MCP Memory Keeperの導入（永続コンテキスト）
11. Apify MCP Serverの統合（ドキュメント自動クロール）
12. hierarchical-memoryスキルの全リポジトリ展開

---

## 6. 追加発見: 高度な戦略（エージェント最終報告より）

### Git Worktreeによる並列インスタンス
- 1つのリポジトリから複数ブランチを別ディレクトリにチェックアウト
- 各worktreeで独立したClaude Codeセッションを実行
- 各インスタンスが独自の200Kコンテキストウィンドウを持つ
- **出典**: [incident.io](https://incident.io/blog/shipping-faster-with-claude-code-and-git-worktrees)

### context: fork（スキルのサブエージェント実行）
- Claude Code 2.1の新機能
- スキルのフロントマターに`context: fork`を追加
- スキルが独立したサブエージェントとして実行
- 親コンテキストに内部推論が一切入らない
- **出典**: [Claude Code Skills Docs](https://code.claude.com/docs/en/skills)

### Double-Escape チェックポイント戦略
- `Esc+Esc`でコンテキストの豊富なチェックポイントに戻れる
- **トークンを消費せずに**戻れる（重要！）
- 3つのリワインドモード: 会話のみ / コードのみ / 両方
- **出典**: [Checkpointing Docs](https://code.claude.com/docs/en/checkpointing)

### Agent Teams（実験的機能）
- `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`で有効化
- リードエージェントがチームメイトを生成
- 各メイトが独立コンテキストとgit worktreeで動作
- **出典**: [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams)

### .claudeignoreファイル
- node_modules, build, distなどをインデックスから除外
- 不要なファイル読み込みによるトークン消費を防止

### TOP 10 最重要テクニック（コミュニティ総合）
1. 無関係タスク間で`/clear`を使用
2. 50-70%容量でプロアクティブに`/compact`実行
3. リサーチをサブエージェントに委任
4. MCP Tool Searchを有効化（46.9%削減）
5. CLAUDE.mdを5Kトークン以下に維持
6. 調査範囲を具体的に指定
7. Document & Clearパターン使用
8. `/context`コマンドでモニタリング
9. 未使用MCPサーバーを無効化
10. チェックポイント（Esc+Esc）を活用
