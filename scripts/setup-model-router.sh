#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ROUTER_CONFIG_DIR="$HOME/.claude-code-router"

echo "=== LLM Model Router Setup ==="
echo ""

# 1. Check claude-code-router
echo "[1/5] Checking claude-code-router..."
if command -v claude-code-router &>/dev/null; then
  ROUTER_VERSION=$(claude-code-router --version 2>/dev/null || echo "unknown")
  echo "  Found: claude-code-router $ROUTER_VERSION"
else
  echo "  WARNING: claude-code-router not found."
  echo "  Install with: npm install -g claude-code-router"
fi

# 2. Check Ollama
echo "[2/5] Checking Ollama..."
if command -v ollama &>/dev/null; then
  echo "  Found: ollama $(ollama --version 2>/dev/null || echo "unknown")"
  if curl -s --max-time 2 http://localhost:11434/api/tags >/dev/null 2>&1; then
    echo "  Ollama server: RUNNING"
    MODELS=$(curl -s http://localhost:11434/api/tags | python3 -c "
import sys, json
data = json.load(sys.stdin)
for m in data.get('models', []):
    print(f\"    - {m['name']}\")
" 2>/dev/null || echo "    (could not list models)")
    echo "  Available models:"
    echo "$MODELS"
  else
    echo "  WARNING: Ollama server not running. Start with: ollama serve"
  fi
else
  echo "  WARNING: Ollama not found. Install from: https://ollama.ai"
fi

# 3. Check Redis
echo "[3/5] Checking Redis..."
if command -v redis-cli &>/dev/null; then
  if redis-cli ping >/dev/null 2>&1; then
    echo "  Redis: RUNNING"
  else
    echo "  WARNING: Redis installed but not running. Start with: brew services start redis"
  fi
else
  echo "  WARNING: Redis not found. Install with: brew install redis"
fi

# 4. Copy router config
echo "[4/5] Setting up router configuration..."
mkdir -p "$ROUTER_CONFIG_DIR"
cp "$PROJECT_DIR/.claude/router-config.json" "$ROUTER_CONFIG_DIR/config.json"
echo "  Copied router-config.json to $ROUTER_CONFIG_DIR/config.json"

# 5. Check environment variables
echo "[5/5] Checking environment variables..."
MISSING_VARS=()

if [ -z "${ANTHROPIC_API_KEY:-}" ]; then
  MISSING_VARS+=("ANTHROPIC_API_KEY")
fi

if [ -z "${OPENROUTER_API_KEY:-}" ]; then
  echo "  INFO: OPENROUTER_API_KEY not set (optional, for free tier fallback)"
fi

if [ -z "${REDIS_URL:-}" ]; then
  echo "  INFO: REDIS_URL not set (defaults to localhost:6379)"
fi

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo ""
  echo "  WARNING: Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "    - $var"
  done
  echo "  Set them in .env or export them in your shell."
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "  1. Ensure Ollama is running: ollama serve"
echo "  2. Pull required models: ollama pull qwen3-coder:30b"
echo "  3. Start the LLM stack: npm run llm:start"
echo "  4. Check status: npm run llm:status"
