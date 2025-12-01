# Strict Import Rules for Missing Files

**Date:** 2025-12-01  
**Purpose:** Mandatory rules for importing agents, PDF utilities, admin utilities, and API utilities

## 🚨 CRITICAL RULES (MUST FOLLOW)

### Rule 1: Read Status First
**BEFORE doing anything:**
1. ✅ Read `PROJECT_STATUS.md` - Understand current state
2. ✅ Read `docs/GAP_ANALYSIS_VS_PLAN.md` - Understand what's missing
3. ✅ Read `docs/IMPORT_ORDER.md` - Understand import sequence
4. ✅ Check for duplicates using `compare-duplicates.js`

**NEVER skip this step.**

---

### Rule 2: Import Path Rules (STRICT)

**MANDATORY import path format:**

```typescript
// ✅ CORRECT - Absolute from root, NO extensions, NO @ alias
import { orchestrator } from 'src/core/agents/orchestrator'
import { pdfGenerator } from 'src/core/pdf-generator-puppeteer'
import { adminChatService } from 'src/core/admin/admin-chat-service'
import { logger } from 'src/core/utils/logger'

// ❌ WRONG - NO @ alias
import { orchestrator } from '@/src/core/agents/orchestrator'

// ❌ WRONG - NO .js/.ts extensions
import { orchestrator } from 'src/core/agents/orchestrator.js'

// ❌ WRONG - NO relative paths (unless absolutely necessary)
import { orchestrator } from '../core/agents/orchestrator'

// ❌ WRONG - NO double core
import { orchestrator } from 'src/core/core/agents/orchestrator'
```

**Path Mapping:**
| Source Path | Target Path |
|------------|-------------|
| `api/_lib/agents/` | `src/core/agents/` |
| `api/_lib/core/pdf-*` | `src/core/pdf-*` |
| `api/_lib/core/admin/` | `src/core/admin/` |
| `api/_lib/lib/api/` | `src/core/lib/api/` |
| `api/_lib/utils/` | `src/core/utils/` |
| `server/utils/` | `src/core/utils/` (if referenced by admin routes) |

---

### Rule 3: Check Dependencies First

**BEFORE importing any file:**

1. ✅ **List all dependencies** the file imports
2. ✅ **Verify each dependency exists** in the migrated codebase
3. ✅ **If dependency missing:** Import dependency FIRST
4. ✅ **If dependency has wrong path:** Fix path FIRST

**Dependency Order for Missing Files:**

```
Priority 1 (No dependencies):
- src/core/agents/types.ts
- src/core/agents/intent.ts

Priority 2 (Depends on Priority 1):
- src/core/agents/agent-persistence.ts
- src/core/agents/index.ts

Priority 3 (Depends on tools/context):
- src/core/agents/orchestrator.ts
- src/core/agents/discovery-agent.ts
- src/core/agents/scoring-agent.ts
- ... (all other agents)

Priority 4 (Utilities - no dependencies):
- src/core/pdf-roi-charts.ts
- src/core/pdf-generator-puppeteer.ts
- src/core/token-usage-logger.ts
- src/core/utils/json.ts
- src/core/utils/logger.ts

Priority 5 (Depends on utilities):
- src/core/admin/admin-chat-service.ts
- src/core/lib/api/response.ts
- src/core/lib/api-middleware.ts
```

---

### Rule 4: Check for Duplicates

**BEFORE importing:**

1. ✅ **Check if file exists** in `src/` directory
2. ✅ **If exists:** Use `compare-duplicates.js` to compare
3. ✅ **If duplicate:** Follow merge process (see `DUPLICATE_COMPARISON_CHECKLIST.md`)
4. ✅ **If no duplicate:** Import directly

