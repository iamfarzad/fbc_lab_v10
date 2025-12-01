# Import Process Summary

## What We've Set Up

### 1. Analysis Tools
- ✅ `analyze-dependencies.js` - Analyzes import map, identifies dependency levels
- ✅ `compare-duplicates.js` - Compares duplicate files (needs actual source files to work)

### 2. Documentation
- ✅ `docs/IMPORT_STRATEGY.md` - Overall strategy, file structure, decisions
- ✅ `docs/IMPORT_ORDER.md` - Prioritized import list (128 files)
- ✅ `docs/DUPLICATE_COMPARISON_CHECKLIST.md` - Step-by-step process for comparing duplicates

### 3. Decisions Made
- ✅ **Keep agents** - Migrate from `api/_lib/agents/` → `src/core/agents/`
- ✅ **Keep WebSocket server** - Import `server/` directory
- ✅ **Use `src/` structure** - Migrate/merge `api/_lib/` code into `src/`
- ✅ **Compare duplicates first** - Before importing, compare and merge duplicates

## Current Status

**Files to import:** 180
**Foundation files (no deps):** 87
**Files to skip:** 118 (archived/disabled)

## Next Steps

### Immediate (Before Importing)

1. **Set up directory structure**
   ```bash
   mkdir -p src/{components,services,lib,core/{context,agents,tools,live,queue},config,types,hooks}
   mkdir -p server/{handlers,websocket,context,rate-limiting,live-api,utils}
   mkdir -p utils/visuals
   mkdir -p components/chat
   mkdir -p context
   ```

2. **Access original codebase** - Need source files to:
   - Compare duplicates
   - Extract unique functions
   - Merge implementations

### Phase 1: Foundation Files (Start Here)

Import files with **no dependencies** first:

**Types (10 files):**
- `types.ts`
- `src/types/core.ts`
- `src/types/conversation-flow.ts`
- `src/core/database.types.ts`
- `src/core/live/types.ts`
- `src/core/tools/tool-types.ts`
- `src/core/tools/types.ts`
- `src/core/queue/job-types.ts`
- `server/message-types.ts`
- `server/message-payload-types.ts`

**Config (5 files):**
- `config.ts`
- `src/config/constants.ts`
- `src/config/env.ts`
- `src/config/live-tools.ts`
- `src/lib/ai/retry-config.ts`

**Utils (15+ files):**
- `utils/browser-compat.ts`
- `utils/audioUtils.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- ... (see IMPORT_ORDER.md for full list)

### Phase 2: Compare Duplicates

**Before importing these, compare duplicates:**

1. **Tools (10 files)** - Compare `api/_lib/core/tools/*` vs `src/core/tools/*`
2. **Context (2 files)** - Compare context files
3. **Analytics (2 files)** - Compare analytics files
4. **Supabase (1 file)** - Compare client files
5. **Config (2 files)** - Compare config files

### Phase 3: Migrate Agents

**15 agent files** from `api/_lib/agents/` → `src/core/agents/`:
- Update all imports in each agent
- Update orchestrator imports
- Test agent system works

### Phase 4: Continue Import

Follow `IMPORT_ORDER.md` for remaining files.

## Workflow for Each File

```
1. Check if file has duplicate
   ↓
2. If duplicate: Compare → Merge → Import merged version
   ↓
3. If no duplicate: Import directly
   ↓
4. Update import paths
   ↓
5. Verify imports resolve
   ↓
6. Move to next file
```

## Key Files to Reference

- **Strategy:** `docs/IMPORT_STRATEGY.md`
- **Order:** `docs/IMPORT_ORDER.md`
- **Duplicates:** `docs/DUPLICATE_COMPARISON_CHECKLIST.md`
- **Analysis:** Run `node analyze-dependencies.js`

## Important Notes

1. **One file at a time** - Don't skip ahead
2. **Compare duplicates first** - Don't lose functionality
3. **Update imports as you go** - Keep paths consistent
4. **Test after each import** - Catch issues early
5. **Document decisions** - Note why certain merges were done

## Questions?

- Check `IMPORT_STRATEGY.md` for decisions
- Check `DUPLICATE_COMPARISON_CHECKLIST.md` for merge process
- Run `node analyze-dependencies.js` for dependency analysis

