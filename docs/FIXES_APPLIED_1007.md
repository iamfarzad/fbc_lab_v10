# Fixes Applied for 1007 Error

**Date:** 2025-12-10  
**Issue:** 1007 "Request contains an invalid argument" error closing Live API sessions

---

## Root Cause

**December 6 working config had:**
- ✅ No `inputAudioTranscription: {}`
- ✅ No `outputAudioTranscription: {}`
- ✅ No `generationConfig` or `temperature`
- ✅ Tools: `[{ googleSearch: {} }]` only (no functionDeclarations)

**Current broken config had:**
- ✅ No transcription objects (fixed)
- ❌ `temperature: 1.0` on top level (removed)
- ❌ `functionDeclarations` in tools (disabled)

---

## Fixes Applied

### 1. Removed Empty Transcription Objects ✅
```typescript
// REMOVED:
// inputAudioTranscription: {},
// outputAudioTranscription: {},
```

### 2. Removed Temperature ✅
```typescript
// REMOVED:
// temperature: 1.0
```

### 3. Disabled Function Declarations ✅
```typescript
// Changed from:
toolsConfig = [
  { googleSearch: {} },
  { functionDeclarations: validFunctions }
]

// To (matching December 6):
toolsConfig = [{ googleSearch: {} }]
```

---

## Current Config (Matches December 6)

```typescript
const liveConfig: any = {
  responseModalities: [Modality.AUDIO],
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
  tools: [{ googleSearch: {} }]  // Only googleSearch, no functionDeclarations
}
```

---

## Next Steps

1. **Restart server** to apply config changes
2. **Test connection** - should not get 1007 error
3. **Verify webcam + voice** work together
4. **Re-enable functionDeclarations later** when Live API supports them

---

## Expected Result

- ✅ No 1007 errors
- ✅ Session stays connected
- ✅ Webcam frames send successfully
- ✅ Voice audio works
- ✅ AI can see webcam and hear voice
