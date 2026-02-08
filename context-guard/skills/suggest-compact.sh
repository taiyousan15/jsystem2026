#!/bin/bash
# Strategic Compact Suggester v2
# Tracks tool calls per Claude Code session and suggests /compact at strategic intervals
#
# FIX: v1 used $$ (PID) which changes per hook invocation.
# v2 uses CLAUDE_SESSION_ID or a stable session identifier.

# Use a stable session identifier (PPID is the parent Claude Code process)
SESSION_ID="${CLAUDE_SESSION_ID:-$(ps -o ppid= -p $$ 2>/dev/null | tr -d ' ')}"
COUNTER_FILE="/tmp/claude-compact-counter-${SESSION_ID}"
THRESHOLD=${COMPACT_THRESHOLD:-30}
REMIND_INTERVAL=${COMPACT_REMIND_INTERVAL:-15}

# Initialize or increment counter
if [ -f "$COUNTER_FILE" ]; then
  count=$(cat "$COUNTER_FILE" 2>/dev/null || echo "0")
  count=$((count + 1))
else
  count=1
fi
echo "$count" > "$COUNTER_FILE"

# First threshold warning
if [ "$count" -eq "$THRESHOLD" ]; then
  echo "[StrategicCompact] ${THRESHOLD} tool calls reached. Consider /compact before starting a new phase." >&2
fi

# Periodic reminders after threshold
if [ "$count" -gt "$THRESHOLD" ] && [ $((count % REMIND_INTERVAL)) -eq 0 ]; then
  echo "[StrategicCompact] ${count} tool calls. Context may be getting large - /compact recommended." >&2
fi

# Critical warning at high counts
if [ "$count" -eq 80 ]; then
  echo "[StrategicCompact] WARNING: 80 tool calls! High risk of context exhaustion. /compact NOW." >&2
fi
