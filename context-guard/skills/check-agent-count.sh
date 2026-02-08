#!/bin/bash
# Agent Count Checker - Warns when too many concurrent background agents
# Max recommended: 3 concurrent agents to prevent context flooding

SESSION_ID="${CLAUDE_SESSION_ID:-$(ps -o ppid= -p $$ 2>/dev/null | tr -d ' ')}"
AGENT_COUNTER="/tmp/claude-agent-count-${SESSION_ID}"
MAX_AGENTS=${MAX_CONCURRENT_AGENTS:-3}

# Increment agent counter
if [ -f "$AGENT_COUNTER" ]; then
  count=$(cat "$AGENT_COUNTER" 2>/dev/null || echo "0")
  count=$((count + 1))
else
  count=1
fi
echo "$count" > "$AGENT_COUNTER"

if [ "$count" -gt "$MAX_AGENTS" ]; then
  echo "[AgentMonitor] WARNING: ${count} agents launched this phase (max recommended: ${MAX_AGENTS})" >&2
  echo "[AgentMonitor] Ensure agents return SUMMARIES only, not full outputs" >&2
fi
