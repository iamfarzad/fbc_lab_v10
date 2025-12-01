# Agent 7: Fix Type Errors - SERVER-2

## Objective
Fix all TypeScript type errors in the server-2 category files.

## Files to Fix (5 files, 8 errors)
- server/utils/errors.ts (1 errors)
- server/utils/tool-implementations.ts (3 errors)
- server/websocket/connection-manager.ts (2 errors)
- server/websocket/message-router.ts (1 errors)
- server/websocket/server.ts (1 errors)

## Error Details
```
server/utils/errors.ts:
  - Line 38: TS2412 - Type 'Record<string, unknown> | undefined' is not assignable to type 'Record<string, unknown>' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.

server/utils/tool-implementations.ts:
  - Line 43: TS6133 - 'args' is declared but its value is never read.
  - Line 183: TS6133 - 'sessionId' is declared but its value is never read.
  - Line 209: TS6133 - 'args' is declared but its value is never read.

server/websocket/connection-manager.ts:
  - Line 167: TS2304 - Cannot find name 'CloseClient'.
  - Line 214: TS2304 - Cannot find name 'CloseClient'.

server/websocket/message-router.ts:
  - Line 203: TS2304 - Cannot find name 'CloseClient'.

server/websocket/server.ts:
  - Line 83: TS2353 - Object literal may only specify known properties, and 'port' does not exist in type 'Error'.
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
**Agent ID:** 7
**Category:** server-2
**Files:** 5
**Errors:** 8
