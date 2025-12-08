# Deep Analysis: Critical Runtime Issues & Data Flow Failures

**Date:** 2025-12-08  
**Analysis Level:** Runtime behavior, data flows, silent failures

---

## 🔴 CRITICAL: Analysis Text Never Injected to Live API

**Location:** `server/context/injection.ts:68-101`

**The Problem:**
```typescript
// CRITICAL FIX: sendRealtimeInput() only accepts audio/video media, NOT text
// Sending text via sendRealtimeInput causes error 1007 "Request contains an invalid argument"
// Text context should be included in systemInstruction during session setup instead
// For now, we'll only send image data if available, and skip text injection

if (snap.imageData) {
  // Send image ✅
  await client.session.sendRealtimeInput({ 
    media: { mimeType: 'image/jpeg', data: base64Data }
  })
} else {
  // Skip injection ❌ ANALYSIS TEXT IS LOST
  serverLogger.debug('Context injection skipped - no image and text not supported')
}
```

**Impact:**
- ✅ Image frames ARE sent to Live API
- ❌ Analysis results (text descriptions) are NEVER sent to Live API
- ✅ Analysis text IS stored in database (via `addVisualAnalysis`)
- ❌ AI never sees the analysis during voice conversation
- **Result:** AI sees frames but doesn't understand what they contain

**Why This Is Critical:**
- User shares screen/webcam
- Frame is analyzed: "User is showing a dashboard with sales metrics"
- Analysis stored in DB ✅
- Image frame sent to Live API ✅
- **Analysis text NEVER reaches Live API** ❌
- AI sees image but has no context about what it means

**Fix Required:**
- Analysis text must be included in `systemInstruction` during session setup OR
- Analysis text must be injected via a different mechanism (NOT sendRealtimeInput)

---

## 🔴 CRITICAL: Intelligence Context Injection Fails with Error 1007

**Location:** `server/handlers/context-update-handler.ts:186-191`

**The Problem:**
```typescript
// This code tries to send text via sendRealtimeInput - WILL FAIL!
if (contextParts.length > 0 && client.session?.sendRealtimeInput) {
  const contextText = `[Context Update]\n${contextParts.join('\n')}`
  try {
    await client.session.sendRealtimeInput({
      media: { text: contextText }  // ❌ ERROR 1007 - text not supported!
    })
  } catch (injectErr) {
    serverLogger.warn('Failed to inject intelligence context', { error: injectErr })
    // Error is caught but context is still lost
  }
}
```

**Impact:**
- Location updates, research context, transcript summaries are NEVER injected
- Error is silently caught and logged as warning
- Context is stored but never reaches Live API session

**Root Cause:**
- Contradictory code: `injection.ts` says "text not supported" but `context-update-handler.ts` tries to send text anyway
- Both paths fail silently

---

## 🔴 CRITICAL: Pending Media Queue Drops All But Last Frame

**Location:** `services/geminiLiveService.ts:513-528`

**The Problem:**
```typescript
private flushPendingMedia(): void {
  if (this.pendingMediaQueue.length === 0) return;
  
  logger.debug(`[GeminiLiveService] Flushing ${this.pendingMediaQueue.length} queued media items`);
  
  // ❌ ONLY SENDS LAST FRAME - ALL OTHERS DROPPED!
  const latestMedia = this.pendingMediaQueue[this.pendingMediaQueue.length - 1];
  this.pendingMediaQueue = [];
  
  if (latestMedia && this.liveClient) {
    this.liveClient.sendRealtimeInput([{
      mimeType: latestMedia.mimeType,
      data: latestMedia.data
    }]);
  }
}
```

**Impact:**
- Webcam/screen share starts sending frames before voice connects
- Frames are queued in `pendingMediaQueue`
- When session becomes ready, **ALL frames except the last one are dropped**
- AI misses initial context (first 10-20 frames)
- User sees "connected" but AI missed the setup

**Scenario:**
1. User starts screen share
2. 15 frames captured before voice connects
3. Session becomes ready
4. Only frame #15 is sent, frames #1-14 are lost ❌

---

## 🔴 CRITICAL: REALTIME_INPUT Silently Dropped During Session Start

**Location:** `server/websocket/message-router.ts:254-256`

