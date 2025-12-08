# Multimodal Breakage Investigation Guide

**Purpose:** Systematic methodology to investigate and fix breakages in the multimodal system (text, voice, webcam, screen share, file uploads).

**Based on:** `WEBCAM_SCREENSHARE_BREAKAGE_ANALYSIS.md` methodology

---

## Investigation Template

### 1. Executive Summary

**Date:** [Date of investigation]  
**Issue:** [Brief description of what broke]  
**Affected Modalities:** [ ] Text [ ] Voice [ ] Webcam [ ] Screen Share [ ] File Upload

**Summary:**
[One paragraph describing the issue and its impact]

---

## 2. Root Cause Analysis

### 2.1 What Was Working Before

Document the working flow:

1. **Entry Point:** [Component/hook that initiates the flow]
2. **Processing:** [How data flows through the system]
3. **Backend Connection:** [How it connects to services/APIs]
4. **Storage/Context:** [How data is stored or shared]
5. **Agent Integration:** [How agents receive the data]

### 2.2 What Broke

**Change That Caused Breakage:**
- [ ] Component refactoring
- [ ] Hook configuration change
- [ ] Props/callbacks removed
- [ ] Service method renamed/removed
- [ ] State management change
- [ ] Routing/path change
- [ ] Type/interface change

