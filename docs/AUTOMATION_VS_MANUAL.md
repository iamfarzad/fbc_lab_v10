# ESLint Errors: Automation vs Manual Fix

## Current Status
- **~140 errors** remaining (down from 156 after automation)
- **1087 warnings**

## ✅ Just Fixed Automatically
- **22** `@ts-ignore` → `@ts-expect-error` fixes
- **11** `async` removals (functions with no await)
- **12 files** modified

## What Can Be Automated ✅

### 1. `@typescript-eslint/ban-ts-comment` (3 errors)
**Status:** ✅ **AUTOMATABLE**
- Replace `@ts-ignore` with `@ts-expect-error`
- **Script:** `scripts/fix-ban-ts-comment.js`
- **Files:** `utils/pdfUtils.ts` (2 instances)

### 2. `@typescript-eslint/require-await` (50 errors)
**Status:** ⚠️ **PARTIALLY AUTOMATABLE**
- Can remove `async` from functions with no `await`
- **Challenge:** Need to analyze function body to detect `await`
- **Script:** `scripts/fix-require-await-comprehensive.js` (needs improvement)
- **Manual work:** ~30-40 errors need careful review

### 3. `@typescript-eslint/no-floating-promises` (6 errors)
**Status:** ✅ **AUTOMATABLE**
- Add `void` operator or `.catch()`
- **Script:** `scripts/fix-floating-promises.js` (exists but needs improvement)

### 4. `@typescript-eslint/no-misused-promises` (20 errors)
**Status:** ⚠️ **PARTIALLY AUTOMATABLE**
- Wrap in arrow functions: `onClick={() => { void promise() }}`
- **Script:** `scripts/fix-misused-promises.js` (exists but needs improvement)
- **Manual work:** Some cases need context-specific fixes

## What Needs Manual Fix ⚠️

### 1. `@typescript-eslint/no-unsafe-argument` (29 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Need type assertions: `value as Type`
- Or proper type definitions
- **Why manual:** Requires understanding the data structure
- **Script:** `scripts/report-unsafe-arguments.js` (reports only)

### 2. `@typescript-eslint/no-redundant-type-constituents` (9 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Remove redundant types from unions
- Example: `string | "literal"` → `string`
- **Why manual:** Requires understanding type semantics

### 3. `@typescript-eslint/no-unsafe-member-access` (9 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Add type guards or type assertions
- **Why manual:** Requires understanding object structure

### 4. `@typescript-eslint/restrict-template-expressions` (5 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Fix template literal expressions
- **Why manual:** Context-specific

### 5. `@typescript-eslint/no-unsafe-enum-comparison` (3 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Fix enum comparisons
- **Why manual:** Requires understanding enum types

### 6. `@typescript-eslint/no-base-to-string` (3 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Fix toString() calls on objects
- **Why manual:** Context-specific

### 7. `@typescript-eslint/await-thenable` (3 errors)
**Status:** ❌ **MANUAL REQUIRED**
- Remove `await` from non-promises
- **Why manual:** Requires understanding return types

### 8. `no-constant-condition` (1 error)
**Status:** ❌ **MANUAL REQUIRED**
- Fix constant conditions in loops/ifs
- **Why manual:** Logic-specific

## Recommendation

### Phase 1: Quick Wins (Automated) - ~10-15 errors
1. Fix `ban-ts-comment` (3 errors) ✅
2. Fix simple `require-await` cases (10-15 errors) ⚠️
3. Fix `floating-promises` (6 errors) ⚠️

### Phase 2: Semi-Automated - ~30-40 errors
1. Improve `require-await` script to handle more cases
2. Improve `misused-promises` script
3. Manual review of automated fixes

### Phase 3: Manual - ~100-110 errors
1. Fix `no-unsafe-argument` (29 errors) - Add type assertions
2. Fix `no-redundant-type-constituents` (9 errors) - Clean up types
3. Fix remaining type-safety issues

## Estimated Time
- **Automated fixes:** 1-2 hours (script improvements + running)
- **Manual fixes:** 4-8 hours (depending on complexity)

## Strategy
1. **Don't fix all 156 manually** - Focus on automation first
2. **Fix by category** - Start with easiest (ban-ts-comment)
3. **Use scripts** - Even partial automation helps
4. **Prioritize errors** - Fix high-impact errors first

## Next Steps
1. ✅ Fix `ban-ts-comment` manually (quick win)
2. Improve `require-await` script to catch more cases
3. Run improved scripts
4. Manually fix remaining `no-unsafe-argument` errors (biggest category)
5. Fix other type-safety issues as needed