**The Problem:**
```typescript
case MESSAGE_TYPES.REALTIME_INPUT: {
  const client = activeSessions.get(connectionId)
  if (!client) {
    if (sessionStarting.has(connectionId)) {
      serverLogger.debug('REALTIME_INPUT received while session starting - ignoring', { connectionId })
      break  // ❌ MESSAGE SILENTLY DROPPED
    }
    // ...
  }
}
```

**Impact:**
- User starts screen share/webcam
- Frames start flowing immediately
- Voice connection starts (takes 2-5 seconds)
- All frames sent during connection startup are **silently dropped**
- No queue, no retry, just lost

**Race Condition:**
- Client sends REALTIME_INPUT immediately
- Server hasn't finished `handleStart()` yet
- Message arrives, `sessionStarting.has(connectionId)` is true
- Message is ignored with debug log only
- Frame is lost forever

---

## 🔴 CRITICAL: Context Updates Dropped If Session Not Ready

**Location:** Multiple places

### Client Side: `services/geminiLiveService.ts:461-464`
```typescript
if (!this.isSessionReady) {
  console.warn('[GeminiLiveService] Context update blocked: Session not ready');
  return;  // ❌ DROPPED, NO QUEUE
}
```

### Server Side: `server/handlers/context-update-handler.ts:77-83`
```typescript
if (!st?.isReady) {
  serverLogger.warn('CONTEXT_UPDATE received before session ready', { connectionId })
  safeSend(client.ws, JSON.stringify({
    type: MESSAGE_TYPES.ERROR,
    payload: { message: 'Session not ready', code: 'LIVE_NOT_READY' }
  }))
  return  // ❌ DROPPED, NO QUEUE
}
```

**Impact:**
- Context updates sent before session ready are lost
- No retry mechanism
- No queue to hold updates until ready
- Silent failure (just error message to client)

---

## 🔴 CRITICAL: Buffer Overflow Silently Drops Messages

**Location:** `src/core/live/client.ts:837-846`

**The Problem:**
```typescript
// Check buffer before sending non-priority messages
if (this.socket.bufferedAmount > this.MAX_BUFFERED_AMOUNT) {  // 500KB
  console.warn('🔌 [LiveClient] Buffer full, dropping message', {
    bufferedAmount: this.socket.bufferedAmount,
    threshold: this.MAX_BUFFERED_AMOUNT,
    messageType: (message as { type?: string }).type
  });
  
  this.trackBufferHealth();
  return false;  // ❌ MESSAGE DROPPED, NO RETRY
}
```

**Impact:**
- High-frequency messages (audio, video frames) fill buffer quickly
- Once buffer exceeds 500KB, all subsequent messages are dropped
- No backpressure handling
- No retry logic
- Messages just disappear

**When This Happens:**
- Rapid screen share frames (4 FPS = 240 frames/minute)
- High-resolution images
- Combined audio + video streaming
- Network congestion (slow upload)

---

## 🔴 CRITICAL: VercelRequest Body Parsing Issue

**Location:** `api/tools/webcam.ts:51-57`

**The Problem:**
```typescript
export const config = {
  api: {
    bodyParser: false,  // Disabled
  },
};

// Later:
body = JSON.parse(req.body as string)  // ❌ req.body might not be a string!
```

**Why This Fails:**
- With `bodyParser: false`, Vercel doesn't automatically parse the body
- `req.body` might be:
  - `undefined` (if not read yet)
  - A Buffer (raw stream data)
  - An object (if parsed elsewhere)
  - **NOT a string** in most cases

**Actual Vercel Behavior:**
- Need to use `getRawBody()` from `@vercel/node` OR
- Read the stream manually OR
- Remove `bodyParser: false` and use default parsing

**Impact:**
- All webcam analysis requests fail with "Invalid JSON body"
- Fallback to direct API call also fails
- Webcam analysis completely broken

---

## 🟡 HIGH: Connection State Missing in Rate Limiter

**Location:** `server/rate-limiting/websocket-rate-limiter.ts:51-78`

**The Problem:**
```typescript
let st = connectionStates.get(connectionId)
if (!st) {
  // This should never happen - connectionState should be initialized in connection-manager
  serverLogger.error('CRITICAL: ConnectionState missing in checkRateLimit', ...)
  
  // Initialize defensively to prevent crash, but this indicates a bug
  const defaultState: ConnectionState = {
    isReady: false,  // ❌ Defaults to NOT READY
    // ...
  }
  connectionStates.set(connectionId, defaultState)
  st = defaultState
  // Allow first message to pass through, but this is a bug
}
```