**Specific Issue:**
[Describe exactly what's broken - missing callbacks, undefined references, type errors, etc.]

---

## 3. Detailed Comparison

### 3.1 Current State (BROKEN)

**File:** `[file path]`  
**Lines:** `[line numbers]`

```typescript
// Current broken code
```

**Missing/Broken:**
- [ ] Missing callback: `[callback name]`
- [ ] Missing prop: `[prop name]`
- [ ] Undefined reference: `[reference]`
- [ ] Type mismatch: `[type issue]`
- [ ] Logic error: `[description]`

### 3.2 Expected State (WORKING)

```typescript
// Expected working code
```

**Required:**
- [ ] Callback: `[callback name]` - [purpose]
- [ ] Prop: `[prop name]` - [purpose]
- [ ] Reference: `[reference]` - [purpose]
- [ ] Type: `[type]` - [purpose]

---

## 4. Integration Flow Verification

### 4.1 Working Flow (Before)

```
┌─────────────────┐
│  [Entry Point]  │
└────────┬────────┘
         │
         │ [method/callback]()
         ▼
┌─────────────────┐
│  [Component]     │
└────────┬────────┘
         │
         │ [method/callback]()
         ▼
┌─────────────────┐
│  [Service]      │
└────────┬────────┘
         │
         │ [API call/WebSocket]
         ▼
┌─────────────────┐
│  [Backend]      │
└─────────────────┘
```

### 4.2 Broken Flow (Current)

```
┌─────────────────┐
│  [Entry Point]  │
└────────┬────────┘
         │
         │ [method/callback]? ❌ undefined
         ▼
    [FLOW BROKEN]
```

---

## 5. Modality-Specific Checklists

### 5.1 Text Input

**Check:**
- [ ] `ChatInputDock` → `onSendMessage` callback exists
- [ ] `App.tsx` → `handleSendMessage` receives text
- [ ] Message added to transcript state
- [ ] `/api/chat/persist-message` called
- [ ] `MultimodalContextManager.addTextMessage()` called
- [ ] Agents receive message in `/api/chat` endpoint

**Key Files:**
- `components/chat/ChatInputDock.tsx`
- `App.tsx` (handleSendMessage)
- `src/core/context/multimodal-context-manager.ts`
- `app/api/chat/route.ts`

### 5.2 Voice Input/Output

**Check:**
- [ ] `GeminiLiveService` initialized
- [ ] `liveServiceRef.current` available
- [ ] `connectionState === LiveConnectionState.CONNECTED`
- [ ] `useVoice` or `useRealtimeVoice` hook configured
- [ ] `sendRealtimeInput` callback provided
- [ ] `sendContextUpdate` callback provided
- [ ] WebSocket connection established
- [ ] Audio chunks sent via `sendRealtimeMedia()`
- [ ] Backend receives `REALTIME_INPUT` messages
- [ ] Transcription stored in `MultimodalContextManager`

**Key Files:**
- `services/geminiLiveService.ts`
- `src/hooks/voice/useVoice.ts`
- `src/hooks/voice/useRealtimeVoice.ts`
- `App.tsx` (voice connection logic)
- `server/handlers/realtime-input-handler.ts`

### 5.3 Webcam

**Check:**
- [ ] `WebcamPreview` component rendered
- [ ] `onSendFrame` callback provided
- [ ] `handleSendVideoFrame` in `App.tsx` receives frames
- [ ] `liveServiceRef.current.sendRealtimeMedia()` called
- [ ] OR `useCamera` hook configured with `sendRealtimeInput`
- [ ] Frames sent when `connectionState === CONNECTED`
- [ ] Backend receives `REALTIME_INPUT` messages with `mimeType: 'image/jpeg'`
- [ ] Context updates sent if analysis performed

**Key Files:**
- `components/chat/WebcamPreview.tsx`
- `src/hooks/media/useCamera.ts`
- `App.tsx` (handleSendVideoFrame, useCamera config)
- `services/geminiLiveService.ts` (sendRealtimeMedia)

### 5.4 Screen Share

**Check:**
- [ ] `useScreenShare` hook configured
- [ ] `sendRealtimeInput` callback provided
- [ ] `sendContextUpdate` callback provided
- [ ] `sessionId` provided
- [ ] `voiceConnectionId` provided (if voice active)
- [ ] `enableAutoCapture: true` set
- [ ] `captureInterval` configured
- [ ] Frames captured and sent via `sendRealtimeInput()`
- [ ] Analysis performed and sent via `sendContextUpdate()`
- [ ] Backend receives `REALTIME_INPUT` messages
- [ ] Backend receives `CONTEXT_UPDATE` messages

**Key Files:**
- `src/hooks/media/useScreenShare.ts`
- `App.tsx` (useScreenShare configuration)
- `components/chat/ScreenSharePreview.tsx`
- `server/handlers/realtime-input-handler.ts`
- `server/handlers/context-update-handler.ts`

### 5.5 File Upload

**Check:**
- [ ] `ChatInputDock` file input handler
- [ ] File converted to base64
- [ ] File attached to message
- [ ] `/api/chat/persist-message` called with attachment
- [ ] `MultimodalContextManager.addFileUpload()` called
- [ ] File analysis performed (if image/PDF)
- [ ] Agents receive file in `/api/chat` endpoint

**Key Files:**
- `components/chat/ChatInputDock.tsx`
- `App.tsx` (handleSendMessage with file)
- `src/core/context/multimodal-context-manager.ts`
- `app/api/chat/route.ts`

---

## 6. Common Breakage Patterns

### Pattern 1: Missing Callbacks

**Symptom:** Modality appears to work but data doesn't reach backend

**Investigation:**
1. Check hook configuration in `App.tsx`
2. Verify callbacks are passed as props
3. Check if callbacks are conditionally provided (may be undefined)
4. Verify callback implementations exist in service

**Example:**
```typescript
// ❌ BROKEN - callback missing
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    // sendRealtimeInput missing!
});

// ✅ WORKING - callback provided
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    sendRealtimeInput: (chunks) => {
        liveServiceRef.current?.sendRealtimeMedia(chunks[0]);
    }
});
```

### Pattern 2: Connection State Not Checked

**Symptom:** Data sent but not received by backend

**Investigation:**
1. Check if `connectionState === LiveConnectionState.CONNECTED`
2. Verify `liveServiceRef.current` exists
3. Check WebSocket connection status
4. Verify service is initialized

**Example:**
```typescript
// ❌ BROKEN - no connection check
liveServiceRef.current?.sendRealtimeMedia(chunk);

// ✅ WORKING - connection checked
if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
    liveServiceRef.current.sendRealtimeMedia(chunk);
}
```

### Pattern 3: Ref/State Not Initialized

**Symptom:** `undefined` errors or null reference errors

**Investigation:**
1. Check ref initialization: `useRef(null)`
2. Verify ref is set before use
3. Check state initialization
4. Verify service initialization order

**Example:**
```typescript
// ❌ BROKEN - ref not set
const liveServiceRef = useRef<GeminiLiveService | null>(null);
// ... later ...
liveServiceRef.current.sendRealtimeMedia(chunk); // ❌ null

// ✅ WORKING - ref set and checked
const liveServiceRef = useRef<GeminiLiveService | null>(null);
// ... later ...
if (liveServiceRef.current) {
    liveServiceRef.current.sendRealtimeMedia(chunk);
}
```

### Pattern 4: Props Not Passed Through

**Symptom:** Component receives undefined props

**Investigation:**
1. Trace props from `App.tsx` → component
2. Check intermediate components pass props
3. Verify prop names match
4. Check for conditional prop passing

**Example:**
```typescript
// ❌ BROKEN - prop not passed
<MultimodalChat
    items={transcript}
    // onSendVideoFrame missing!
/>

// ✅ WORKING - prop passed
<MultimodalChat
    items={transcript}
    onSendVideoFrame={handleSendVideoFrame}
/>
```

### Pattern 5: Type Mismatches

**Symptom:** TypeScript errors or runtime type errors

**Investigation:**
1. Check interface/type definitions
2. Verify prop types match expected types
3. Check for optional vs required props
4. Verify callback signatures match

**Example:**
```typescript
// ❌ BROKEN - type mismatch
interface Props {
    onSend: (text: string) => void;
}
// Called with: onSend({ text: "hello" }) // ❌ object instead of string

// ✅ WORKING - types match
interface Props {
    onSend: (text: string) => void;
}
// Called with: onSend("hello") // ✅ string
```

---

## 7. Files Affected Checklist

### Frontend Files
- [ ] `App.tsx` - Main integration point
- [ ] `components/MultimodalChat.tsx` - Chat container
- [ ] `components/chat/ChatInputDock.tsx` - Input handling
- [ ] `components/chat/WebcamPreview.tsx` - Webcam component
- [ ] `components/chat/ScreenSharePreview.tsx` - Screen share component
- [ ] `src/hooks/media/useCamera.ts` - Camera hook
- [ ] `src/hooks/media/useScreenShare.ts` - Screen share hook
- [ ] `src/hooks/voice/useVoice.ts` - Voice hook
- [ ] `src/hooks/voice/useRealtimeVoice.ts` - Realtime voice hook
- [ ] `services/geminiLiveService.ts` - Live API service
- [ ] `src/core/live/client.ts` - Live client
- [ ] `src/core/context/multimodal-context-manager.ts` - Context manager

### Backend Files
- [ ] `server/websocket/server.ts` - WebSocket server
- [ ] `server/handlers/realtime-input-handler.ts` - Realtime input handler
- [ ] `server/handlers/context-update-handler.ts` - Context update handler
- [ ] `server/context/injection.ts` - Context injection
- [ ] `app/api/chat/route.ts` - Chat API endpoint

---

## 8. Fix Implementation

### 8.1 Required Changes

**File:** `[file path]`

```typescript
// Add/change this code
```

**Rationale:**
[Why this change fixes the issue]

### 8.2 Testing Steps

1. [ ] Verify hook receives required callbacks
2. [ ] Verify data flows to service
3. [ ] Verify backend receives data
4. [ ] Verify context is shared correctly
5. [ ] Verify agents receive multimodal data
6. [ ] Test in combination with other modalities

---

## 9. Verification Checklist

After applying the fix:

- [ ] [Modality] receives required callbacks
- [ ] [Modality] data sent to service
- [ ] Service sends data to backend
- [ ] Backend receives [message type] messages
- [ ] Context updates sent (if applicable)
- [ ] Agents receive multimodal data
- [ ] Works in combination with [other modalities]
- [ ] No TypeScript errors
- [ ] No runtime errors
- [ ] Works in production

---

## 10. Related Documentation

- `docs/MULTIMODAL_AGENT_INTEGRATION.md` - Multimodal integration overview
- `docs/WEBCAM_SCREENSHARE_BREAKAGE_ANALYSIS.md` - Example breakage analysis
- `docs/WEBCAM_VOICE_COMPARISON.md` - Webcam/voice comparison
- `server/handlers/realtime-input-handler.ts` - Backend handler implementation
- `server/handlers/context-update-handler.ts` - Context update handler

---

## Quick Reference: Integration Points

### App.tsx Integration Points

```typescript
// Voice
const liveServiceRef = useRef<GeminiLiveService | null>(null);
const connectionState = useLiveConnectionState(liveServiceRef);

// Webcam
const handleSendVideoFrame = useCallback((base64: string) => {
    if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
        liveServiceRef.current.sendRealtimeMedia({ mimeType: 'image/jpeg', data: base64 });
    }
}, [connectionState]);

// Screen Share
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    sendRealtimeInput: (chunks) => {
        if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
            chunks.forEach(chunk => {
                liveServiceRef.current?.sendRealtimeMedia(chunk);
            });
        }
    },
    sendContextUpdate: (update) => {
        // Send via WebSocket
    }
});
```

### Service Methods

```typescript
// GeminiLiveService
liveServiceRef.current.sendRealtimeMedia(chunk: RealtimeMediaChunk)
liveServiceRef.current.getConnectionId(): string | null

// LiveClientWS
liveClient.sendRealtimeInput(chunks: RealtimeInputChunk[])
liveClient.sendContextUpdate(update: VoiceContextUpdate)
```

### Backend Handlers

```typescript
// server/handlers/realtime-input-handler.ts
handleRealtimeInput(connectionId, client, payload)

// server/handlers/context-update-handler.ts
handleContextUpdate(connectionId, client, payload)
```

---

## Summary Template

**Root Cause:** [One sentence describing the root cause]

**Impact:** [What functionality is broken]

**Fix:** [One sentence describing the fix]

**Status:** 
- [ ] [Modality 1]: [Working/Broken]
- [ ] [Modality 2]: [Working/Broken]
- [ ] [Modality 3]: [Working/Broken]

