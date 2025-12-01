# Agent 2: Fix Type Errors - API

## Objective
Fix all TypeScript type errors in the api category files.

## Files to Fix (3 files, 7 errors)
- api/chat.ts (3 errors)
- api/chat/persist-message.ts (1 errors)
- api/send-pdf-summary/route.ts (3 errors)

## Error Details
```
api/chat.ts:
  - Line 2: TS2307 - Cannot find module 'src/core/agents/orchestrator' or its corresponding type declarations.
  - Line 3: TS2307 - Cannot find module 'src/core/agents/types' or its corresponding type declarations.
  - Line 4: TS2307 - Cannot find module 'src/core/core/queue/redis-queue' or its corresponding type declarations.

api/chat/persist-message.ts:
  - Line 10: TS6133 - 'metadata' is declared but its value is never read.

api/send-pdf-summary/route.ts:
  - Line 1: TS2307 - Cannot find module 'src/core/lib/supabase' or its corresponding type declarations.
  - Line 2: TS2307 - Cannot find module 'src/core/utils/logger' or its corresponding type declarations.
  - Line 3: TS2307 - Cannot find module 'src/core/core/email-service' or its corresponding type declarations.
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
**Agent ID:** 2
**Category:** api
**Files:** 3
**Errors:** 7
