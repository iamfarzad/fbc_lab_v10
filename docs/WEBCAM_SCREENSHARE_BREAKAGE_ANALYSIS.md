# Webcam/Screenshare Preview Breakage Analysis

**Date:** 2025-12-08  
**Issue:** Webcam and screenshare previews were moved from bottom-right to top-right and duplicates were deleted, breaking their connection to the backend and context sharing.

---

## Executive Summary

When the preview components were repositioned and duplicates removed, the critical connection between the hooks (`useCamera`, `useScreenShare`) and the Live API service (`GeminiLiveService`) was lost. The hooks require `sendRealtimeInput` and `sendContextUpdate` callbacks to stream frames to the backend, but these are no longer being passed from `App.tsx`.

---

## Root Cause Analysis

### What Was Working Before

The webcam and screenshare previews were connected through a chain:

1. **Hooks** (`useCamera`, `useScreenShare`) capture frames
2. **Hooks** call `sendRealtimeInput()` to stream frames to Live API
3. **Hooks** call `sendContextUpdate()` to share analysis context
4. **App.tsx** provides these callbacks from `liveServiceRef.current`

### What Broke

After moving previews from bottom-right to top-right and deleting duplicates:

**Missing Connection:** `App.tsx` no longer passes `sendRealtimeInput` and `sendContextUpdate` to the hooks.

---

## Detailed Comparison

### 1. useScreenShare Hook Configuration

#### ❌ Current State (BROKEN)
```typescript:147:154:App.tsx
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    enableAutoCapture: true,
    captureInterval: 4000,
    onAnalysis: (analysis, _imageData, _capturedAt) => {
        logger.debug('[App] Screen share analysis:', { analysis });
    }
});
```

**Missing:**
- `sendRealtimeInput` - Required to stream frames to Live API
- `sendContextUpdate` - Required to share context with backend
- `voiceConnectionId` - Optional but useful for voice+screen integration

#### ✅ Expected State (WORKING)
```typescript
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    enableAutoCapture: true,
    captureInterval: 4000,
    voiceConnectionId: liveServiceRef.current?.getConnectionId(),
    sendRealtimeInput: (chunks) => {
        if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
            chunks.forEach(chunk => {
                liveServiceRef.current?.sendRealtimeMedia(chunk);
            });
        }
    },
    sendContextUpdate: (update) => {
        // Send context update via WebSocket to backend
        if (liveServiceRef.current?.liveClient) {
            // Context updates go through WebSocket server
            // Implementation depends on LiveClientWS API
        }
    },
    onAnalysis: (analysis, _imageData, _capturedAt) => {
        logger.debug('[App] Screen share analysis:', { analysis });
    }
});
```

### 2. useCamera Hook Configuration

#### Current State
The webcam uses a different pattern - it's connected via `WebcamPreview` component which calls `onSendFrame` callback.

```typescript:1933:1946:App.tsx
const handleSendVideoFrame = useCallback((base64: string) => {
    // Store latest frame for chat mode (agents) - will be attached to next message
    latestWebcamFrameRef.current = base64;

    // Send video frames to Live API when connected (for real-time multimodal conversation)
    if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
        try {
            liveServiceRef.current.sendRealtimeMedia({ mimeType: 'image/jpeg', data: base64 });
            logger.debug('[App] Webcam frame sent to Live API', { size: base64.length });
        } catch (err) {
            console.error('[App] Failed to send webcam frame to Live API:', err);
        }
    }
    // ...
}, [connectionState]);
```

**Status:** ✅ Webcam is connected via `handleSendVideoFrame` → `liveServiceRef.current.sendRealtimeMedia()`

**However:** The `useCamera` hook itself is NOT being used in `App.tsx`. The webcam is handled directly by `WebcamPreview` component.

### 3. Hook Implementation Requirements

#### useScreenShare Hook
```typescript:353:391:src/hooks/media/useScreenShare.ts
if (sendRealtimeInput) {
    try {
        const base64Data = await blobToBase64(blob)
        sendRealtimeInput([{
            mimeType: 'image/jpeg',
            data: base64Data,
        }])
        logger.debug('📺 Screen frame streamed to Live API')
    } catch (err) {
        console.error('❌ Failed to stream screen frame:', err)
    }
}

if (analysisText && typeof sendContextUpdate === 'function') {
    try {
        sendContextUpdate({
            sessionId: sessionId ?? null,
            modality: 'screen',
            analysis: analysisText,
            imageData,
            capturedAt: capture.timestamp,
            metadata: {
                source: sendRealtimeInput ? 'screen_share_stream' : 'screen_capture',
                ...(voiceConnectionId ? { connectionId: voiceConnectionId } : {}),
            },
        })
    } catch (contextErr) {
        console.warn('⚠️ Failed to push screen share context update:', contextErr)
    }
}
```

