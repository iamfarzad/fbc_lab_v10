# Phase 3: Core Infrastructure - Agent Deployment

**Date:** 2025-12-01  
**Status:** ✅ Prompts Generated - Ready to Deploy

## Overview

Phase 3 completes the Core Infrastructure by importing:
- **Tools System** (8 files)
- **Queue System** (2 files)
- **Email Service** (1 file)
- **Live Client** (1 file)

**Total:** 12 files

## Agent Assignments

### Agent 1: Tools System
**Files:** 8 files
- `src/core/tools/shared-tools.ts`
- `src/core/tools/tool-executor.ts`
- `src/core/tools/calculate-roi.ts`
- `src/core/tools/generate-proposal.ts`
- `src/core/tools/draft-follow-up-email.ts`
- `src/core/tools/extract-action-items.ts`
- `src/core/tools/generate-summary-preview.ts`
- `src/core/tools/shared-tool-registry.ts`

**Dependencies to check:**
- context-storage
- multimodal-context
- pdf-generator (may not exist yet)

### Agent 2: Queue System
**Files:** 2 files
- `src/core/queue/redis-queue.ts`
- `src/core/queue/workers.ts`

**Dependencies to check:**
- job-types (already imported ✅)
- retry-config (already imported ✅)
- vercel-cache (already imported ✅)
- context-storage (already imported ✅)
- email-service (Agent 3 will import)

### Agent 3: Email & Live Client
**Files:** 2 files
- `src/core/email-service.ts`
- `src/core/live/client.ts`

**Dependencies to check:**
- Check imports in each file

### Agent 4: Validation & Fixes
**Tasks:**
- Verify all Phase 3 files can be imported
- Run type-check and fix errors
- Run lint and fix issues
- Check for circular dependencies
- Update PROJECT_STATUS.md

## Deployment Instructions

### 1. Prompts Generated ✅
```bash
node scripts/generate-phase3-prompts.js
```

Prompts are in: `scripts/agent-prompts/phase-3-*.txt`

### 2. Deploy 4 Parallel Agents

**In Cursor:**
1. Click "New Agent" 4 times
2. Copy-paste each prompt:
   - Agent 1: `phase-3-agent-1.txt` (Tools System)
   - Agent 2: `phase-3-agent-2.txt` (Queue System)
   - Agent 3: `phase-3-agent-3.txt` (Email & Live Client)
   - Agent 4: `phase-3-agent-4.txt` (Validation)

### 3. Monitor Progress

After each agent completes:
```bash
# Check type errors (should decrease)
pnpm type-check 2>&1 | grep "error TS" | wc -l

# Check tests (should still pass)
pnpm test --run

# Check for circular dependencies
pnpm check:circular

# Check PROJECT_STATUS.md for updates
```

### 4. Final Validation

After all agents complete:
```bash
pnpm type-check
pnpm lint
pnpm test --run
pnpm check:circular
pnpm check:all
```

## Expected Results

**Before Phase 3:**
- Type errors: 10
- Core infrastructure: Partial (context, supabase, analytics done)

**After Phase 3:**
- Type errors: ~5-15 (may increase temporarily as new files add dependencies)
- Core infrastructure: Complete ✅
- Tools system: Ready for agents
- Queue system: Ready for background jobs
- Ready for Services Layer

## Success Criteria

- ✅ All 12 files imported
- ✅ All import paths are absolute
- ✅ No `@/` aliases
- ✅ Type-check passes (or only expected errors)
- ✅ Lint passes
- ✅ Tests passing (24/24)
- ✅ No critical circular dependencies
- ✅ PROJECT_STATUS.md updated

## Notes

- **File locations:** Files may be in either `api/_lib/` or `src/` in original codebase
- **Dependencies:** Some files may reference dependencies not yet imported (document these)
- **Tools:** Tools depend on context-storage and multimodal-context (already imported ✅)
- **Queue:** Queue depends on email-service (Agent 3 will import)

---

**Ready to deploy Phase 3 agents! 🚀**

