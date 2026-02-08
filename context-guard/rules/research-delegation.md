# Research Delegation Rules (Context Guard)

## Parallel Tool Call Limit

CRITICAL: Never make more than 3 parallel Fetch/WebSearch calls in a single batch.

When 4+ web requests are needed:
- Split into batches of 3
- Wait for batch to complete before starting next
- OR delegate to sub-agents (preferred)

## Research Delegation Pattern

For any research task requiring 4+ web requests, ALWAYS use sub-agents:

```
GOOD: 3 sub-agents each doing 2-3 searches internally (sequential, no cascade failure)
BAD:  6 parallel Fetch/WebSearch calls from main context (1 failure kills all)
```

### Why Sub-agents

- Sub-agents execute tool calls sequentially inside their context
- 1 failure does NOT cascade to other calls
- Each agent has independent retry logic
- Results come back as summaries (saves main context tokens)

### Implementation

When the user asks to research, investigate, or deep-dive:

1. Split the research into 2-3 independent topics
2. Launch each topic as a separate sub-agent (Task tool)
3. Each sub-agent does its own Fetch/WebSearch internally
4. Main context only receives summaries
5. Main context synthesizes the final report

### Example

```
User: "ChatWork API, Zoom API, SNS tracking について調査して"

GOOD approach:
  Agent 1: ChatWork API research (3-5 searches inside)
  Agent 2: Zoom API research (3-5 searches inside)
  Agent 3: SNS tracking research (3-5 searches inside)
  Main: Synthesize 3 summaries into report

BAD approach:
  Main: 6 parallel WebSearch + 3 parallel Fetch = 9 simultaneous calls → cascade failure
```

## Fetch/WebSearch Error Recovery

If a Fetch or WebSearch fails:
- Do NOT retry the same URL immediately in parallel with other calls
- Retry individually with a small delay
- If 429 (rate limit): wait 5 seconds before retry
- If 403 (forbidden): skip and try alternative source