**Critical:** The hook checks `if (sendRealtimeInput)` and `if (typeof sendContextUpdate === 'function')` - if these are undefined, frames are NOT sent.

#### useCamera Hook
```typescript:445:478:src/hooks/media/useCamera.ts
if (sendRealtimeInputRef.current) {
    try {
        const base64Data = await blobToBase64(blob)
        
        const client = getLiveClientSingleton() as unknown as LiveClient
        const socket = client.socket
        const bufferedAmount = socket?.bufferedAmount ?? 0
        
        // Quality adjustment logic...
        if (bufferedAmount > WEBSOCKET_CONFIG.HIGH_BUFFER_THRESHOLD) {
           if (currentQualityRef.current > WEBSOCKET_CONFIG.LOW_QUALITY_JPEG) {
             currentQualityRef.current = WEBSOCKET_CONFIG.LOW_QUALITY_JPEG
           }
        } else {
           currentQualityRef.current = quality
        }
        
        const frame = {
            mimeType: 'image/jpeg',
            data: base64Data,
        }
        
        // Send to Live API
        sendRealtimeInputRef.current([frame])
        logger.debug('📹 Webcam frame streamed to Live API', {
            bufferedAmount,
            quality: currentQualityRef.current,
            size: base64Data.length
        })
    } catch (err) {
        console.error('❌ Failed to stream webcam frame:', err)
    }
}
```

**Note:** `useCamera` uses `sendRealtimeInputRef.current` (a ref), but this ref is never set in `App.tsx` because `useCamera` is not being used.

---

## Backend Connection Flow

### Working Flow (Before)

```
┌─────────────────┐
│  useScreenShare │
│      Hook       │
└────────┬────────┘
         │
         │ sendRealtimeInput([frame])
         ▼
┌─────────────────┐
│   App.tsx       │
│ (callback)      │
└────────┬────────┘
         │
         │ liveServiceRef.current.sendRealtimeMedia()
         ▼
┌─────────────────┐
│GeminiLiveService│
└────────┬────────┘
         │
         │ liveClient.sendRealtimeInput()
         ▼
┌─────────────────┐
│  LiveClientWS   │
└────────┬────────┘
         │
         │ WebSocket message
         ▼
┌─────────────────┐
│  Fly.io Server  │
│ (realtime-input)│
└────────┬────────┘
         │
         │ session.sendRealtimeInput()
         ▼
┌─────────────────┐
│  Gemini Live    │
│      API        │
└─────────────────┘
```

### Broken Flow (Current)

```
┌─────────────────┐
│  useScreenShare │
│      Hook       │
└────────┬────────┘
         │
         │ sendRealtimeInput? ❌ undefined
         │ sendContextUpdate? ❌ undefined
         ▼
    [FRAMES NOT SENT]
```

---

## Context Sharing Breakdown

### sendContextUpdate Purpose

The `sendContextUpdate` callback sends analysis results to the backend for context injection:

```typescript:375:391:src/hooks/media/useScreenShare.ts
if (analysisText && typeof sendContextUpdate === 'function') {
    try {
        sendContextUpdate({
            sessionId: sessionId ?? null,
            modality: 'screen',
            analysis: analysisText,
            imageData,
            capturedAt: capture.timestamp,
            metadata: {
                source: sendRealtimeInput ? 'screen_share_stream' : 'screen_capture',
                ...(voiceConnectionId ? { connectionId: voiceConnectionId } : {}),
            },
        })
    } catch (contextErr) {
        console.warn('⚠️ Failed to push screen share context update:', contextErr)
    }
}
```

**Backend Handler:**
```typescript:59:233:server/handlers/context-update-handler.ts
export function handleContextUpdate(
  connectionId: string,
  client: ContextUpdateClient,
  payload: ContextUpdatePayload
): void {
  // Stores context for later injection into Live API
  // Used by scheduleDebouncedInjection() in server/context/injection.ts
}
```

**Impact:** Without `sendContextUpdate`, screen analysis results are not shared with the AI, so it can't see what's on the user's screen.

---

## Comparison: Webcam vs Screenshare

