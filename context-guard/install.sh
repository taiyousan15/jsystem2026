#!/bin/bash
# ============================================================
# Context Guard - Claude Code コンテキスト枯渇防止システム
# インストールスクリプト
# ============================================================

set -e

echo "=========================================="
echo "  Context Guard インストーラー v1.0"
echo "=========================================="
echo ""

CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills/strategic-compact"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 1. スキルディレクトリ作成
echo "[1/5] スキルディレクトリ作成..."
mkdir -p "$SKILLS_DIR"

# 2. スキルスクリプトをコピー
echo "[2/5] スキルスクリプトをインストール..."
cp "$SCRIPT_DIR/skills/suggest-compact.sh" "$SKILLS_DIR/"
cp "$SCRIPT_DIR/skills/check-agent-count.sh" "$SKILLS_DIR/"
cp "$SCRIPT_DIR/skills/check-claudemd-size.sh" "$SKILLS_DIR/"
chmod +x "$SKILLS_DIR/suggest-compact.sh"
chmod +x "$SKILLS_DIR/check-agent-count.sh"
chmod +x "$SKILLS_DIR/check-claudemd-size.sh"
echo "  -> 3 scripts installed to $SKILLS_DIR"

# 3. 環境変数設定
echo "[3/5] 環境変数チェック..."
SHELL_RC="$HOME/.zshrc"
if [ -f "$HOME/.bashrc" ] && [ ! -f "$HOME/.zshrc" ]; then
  SHELL_RC="$HOME/.bashrc"
fi

if grep -q "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE" "$SHELL_RC" 2>/dev/null; then
  echo "  -> CLAUDE_AUTOCOMPACT_PCT_OVERRIDE は既に設定済み"
else
  echo "" >> "$SHELL_RC"
  echo "# Claude Code context management - auto-compact at 70% instead of 95%" >> "$SHELL_RC"
  echo "export CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70" >> "$SHELL_RC"
  echo "  -> CLAUDE_AUTOCOMPACT_PCT_OVERRIDE=70 を $SHELL_RC に追加"
fi

# 4. MCPサーバー設定
echo "[4/5] MCPサーバー設定..."
CLAUDE_JSON="$HOME/.claude.json"
if [ -f "$CLAUDE_JSON" ]; then
  # Praetorian MCP チェック
  if grep -q "praetorian" "$CLAUDE_JSON" 2>/dev/null; then
    echo "  -> Praetorian MCP は既にインストール済み"
  else
    echo "  -> Praetorian MCP を手動で追加してください:"
    echo '     claude mcp add praetorian -- npx -y claude-praetorian-mcp'
  fi

  # Historian MCP チェック
  if grep -q "claude-historian" "$CLAUDE_JSON" 2>/dev/null; then
    echo "  -> Claude Historian MCP は既にインストール済み"
  else
    echo "  -> Claude Historian MCP を手動で追加してください:"
    echo '     claude mcp add claude-historian -- npx -y claude-historian-mcp'
  fi
else
  echo "  -> .claude.json が見つかりません。MCPサーバーは手動で設定してください。"
fi

# 5. パッケージプリキャッシュ
echo "[5/5] MCPパッケージをプリキャッシュ..."
npx -y claude-praetorian-mcp --version 2>/dev/null || true
npx -y claude-historian-mcp --version 2>/dev/null || true
echo "  -> キャッシュ完了"

echo ""
echo "=========================================="
echo "  インストール完了！"
echo "=========================================="
echo ""
echo "次のステップ:"
echo "  1. ターミナルを再起動（環境変数を反映）"
echo "  2. Claude Code を再起動（MCPサーバーを読み込み）"
echo "  3. /context で使用量を確認しながら作業"
echo ""
echo "詳細: README.md を参照してください"