**Known Duplicates to Check:**
- None for agents (they're only in `api/_lib/agents/`)
- Check PDF utilities if they exist elsewhere
- Check admin utilities if they exist elsewhere

---

### Rule 5: Update All Import References

**AFTER importing:**

1. ✅ **Find all files** that reference the old path
2. ✅ **Update to new path** (absolute from root)
3. ✅ **Remove `.js` extensions** from imports
4. ✅ **Fix `src/core/core/` → `src/core/`** typos
5. ✅ **Remove `api/_lib/` references**

**Files that need updates after agent import:**
- `api/chat.ts` - Already references `src/core/agents/orchestrator` (correct path, but file missing)
- `server/context/orchestrator-sync.ts` - May reference old paths
- Any other files importing agents

---

### Rule 6: Validation After Each File

**AFTER importing EACH file:**

```bash
# 1. Type check (MUST pass)
pnpm type-check

# 2. Lint (MUST pass)
pnpm lint

# 3. Check circular dependencies
pnpm check:circular

# 4. Verify imports resolve
# (TypeScript will catch this in type-check)
```

**If any check fails:**
- ❌ **DO NOT proceed** to next file
- ✅ **Fix errors** before continuing
- ✅ **Re-run checks** until all pass

---

### Rule 7: Update PROJECT_STATUS.md

**AFTER importing EACH file (or batch):**

1. ✅ **Update "Files Imported"** section
2. ✅ **Update progress counters**
3. ✅ **Update "Current Phase"** if phase complete
4. ✅ **Document any issues** found
5. ✅ **Update "Next Steps"** section

**Format:**
```markdown
### Session: [Date] - Agent Import
- ✅ Imported `src/core/agents/orchestrator.ts`
- ✅ Fixed import paths (no .js extensions)
- ✅ Type check passes
- ⚠️ Issue: Missing dependency `src/core/utils/logger` (will import next)
```

---

### Rule 8: Import Order (STRICT)

**Follow this exact order:**

#### Step 1: Agent Foundation (No dependencies)
1. `src/core/agents/types.ts`
2. `src/core/agents/intent.ts`

#### Step 2: Agent Utilities
3. `src/core/agents/agent-persistence.ts`
4. `src/core/agents/index.ts`

#### Step 3: Core Agents (Depend on tools/context)
5. `src/core/agents/orchestrator.ts` ⚠️ **CRITICAL - Fixes api/chat.ts**
6. `src/core/agents/discovery-agent.ts`
7. `src/core/agents/scoring-agent.ts`
8. `src/core/agents/proposal-agent.ts`
9. `src/core/agents/closer-agent.ts`
10. `src/core/agents/retargeting-agent.ts`
11. `src/core/agents/summary-agent.ts`
12. `src/core/agents/workshop-sales-agent.ts`
13. `src/core/agents/consulting-sales-agent.ts`
14. `src/core/agents/admin-agent.ts`
15. `src/core/agents/lead-intelligence-agent.ts`

#### Step 4: PDF Utilities
16. `src/core/pdf-roi-charts.ts`
17. `src/core/pdf-generator-puppeteer.ts`

#### Step 5: Core Utilities
18. `src/core/utils/json.ts`
19. `src/core/utils/logger.ts`
20. `src/core/token-usage-logger.ts`

#### Step 6: Admin Utilities
21. `src/core/admin/admin-chat-service.ts`

#### Step 7: API Utilities
22. `src/core/lib/api/response.ts`
23. `src/core/lib/api-middleware.ts`

**DO NOT skip steps. DO NOT import out of order.**

---

### Rule 9: Fix Import Path Issues

**While importing, fix these known issues:**

1. ✅ **Remove `.js` extensions** (26 occurrences)
   ```typescript
   // ❌ WRONG
   import { x } from 'src/core/utils/logger.js'
   
   // ✅ CORRECT
   import { x } from 'src/core/utils/logger'
   ```

2. ✅ **Fix `src/core/core/` → `src/core/`** (4 files)
   ```typescript
   // ❌ WRONG
   import { x } from 'src/core/core/queue/redis-queue'
   
   // ✅ CORRECT
   import { x } from 'src/core/queue/redis-queue'
   ```

3. ✅ **Remove `api/_lib/` references**
   ```typescript
   // ❌ WRONG
   import { x } from '../../api/_lib/context/multimodal-context.js'
   
   // ✅ CORRECT
   import { x } from 'src/core/context/multimodal-context'
   ```

---

### Rule 10: Never Commit Broken Code

**BEFORE committing:**

1. ✅ **All type checks pass:** `pnpm type-check`
2. ✅ **All lint checks pass:** `pnpm lint`
3. ✅ **No circular dependencies:** `pnpm check:circular`
4. ✅ **No secrets in code:** `pnpm check:secrets`
5. ✅ **All imports resolve:** Verified by TypeScript

**If any check fails:**
- ❌ **DO NOT commit**
- ✅ **Fix issues first**
- ✅ **Re-run all checks**

---

## 📋 Pre-Import Checklist

**Before starting import:**

- [ ] Read `PROJECT_STATUS.md`
- [ ] Read `docs/GAP_ANALYSIS_VS_PLAN.md`
- [ ] Understand what files are missing
- [ ] Check source location: `/Users/farzad/fbc-lab-9`
- [ ] Verify dependencies exist
- [ ] Plan import order
- [ ] Set up directory structure if needed

---

## 📋 Per-File Import Checklist

**For EACH file:**

- [ ] Check if duplicate exists (use `compare-duplicates.js`)
- [ ] If duplicate: Compare and merge first
- [ ] Verify all dependencies exist
- [ ] Import file from source
- [ ] Update ALL import paths:
  - [ ] Remove `@/` aliases
  - [ ] Remove `.js` extensions
  - [ ] Use absolute paths from root
  - [ ] Fix `src/core/core/` typos
- [ ] Run `pnpm type-check` (MUST pass)
- [ ] Run `pnpm lint` (MUST pass)
- [ ] Run `pnpm check:circular` (check for cycles)
- [ ] Update `PROJECT_STATUS.md`
- [ ] Find and update all files that import this file
- [ ] Verify no broken imports

---

## 📋 Post-Import Checklist

**After importing all files:**

- [ ] All 22-24 missing files imported
- [ ] All import paths fixed
- [ ] All `.js` extensions removed
- [ ] All `src/core/core/` typos fixed
- [ ] All `api/_lib/` references removed
- [ ] `pnpm type-check` passes (0 errors)
- [ ] `pnpm lint` passes (0 errors)
- [ ] `pnpm check:circular` passes (no critical cycles)
- [ ] `PROJECT_STATUS.md` updated
- [ ] All files that reference imported files updated
- [ ] `api/chat.ts` works (orchestrator exists)
- [ ] Admin routes work (dependencies exist)
- [ ] Tools work (PDF utilities exist)

---

## 🔧 Tools & Commands

### Required Commands After Each Import:
```bash
# Type check (MUST pass)
pnpm type-check

# Lint (MUST pass)
pnpm lint

# Check circular dependencies
pnpm check:circular

# Check for secrets (before commit)
pnpm check:secrets

# All checks
pnpm check:all
```

### Import File Command:
```bash
# Import from source
node scripts/import-file.js <source-path> --validate

# Example:
node scripts/import-file.js /Users/farzad/fbc-lab-9/api/_lib/agents/orchestrator.ts --validate
```

### Compare Duplicates:
```bash
node scripts/compare-duplicates.js
```

---

## ⚠️ Common Mistakes to Avoid

1. ❌ **Skipping dependency check** - Always check dependencies first
2. ❌ **Using `.js` extensions** - Never use file extensions in imports
3. ❌ **Using `@/` alias** - Always use absolute paths from root
4. ❌ **Skipping validation** - Always run checks after each file
5. ❌ **Importing out of order** - Follow dependency order strictly
6. ❌ **Not updating status** - Always update PROJECT_STATUS.md
7. ❌ **Not fixing references** - Update all files that import the new file
8. ❌ **Committing broken code** - Never commit if checks fail
9. ❌ **Using relative paths** - Use absolute paths from root
10. ❌ **Creating `src/core/core/`** - Watch for double "core" typos

---

## 📝 Example Import Workflow

### Example: Importing `orchestrator.ts`

```bash
# 1. Check dependencies
# orchestrator.ts depends on:
# - src/core/tools/tool-executor ✅ (exists)
# - src/core/context/context-storage ✅ (exists)
# - src/lib/ai-client ✅ (exists)
# - src/core/agents/types ✅ (need to import first!)

# 2. Import dependencies first
node scripts/import-file.js /Users/farzad/fbc-lab-9/api/_lib/agents/types.ts
# ... update paths, validate ...

# 3. Import orchestrator
node scripts/import-file.js /Users/farzad/fbc-lab-9/api/_lib/agents/orchestrator.ts

# 4. Update import paths in orchestrator.ts
# Change: api/_lib/core/tools/tool-executor → src/core/tools/tool-executor
# Change: api/_lib/context/context-storage → src/core/context/context-storage
# Change: api/_lib/utils/ai-client → src/lib/ai-client
# Change: api/_lib/agents/types → src/core/agents/types

# 5. Validate
pnpm type-check  # MUST pass
pnpm lint         # MUST pass

# 6. Update files that import orchestrator
# api/chat.ts already has correct path, just verify it works

# 7. Update status
# Edit PROJECT_STATUS.md: Add orchestrator.ts to imported files

# 8. Continue to next file
```

---

## 🎯 Success Criteria

**Import is complete when:**

1. ✅ All 22-24 missing files imported
2. ✅ `api/chat.ts` works (orchestrator exists)
3. ✅ Admin routes work (dependencies exist)
4. ✅ Tools work (PDF utilities exist)
5. ✅ `pnpm type-check` passes (0 errors)
6. ✅ `pnpm lint` passes (0 errors)
7. ✅ All import paths correct (no `.js`, no `@/`, no `src/core/core/`)
8. ✅ `PROJECT_STATUS.md` updated
9. ✅ All references updated

---

## 📚 Reference Documents

- `docs/DUPLICATE_COMPARISON_CHECKLIST.md` - How to compare duplicates
- `docs/IMPORT_STRATEGY.md` - Overall import strategy
- `docs/IMPORT_ORDER.md` - Import sequence
- `docs/CLEANUP_CHECKLIST.md` - Code quality checks
- `docs/PROJECT_CONFIG.md` - Import path rules
- `docs/CONTEXT_PRESERVATION.md` - Status update rules
- `PROJECT_STATUS.md` - Current project state

---

**Remember:** These rules are MANDATORY. Follow them strictly to ensure a clean, working codebase.