| Aspect | Webcam | Screenshare |
|--------|--------|-------------|
| **Component** | `WebcamPreview.tsx` | `ScreenSharePreview.tsx` |
| **Hook Used** | ❌ `useCamera` NOT used | ✅ `useScreenShare` used |
| **Frame Sending** | ✅ Via `onSendFrame` → `handleSendVideoFrame` | ❌ Via hook, but callback missing |
| **Connection** | ✅ `liveServiceRef.current.sendRealtimeMedia()` | ❌ `sendRealtimeInput` undefined |
| **Context Sharing** | ❌ Not implemented | ❌ `sendContextUpdate` undefined |
| **Status** | ✅ Working | ❌ Broken |

---

## Files Affected

### Frontend (Hooks & Components)
- ✅ `src/hooks/media/useScreenShare.ts` - Hook implementation (correct)
- ✅ `src/hooks/media/useCamera.ts` - Hook implementation (correct, but not used)
- ✅ `components/chat/WebcamPreview.tsx` - Component (working)
- ✅ `components/chat/ScreenSharePreview.tsx` - Component (UI only, no backend connection)
- ❌ `App.tsx` - Missing hook callbacks

### Backend (Services & Handlers)
- ✅ `services/geminiLiveService.ts` - `sendRealtimeMedia()` method (correct)
- ✅ `src/core/live/client.ts` - `sendRealtimeInput()` method (correct)
- ✅ `server/handlers/realtime-input-handler.ts` - WebSocket handler (correct)
- ✅ `server/handlers/context-update-handler.ts` - Context handler (correct)
- ✅ `server/context/injection.ts` - Context injection (correct)

**Conclusion:** All backend code is correct. The issue is purely in `App.tsx` not passing callbacks to `useScreenShare`.

---

## Fix Required

### 1. Add sendRealtimeInput to useScreenShare

```typescript
const screenShare = useScreenShare({
    sessionId: screenShareSessionId,
    enableAutoCapture: true,
    captureInterval: 4000,
    voiceConnectionId: liveServiceRef.current?.getConnectionId(),
    sendRealtimeInput: (chunks) => {
        if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
            chunks.forEach(chunk => {
                liveServiceRef.current?.sendRealtimeMedia(chunk);
            });
        }
    },
    sendContextUpdate: (update) => {
        // Send via WebSocket to backend
        // Implementation depends on LiveClientWS API for context updates
        // May need to add method to LiveClientWS or use existing WebSocket connection
    },
    onAnalysis: (analysis, _imageData, _capturedAt) => {
        logger.debug('[App] Screen share analysis:', { analysis });
    }
});
```

### 2. Update sendContextUpdate Implementation

The `sendContextUpdate` callback needs to send data to the WebSocket server. Check if `LiveClientWS` has a method for this, or add one:

```typescript
// In services/geminiLiveService.ts or src/core/live/client.ts
public sendContextUpdate(update: VoiceContextUpdate) {
    if (!this.liveClient || !this.isConnected) return;
    this.liveClient.sendContextUpdate(update);
}
```

Then in `App.tsx`:
```typescript
sendContextUpdate: (update) => {
    if (liveServiceRef.current) {
        liveServiceRef.current.sendContextUpdate(update);
    }
}
```

---

## Verification Checklist

After applying the fix:

- [ ] `useScreenShare` receives `sendRealtimeInput` callback
- [ ] `useScreenShare` receives `sendContextUpdate` callback
- [ ] Screenshare frames are sent to Live API when connected
- [ ] Screenshare context updates are sent to backend
- [ ] Backend receives `REALTIME_INPUT` messages for screenshare
- [ ] Backend receives `CONTEXT_UPDATE` messages for screenshare
- [ ] AI can see and analyze screenshare content
- [ ] Screenshare works in combination with voice mode

---

## Related Documentation

- `docs/MULTIMODAL_AGENT_INTEGRATION.md` - Multimodal integration overview
- `docs/WEBCAM_VOICE_COMPARISON.md` - Webcam/voice comparison
- `server/handlers/realtime-input-handler.ts` - Backend handler implementation
- `server/handlers/context-update-handler.ts` - Context update handler

---

## Summary

**Root Cause:** Missing `sendRealtimeInput` and `sendContextUpdate` callbacks in `useScreenShare` configuration in `App.tsx`.

**Impact:** Screenshare frames are not sent to Live API, and context is not shared with backend.

**Fix:** Add callbacks to `useScreenShare` hook configuration, connecting it to `liveServiceRef.current`.

**Status:** 
- ✅ Webcam: Working (via `handleSendVideoFrame`)
- ❌ Screenshare: Broken (missing hook callbacks)

