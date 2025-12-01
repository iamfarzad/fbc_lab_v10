# What is Phase 3?

**Date:** 2025-12-01

## Phase Numbering Confusion

There are two different phase numbering systems in the docs:

### System 1: `IMPORT_ORDER.md` (File Import Sequence)
- **Phase 1:** Foundation files (types, config, utils) ✅ DONE
- **Phase 2:** Core Infrastructure (Supabase, Context, Queue, Tools) 🟡 PARTIALLY DONE
- **Phase 3:** Services Layer (unifiedContext, chromeAiService, etc.) ⏳ NEXT

### System 2: `PARALLEL_AGENT_STRATEGY.md` (Agent Workflow)
- **Phase 1:** Foundation files ✅ DONE
- **Phase 2:** Duplicate Comparison ✅ DONE
- **Phase 3:** Core Infrastructure (finish importing tools, queue, etc.) ⏳ NEXT
- **Phase 4:** Agents Migration
- **Phase 5:** Services Layer

## What "Proceed to Phase 3" Actually Means

Based on our progress, **Phase 3** means:

### Option A: Finish Core Infrastructure (Recommended)
Complete importing the remaining **Core Infrastructure** files that we haven't imported yet:

**Tools System:**
- `src/core/tools/shared-tools.ts`
- `src/core/tools/tool-executor.ts`
- `src/core/tools/calculate-roi.ts`
- `src/core/tools/generate-proposal.ts`
- `src/core/tools/draft-follow-up-email.ts`
- `src/core/tools/extract-action-items.ts`
- `src/core/tools/generate-summary-preview.ts`
- `src/core/tools/shared-tool-registry.ts`

**Queue System:**
- `src/core/queue/redis-queue.ts`
- `src/core/queue/workers.ts`

**Email Service:**
- `src/core/email-service.ts`

**Live/WebSocket:**
- `src/core/live/client.ts`

**Why this makes sense:**
- We've already imported context system, supabase client, analytics
- Tools and queue are core infrastructure that other things depend on
- Services layer depends on these being complete

### Option B: Skip to Services Layer
Jump directly to importing **Services Layer** files:
- `services/unifiedContext.ts`
- `services/chromeAiService.ts`
- `services/standardChatService.ts`
- `services/leadResearchService.ts`
- `services/aiBrainService.ts`
- `services/geminiLiveService.ts`

**Why this might not work:**
- Services depend on tools, queue, and other core infrastructure
- We'll hit missing dependency errors

## Recommendation

**Proceed with Option A: Finish Core Infrastructure**

This means:
1. Import remaining tools files (8 files)
2. Import queue system (2 files)
3. Import email service (1 file)
4. Import live client (1 file)
5. Validate everything works
6. Then move to Services Layer

## How to Proceed

We can use **parallel agents** again (like Phase 2 continuation):

**Agent 1:** Tools System (8 files)
**Agent 2:** Queue System (2 files)
**Agent 3:** Email & Live Client (2 files)
**Agent 4:** Validation & Fixes

This would complete the Core Infrastructure phase, making the codebase ready for Services Layer.

---

**TL;DR:** Phase 3 = Finish importing Core Infrastructure (tools, queue, email, live client) before moving to Services Layer.