**Impact:**
- Race condition: Rate limiter called before connection manager initializes state
- Messages might be allowed through with wrong state
- `isReady: false` by default blocks subsequent messages
- Indicates a deeper initialization order problem

---

## 🟡 HIGH: Session Start Timeout Doesn't Disconnect

**Location:** `services/geminiLiveService.ts:196-202`

**The Problem:**
```typescript
this.sessionStartTimeout = setTimeout(() => {
  console.warn('[GeminiLiveService] Warning: session_started not received within 20s after start_ack');
  // Don't disconnect - the session may still connect. Emit CONNECTING state to indicate ongoing attempt.
  if (!this.isSessionReady) {
    logger.warn('[GeminiLiveService] Session still not ready after timeout - keeping connection attempt alive');
  }
}, 20000);
```

**Impact:**
- If `session_started` never arrives, connection stays in limbo
- No cleanup, no error state, just stuck
- User sees "connecting" forever
- Resources leaked (WebSocket, audio contexts, timers)

---

## 🟡 HIGH: Rate Limiting Blocks Legitimate High-Frequency Messages

**Location:** `server/rate-limiting/websocket-rate-limiter.ts`

**Config:**
- Audio: 200 chunks/second (reasonable)
- Regular messages: 100/minute for clients
- **REALTIME_INPUT** (images): Uses regular limit = 100/minute

**Problem:**
- Screen share at 4 FPS = 240 frames/minute
- **Exceeds rate limit after 100 frames (42 seconds)**
- Frames start getting dropped
- Rate limit error sent to client, but client keeps sending

**Impact:**
- Screen share works for ~40 seconds, then starts failing
- Webcam streaming also hits limit quickly
- No exponential backoff or adaptive limiting

---

## 🟡 MEDIUM: Multiple Session Readiness Checks (Race Conditions)

**Location:** Multiple files

**Checks in Order:**
1. Client: `GeminiLiveService.isSessionReady` (line 461)
2. Server: `connectionStates.get(connectionId)?.isReady` (line 77)
3. Client: `connectionState === LiveConnectionState.CONNECTED` (App.tsx:201)

**Problem:**
- Three different state flags that can be out of sync
- Server might be ready but client thinks it's not
- Client might be ready but server blocks message
- Race conditions between these checks

**Example Race:**
1. Server sets `isReady = true` (line 679 in start-handler.ts)
2. Client hasn't received `session_started` event yet
3. Client blocks message (thinks not ready)
4. Server accepts message (thinks ready)
5. But client never sends because it's blocked

---

## 🟡 MEDIUM: AudioWorklet Fallback Incomplete

**Location:** `services/geminiLiveService.ts:324-330`

**The Problem:**
```typescript
try {
  await this.inputAudioContext.audioWorklet.addModule('/audio-processor.js');
} catch (e) {
  console.error('Failed to load audio worklet, falling back to ScriptProcessor', e);
  // Fallback or error handling could go here, but for now we assume it works
  // ❌ NO ACTUAL FALLBACK IMPLEMENTED
}
this.processor = new AudioWorkletNode(this.inputAudioContext, 'audio-recorder-worklet');
// ❌ Still tries to create AudioWorkletNode even if it failed!
```

**Impact:**
- If AudioWorklet fails to load (network issue, CORS, missing file), entire voice connection fails
- Should fallback to ScriptProcessorNode (deprecated but works)
- Current code crashes instead of falling back

---

## 📊 Summary: Silent Failure Points

