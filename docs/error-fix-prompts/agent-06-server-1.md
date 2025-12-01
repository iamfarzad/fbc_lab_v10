# Agent 6: Fix Type Errors - SERVER-1

## Objective
Fix all TypeScript type errors in the server-1 category files.

## Files to Fix (5 files, 26 errors)
- server/context/conversation-history.ts (2 errors)
- server/context/injection.ts (3 errors)
- server/context/orchestrator-sync.ts (6 errors)
- server/handlers/context-update-handler.ts (5 errors)
- server/handlers/start-handler.ts (10 errors)

## Error Details
```
server/context/conversation-history.ts:
  - Line 11: TS2307 - Cannot find module '../../api/_lib/context/multimodal-context.js' or its corresponding type declarations.
  - Line 26: TS7006 - Parameter 'entry' implicitly has an 'any' type.

server/context/injection.ts:
  - Line 2: TS2307 - Cannot find module 'src/src/config/constants' or its corresponding type declarations.
  - Line 78: TS2353 - Object literal may only specify known properties, and 'mimeType' does not exist in type '{ text: string; }'.
  - Line 110: TS2322 - Type 'undefined' is not assignable to type 'Timeout'.

server/context/orchestrator-sync.ts:
  - Line 3: TS6133 - 'safeSend' is declared but its value is never read.
  - Line 4: TS6133 - 'MESSAGE_TYPES' is declared but its value is never read.
  - Line 17: TS6133 - 'client' is declared but its value is never read.
  - Line 23: TS2307 - Cannot find module '../../api/_lib/context/multimodal-context.js' or its corresponding type declarations.
  - Line 58: TS6133 - 'agentContext' is declared but its value is never read.
  - Line 77: TS7006 - Parameter 'msg' implicitly has an 'any' type.

server/handlers/context-update-handler.ts:
  - Line 88: TS2375 - Type '{ analysis: string; capturedAt: number; imageData: string | undefined; lastInjected: number | undefined; lastPersisted: number | undefined; }' is not assignable to type 'Snapshot' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 102: TS18048 - 'snapRef' is possibly 'undefined'.
  - Line 102: TS18048 - 'snapRef' is possibly 'undefined'.
  - Line 105: TS18048 - 'snapRef' is possibly 'undefined'.
  - Line 108: TS2307 - Cannot find module '../../api/_lib/context/multimodal-context' or its corresponding type declarations.

server/handlers/start-handler.ts:
  - Line 8: TS2307 - Cannot find module 'server/live-api/config-builder' or its corresponding type declarations.
  - Line 9: TS2307 - Cannot find module 'server/live-api/session-manager' or its corresponding type declarations.
  - Line 10: TS2307 - Cannot find module 'server/live-api/tool-processor' or its corresponding type declarations.
  - Line 13: TS2307 - Cannot find module 'src/core/session/session-coordinator' or its corresponding type declarations.
  - Line 202: TS6133 - 'timeoutId' is declared but its value is never read.
  - Line 336: TS2307 - Cannot find module '../../api/_lib/context/multimodal-context' or its corresponding type declarations.
  - Line 426: TS2307 - Cannot find module '../../api/_lib/context/multimodal-context' or its corresponding type declarations.
  - Line 508: TS2412 - Type 'undefined' is not assignable to type 'Timeout' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  - Line 528: TS2412 - Type 'undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
  - Line 550: TS2412 - Type 'undefined' is not assignable to type 'string' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the type of the target.
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
**Agent ID:** 6
**Category:** server-1
**Files:** 5
**Errors:** 26
