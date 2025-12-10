# Config Validation Per Official Gemini Live API Docs

**Date:** 2025-12-10  
**Source:** Official Gemini Live API documentation review

---

## Valid Config Elements (Re-enabled)

### 1. Transcription Objects ✅

**Per docs:** Empty transcription objects are valid:
```typescript
inputAudioTranscription: {},  // ✅ Valid per docs
outputAudioTranscription: {}, // ✅ Valid per docs
```

**Previous assumption:** These caused 1007 - **INCORRECT**
**Reality:** They're valid. The 1007 was from `text/plain` chunks (now fixed).

---

### 2. Tools Configuration ✅

**Per docs:** Tools with `googleSearch` and `functionDeclarations` are valid:
```typescript
tools: [
  { googleSearch: {} },
  { functionDeclarations: [...] }
]
```

**Previous assumption:** Tools caused 1007 - **INCORRECT**
**Reality:** Tools are valid. 1007 was from:
- `text/plain` chunks (now fixed)
- Possibly malformed function declarations (now validated)

---

## Function Declaration Schema (Per Docs)

**Required fields:**
- `name` (string): Required, alphanumeric + `_` `:` `.` `-`, max 64 chars
- `description` (string): Required

**Optional fields:**
- `parameters` (object): OpenAPI 3.0.3 Parameter Object
- `parametersJsonSchema` (Value format): JSON Schema format
- `response` (object): OpenAPI 3.0.3 Response Object
- `responseJsonSchema` (Value format): JSON Schema format

---

## Validation Added

1. ✅ Re-enabled `inputAudioTranscription: {}` and `outputAudioTranscription: {}`
2. ✅ Re-enabled tools with proper validation:
   - Validates `name` exists and is string
   - Validates `description` exists and is string
   - Validates `name` format (alphanumeric + `_` `:` `.` `-`)
   - Validates `name` length (max 64 chars)
3. ✅ Re-enabled `googleSearch: {}` (always included)

---

## What Actually Caused 1007

1. ✅ **`text/plain` chunks** - Fixed by disabling `sendText()` and rejecting text on server
2. ⚠️ **Possibly malformed function declarations** - Now validated per schema
3. ❓ **`presence_penalty`** - Not found in codebase, but check external wrappers

---

## Current Config (Validated)

```typescript
const liveConfig = {
  responseModalities: [Modality.AUDIO],
  inputAudioTranscription: {},  // ✅ Valid
  outputAudioTranscription: {}, // ✅ Valid
  speechConfig: {
    voiceConfig: {
      prebuiltVoiceConfig: {
        voiceName: voiceNameOverride || VOICE_CONFIG.DEFAULT_VOICE
      }
    }
  },
  systemInstruction: {
    parts: [{ text: fullInstruction }]
  },
  tools: [
    { googleSearch: {} },
    { functionDeclarations: validatedFunctions }  // ✅ Validated per schema
  ]
}
```

---

## Next Steps

1. ✅ Re-enabled transcription objects
2. ✅ Re-enabled tools with validation
3. ✅ Fixed `text/plain` issue
4. ⏳ Test with full config to verify 1007 is resolved
