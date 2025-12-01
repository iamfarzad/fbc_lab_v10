# Original Codebase Analysis

**Generated:** 2025-12-01  
**Source:** `/Users/farzad/fbc-lab-9`

## ✅ Verification Results

### Build Tool
- **Tool:** Vite ✅ (matches our plan)
- **Config:** `vite.config.ts` exists
- **TypeScript:** `tsconfig.json` exists

### Structure
- **Root Directories:** 18
- **Root Files:** 40
- **Key Files:** All present ✅

### Duplicates Found
We identified duplicates in 5 categories (as expected):

1. **Tools:** `api/_lib/core/tools` vs `src/core/tools` (10 files each)
2. **Context:** `api/_lib/context` vs `src/core/context` (9 vs 5 files)
3. **Analytics:** `api/_lib/core/analytics` vs `src/core/analytics` (2 files each)
4. **Supabase:** `api/_lib/supabase` vs `src/core/supabase` (3 vs 1 files)
5. **Config:** `api/_lib/config` vs `src/config` (3 files each)

**Action Required:** Compare and merge before importing (see `DUPLICATE_COMPARISON_CHECKLIST.md`)

---

## ⚠️ Discrepancies to Address

### 1. Import Path Strategy

**Original Codebase:**
- Uses `@/` alias for `src/` directory
- `vite.config.ts` has: `'@': path.resolve(__dirname, './src')`
- `tsconfig.json` has: `"@/*": ["./src/*"]`

**Our Plan:**
- Use absolute imports from root (no `@/` alias)
- Use: `components/X`, `services/Y`, `src/Z`

**Impact:**
- All imports using `@/` need to be updated to absolute paths
- This is expected and part of our cleanup strategy

### 2. Environment Variable Naming

**Original Codebase:**
- Uses `NEXT_PUBLIC_` prefix (legacy from Next.js)
- Examples: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_LIVE_SERVER_URL`

**Our Plan:**
- Temporarily support `NEXT_PUBLIC_` during import
- Standardize to `VITE_` prefix after import phase

**Impact:**
- `vite.config.ts` needs to inject `NEXT_PUBLIC_*` vars (already planned)
- Migration to `VITE_` will be a separate phase

### 3. Server Structure

**Original:**
- `server/` has its own `package.json` ✅
- 8 dependencies in server
- 7 TypeScript files at root of `server/`

**Our Plan:**
- Keep `server/` structure
- Deploy from root (server imports from `src/`)

**Status:** ✅ Matches our plan

---

## 📋 File Verification

### Root Files (Expected)
- ✅ `types.ts`
- ✅ `config.ts`
- ✅ `App.tsx`
- ✅ `index.tsx`
- ✅ `package.json`
- ✅ `tsconfig.json`
- ✅ `vite.config.ts`

### Key Directories
- ✅ `components/` (14 items)
- ✅ `services/` (7 items)
- ✅ `utils/` (5 items)
- ✅ `src/` (7 subdirectories)
- ✅ `server/` (26 items, has own package.json)
- ✅ `api/` (6 subdirectories)
- ✅ `context/` (1 item)

---

## 🔍 Additional Findings

### 1. API Structure
- `api/_lib/` - Legacy code (to be migrated to `src/`)
- `api/admin/` - Admin routes
- `api/chat/` - Chat routes
- `api/send-pdf-summary/` - PDF summary route

### 2. Server Structure
- Has own `package.json` ✅
- `server/handlers/` - Request handlers
- `server/websocket/` - WebSocket logic
- `server/live-api/` - Live API
- `server/rate-limiting/` - Rate limiting
- `server/utils/` - Server utilities

### 3. Source Structure (`src/`)
- `src/components/` - Shared components
- `src/config/` - Configuration
- `src/core/` - Core business logic
  - `agents/` - AI agents
  - `tools/` - Tool implementations
  - `context/` - Context management
  - `analytics/` - Analytics
  - `supabase/` - Supabase client
- `src/lib/` - Shared libraries
- `src/schemas/` - Zod schemas
- `src/types/` - TypeScript types
- `src/hooks/` - React hooks

---

## ✅ Readiness Checklist

### Pre-Import Verification
- [x] Source path configured (`.source-config.json`)
- [x] Build tool verified (Vite)
- [x] Key files exist
- [x] Duplicates identified
- [x] Structure matches expectations
- [x] Import strategy defined
- [x] Environment variable strategy defined

### Import Strategy
- [x] Import order defined (`docs/IMPORT_ORDER.md`)
- [x] Duplicate comparison process defined
- [x] Import path update strategy defined
- [x] Validation process defined

### Tools Ready
- [x] `scripts/import-file.js` - File import tool
- [x] `scripts/analyze-original-codebase.js` - Analysis tool
- [x] `scripts/compare-duplicates.js` - Duplicate comparison
- [x] `scripts/generate-agent-prompts.js` - Agent coordination

---

## 🎯 Next Steps

1. **Start Phase 1 Import**
   - Import foundation files (types, config, utils)
   - Update import paths from `@/` to absolute
   - Validate after each file

2. **Handle Duplicates**
   - Compare `api/_lib/` vs `src/` versions
   - Merge unique functionality
   - Update imports to merged versions

3. **Continue Incrementally**
   - Follow `docs/IMPORT_ORDER.md`
   - Validate at each step
   - Update `PROJECT_STATUS.md`

---

## 📊 Statistics

- **Expected Files:** 298 (from import map)
- **Root Directories:** 18
- **Root Files:** 40
- **Duplicate Categories:** 5
- **Server Dependencies:** 8
- **Main Dependencies:** 11
- **Dev Dependencies:** 14

---

## ⚠️ Important Notes

1. **Import Path Updates Required:**
   - All `@/` imports → absolute paths
   - Example: `@/config/constants` → `src/config/constants`

2. **Environment Variables:**
   - Support `NEXT_PUBLIC_*` during import
   - Migrate to `VITE_*` after import

3. **Duplicate Merging:**
   - Must compare before importing
   - Preserve all unique functionality
   - Update imports after merge

4. **Server Deployment:**
   - Deploy from root
   - Server imports from `src/`
   - Keep server's `package.json`

---

## ✅ Conclusion

**Status:** Ready to start import process

All key files exist, structure matches expectations, and duplicates are identified. The main work will be:
1. Updating import paths (`@/` → absolute)
2. Merging duplicate files
3. Validating incrementally

**Proceed with Phase 1 import.**

