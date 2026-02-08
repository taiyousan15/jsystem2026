#!/bin/bash
# CLAUDE.md Size Checker - Warns if CLAUDE.md exceeds 5,000 tokens (~20KB)
# Run at session start to prevent context bloat

MAX_BYTES=20000

# Check current directory and parent for CLAUDE.md
for candidate in "./CLAUDE.md" "../CLAUDE.md" ".claude/CLAUDE.md"; do
  if [ -f "$candidate" ]; then
    size=$(wc -c < "$candidate" 2>/dev/null || echo "0")
    if [ "$size" -gt "$MAX_BYTES" ]; then
      echo "[CLAUDE.md Check] WARNING: $candidate is ${size} bytes (>${MAX_BYTES} limit)" >&2
      echo "[CLAUDE.md Check] Large CLAUDE.md consumes startup context. Move details to docs/" >&2
    fi
  fi
done
