# Agent 10: Fix Type Errors - ROOT

## Objective
Fix all TypeScript type errors in the root category files.

## Files to Fix (2 files, 31 errors)
- App.tsx (30 errors)
- context/ToastContext.tsx (1 errors)

## Error Details
```
App.tsx:
  - Line 79: TS2307 - Cannot find module './scripts/verify-services' or its corresponding type declarations.
  - Line 93: TS6133 - 'setSessionId' is declared but its value is never read.
  - Line 552: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  - Line 552: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  - Line 555: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  - Line 555: TS2345 - Argument of type 'string | undefined' is not assignable to parameter of type 'string'.
  - Line 685: TS2345 - Argument of type '(prev: VisualState) => { shape: VisualShape; textContent: string | undefined; weatherData: { condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy"; temperature?: string; } | undefined; ... 4 more ...; mode: "listening" | ... 2 more ... | "idle"; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.
  - Line 697: TS6133 - 'hasAudio' is declared but its value is never read.
  - Line 698: TS6133 - 'hasVision' is declared but its value is never read.
  - Line 699: TS6133 - 'hasFiles' is declared but its value is never read.
  - Line 702: TS2345 - Argument of type '(prev: VisualState) => { audioLevel: number; mode: "listening" | "thinking" | "speaking" | "idle"; shape: VisualShape; textContent: string | undefined; weatherData: { ...; } | undefined; chartData: { ...; } | undefined; mapData: { ...; } | undefined; isActive: boolean; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.
  - Line 768: TS2375 - Type '{ title: string; lat: number | undefined; lng: number | undefined; }' is not assignable to type '{ title: string; lat?: number; lng?: number; destination?: { title: string; lat: number; lng: number; }; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 773: TS2345 - Argument of type '(prev: VisualState) => { shape: "map"; mapData: { title: string; lat?: number; lng?: number; destination?: { title: string; lat: number; lng: number; }; } | undefined; isActive: boolean; ... 4 more ...; chartData?: { ...; }; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.
  - Line 780: TS2345 - Argument of type '(prev: TranscriptItem[]) => (TranscriptItem | { id: string; role: "user" | "model"; text: string; timestamp: Date; isFinal: boolean; status: "complete"; groundingMetadata: GroundingMetadata | undefined; })[]' is not assignable to parameter of type 'SetStateAction<TranscriptItem[]>'.
  - Line 834: TS2375 - Type '{ title: any; lat: any; lng: any; destination: { lat: any; lng: any; title: any; } | undefined; }' is not assignable to type '{ title: string; lat?: number; lng?: number; destination?: { title: string; lat: number; lng: number; }; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 845: TS2375 - Type '{ lat: any; lng: any; title?: string; destination?: { title: string; lat: number; lng: number; }; }' is not assignable to type '{ title: string; lat?: number; lng?: number; destination?: { title: string; lat: number; lng: number; }; }' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 854: TS2345 - Argument of type '(prev: VisualState) => { shape: any; textContent: string | undefined; weatherData: { condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy"; temperature?: string; } | undefined; ... 4 more ...; mode: "listening" | ... 2 more ... | "idle"; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.
  - Line 1117: TS2345 - Argument of type '(prev: VisualState) => { shape: VisualShape; textContent: string | undefined; weatherData: { condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy"; temperature?: string; } | undefined; ... 4 more ...; mode: "listening" | ... 2 more ... | "idle"; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.
  - Line 1128: TS2375 - Type '{ id: string; role: "user"; text: string; timestamp: Date; isFinal: true; status: "complete"; attachment: { type: "image" | "file"; url: string; mimeType: string; data: string; name: string; } | undefined; }' is not assignable to type 'TranscriptItem' with 'exactOptionalPropertyTypes: true'. Consider adding 'undefined' to the types of the target's properties.
  - Line 1164: TS18047 - 'liveServiceRef.current' is possibly 'null'.
  - Line 1166: TS18047 - 'liveServiceRef.current' is possibly 'null'.
  - Line 1170: TS18047 - 'liveServiceRef.current' is possibly 'null'.
  - Line 1209: TS2345 - Argument of type 'Location | undefined' is not assignable to parameter of type '{ latitude: number; longitude: number; }'.
  - Line 1212: TS2345 - Argument of type 'Location | undefined' is not assignable to parameter of type '{ latitude: number; longitude: number; }'.
  - Line 1282: TS2345 - Argument of type '(prev: TranscriptItem[]) => (TranscriptItem | { text: string; reasoning: string | undefined; groundingMetadata: any; isFinal: true; status: "complete"; id: string; role: "user" | "model"; timestamp: Date; attachment?: { ...; }; })[]' is not assignable to parameter of type 'SetStateAction<TranscriptItem[]>'.
  - Line 1312: TS2345 - Argument of type '(prev: TranscriptItem[]) => (TranscriptItem | { text: string; reasoning: string | undefined; groundingMetadata: any; isFinal: true; status: "complete"; id: string; role: "user" | "model"; timestamp: Date; attachment?: { ...; }; })[]' is not assignable to parameter of type 'SetStateAction<TranscriptItem[]>'.
  - Line 1352: TS2345 - Argument of type '(prev: TranscriptItem[]) => (TranscriptItem | { text: string; reasoning: string | undefined; groundingMetadata: any; isFinal: true; status: "complete"; id: string; role: "user" | "model"; timestamp: Date; attachment?: { ...; }; })[]' is not assignable to parameter of type 'SetStateAction<TranscriptItem[]>'.
  - Line 1399: TS2345 - Argument of type '(prev: TranscriptItem[]) => (TranscriptItem | { text: string; reasoning: unknown; isFinal: true; status: "complete"; id: string; role: "user" | "model"; timestamp: Date; attachment?: { ...; }; groundingMetadata?: GroundingMetadata; })[]' is not assignable to parameter of type 'SetStateAction<TranscriptItem[]>'.
  - Line 1431: TS2339 - Property 'length' does not exist on type '{}'.
  - Line 1443: TS2345 - Argument of type '(prev: VisualState) => { shape: VisualShape; textContent: string | undefined; weatherData: { condition: "sunny" | "cloudy" | "rainy" | "snowy" | "stormy"; temperature?: string; } | undefined; ... 4 more ...; mode: "listening" | ... 2 more ... | "idle"; }' is not assignable to parameter of type 'SetStateAction<VisualState>'.

context/ToastContext.tsx:
  - Line 2: TS2307 - Cannot find module 'components/components/ui/Toast' or its corresponding type declarations.
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
**Agent ID:** 10
**Category:** root
**Files:** 2
**Errors:** 31
