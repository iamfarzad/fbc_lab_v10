# Text/Plain 1007 Error Fix

**Date:** 2025-12-10  
**Root Cause:** `text/plain` chunks being sent via `sendRealtimeInput()` causes 1007 error

---

## The Problem

**Logs show:**
```
[12:34:50.414] realtime_input_sent (1470aac0)
{
  "chunks": 1,
  "mimeType": "text/plain"
}
[12:34:50.526] session_closed (1470aac0)
{
  "code": 1007,
  "reason": "Request contains an invalid argument."
}
```

**Root Cause:**
- Live API's `sendRealtimeInput()` **only accepts audio/video media**
- Sending `text/plain` via `sendRealtimeInput()` causes error 1007
- Text should be included in `systemInstruction` during session setup, NOT sent as realtime input

---

## Where Text Was Being Sent

1. **`src/core/live/client.ts:812`** - `sendText()` method sends `text/plain`
2. **`App.tsx:415, 419`** - Calls `liveServiceRef.current?.sendText()`
3. **`services/geminiLiveService.ts:555`** - Wrapper calls `liveClient.sendText()`

---

## Fixes Applied

### 1. Disabled `sendText()` in LiveClientWS ✅
```typescript
sendText(text: string) {
  // CRITICAL FIX: Live API's sendRealtimeInput() only accepts audio/video media, NOT text
  // Sending text via sendRealtimeInput causes error 1007
  console.warn('[LiveClientWS] sendText() called but disabled - text cannot be sent via sendRealtimeInput')
  return
}
```

### 2. Reject Text on Server Side ✅
```typescript
// server/handlers/realtime-input-handler.ts
const isText = mimeType === 'text/plain' || mimeType.startsWith('text/')

if (isText) {
  serverLogger.warn('REALTIME_INPUT: Rejecting text chunk - Live API does not accept text (causes 1007 error)')
  return
}
```

### 3. Removed `sendText()` Calls in App.tsx ✅
```typescript
// Removed:
// liveServiceRef.current?.sendText("Analyze this image.");  // ❌ DISABLED
// liveServiceRef.current?.sendText(text);  // ❌ DISABLED
```

---

## Expected Result

- ✅ No more `text/plain` chunks sent to Live API
- ✅ No more 1007 errors from text
- ✅ Session stays connected
- ✅ Webcam + voice work together

---

## Note

Text should be included in `systemInstruction` during session setup, not sent as realtime input. If you need to send text during conversation, it should be handled differently (e.g., via chat messages that get included in context).
