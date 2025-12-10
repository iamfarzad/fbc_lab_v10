# December 6 vs Current Codebase: Critical Differences

**Date:** 2025-12-10  
**Issue:** Black webcam frame, 1007 errors, rate limiting blocking audio

---

## Critical Issues Found

### 1. Empty Transcription Objects (Causes 1007 Error) ❌

**Current (BROKEN):**
```typescript
// server/live-api/config-builder.ts:322-323
inputAudioTranscription: {},  // ❌ Empty object causes 1007 error
outputAudioTranscription: {}, // ❌ Empty object causes 1007 error
```

**December 6 (WORKING):**
```typescript
// No transcription objects at all - transcription enabled by default
// speechConfig only
```

**Fix:** Remove empty transcription objects - they cause "Request contains an invalid argument" (1007) error

---

### 2. Rate Limiting Blocking Audio Chunks ❌

**Current:**
- Audio rate limit: 200 chunks/second
- Logs show: "Rate limit exceeded for REALTIME_INPUT" for audio chunks
- Audio chunks are being sent faster than 200/sec

**December 6:**
- Same rate limit (200/sec)
- But audio might have been throttled differently or sent at lower frequency

**Issue:** Audio chunks are exceeding the rate limit, causing them to be blocked

---

### 3. WebcamPreview Dependency Array ❌

**Current:**
```typescript
}, [isWebcamActive, facingMode, onSendFrame]); // onSendFrame might change
```

**Problem:** If `onSendFrame` changes, the effect re-runs, stopping and restarting the stream, causing black frame

**Fix:** Remove `onSendFrame` from deps (it's stable via useCallback)

---

### 4. Session Race Condition (Fixed) ✅

**Current:**
- Backend waits for session in activeSessions if isReady is true
- Client delays flushing queued frames by 200ms

**December 6:**
- Simpler flow, no race condition handling

**Status:** Fixed in previous commit

---

### 5. Const Assignment Error (Fixed) ✅

**Current:**
```typescript
const client = activeSessions.get(connectionId)
// Later: client = activeSessions.get(connectionId) // ❌ Error
```

**Fix:** Changed to `let client`

---

## Root Causes

1. **1007 Error:** Empty transcription objects → Live API rejects config → session closes → black frame
2. **Rate Limiting:** Audio chunks sent too fast → blocked → session degrades
3. **Stream Restart:** onSendFrame in deps → effect re-runs → stream stops → black frame

---

## Fixes Applied

1. ✅ Removed empty `inputAudioTranscription: {}` and `outputAudioTranscription: {}`
2. ✅ Removed `onSendFrame` from WebcamPreview dependency array
3. ✅ Fixed const assignment error (changed to `let`)
4. ✅ Added session race condition handling (previous fix)

---

## Testing

After fixes:
- [ ] No more 1007 errors
- [ ] Webcam shows video (not black)
- [ ] No rate limit warnings for audio
- [ ] AI can see webcam feed
- [ ] Stream doesn't restart unexpectedly

---

**Status:** Fixes applied, ready for testing
