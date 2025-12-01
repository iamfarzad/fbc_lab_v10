# Agent 3: Fix Type Errors - COMPONENTS-1

## Objective
Fix all TypeScript type errors in the components-1 category files.

## Files to Fix (6 files, 20 errors)
- components/AntigravityCanvas.tsx (7 errors)
- components/chat/CalendarWidget.tsx (1 errors)
- components/chat/ChatInputDock.tsx (6 errors)
- components/chat/ChatMessage.tsx (3 errors)
- components/chat/MarkdownRenderer.tsx (1 errors)
- components/chat/WebcamPreview.tsx (2 errors)

## Error Details
```
components/AntigravityCanvas.tsx:
  - Line 59: TS2375 - Type '{ index: number; total: number; width: number; height: number; time: number; audio: number; rawAudio: number; mouse: { x: number; y: number; }; p: { x: number; y: number; baseAlpha: number; }; visualState: VisualState; localTime: string | undefined; }' is not assignable to type 'ParticleContext' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 258: TS2532 - Object is possibly 'undefined'.
  - Line 258: TS2532 - Object is possibly 'undefined'.
  - Line 259: TS2532 - Object is possibly 'undefined'.
  - Line 259: TS2532 - Object is possibly 'undefined'.
  - Line 319: TS18048 - 'touch' is possibly 'undefined'.
  - Line 319: TS18048 - 'touch' is possibly 'undefined'.

components/chat/CalendarWidget.tsx:
  - Line 1: TS6133 - 'React' is declared but its value is never read.

components/chat/ChatInputDock.tsx:
  - Line 4: TS6133 - 'TranscriptItem' is declared but its value is never read.
  - Line 4: TS2307 - Cannot find module 'src/types' or its corresponding type declarations.
  - Line 41: TS6133 - 'onConnect' is declared but its value is never read.
  - Line 42: TS6133 - 'onDisconnect' is declared but its value is never read.
  - Line 105: TS18048 - 'item' is possibly 'undefined'.
  - Line 107: TS18048 - 'item' is possibly 'undefined'.

components/chat/ChatMessage.tsx:
  - Line 3: TS2307 - Cannot find module 'src/types' or its corresponding type declarations.
  - Line 235: TS7006 - Parameter 'query' implicitly has an 'any' type.
  - Line 235: TS7006 - Parameter 'idx' implicitly has an 'any' type.

components/chat/MarkdownRenderer.tsx:
  - Line 149: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.

components/chat/WebcamPreview.tsx:
  - Line 3: TS2307 - Cannot find module 'src/utils/visuals/store' or its corresponding type declarations.
  - Line 152: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
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
**Agent ID:** 3
**Category:** components-1
**Files:** 6
**Errors:** 20
