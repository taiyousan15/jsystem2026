#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
COMPOSE_FILE="$PROJECT_DIR/docker-compose.llm.yml"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_service() {
  local name="$1"
  local url="$2"
  local timeout="${3:-3}"

  if curl -sf --max-time "$timeout" "$url" >/dev/null 2>&1; then
    echo -e "  ${GREEN}[OK]${NC} $name"
    return 0
  else
    echo -e "  ${RED}[DOWN]${NC} $name"
    return 1
  fi
}

cmd_start() {
  echo "Starting LLM stack..."
  docker compose -f "$COMPOSE_FILE" up -d

  echo ""
  echo "Waiting for services to be healthy..."
  local retries=30
  local count=0
  while [ $count -lt $retries ]; do
    if docker compose -f "$COMPOSE_FILE" ps --format json 2>/dev/null | \
       python3 -c "import sys,json; data=[json.loads(l) for l in sys.stdin]; exit(0 if all(d.get('Health','')=='healthy' for d in data if d.get('Health')) else 1)" 2>/dev/null; then
      echo -e "${GREEN}All services healthy!${NC}"
      cmd_status
      return 0
    fi
    count=$((count + 1))
    sleep 2
    echo -n "."
  done

  echo ""
  echo -e "${YELLOW}Warning: Some services may not be healthy yet.${NC}"
  cmd_status
}

cmd_stop() {
  echo "Stopping LLM stack..."
  docker compose -f "$COMPOSE_FILE" down
  echo -e "${GREEN}LLM stack stopped.${NC}"
}

cmd_status() {
  echo ""
  echo "=== LLM Stack Status ==="
  echo ""

  echo "Docker services:"
  if docker compose -f "$COMPOSE_FILE" ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null; then
    true
  else
    echo "  Docker Compose services not running"
  fi

  echo ""
  echo "Service health:"
  check_service "LiteLLM Proxy (port 4000)" "http://localhost:4000/health/liveliness" || true
  check_service "LiteLLM DB (port 5433)" "http://localhost:5433" 2 || true
  check_service "Ollama (port 11434)" "http://localhost:11434/api/tags" || true

  if command -v redis-cli &>/dev/null; then
    if redis-cli ping >/dev/null 2>&1; then
      echo -e "  ${GREEN}[OK]${NC} Redis (local, port 6379)"
    else
      echo -e "  ${RED}[DOWN]${NC} Redis (local, port 6379)"
    fi
  fi

  echo ""
}

cmd_logs() {
  local service="${1:-}"
  if [ -n "$service" ]; then
    docker compose -f "$COMPOSE_FILE" logs -f "$service"
  else
    docker compose -f "$COMPOSE_FILE" logs -f
  fi
}

cmd_cost() {
  local period="${1:-day}"
  if [ -f "$PROJECT_DIR/scripts/cost-report.ts" ]; then
    npx ts-node "$PROJECT_DIR/scripts/cost-report.ts" --period="$period"
  else
    echo "Cost report script not found."
    exit 1
  fi
}

cmd_switch() {
  local target="${1:-litellm}"
  case "$target" in
    litellm)
      echo "Switching to LiteLLM proxy..."
      export ANTHROPIC_BASE_URL="http://localhost:4000"
      echo -e "${GREEN}ANTHROPIC_BASE_URL=http://localhost:4000${NC}"
      echo "Add to .env: ANTHROPIC_BASE_URL=http://localhost:4000"
      ;;
    direct)
      echo "Switching to direct Anthropic API..."
      unset ANTHROPIC_BASE_URL 2>/dev/null || true
      echo -e "${GREEN}ANTHROPIC_BASE_URL unset (using direct API)${NC}"
      echo "Remove ANTHROPIC_BASE_URL from .env"
      ;;
    *)
      echo "Usage: $0 switch [litellm|direct]"
      exit 1
      ;;
  esac
}

cmd_help() {
  echo "Usage: $0 <command> [args]"
  echo ""
  echo "Commands:"
  echo "  start       Start the LLM Docker stack"
  echo "  stop        Stop the LLM Docker stack"
  echo "  status      Show service status"
  echo "  logs [svc]  Tail logs (optionally for a specific service)"
  echo "  cost [day|week|month]  Show cost report"
  echo "  switch [litellm|direct]  Switch API base URL"
  echo "  help        Show this help"
}

case "${1:-help}" in
  start)  cmd_start ;;
  stop)   cmd_stop ;;
  status) cmd_status ;;
  logs)   cmd_logs "${2:-}" ;;
  cost)   cmd_cost "${2:-day}" ;;
  switch) cmd_switch "${2:-litellm}" ;;
  help)   cmd_help ;;
  *)
    echo "Unknown command: $1"
    cmd_help
    exit 1
    ;;
esac
