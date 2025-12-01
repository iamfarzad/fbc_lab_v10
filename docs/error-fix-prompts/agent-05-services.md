# Agent 5: Fix Type Errors - SERVICES

## Objective
Fix all TypeScript type errors in the services category files.

## Files to Fix (5 files, 9 errors)
- services/aiBrainService.ts (2 errors)
- services/geminiLiveService.ts (1 errors)
- services/leadResearchService.ts (3 errors)
- services/standardChatService.ts (2 errors)
- services/unifiedContext.ts (1 errors)

## Error Details
```
services/aiBrainService.ts:
  - Line 68: TS6133 - 'isLocal' is declared but its value is never read.
  - Line 192: TS6133 - 'snapshot' is declared but its value is never read.

services/geminiLiveService.ts:
  - Line 403: TS6133 - 'mimeType' is declared but its value is never read.

services/leadResearchService.ts:
  - Line 15: TS2352 - Conversion of type '{ company: { name: string; domain: string; industry: undefined; size: undefined; summary: string; website: string; linkedin: undefined; country: undefined; }; person: { fullName: string | undefined; role: undefined; seniority: undefined; profileUrl: undefined; company: string; }; role: string; confidence: number; st...' to type 'ResearchResult' may be a mistake because neither type sufficiently overlaps with the other. If this was intentional, convert the expression to 'unknown' first.
  - Line 47: TS2375 - Type '{ company: { name: string; domain: string; industry: string; size: string; summary: string; website: string; linkedin: string; country: string; }; person: { fullName: string; role: string; seniority: string; profileUrl: string; company: string; }; role: string; confidence: number; strategic: undefined; citations: ne...' is not assignable to type 'ResearchResult' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 90: TS6133 - 'responseSchema' is declared but its value is never read.

services/standardChatService.ts:
  - Line 392: TS2375 - Type '{ toolCalls?: undefined; groundingMetadata?: GroundingMetadata; reasoning?: string; text: string; }' is not assignable to type '{ text: string; reasoning?: string; groundingMetadata?: any; toolCalls?: any[]; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 396: TS2873 - This kind of expression is always falsy.

services/unifiedContext.ts:
  - Line 26: TS6133 - 'isInitialized' is declared but its value is never read.
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
**Agent ID:** 5
**Category:** services
**Files:** 5
**Errors:** 9
