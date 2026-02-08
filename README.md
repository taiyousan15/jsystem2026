# Context Guard v1.0

**Claude Code Context Exhaustion Prevention System** - コンテキストウィンドウ枯渇を防止する包括的な監視・圧縮・運用システム

---

![Node.js](https://img.shields.io/badge/Node.js-20.x%20%7C%2024.x-green) ![MCP](https://img.shields.io/badge/MCP-2%20servers-purple) ![Hooks](https://img.shields.io/badge/Hooks-3%20monitors-orange) ![License](https://img.shields.io/badge/License-MIT-brightgreen)

---

## これは何？

Claude Code で大規模タスクを実行すると、200K トークンのコンテキストウィンドウが枯渇し `Conversation too long` エラーが発生します。

**Context Guard** はこの問題を防止するシステムです。以下が自動でインストールされます：

| # | インストールされるもの | 効果 |
|---|----------------------|------|
| 1 | 監視スクリプト 3つ | ツールコール数（30回で警告）、エージェント数（3個超で警告）、CLAUDE.mdサイズ（20KB超で警告） |
| 2 | 自動コンパクション設定 | デフォルト95%→**70%**で早期発動（枯渇前に圧縮） |
| 3 | Praetorian MCP | ランタイムのトークンを**90%以上**圧縮 |
| 4 | Claude Historian MCP | 過去セッション検索で再調査不要 |

---

## インストール手順（Mac / Windows 共通）

### Step 1: ターミナルを開く

| OS | 開き方 |
|----|--------|
| **Mac** | `Cmd + Space` →「ターミナル」と入力 → Enter |
| **Windows** | `Win + X` →「PowerShell」または「ターミナル」を選択 |

### Step 2: 以下のコマンドをコピーして貼り付け → Enter

```
npx github:taiyousan15/jsystem2026
```

### Step 3: 完了後、再起動

1. ターミナルを閉じて開き直す
2. Claude Code を再起動する

**以上で完了です。**

---

## アップデート手順

新しいバージョンが出た場合も、同じコマンドを実行するだけです：

```
npx github:taiyousan15/jsystem2026
```

既にインストール済みの設定は上書きされず、新しい機能だけが追加されます。

---

## 必要環境

| ソフトウェア | バージョン | 確認コマンド |
|-------------|-----------|-------------|
| **Node.js** | 20.x 以上 | `node -v` |
| **Git** | 任意 | `git --version` |
| **Claude Code** | 最新版 | `claude --version` |

> Node.js が入っていない場合: https://nodejs.org/ からインストールしてください。

---

## 新機能一覧

| 機能 | 説明 |
|------|------|
| 🛡️ 自動コンパクション | 70%到達で自動発動（デフォルト95%→70%） |
| 📊 ツールコール監視 | 30回で警告、80回で危険アラート |
| 🤖 エージェント数制御 | 同時3個超で警告表示 |
| 📏 CLAUDE.md サイズ監視 | 20KB超で自動警告 |
| 🗜️ Praetorian MCP | TOON圧縮で90%+トークン節約 |
| 🔍 Claude Historian MCP | 過去セッション検索で再調査不要 |
| 🔎 MCP Tool Search | 起動時トークン87%削減（66K→8.5K） |

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

| 項目 | 値 |
|------|-----|
| コンテキスト実用上限 | **70%**（140K / 200K） |
| ツールコール上限/フェーズ | **30回** |
| 同時バックグラウンドエージェント | **最大3個** |
| CLAUDE.md サイズ上限 | **~20KB** |
| `/compact` タイミング | **フェーズ完了時** |

---

## トラブルシューティング

| 問題 | 解決方法 |
|------|---------|
| `npx: command not found` | Node.js をインストールしてください: https://nodejs.org/ |
| `git: command not found` | Git をインストールしてください: https://git-scm.com/ |
| `claude: command not found` | Claude Code CLI をインストールしてください |
| インストール後に効果がない | ターミナルと Claude Code の両方を再起動してください |

---

## 手動インストール（上級者向け）

`npx` を使わずに手動でインストールする場合：

```bash
git clone https://github.com/taiyousan15/jsystem2026.git
cd jsystem2026
bash context-guard/install.sh
claude mcp add praetorian -- npx -y claude-praetorian-mcp
claude mcp add claude-historian -- npx -y claude-historian-mcp
```

---

## ファイル構成

```
jsystem2026/
├── README.md
├── package.json
├── CONTEXT_MANAGEMENT_RESEARCH_REPORT.md
└── context-guard/
    ├── install.sh                  # Bash インストーラー
    ├── install-all.sh              # Mac/Linux ワンコマンド
    ├── install-all.ps1             # Windows ワンコマンド
    ├── install-all-node.js         # npx クロスプラットフォーム
    └── skills/
        ├── suggest-compact.sh      # ツールコール数カウンター
        ├── check-agent-count.sh    # エージェント数監視
        └── check-claudemd-size.sh  # CLAUDE.md サイズチェック
```

---

## 調査レポート

詳細は [CONTEXT_MANAGEMENT_RESEARCH_REPORT.md](CONTEXT_MANAGEMENT_RESEARCH_REPORT.md) を参照。

---

## 更新履歴

### 2026-02-08: v1.0.2 ワンコマンドインストーラー

| 項目 | 内容 |
|------|------|
| 🚀 npx対応 | `npx github:taiyousan15/jsystem2026` で Mac/Windows/Linux 一発インストール |
| 📖 README刷新 | 初めての人でもわかるステップバイステップ手順に改善 |
| 🔧 トラブルシューティング | よくある問題と解決方法を追加 |

### 2026-02-08: v1.0.1 Mac / Windows 両対応

| 項目 | 内容 |
|------|------|
| 🖥️ Windows対応 | PowerShell ワンコマンドインストール追加 |
| 📋 実行内容表 | Mac / Windows 各ステップの対応表追加 |

### 2026-02-08: v1.0.0 初回リリース

| 項目 | 内容 |
|------|------|
| 🛡️ 環境変数 | `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70` 設定 |
| 🔧 バグ修正 | strategic-compact PIDバグ修正 |
| 🤖 MCP追加 | Praetorian MCP / Claude Historian MCP |
| 📊 フック追加 | エージェント数監視 / CLAUDE.mdサイズチェック |
| 📋 調査 | 世界規模のコンテキスト管理調査レポート作成 |

---

## 参考リンク

| リンク | 内容 |
|--------|------|
| [Anthropic - Subagents](https://code.claude.com/docs/en/subagents) | 公式サブエージェントドキュメント |
| [Anthropic - Context Windows](https://platform.claude.com/docs/en/build-with-claude/context-windows) | 公式コンテキストウィンドウ解説 |
| [Praetorian MCP](https://github.com/vvkmnn/claude-praetorian-mcp) | TOON圧縮MCPサーバー |
| [Claude Historian MCP](https://github.com/vvkmnn/claude-historian-mcp) | セッション履歴検索MCP |

---

## ライセンス

MIT License
