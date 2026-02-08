# Context Guard - Claude Code コンテキスト枯渇防止システム

Claude Code のコンテキストウィンドウ枯渇問題を防止する包括的な対策システムです。

## 問題

Claude Code で大規模タスクを実行すると、200K トークンのコンテキストウィンドウが枯渇し、`Conversation too long` エラーが発生します。

**主な原因:**
- 5つ以上のバックグラウンドエージェントが大量出力を返す
- デフォルトの自動コンパクション（95%）では手遅れ
- MCP ツール定義が起動時に 66,000+ トークン消費
- フェーズ間で `/compact` が実行されない

## 対策一覧

| # | 対策 | 効果 |
|---|------|------|
| 1 | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` | 70%で自動コンパクション発動（デフォルト95%） |
| 2 | strategic-compact スキル | 30 tool calls でコンパクション提案 |
| 3 | MCP Tool Search 有効化 | 起動時トークン 66K → 8.5K（87%削減） |
| 4 | Praetorian MCP Server | 90%+ トークン節約（TOON圧縮） |
| 5 | Claude Historian MCP | 過去セッション検索（再調査不要） |
| 6 | エージェント数監視フック | 同時3個超で警告 |
| 7 | CLAUDE.md サイズチェッカー | 20KB超で警告 |

## クイックインストール

```bash
git clone https://github.com/taiyousan15/jsystem2026.git
cd jsystem2026
bash context-guard/install.sh
```

## 手動インストール

### 1. 環境変数（必須）

```bash
# ~/.zshrc または ~/.bashrc に追加
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70
```

ターミナル再起動で反映。

### 2. スキルスクリプト

```bash
mkdir -p ~/.claude/skills/strategic-compact

# ツールコール数カウンター（30回で警告）
cp context-guard/skills/suggest-compact.sh ~/.claude/skills/strategic-compact/
chmod +x ~/.claude/skills/strategic-compact/suggest-compact.sh

# エージェント数監視（3個超で警告）
cp context-guard/skills/check-agent-count.sh ~/.claude/skills/strategic-compact/
chmod +x ~/.claude/skills/strategic-compact/check-agent-count.sh

# CLAUDE.md サイズチェック（20KB超で警告）
cp context-guard/skills/check-claudemd-size.sh ~/.claude/skills/strategic-compact/
chmod +x ~/.claude/skills/strategic-compact/check-claudemd-size.sh
```

### 3. MCP サーバー

```bash
# Praetorian（コンテキスト圧縮 90%+節約）
claude mcp add praetorian -- npx -y claude-praetorian-mcp

# Claude Historian（過去セッション検索）
claude mcp add claude-historian -- npx -y claude-historian-mcp
```

### 4. Hooks 設定

`~/.claude/hooks/hooks.json` の `PreToolUse` 配列に以下を追加:

```json
{
  "matcher": "tool == \"Task\"",
  "hooks": [
    {
      "type": "command",
      "command": "bash ~/.claude/skills/strategic-compact/check-agent-count.sh"
    }
  ],
  "description": "Warn when too many concurrent agents are launched"
}
```

## 運用ルール

### フェーズベース実装パターン

```
Phase 1: 計画・探索
  → /compact
Phase 2: 基盤構築
  → /compact
Phase 3: 機能実装
  → /compact
Phase 4: テスト
  → /compact
Phase 5: デプロイ
```

### 数値基準

| 項目 | 値 |
|------|-----|
| コンテキスト実用上限 | 70%（200Kの140K） |
| 自動コンパクション | 70%で発動 |
| ツールコール上限/フェーズ | 30回 |
| 同時バックグラウンドエージェント | 最大3個 |
| CLAUDE.md サイズ上限 | 5,000トークン（~20KB） |
| `/compact` タイミング | フェーズ完了時、60%到達時 |

### サブエージェントルール

- 重い処理はすべてサブエージェントに委譲
- サブエージェントは**要約のみ**を返す
- メインは最終結果の統合のみ担当
- `run_in_background: true` で独立実行

## ファイル構成

```
context-guard/
├── install.sh                    # ワンクリックインストーラー
├── skills/
│   ├── suggest-compact.sh        # ツールコール数カウンター
│   ├── check-agent-count.sh      # エージェント数監視
│   └── check-claudemd-size.sh    # CLAUDE.md サイズチェック
CONTEXT_MANAGEMENT_RESEARCH_REPORT.md  # 包括的調査レポート
README.md                         # このファイル
```

## 調査レポート

詳細な調査結果は [CONTEXT_MANAGEMENT_RESEARCH_REPORT.md](CONTEXT_MANAGEMENT_RESEARCH_REPORT.md) を参照:

- 世界中のSNS、論文、コミュニティからの調査結果
- MCP マーケット、スキルマーケット、Apify ストアの分析
- taisun_agent 全リポジトリの現状分析
- 22の対策手法（優先度順）
- TOP 10 コミュニティベストプラクティス

## アップデート

```bash
cd jsystem2026
git pull origin main
bash context-guard/install.sh
```

## 参考リンク

- [Anthropic - Subagents](https://code.claude.com/docs/en/subagents)
- [claudefa.st - Context Management](https://claudefa.st/blog/guide/mechanics/context-management)
- [Medium - Tool Search 46.9% Reduction](https://medium.com/@joe.njenga/claude-code-just-cut-mcp-context-bloat-by-46-9-51k-tokens-down-to-8-5k-with-new-tool-search-ddf9e905f734)
- [Praetorian MCP](https://github.com/vvkmnn/claude-praetorian-mcp)
- [Claude Historian MCP](https://github.com/vvkmnn/claude-historian-mcp)
