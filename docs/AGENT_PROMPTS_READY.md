# Phase 2 Continuation: Agent Prompts Ready for Deployment

**Date:** 2025-12-01  
**Status:** ✅ Agent 1 Complete, Agents 2-4 Ready

## ✅ Agent 1: COMPLETE

**Task:** Import `context-types.ts`  
**Status:** ✅ Imported and validated  
**Result:** Fixed 3 type errors

---

## 📋 Agents 2-4: Ready to Deploy

### Agent 2: Security System

**Copy this prompt into a new agent chat:**

```
You are Agent 2: Security System

TASK: Import security files required by multimodal-context

Files to import (in this order):
1. api/_lib/core/security/pii-detector.ts → src/core/security/pii-detector.ts
2. api/_lib/core/security/audit-logger.ts → src/core/security/audit-logger.ts

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/PHASE_2_COMPLETE.md for Phase 2 status
3. Access source files from original project:
   - Check .source-config.json for source location (/Users/farzad/fbc-lab-9)
   - Read files directly from that path
   - Use: node scripts/import-file.js <file-path> --validate
4. For each file to import:
   a. Import using: node scripts/import-file.js <source-path>
   b. Move to target location: mv <imported-file> <target-path>
   c. Update import paths to absolute from root (no @/ aliases)
   d. Remove .js extensions from imports
   e. Fix any obvious type errors
5. After importing all files:
   - Run: pnpm type-check (MUST pass or fix errors)
   - Run: pnpm lint (MUST pass or fix errors)
   - Run: pnpm test --run (verify tests still pass)
6. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All files imported to correct locations
- [ ] All import paths updated (absolute from root)
- [ ] pnpm type-check passes (or errors documented)
- [ ] pnpm lint passes
- [ ] pnpm test --run passes
- [ ] PROJECT_STATUS.md updated

IMPORT PATH RULES:
- Use absolute paths from root: 'src/lib/X', 'src/core/Y'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/PHASE_2_COMPLETE.md for current Phase 2 status.
```

---

### Agent 3: Embeddings System

**Copy this prompt into a new agent chat:**

```
You are Agent 3: Embeddings System

TASK: Import embeddings files required by multimodal-context

Files to import (in this order):
1. api/_lib/core/embeddings/gemini.ts → src/core/embeddings/gemini.ts
2. api/_lib/core/embeddings/query.ts → src/core/embeddings/query.ts

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/PHASE_2_COMPLETE.md for Phase 2 status
3. Access source files from original project:
   - Check .source-config.json for source location (/Users/farzad/fbc-lab-9)
   - Read files directly from that path
   - Use: node scripts/import-file.js <file-path> --validate
4. For each file to import:
   a. Import using: node scripts/import-file.js <source-path>
   b. Move to target location: mv <imported-file> <target-path>
   c. Update import paths to absolute from root (no @/ aliases)
   d. Remove .js extensions from imports
   e. Fix any obvious type errors
5. After importing all files:
   - Run: pnpm type-check (MUST pass or fix errors)
   - Run: pnpm lint (MUST pass or fix errors)
   - Run: pnpm test --run (verify tests still pass)
6. Update PROJECT_STATUS.md with:
   - Files imported
   - Any issues found
   - Validation results

VALIDATION CHECKLIST:
- [ ] All files imported to correct locations
- [ ] All import paths updated (absolute from root)
- [ ] pnpm type-check passes (or errors documented)
- [ ] pnpm lint passes
- [ ] pnpm test --run passes
- [ ] PROJECT_STATUS.md updated

IMPORT PATH RULES:
- Use absolute paths from root: 'src/lib/X', 'src/core/Y'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/PHASE_2_COMPLETE.md for current Phase 2 status.
```

---

### Agent 4: Fix Import Paths & Validation

**Copy this prompt into a new agent chat:**

```
You are Agent 4: Fix Import Paths & Validation

TASK: Fix remaining import paths and validate Phase 2 completion

Tasks to complete:
1. Fix json-guards.ts import path (src/supabase/database.types → src/core/database.types)
2. Verify all Phase 2 files can be imported
3. Run type-check and fix any remaining errors
4. Run lint and fix any issues
5. Update PROJECT_STATUS.md

REQUIREMENTS:
1. Read PROJECT_STATUS.md to understand current state
2. Read docs/PHASE_2_COMPLETE.md for Phase 2 status
3. Access source files from original project:
   - Check .source-config.json for source location (/Users/farzad/fbc-lab-9)
   - Read files directly from that path
   - Use: node scripts/import-file.js <file-path> --validate
4. Fix import paths:
   - Update json-guards.ts to use correct database.types path
   - Verify all imports resolve
   - Fix any broken imports
5. After fixing all paths:
   - Run: pnpm type-check (MUST pass or fix errors)
   - Run: pnpm lint (MUST pass or fix errors)
   - Run: pnpm test --run (verify tests still pass)
6. Update PROJECT_STATUS.md with:
   - Files fixed
   - Any issues found
   - Validation results
   - Phase 2 completion status

VALIDATION CHECKLIST:
- [ ] json-guards.ts import path fixed
- [ ] All import paths updated (absolute from root)
- [ ] pnpm type-check passes (or errors documented)
- [ ] pnpm lint passes
- [ ] pnpm test --run passes
- [ ] PROJECT_STATUS.md updated

IMPORT PATH RULES:
- Use absolute paths from root: 'src/lib/X', 'src/core/Y'
- NO @/ aliases
- NO .js extensions
- NO relative paths (../)

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
See docs/PHASE_2_COMPLETE.md for current Phase 2 status.
```

---

## 📊 Current Status

**Agent 1:** ✅ Complete  
**Agents 2-4:** Ready to deploy

**Type Errors:** Check with `pnpm type-check 2>&1 | grep "error TS" | wc -l`  
**Tests:** Should be 24/24 passing

---

## 🚀 Deployment Instructions

1. **Open 3 new agent chats in Cursor** (Agent 1 is done)
2. **Copy-paste each prompt above** into separate agent chats
3. **Agents work in parallel** - no conflicts
4. **Monitor progress:**
   ```bash
   pnpm type-check 2>&1 | grep "error TS" | wc -l
   ```
5. **After all complete:**
   ```bash
   pnpm type-check
   pnpm lint
   pnpm test --run
   ```

---

**Ready to deploy Agents 2-4! 🚀**

