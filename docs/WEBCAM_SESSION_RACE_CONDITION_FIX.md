# Webcam Session Race Condition Fix

**Date:** 2025-12-10  
**Issue:** "REALTIME_INPUT received but no active session" warnings - webcam frames rejected  
**Root Cause:** Race condition between client marking session ready and backend adding to activeSessions

---

## Problem

**Symptoms:**
- Hundreds of `[websocket] [WARN] REALTIME_INPUT received but no active session` warnings
- AI says "I don't have access to your camera" even though webcam is active
- Webcam frames are being sent but rejected by backend

**Root Cause:**
1. Client receives `session_started` event → sets `isSessionReady = true`
2. Client immediately flushes queued frames and sends new frames
3. Frames arrive at backend WebSocket
4. Backend checks `activeSessions.get(connectionId)` → returns `undefined`
5. Backend rejects frames with "no active session" warning

**Why This Happens:**
- Backend sets `isReady = true` and sends `session_started` to client
- Backend adds session to `activeSessions` at the same time
- But there's a tiny timing window where frames can arrive before the session is fully registered
- Or frames are sent from client before `session_started` is received (queued frames flushed too early)

---

## Fix Applied

### 1. Backend: Wait for Session in activeSessions

**File:** `server/websocket/message-router.ts:250-297`

**Change:**
- Check `connectionStates.get(connectionId)?.isReady` in addition to `activeSessions`
- If session is ready but not in activeSessions yet, wait briefly (up to 500ms) for it to be added
- This handles the race condition where `isReady` is true but session isn't in `activeSessions` yet

**Code:**
```typescript
case MESSAGE_TYPES.REALTIME_INPUT: {
  const client = activeSessions.get(connectionId)
  const connectionState = connectionStates.get(connectionId)
  const isSessionReady = connectionState?.isReady === true
  
  if (!client && isSessionReady) {
    // Wait briefly for session to be added to activeSessions
    for (let i = 0; i < 10 && !client; i++) {
      await new Promise(resolve => setTimeout(resolve, 50))
      client = activeSessions.get(connectionId)
    }
  }
  
  if (!client) {
    // Handle error...
  }
  
  await handlers.handleRealtimeInput(...)
}
```

### 2. Client: Ensure Proper Queuing

**File:** `services/geminiLiveService.ts:568-609`

**Already Fixed:**
- Frames are queued when `isSessionReady` is false
- Frames are flushed when `session_started` is received
- This should prevent frames from being sent before session is ready

**Verification Needed:**
- Ensure `flushPendingMedia()` only sends frames AFTER session is confirmed ready
- Check that frames aren't being sent during the flush before backend is ready

---

## Testing

After fix:
- [ ] Enable webcam
- [ ] Check console for "REALTIME_INPUT received but no active session" warnings
- [ ] Verify warnings are reduced or eliminated
- [ ] Ask AI "Can you see me?" - should say yes
- [ ] Verify webcam frames are displayed in chat (from previous fix)

---

## Additional Investigation Needed

If warnings persist, check:
1. **Client-side timing:** Are frames being flushed too early?
2. **Backend timing:** Is session added to activeSessions before isReady is set?
3. **WebSocket ordering:** Are frames arriving before session_started is processed?

---

**Status:** Fix applied, needs testing
