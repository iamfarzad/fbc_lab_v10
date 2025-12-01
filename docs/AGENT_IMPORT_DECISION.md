# Agent Import Decision - VALIDATION

**Date:** 2025-12-01  
**Status:** ⚠️ **GAP IDENTIFIED** - Agents were never imported despite being required

## Original Decision

**You explicitly stated:** "Yes we need the agent they have a purpose"

**Documented in:**
- `PROJECT_STATUS.md` line 34: "✅ Keep agents (migrate from `api/_lib/agents/` → `src/core/agents/`)"
- `IMPORT_STRATEGY.md` lines 258-274: Explicitly lists all 15 agent files to migrate
- `PARALLEL_AGENT_STRATEGY.md`: Phase 4 dedicated to agent migration

## What Actually Happened

**Execution followed:** `IMPORT_ORDER.md` which had:
- Line 200: "Do we need the agent orchestration system? (Not in this list - would need to migrate from `api/_lib/agents/`)"
- Marked as "decision needed" but decision was never made
- Agents were never added to the import list

**Result:**
- ❌ No `src/core/agents/` directory exists
- ❌ `api/chat.ts` has TODOs: "when agents are migrated"
- ❌ All 15 agent files missing
- ❌ Agent orchestration system completely absent

## Current Impact

### Broken Dependencies
1. **`api/chat.ts`** - Cannot work (imports non-existent `src/core/agents/orchestrator`)
2. **Agent-based routing** - Completely broken
3. **All specialized agents** - Missing (discovery, scoring, proposal, closer, etc.)

### Missing Files (15 total)
```
src/core/agents/orchestrator.ts          ← Critical: Referenced by api/chat.ts
src/core/agents/discovery-agent.ts
src/core/agents/scoring-agent.ts
src/core/agents/proposal-agent.ts
src/core/agents/closer-agent.ts
src/core/agents/retargeting-agent.ts
src/core/agents/summary-agent.ts
src/core/agents/workshop-sales-agent.ts
src/core/agents/consulting-sales-agent.ts
src/core/agents/admin-agent.ts
src/core/agents/lead-intelligence-agent.ts
src/core/agents/agent-persistence.ts
src/core/agents/intent.ts
src/core/agents/types.ts
src/core/agents/index.ts
```

## Root Cause

**Conflicting documentation:**
1. ✅ `IMPORT_STRATEGY.md` - Said to keep agents (15 files listed)
2. ✅ `PARALLEL_AGENT_STRATEGY.md` - Phase 4: Agents Migration
3. ⚠️ `IMPORT_ORDER.md` - Marked as "decision needed" (optional)
4. ❌ **Execution followed `IMPORT_ORDER.md`** (the optional path)

**The decision was made** (you said "yes we need the agent"), but **execution didn't follow the decision**.

## Validation

✅ **Gap Analysis is CORRECT:**
- Agents were never imported
- Decision was made but not executed
- `IMPORT_ORDER.md` marked them as optional, execution followed that
- Strategy docs said to keep them, but weren't followed

## Required Action

**Import the agent system NOW** before continuing with error fixes.

### Plan
1. Create `src/core/agents/` directory
2. Import all 15 agent files from `/Users/farzad/fbc-lab-9/api/_lib/agents/`
3. Update import paths (absolute from root, no `.js` extensions)
4. Fix dependencies (tools, context-storage, ai-client)
5. Update `api/chat.ts` to use real orchestrator (remove TODOs)
6. Validate: `pnpm type-check` should pass for agent files

### Priority
**HIGH** - `api/chat.ts` is broken without agents. This is core functionality.

---

**Conclusion:** The gap analysis is accurate. Agents were required but never imported. We need to import them now.

