# Gap Closure Plan

**Date:** 2025-12-01  
**Purpose:** Step-by-step plan to import the 2 missing admin utility files

## Missing Files

1. `src/core/admin/admin-chat-service.ts`
2. `src/core/token-usage-logger.ts`

---

## Step-by-Step Import Process

### Step 1: Create Admin Directory

```bash
mkdir -p src/core/admin
```

**Status:** ✅ Directory will be created automatically when file is imported

---

### Step 2: Import `admin-chat-service.ts`

**Source:** `/Users/farzad/fbc-lab-9/api/_lib/core/admin/admin-chat-service.ts`  
**Target:** `src/core/admin/admin-chat-service.ts`

**Original imports to fix:**
```typescript
// ❌ Original (wrong paths)
import { getSupabaseService } from '../../lib/supabase.js'
import type { Database } from '../../supabase/database.types.js'
```

**Fixed imports:**
```typescript
// ✅ Fixed (absolute paths, no extensions)
import { getSupabaseService } from 'src/lib/supabase'
import type { Database } from 'src/core/database.types'
```

**Action:**
1. Copy file from source
2. Update import paths
3. Remove `.js` extensions
4. Verify `getSupabaseService` exists in `src/lib/supabase` ✅ (it does)

---

### Step 3: Import `token-usage-logger.ts`

**Source:** `/Users/farzad/fbc-lab-9/api/_lib/core/token-usage-logger.ts`  
**Target:** `src/core/token-usage-logger.ts`

**Original imports:** None (standalone file)

**Action:**
1. Copy file from source
2. No import path fixes needed (standalone file)
3. Verify it exports `getTokenUsageByDateRange` ✅

---

### Step 4: Uncomment Imports in Admin Routes

#### File 1: `api/admin/sessions/route.ts`

**Change:**
```typescript
// ❌ Before (commented)
// import { adminChatService } from 'src/core/admin/admin-chat-service'

// ✅ After (uncommented)
import { adminChatService } from 'src/core/admin/admin-chat-service'
```

**Also uncomment usage:**
```typescript
// ❌ Before
// const sessionsRaw = await adminChatService.getAdminSessions(adminId)
const sessions: unknown[] = [] // Stub

// ✅ After
const sessionsRaw = await adminChatService.getAdminSessions(adminId)
const sessions = Array.isArray(sessionsRaw)
  ? sessionsRaw.map(s => asAdminSession(s)).filter((s): s is AdminSessionRow => s !== null).slice(0, validatedLimit)
  : []
```

**Note:** May need to uncomment `asAdminSession` import if available.

---

#### File 2: `api/admin/token-costs/route.ts`

**Change:**
```typescript
// ❌ Before (commented)
// import { getTokenUsageByDateRange } from 'src/core/token-usage-logger'

// ✅ After (uncommented)
import { getTokenUsageByDateRange } from 'src/core/token-usage-logger'
```

**Also uncomment usage:**
```typescript
// ❌ Before
// const dailyUsage = await getTokenUsageByDateRange(startDate, now, model)
const dailyUsage: unknown[] = [] // Stub

// ✅ After
const dailyUsage = await getTokenUsageByDateRange(startDate, now, model)
```

---

### Step 5: Verify Dependencies

**Check these exist:**
- ✅ `src/lib/supabase` - Has `getSupabaseService` ✅
- ✅ `src/core/database.types` - Has `Database` type ✅
- ✅ `src/core/admin/admin-chat-service.ts` - Will exist after Step 2
- ✅ `src/core/token-usage-logger.ts` - Will exist after Step 3

---

### Step 6: Run Validation

```bash
# Type check
pnpm type-check

# Lint
pnpm lint

# Run tests
pnpm test
```

**Expected:** No new errors (files are stubs, so functionality is limited but should compile)

---

## Implementation Commands

### Quick Import (Manual)

```bash
# 1. Import admin-chat-service.ts
cp /Users/farzad/fbc-lab-9/api/_lib/core/admin/admin-chat-service.ts src/core/admin/admin-chat-service.ts

# 2. Import token-usage-logger.ts
cp /Users/farzad/fbc-lab-9/api/_lib/core/token-usage-logger.ts src/core/token-usage-logger.ts

# 3. Fix import paths in admin-chat-service.ts (see Step 2 above)

# 4. Uncomment imports in admin routes (see Step 4 above)

# 5. Run validation
pnpm type-check && pnpm lint
```

---

## Automated Import Script

You can also use the import script:

```bash
# Import admin-chat-service.ts
node scripts/import-file.js /Users/farzad/fbc-lab-9/api/_lib/core/admin/admin-chat-service.ts --target src/core/admin/admin-chat-service.ts

# Import token-usage-logger.ts
node scripts/import-file.js /Users/farzad/fbc-lab-9/api/_lib/core/token-usage-logger.ts --target src/core/token-usage-logger.ts
```

**Then manually fix import paths and uncomment admin route imports.**

---

## Verification Checklist

After completion, verify:

- [ ] `src/core/admin/admin-chat-service.ts` exists
- [ ] `src/core/token-usage-logger.ts` exists
- [ ] Import paths in `admin-chat-service.ts` are fixed (absolute, no extensions)
- [ ] `api/admin/sessions/route.ts` imports `adminChatService` (uncommented)
- [ ] `api/admin/token-costs/route.ts` imports `getTokenUsageByDateRange` (uncommented)
- [ ] `pnpm type-check` passes with no new errors
- [ ] `pnpm lint` passes with no new errors
- [ ] Admin routes compile successfully

---

## Notes

1. **Both files are stubs** - They're not fully implemented in the original codebase either
2. **Functionality is limited** - Admin features will work but return empty data until fully implemented
3. **No breaking changes** - These are additions, not modifications
4. **Import paths are critical** - Must use absolute paths from root, no `.js` extensions

---

## Expected Outcome

After completing these steps:
- ✅ All missing files imported
- ✅ Admin routes functional (with stub implementations)
- ✅ No type errors
- ✅ Gap closed: 95% → 100% completion

