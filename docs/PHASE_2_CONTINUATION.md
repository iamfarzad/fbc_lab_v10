# Phase 2 Continuation: Missing Dependencies

**Date:** 2025-12-01  
**Status:** 🟡 Ready for Parallel Agents

## Overview

Phase 2 duplicate comparison is complete, but we have missing dependencies that need to be imported before moving to Phase 3. Using parallel agents to import these efficiently.

## Missing Dependencies

### 1. Context Types (Agent 1)
- **File:** `api/_lib/context/context-types.ts`
- **Target:** `src/core/context/context-types.ts`
- **Required by:** 
  - `context-storage.ts`
  - `context-summarizer.ts`
  - `multimodal-context.ts`

### 2. Security System (Agent 2)
- **Files:**
  - `api/_lib/core/security/pii-detector.ts` → `src/core/security/pii-detector.ts`
  - `api/_lib/core/security/audit-logger.ts` → `src/core/security/audit-logger.ts`
- **Required by:** `multimodal-context.ts`

### 3. Embeddings System (Agent 3)
- **Files:**
  - `api/_lib/core/embeddings/gemini.ts` → `src/core/embeddings/gemini.ts`
  - `api/_lib/core/embeddings/query.ts` → `src/core/embeddings/query.ts`
- **Required by:** `multimodal-context.ts`

### 4. Import Path Fixes (Agent 4)
- Fix `json-guards.ts` import path
- Validate all Phase 2 files
- Run final checks

## Agent Assignments

### Agent 1: Context Types & Core
**Files:** 1 file
- `context-types.ts`

**Validation:**
```bash
pnpm type-check  # Should reduce errors
pnpm lint
```

### Agent 2: Security System
**Files:** 2 files
- `pii-detector.ts`
- `audit-logger.ts`

**Validation:**
```bash
pnpm type-check  # Should reduce errors
pnpm lint
```

### Agent 3: Embeddings System
**Files:** 2 files
- `gemini.ts`
- `query.ts`

**Validation:**
```bash
pnpm type-check  # Should reduce errors
pnpm lint
```

### Agent 4: Fix Import Paths & Validation
**Tasks:**
- Fix `json-guards.ts` import path
- Verify all imports resolve
- Run final validation
- Update PROJECT_STATUS.md

## Success Criteria

After all agents complete:
- ✅ All missing dependencies imported
- ✅ `pnpm type-check` passes (or only expected errors remain)
- ✅ `pnpm lint` passes
- ✅ `pnpm test --run` passes (24/24 tests)
- ✅ All import paths are absolute from root
- ✅ No `@/` aliases
- ✅ PROJECT_STATUS.md updated

## Current Type Errors (Expected to Fix)

```
src/core/context/context-storage.ts(2,45): Cannot find module 'src/core/context/context-types'
src/core/context/context-summarizer.ts(3,40): Cannot find module 'src/core/context/context-types'
src/core/context/multimodal-context.ts(2,123): Cannot find module 'src/core/context/context-types'
src/core/context/multimodal-context.ts(25,28): Cannot find module 'src/core/embeddings/gemini'
src/core/context/multimodal-context.ts(26,45): Cannot find module 'src/core/embeddings/query'
src/core/context/multimodal-context.ts(7,52): Cannot find module 'src/core/security/pii-detector'
src/core/context/multimodal-context.ts(8,26): Cannot find module 'src/core/security/audit-logger'
src/types/json-guards.ts(8,27): Cannot find module 'src/supabase/database.types'
```

## Next Steps

1. **Generate prompts:**
   ```bash
   node scripts/generate-phase2-continuation-prompts.js
   ```

2. **Open 4 agent chats in Cursor:**
   - Copy prompts from `scripts/agent-prompts/phase-2-continuation-*.txt`
   - Each agent works in parallel

3. **Monitor progress:**
   - Check `PROJECT_STATUS.md` after each agent completes
   - Run `pnpm type-check` to see error reduction

4. **Final validation:**
   ```bash
   pnpm type-check
   pnpm lint
   pnpm test --run
   ```

## Notes

- Agents work in parallel but on different files (no conflicts)
- Each agent validates their work before completing
- Agent 4 coordinates final validation
- All agents update PROJECT_STATUS.md

---

**Ready to deploy parallel agents!**

