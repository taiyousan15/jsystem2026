#!/bin/bash
# Context Guard - ワンコマンドインストーラー
# 使い方: curl -sL https://raw.githubusercontent.com/taiyousan15/jsystem2026/main/context-guard/install-all.sh | bash
set -e

echo "=== Context Guard インストール開始 ==="

# 1. リポジトリ取得
rm -rf /tmp/context-guard
git clone https://github.com/taiyousan15/jsystem2026.git /tmp/context-guard

# 2. スキルインストール
bash /tmp/context-guard/context-guard/install.sh

# 2.5. リサーチ委譲ルールインストール
echo "[Rules] リサーチ委譲ルール インストール中..."
mkdir -p "$HOME/.claude/rules"
cp /tmp/context-guard/context-guard/rules/research-delegation.md "$HOME/.claude/rules/" 2>/dev/null || true
echo "  -> research-delegation.md installed"

# 3. MCPサーバー追加
echo "[MCP] Praetorian MCP 追加中..."
claude mcp add praetorian -- npx -y claude-praetorian-mcp 2>/dev/null || true
echo "[MCP] Claude Historian MCP 追加中..."
claude mcp add claude-historian -- npx -y claude-historian-mcp 2>/dev/null || true

# 4. クリーンアップ
rm -rf /tmp/context-guard

echo ""
echo "=== Context Guard インストール完了 ==="
echo "ターミナルと Claude Code を再起動してください"
