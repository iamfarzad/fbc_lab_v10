# Why Webcam Stops Voice

**Date:** 2025-12-10  
**Issue:** When webcam is on, voice stops responding

---

## Analysis

### The Problem

When webcam activates:
1. Webcam auto-connect logic triggers (`useGeminiLive.ts:232-249`)
2. If voice is already connected, it should NOT reconnect
3. But if 1007 error closes the session, webcam activation triggers a reconnect
4. During reconnect, voice stops working

### Root Cause

**The 1007 error is closing the session**, which causes:
- Session closes → voice stops
- Webcam activation → tries to reconnect
- Reconnect fails → both stop working

### Code Flow

```typescript
// useGeminiLive.ts:232-249
useEffect(() => {
    if (isWebcamActive && 
        connectionState !== LiveConnectionState.CONNECTED && 
        connectionState !== LiveConnectionState.CONNECTING &&
        !webcamConnectAttemptedRef.current) {
        
        // This triggers reconnect if session closed with 1007
        void handleConnectRef.current()
    }
}, [isWebcamActive, connectionState]);
```

**The guard checks:**
- ✅ `connectionState !== LiveConnectionState.CONNECTED` - prevents reconnect if connected
- ✅ `connectionState !== LiveConnectionState.CONNECTING` - prevents reconnect if connecting
- ❌ **But if 1007 closes session, connectionState becomes DISCONNECTED**
- ❌ **Then webcam activation triggers reconnect**

### Why Voice Stops

1. **1007 error closes session** → `connectionState = DISCONNECTED`
2. **Webcam activates** → sees `DISCONNECTED` state
3. **Triggers `handleConnect()`** → disconnects existing service (line 159)
4. **Creates new service** → but 1007 happens again
5. **Voice stops** because session is closed

---

## Fix

**Primary fix:** Fix 1007 error (remove tools entirely)

**Secondary fix:** Improve webcam auto-connect logic to not interfere with existing voice connection

---

## Current Status

- ✅ Removed tools entirely (testing if that fixes 1007)
- ⏳ Need to verify webcam doesn't interfere with existing voice connection
