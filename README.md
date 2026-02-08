# Context Guard v1.0

**Claude Code Context Exhaustion Prevention System** - コンテキストウィンドウ枯渇を防止する包括的な監視・圧縮・運用システム

---

![Node.js](https://img.shields.io/badge/Node.js-20.x%20%7C%2024.x-green) ![Shell](https://img.shields.io/badge/Shell-Bash%205.x-blue) ![MCP](https://img.shields.io/badge/MCP-2%20servers-purple) ![Hooks](https://img.shields.io/badge/Hooks-3%20monitors-orange) ![License](https://img.shields.io/badge/License-MIT-brightgreen)

---

> 2026-02-08: v1.0.0 Context Guard リリース - コンテキスト枯渇防止システム

世界中のSNS・論文・コミュニティ・MCPマーケットを網羅的に調査し、Claude Code のコンテキストウィンドウ枯渇問題に対する**9つの対策**を実装しました。

---

## 新機能

| 機能 | 説明 |
|------|------|
| 🛡️ 自動コンパクション | 70%到達で自動発動（デフォルト95%→70%） |
| 📊 ツールコール監視 | 30回で警告、80回で危険アラート |
| 🤖 エージェント数制御 | 同時3個超で警告表示 |
| 📏 CLAUDE.md サイズ監視 | 20KB超で自動警告 |
| 🗜️ Praetorian MCP | TOON圧縮で90%+トークン節約 |
| 🔍 Claude Historian MCP | 過去セッション検索で再調査不要 |
| 🔎 MCP Tool Search | 起動時トークン87%削減（66K→8.5K） |
| 🔧 PIDバグ修正済み | strategic-compact カウンター正常動作 |
| 📋 包括的調査レポート | 22の対策手法を優先度順に整理 |

---

## 背景: なぜ必要か

Claude Code で大規模タスクを実行すると、200K トークンのコンテキストウィンドウが枯渇し `Conversation too long` エラーが発生します。

**根本原因:**

| 原因 | トークン影響 |
|------|-------------|
| 5+バックグラウンドエージェントの大量出力 | 数万トークン消費 |
| デフォルト自動コンパクション（95%） | 発動時には手遅れ |
| MCPツール定義の起動時読み込み | 66,000+ トークン |
| フェーズ間の未コンパクション | 累積で上限突破 |
| CLAUDE.md の肥大化（例: 19KB） | 毎回システムプロンプトに読み込み |

---

## クイックインストール

```bash
git clone https://github.com/taiyousan15/jsystem2026.git
cd jsystem2026
bash context-guard/install.sh
```

**必要環境:** Node.js >= 20.0.0 / Bash 5.x / Claude Code CLI

---

## 手動インストール

### Step 1: 環境変数（必須）

```bash
# ~/.zshrc または ~/.bashrc に追加
export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70
```

ターミナル再起動で反映。

### Step 2: スキルスクリプト

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

### Step 3: MCPサーバー

```bash
# Praetorian（コンテキスト圧縮 90%+節約）
claude mcp add praetorian -- npx -y claude-praetorian-mcp

# Claude Historian（過去セッション検索）
claude mcp add claude-historian -- npx -y claude-historian-mcp
```

### Step 4: Hooks 設定

`~/.claude/hooks/hooks.json` の `PreToolUse` 配列に追加:

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

---

## 運用ルール

### フェーズベース実装パターン

```
Phase 1: 計画・探索    → /compact
Phase 2: 基盤構築      → /compact
Phase 3: 機能実装      → /compact
Phase 4: テスト        → /compact
Phase 5: デプロイ
```

### 数値基準

| 項目 | 値 | 根拠 |
|------|-----|------|
| コンテキスト実用上限 | **70%**（140K / 200K） | 残り30%で安全圏確保 |
| 自動コンパクション | **70%で発動** | デフォルト95%では遅すぎる |
| ツールコール上限/フェーズ | **30回** | コミュニティ推奨値 |
| 同時バックグラウンドエージェント | **最大3個** | 出力がメインコンテキストに蓄積 |
| CLAUDE.md サイズ上限 | **~20KB**（5Kトークン） | 毎回システムプロンプトに読込 |
| `/compact` タイミング | **フェーズ完了時** | 調査→実装の境界で必須 |

### サブエージェントルール

```
[必須] 重い処理はすべてサブエージェントに委譲
[必須] サブエージェントは「要約のみ」を返す
[必須] メインは最終結果の統合のみ担当
[推奨] run_in_background: true で独立実行
[禁止] 5個以上の同時バックグラウンドエージェント
```

---

## ファイル構成

```
jsystem2026/
├── README.md                              # このファイル
├── CONTEXT_MANAGEMENT_RESEARCH_REPORT.md  # 包括的調査レポート（235行）
└── context-guard/
    ├── install.sh                         # ワンクリックインストーラー
    └── skills/
        ├── suggest-compact.sh             # ツールコール数カウンター
        ├── check-agent-count.sh           # エージェント数監視
        └── check-claudemd-size.sh         # CLAUDE.md サイズチェック
```

---

## 対策効果サマリー

| 対策 | 削減効果 | 種別 |
|------|---------|------|
| MCP Tool Search | **87%** 起動時トークン削減 | 自動 |
| Praetorian MCP | **90%+** ランタイムトークン節約 | 手動呼出 |
| Auto-compact 70% | **25%** 早期にコンパクション | 自動 |
| サブエージェント要約ルール | **50-80%** 出力トークン削減 | 運用ルール |
| CLAUDE.md 制限 | **最大5Kトークン** 起動コスト固定 | 監視 |
| Claude Historian | **再調査0回** 過去ソリューション再利用 | 手動呼出 |

---

## 調査レポート

詳細は [CONTEXT_MANAGEMENT_RESEARCH_REPORT.md](CONTEXT_MANAGEMENT_RESEARCH_REPORT.md) を参照:

- 6並列エージェントによる世界規模の網羅調査
- SNS・論文・コミュニティ・Reddit からの知見
- MCPマーケット（22サーバー）・スキルマーケット（164,640+スキル）分析
- taisun_agent 全リポジトリ監査（88/100スコア）
- TOP 10 コミュニティベストプラクティス

---

## インストール・アップデート（ワンコマンド）

> **2026-02-08 更新: Mac / Windows 両対応**

ターミナルにコピー＆ペーストして Enter を押すだけで完了します。

### Mac / Linux / Windows 共通

```
npx github:taiyousan15/jsystem2026
```

完了後、ターミナルと Claude Code を再起動してください。

---

## 更新履歴

### 2026-02-08: v1.0.1 Mac / Windows 両対応アップデート

| 項目 | 内容 |
|------|------|
| 🖥️ Windows対応 | PowerShell ワンコマンドインストール追加 |
| 📋 実行内容表 | Mac / Windows 各ステップの対応表追加 |
| 🔄 再起動案内 | インストール後の再起動手順を明記 |

### 2026-02-08: v1.0.0 初回リリース

| 項目 | 内容 |
|------|------|
| 🛡️ 環境変数 | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` 設定 |
| 🔧 バグ修正 | strategic-compact PIDバグ修正（$$→PPID） |
| 🤖 MCP追加 | Praetorian MCP / Claude Historian MCP インストール |
| 📊 フック追加 | エージェント数監視 / CLAUDE.mdサイズチェック |
| 📋 調査 | 世界規模のコンテキスト管理調査レポート作成 |
| 🔎 確認 | MCP Tool Search 有効化確認 |

---

## 参考リンク

| リンク | 内容 |
|--------|------|
| [Anthropic - Subagents](https://code.claude.com/docs/en/subagents) | 公式サブエージェントドキュメント |
| [Anthropic - Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) | 公式コンテキストウィンドウ解説 |
| [claudefa.st - Context Management](https://claudefa.st/blog/guide/mechanics/context-management) | コミュニティガイド |
| [Medium - Tool Search](https://medium.com/@joe.njenga/claude-code-just-cut-mcp-context-bloat-by-46-9-51k-tokens-down-to-8-5k-with-new-tool-search-ddf9e905f734) | Tool Search 46.9%削減記事 |
| [Praetorian MCP](https://github.com/vvkmnn/claude-praetorian-mcp) | TOON圧縮MCPサーバー |
| [Claude Historian MCP](https://github.com/vvkmnn/claude-historian-mcp) | セッション履歴検索MCP |
| [JetBrains Research](https://blog.jetbrains.com/research/2025/12/efficient-context-management/) | 50%+コスト削減研究 |
| [Mem0 Paper](https://arxiv.org/abs/2504.19413) | 26%精度向上・90%トークン削減論文 |

---

## ライセンス

MIT License
