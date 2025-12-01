# Duplicate Comparison Checklist

## Process for Each Duplicate File

Before importing any file that has a duplicate, follow this process:

### Step 1: Identify Duplicates

Check if the file you're about to import has a duplicate:

**Tools (10 files):**
- [ ] `calculate-roi.ts`
- [ ] `draft-follow-up-email.ts`
- [ ] `extract-action-items.ts`
- [ ] `generate-proposal.ts`
- [ ] `generate-summary-preview.ts`
- [ ] `shared-tool-registry.ts`
- [ ] `shared-tools.ts`
- [ ] `tool-executor.ts`
- [ ] `tool-types.ts`
- [ ] `types.ts`

**Context (2 files):**
- [ ] `multimodal-context.ts`
- [ ] `context-storage.ts`

**Analytics (2 files):**
- [ ] `agent-analytics.ts`
- [ ] `tool-analytics.ts`

**Other:**
- [ ] `supabase/client.ts`
- [ ] `config/constants.ts`
- [ ] `config/env.ts`

### Step 2: Compare Files

For each duplicate pair:

1. **Open both files side-by-side**
   - `api/_lib/[path]/[file]` (source)
   - `src/core/[path]/[file]` (target)

2. **Extract and document:**
   - [ ] All exported functions/classes/interfaces
   - [ ] All unique functions in source file
   - [ ] All unique functions in target file
   - [ ] Import differences
   - [ ] Implementation differences

3. **Create comparison document:**
   ```markdown
   ## [filename] Comparison
   
   ### Source: `api/_lib/[path]/[file]`
   - Exports: [list]
   - Functions: [list]
   - Unique to source: [list]
   
   ### Target: `src/core/[path]/[file]`
   - Exports: [list]
   - Functions: [list]
   - Unique to target: [list]
   
   ### Merge Plan:
   - [ ] Function A from source → add to target
   - [ ] Function B from target → keep
   - [ ] Update imports in merged file
   ```

### Step 3: Merge Strategy

**Decision rules:**
1. **Keep target structure** (`src/`) as base
2. **Add missing functions** from source (`api/_lib/`)
3. **Resolve conflicts** by:
   - If same function name: Compare implementations, keep better one
   - If different implementations: Merge logic if possible, or create wrapper
4. **Update imports** to use new paths
5. **Update exports** to include all needed items

### Step 4: Create Merged File

1. **Start with target file** (`src/` version)
2. **Add unique functions** from source
3. **Update imports** to match new structure:
   ```typescript
   // OLD (api/_lib)
   import { something } from 'api/_lib/context/context-storage'
   
   // NEW (src) - Use absolute path from root, NO @ alias
   import { something } from 'src/core/context/context-storage'
   ```
4. **Test imports resolve**
5. **Verify all exports present**

### Step 5: Update Dependencies

After merging, update all files that import the duplicate:

1. **Find all imports** of the old path
2. **Update to new path**
3. **Verify no broken imports**

## Tools Comparison Example

### `tool-executor.ts`

**Source:** `api/_lib/core/tools/tool-executor.ts`
**Target:** `src/core/tools/tool-executor.ts`

**Check:**
- [ ] Same function signatures?
- [ ] Same error handling?
- [ ] Same caching logic?
- [ ] Import path differences?
- [ ] Any unique utility functions?

**Merge:**
- [ ] Use target as base
- [ ] Add any unique functions from source
- [ ] Update imports
- [ ] Test

## Context Comparison Example

### `multimodal-context.ts`

**Source:** `api/_lib/context/multimodal-context.ts`
**Target:** `src/core/context/multimodal-context.ts`

**Check:**
- [ ] Same context structure?
- [ ] Same methods?
- [ ] Same state management?
- [ ] Any unique features in source?
- [ ] Any unique features in target?

**Merge:**
- [ ] Compare class/interface definitions
- [ ] Merge unique methods
- [ ] Update all internal imports
- [ ] Update all external imports that use this

## Agent Migration Checklist

When migrating agents from `api/_lib/agents/` to `src/core/agents/`:

For each agent file:

1. **Check dependencies:**
   - [ ] Does it import `api/_lib/core/tools/tool-executor`? → Update to `src/core/tools/tool-executor`
   - [ ] Does it import `api/_lib/context/context-storage`? → Update to `src/core/context/context-storage`
   - [ ] Does it import `api/_lib/utils/ai-client`? → Update to `src/lib/ai-client`
   - [ ] Does it import `api/_lib/config/constants`? → Update to `src/config/constants`

2. **Check for duplicates:**
   - [ ] Is there a `src/core/agents/[agent-name].ts`? If yes, compare first

3. **Migrate:**
   - [ ] Copy file to `src/core/agents/`
   - [ ] Update all imports
   - [ ] Update exports if needed
   - [ ] Test imports resolve

4. **Update orchestrator:**
   - [ ] Update `orchestrator.ts` to import from new paths
   - [ ] Update agent registry

## Quick Reference: Import Path Updates

| Old Path | New Path | Example |
|----------|----------|--------|
| `api/_lib/core/tools/` | `src/core/tools/` | `import { tool } from 'src/core/tools/tool-executor'` |
| `api/_lib/context/` | `src/core/context/` | `import { context } from 'src/core/context/multimodal-context'` |
| `api/_lib/core/analytics/` | `src/core/analytics/` | `import { analytics } from 'src/core/analytics/agent-analytics'` |
| `api/_lib/agents/` | `src/core/agents/` | `import { agent } from 'src/core/agents/orchestrator'` |
| `api/_lib/supabase/` | `src/core/supabase/` | `import { client } from 'src/core/supabase/client'` |
| `api/_lib/config/` | `src/config/` | `import { constants } from 'src/config/constants'` |
| `api/_lib/utils/` | `src/lib/` | `import { util } from 'src/lib/ai-client'` |
| `api/_lib/lib/` | `src/lib/` | `import { lib } from 'src/lib/errors'` |

**Note:** Use absolute paths from root, NO `@/` alias prefix.

## Notes

- Always preserve functionality from both versions
- When in doubt, keep both implementations with different names
- Document why certain functions were kept/removed
- Test after each merge
- Update this checklist as you discover new duplicates

