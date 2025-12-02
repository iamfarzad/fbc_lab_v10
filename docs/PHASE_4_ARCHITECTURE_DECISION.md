# Phase 4: Architecture Decision - Services Location

**Date:** 2025-12-02  
**Status:** ✅ Validated - Original plan is correct

## Decision

**Keep `services/` at root level** - No folder structure realignment needed.

## Current Architecture

```
Root Level (Frontend-Only):
├── components/     ← React components
├── services/       ← Frontend services (API clients, React hooks)
├── utils/         ← Frontend utilities
└── context/       ← React context

src/ (Shared Code - Used by BOTH Frontend AND Backend):
├── core/          ← Business logic (server imports from here)
├── config/        ← Configuration (shared)
└── lib/           ← Libraries (shared)
```

## Validation Results

- ✅ `services/` directory exists at root (6 service files + 7 test files)
- ✅ All import paths correct (8 imports verified)
- ✅ Vite config: `'services': path.resolve(__dirname, './services')` ✅
- ✅ Vitest config: `'services': path.resolve(__dirname, './services')` ✅
- ✅ TypeScript config: `baseUrl: "."` supports absolute imports ✅
- ✅ Server does NOT import from services (verified - no matches in `server/`)
- ✅ Architecture pattern is consistent and correct
- ✅ Fixed @/ aliases in test files (2 files, 4 occurrences → `src/`)

## Files Verified

### Service Files (6):
- `services/unifiedContext.ts`
- `services/standardChatService.ts`
- `services/aiBrainService.ts`
- `services/chromeAiService.ts`
- `services/geminiLiveService.ts`
- `services/leadResearchService.ts` → Moved to `src/core/intelligence/lead-research.ts` (Phase 2 consolidation)

### Import Locations (8 imports):
- `App.tsx` - 6 imports (relative: `./services/...`)
- `components/AdminDashboard.tsx` - 1 import (absolute: `services/...`)
- `test/voice-mode-e2e.test.ts` - 1 import (relative: `../services/...`)

### Config Files:
- `vite.config.ts` - Alias correctly configured ✅
- `vitest.config.ts` - Alias + coverage correctly configured ✅
- `tsconfig.json` - `baseUrl: "."` supports absolute imports ✅

## Alternative Considered

**Proposed:** Move `services/` to `src/services/` for "architecture standards"

**Why Rejected:**
1. **Breaks architectural pattern** - Services are frontend-only, not shared code
2. **Creates confusion** - What's shared vs frontend-only?
3. **Adds unused code to server Docker image** - Server doesn't use services
4. **Requires unnecessary updates** - 5 files would need changes
5. **Inconsistent** - `components/`, `utils/` remain at root, why move only services?

**Impact if moved:**
- Would require updating:
  - `App.tsx` (6 imports)
  - `components/AdminDashboard.tsx` (1 import)
  - `test/voice-mode-e2e.test.ts` (1 import)
  - `vite.config.ts` (1 alias)
  - `vitest.config.ts` (1 alias + 1 coverage path)
- Would break the clear separation: root = frontend, `src/` = shared

## Conclusion

The original plan was correct. Services should remain at root level as frontend-only code. The separation between root (frontend) and `src/` (shared) is intentional and architecturally sound.

**No changes needed.** ✅