| Issue | Location | Severity | Impact |
|-------|----------|----------|--------|
| **Analysis text never injected** | injection.ts:68 | 🔴 Critical | AI doesn't understand what it sees |
| **Intelligence context fails** | context-update-handler.ts:186 | 🔴 Critical | Location/research never shared |
| **Pending queue drops frames** | geminiLiveService.ts:519 | 🔴 Critical | Initial context lost |
| **REALTIME_INPUT dropped during start** | message-router.ts:254 | 🔴 Critical | Early frames lost |
| **Context updates dropped** | Multiple | 🔴 Critical | No queue/retry |
| **Buffer overflow drops messages** | client.ts:837 | 🔴 Critical | High-frequency loss |
| **Vercel body parsing broken** | webcam.ts:54 | 🔴 Critical | Webcam analysis fails |
| **Connection state missing** | rate-limiter.ts:51 | 🟡 High | Wrong state blocking |
| **Session timeout no cleanup** | geminiLiveService.ts:196 | 🟡 High | Resources leaked |
| **Rate limit too low** | rate-limiter.ts:16 | 🟡 High | Legitimate traffic blocked |
| **Multiple readiness checks** | Multiple | 🟡 Medium | Race conditions |
| **AudioWorklet no fallback** | geminiLiveService.ts:324 | 🟡 Medium | Single point of failure |

---

## 🔍 Data Flow Analysis

### Screen Share Analysis Flow (Current - Broken)

```
1. useScreenShare.captureFrame()
   ↓
2. uploadToBackend() → /api/tools/webcam
   ↓
3. Analysis returned: "User showing dashboard"
   ↓
4. sendContextUpdate({ analysis: "User showing dashboard", imageData: base64 })
   ↓
5. LiveClientWS.sendContextUpdate() → WebSocket
   ↓
6. Server: handleContextUpdate()
   ↓
7. Store in latestContext.screen ✅
   ↓
8. scheduleDebouncedInjection()
   ↓
9. Try to inject:
   - Image sent ✅
   - Analysis text: SKIPPED ❌ (text not supported via sendRealtimeInput)
   ↓
10. Result: AI sees image but doesn't know it's a dashboard
```

### Webcam Frame Flow (Current - Broken)

```
1. WebcamPreview captures frame
   ↓
2. handleSendVideoFrame(base64)
   ↓
3. sendRealtimeMedia({ mimeType: 'image/jpeg', data: base64 })
   ↓
4. Check: isSessionReady?
   - If NO: Queue in pendingMediaQueue ⚠️
   - If YES: Send immediately ✅
   ↓
5. LiveClientWS.sendRealtimeInput()
   ↓
6. Check: bufferedAmount < 500KB?
   - If NO: Drop message ❌
   - If YES: Send ✅
   ↓
7. WebSocket → Server
   ↓
8. Server: handleRealtimeInput()
   ↓
9. Check: session ready?
   - If NO: Send error, drop ❌
   - If YES: Forward to Live API ✅
   ↓
10. Live API receives frame
    ↓
11. AI sees frame but NO ANALYSIS TEXT ❌
```

---

## 🔧 Required Fixes (Priority Order)

### Priority 1: Fix Analysis Text Injection
- Include analysis text in `systemInstruction` during session setup
- OR find alternative way to inject text context (not via sendRealtimeInput)
- Remove contradictory code in context-update-handler.ts

### Priority 2: Fix Media Queue
- Queue ALL frames, not just last one
- Send queued frames in order when session ready
- OR send all frames as batch
- OR limit queue size and send most recent N frames

### Priority 3: Fix Vercel Body Parsing
- Use proper Vercel body parsing mechanism
- Read stream manually if needed
- Test with actual Vercel deployment

### Priority 4: Add Retry/Queue Mechanisms
- Queue REALTIME_INPUT during session start
- Queue CONTEXT_UPDATE until session ready
- Add retry logic for buffer overflow
- Implement backpressure handling

### Priority 5: Fix Race Conditions
- Unify session readiness checks
- Single source of truth for `isReady` state
- Proper state synchronization between client/server

### Priority 6: Implement Fallbacks
- AudioWorklet → ScriptProcessorNode fallback
- Session timeout cleanup and error state
- Connection state initialization fix

---

## 🎯 Root Cause Summary

**The fundamental issue:** The system is designed to send analysis text via `sendRealtimeInput()`, but Gemini Live API doesn't support text in `sendRealtimeInput()` (only audio/video). This creates a **fundamental architectural mismatch** where:

1. Analysis is performed ✅
2. Analysis is stored ✅
3. Analysis is sent via wrong mechanism ❌
4. Analysis never reaches AI ❌

**Secondary issues:** Multiple silent failure points where messages are dropped without retry or queue, creating a system that appears to work but silently loses data.

