# Agent 8: Fix Type Errors - CORE

## Objective
Fix all TypeScript type errors in the core category files.

## Files to Fix (8 files, 24 errors)
- src/core/lib/api/response.ts (2 errors)
- src/core/tools/calculate-roi.ts (1 errors)
- src/core/tools/draft-follow-up-email.ts (1 errors)
- src/core/tools/extract-action-items.ts (1 errors)
- src/core/tools/generate-proposal.ts (1 errors)
- src/core/tools/generate-summary-preview.ts (9 errors)
- src/core/tools/shared-tool-registry.ts (8 errors)
- src/core/tools/tool-executor.ts (1 errors)

## Error Details
```
src/core/lib/api/response.ts:
  - Line 20: TS6133 - 'headers' is declared but its value is never read.
  - Line 25: TS6133 - 'responseBody' is declared but its value is never read.

src/core/tools/calculate-roi.ts:
  - Line 8: TS2307 - Cannot find module 'src/pdf-roi-charts' or its corresponding type declarations.

src/core/tools/draft-follow-up-email.ts:
  - Line 13: TS2307 - Cannot find module 'src/pdf-generator-puppeteer' or its corresponding type declarations.

src/core/tools/extract-action-items.ts:
  - Line 8: TS2307 - Cannot find module 'src/pdf-generator-puppeteer' or its corresponding type declarations.

src/core/tools/generate-proposal.ts:
  - Line 10: TS2307 - Cannot find module 'src/lib/usage-limits' or its corresponding type declarations.

src/core/tools/generate-summary-preview.ts:
  - Line 8: TS2307 - Cannot find module 'src/pdf-generator-puppeteer' or its corresponding type declarations.
  - Line 90: TS7006 - Parameter 'decision' implicitly has an 'any' type.
  - Line 90: TS7006 - Parameter 'idx' implicitly has an 'any' type.
  - Line 98: TS7006 - Parameter 'step' implicitly has an 'any' type.
  - Line 98: TS7006 - Parameter 'idx' implicitly has an 'any' type.
  - Line 108: TS7006 - Parameter 'rec' implicitly has an 'any' type.
  - Line 108: TS7006 - Parameter 'idx' implicitly has an 'any' type.
  - Line 117: TS7006 - Parameter 'point' implicitly has an 'any' type.
  - Line 117: TS7006 - Parameter 'idx' implicitly has an 'any' type.

src/core/tools/shared-tool-registry.ts:
  - Line 104: TS2339 - Property 'productivityGain' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 104: TS2339 - Property 'productivityGain' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 105: TS2339 - Property 'errorReduction' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 105: TS2339 - Property 'errorReduction' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 106: TS2339 - Property 'customerSatisfaction' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 106: TS2339 - Property 'customerSatisfaction' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 107: TS2339 - Property 'revenueIncrease' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.
  - Line 107: TS2339 - Property 'revenueIncrease' does not exist on type '{ currentCost?: number | undefined; timeSavings?: number | undefined; employeeCostPerHour?: number | undefined; implementationCost?: number | undefined; timeline?: number | undefined; ... 4 more ...; retentionSavings?: number | undefined; }'.

src/core/tools/tool-executor.ts:
  - Line 237: TS2379 - Argument of type '{ inputs: Record<string, unknown> | undefined; outputs: Record<string, unknown> | undefined; cached: boolean; attempt: number; }' is not assignable to parameter of type '{ inputs?: Record<string, unknown>; outputs?: Record<string, unknown>; cached?: boolean; attempt?: number; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
```

## Instructions

1. **Read the source files** from the original codebase:
   - Source path: `/Users/farzad/fbc-lab-9`
   - For each file, check if it exists in the source and compare implementations

2. **Fix each error systematically:**
   - **TS2307 (Cannot find module)**: 
     - Check if the module exists in the codebase
     - If missing, check the original codebase for the correct import path
     - Update import paths to use absolute paths from root (no `@/` aliases, no `.js` extensions)
   
   - **TS6133 (Unused variable)**:
     - Remove unused variables or prefix with `_` if needed for future use
   
   - **TS7006 (Implicit any)**:
     - Add explicit type annotations to parameters
   
   - **TS18048 / TS2532 (Possibly undefined)**:
     - Add null checks or use nullish coalescing (`??`)
     - Use optional chaining (`?.`) where appropriate
   
   - **TS2375 / TS2379 (Type not assignable)**:
     - Fix strict optional property types by explicitly setting `undefined` for optional properties
     - Ensure types match exactly (check `exactOptionalPropertyTypes` requirements)
   
   - **TS2339 (Property does not exist)**:
     - Check if the property exists in the type definition
     - Add the property if missing or use type assertion if appropriate

3. **Follow the established structure:**
   - Use absolute imports from root (e.g., `src/lib/logger`, not `@/lib/logger`)
   - No `.js` extensions in imports
   - Follow the file structure defined in `PROJECT_STATUS.md`

4. **After fixing:**
   - Run `pnpm type-check` to verify errors are fixed
   - Run `pnpm lint` to check for linting issues
   - Update `PROJECT_STATUS.md` with progress

5. **Validation:**
   - All type errors in your assigned files should be resolved
   - No new errors should be introduced
   - Code should follow TypeScript strict mode requirements

## Files Location
- Target files are in: `/Users/farzad/fbc_lab_v10`
- Original source: `/Users/farzad/fbc-lab-9`

## Success Criteria
- ✅ All type errors in assigned files are fixed
- ✅ Type check passes for your files
- ✅ No new errors introduced
- ✅ Code follows project structure and conventions

---
**Agent ID:** 8
**Category:** core
**Files:** 8
**Errors:** 24
