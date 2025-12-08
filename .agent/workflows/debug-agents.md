---
description: Debug agent pipeline - routing, stages, responses, and lead qualification flow
---

# Debug Agent Pipeline

// turbo-all

## 1. Verify build before debugging
```bash
pnpm type-check
```

## 2. Check agent file structure
```bash
ls -la src/core/agents/
```

## 3. Run agent unit tests
```bash
pnpm test src/core/agents 2>&1 | tail -50
```

## 4. Check orchestrator routing logic
```bash
grep -n "case '\|stage\|routeToAgent" src/core/agents/orchestrator.ts | head -30
```

## 5. Verify all agents are exported
```bash
cat src/core/agents/index.ts
```

## 6. Check API endpoint for agent routing
```bash
grep -n "routeToAgent\|stage\|agent" api/chat.ts | head -20
```

## 7. Test agent API locally
```bash
curl -s -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "I need help with AI for my business"}],
    "sessionId": "test-debug-123"
  }' 2>/dev/null | head -30
```

## 8. Check agent-stage endpoint
```bash
curl -s -X POST http://localhost:3002/api/agent-stage \
  -H "Content-Type: application/json" \
  -d '{
    "message": "I want to learn about your workshops",
    "sessionId": "test-debug-123"
  }' 2>/dev/null | head -20
```

---

## Agent Pipeline Overview

### Funnel Stages (src/core/types/funnel-stage.ts)
```
DISCOVERY → SCORING → QUALIFIED
    ↓
WORKSHOP_PITCH or CONSULTING_PITCH
    ↓
PROPOSAL → OBJECTION → CLOSING
    ↓
BOOKING_REQUESTED → BOOKED → SUMMARY
```

### Agent Mapping
| Stage | Agent | File |
|-------|-------|------|
| DISCOVERY | Discovery Agent | `discovery-agent.ts` |
| SCORING | Scoring Agent | `scoring-agent.ts` |
| WORKSHOP_PITCH | Workshop Sales Agent | `workshop-sales-agent.ts` |
| CONSULTING_PITCH | Consulting Sales Agent | `consulting-sales-agent.ts` |
| PROPOSAL | Proposal Agent | `proposal-agent.ts` |
| OBJECTION | Objection Agent | `objection-agent.ts` |
| CLOSING | Closer Agent | `closer-agent.ts` |
| SUMMARY | Summary Agent | `summary-agent.ts` |
| RETARGETING | Retargeting Agent | `retargeting-agent.ts` |
| ADMIN | Admin Agent | `admin-agent.ts` |

---

## Common Agent Issues

### Agent not transitioning stages
1. Check `exit-detector.ts` for exit signals
2. Check `orchestrator.ts` for stage transition logic
3. Verify `conversationFlow.categoriesCovered` is incrementing

```bash
grep -n "categoriesCovered\|shouldTransition\|exitDetector" src/core/agents/orchestrator.ts src/core/agents/exit-detector.ts | head -20
```

### Agent giving generic responses
1. Check if `intelligenceContext` is being passed
2. Verify research data is available
3. Check response-validator isn't blocking personalization

```bash
grep -n "intelligenceContext\|research\|context" src/core/agents/discovery-agent.ts | head -20
```

### Agent hallucinating/making up info
Check response validator:
```bash
cat src/core/agents/response-validator.ts | head -50
```

### Wrong agent responding
Check orchestrator routing:
```bash
grep -n "routeToAgent\|case '\|switch" src/core/agents/orchestrator.ts | head -30
```

### Agent not using tools
Check tool definitions in agent file:
```bash
grep -n "tools\|executeUnifiedTool\|calculate_roi\|search" src/core/agents/closer-agent.ts | head -15
```

---

## Testing Specific Agents

### Test Discovery Agent
```bash
pnpm test src/core/agents/__tests__/discovery-agent.test.ts 2>&1
```

### Test Orchestrator Routing
```bash
pnpm test src/core/agents/__tests__/orchestrator.test.ts 2>&1
```

### Test Exit Detector
```bash
pnpm test src/core/agents/__tests__/exit-detector.test.ts 2>&1
```

---

## Debug in Browser

1. Open DevTools Console
2. Look for logs with:
   - `[Agent]` - Agent selection
   - `[Stage]` - Stage transitions
   - `stage:` - Current stage in responses
   - `agent:` - Which agent responded

3. Check Network tab for `/api/chat` requests:
   - Request body: Check `sessionId`, `messages`
   - Response: Check `agent`, `stage`, `metadata`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/core/agents/orchestrator.ts` | Main routing logic |
| `src/core/agents/types.ts` | Agent interfaces |
| `src/core/types/funnel-stage.ts` | Stage definitions |
| `src/core/agents/exit-detector.ts` | When to exit/transition |
| `src/core/agents/response-validator.ts` | Validate responses |
| `src/core/agents/agent-persistence.ts` | Save agent state |
| `api/chat.ts` | API entry point |
| `api/agent-stage.ts` | Metadata-only endpoint |
