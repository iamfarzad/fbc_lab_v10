# Webcam + Voice Connection Explanation

**Date:** 2025-12-10  
**Question:** Why is webcam not connected to chat/text and voice?

---

## Answer: Webcam IS Connected to Voice/Chat

The webcam **IS** connected to the same Live API session as voice and chat. They share a **unified multimodal stream**.

### How It Works

1. **Single Live API Session:**
   - Voice audio → `GeminiLiveService` → Live API session
   - Webcam frames → `GeminiLiveService.sendRealtimeMedia()` → **Same Live API session**
   - Chat text → Also goes through Live API when voice is active

2. **Unified Multimodal Stream:**
   ```
   Voice Audio Chunks ──┐
                        ├──> GeminiLiveService ──> Live API Session ──> AI
   Webcam Frames ───────┘
   ```

3. **Auto-Connect Logic:**
   - When webcam activates → automatically connects to Live API (if not connected)
   - Location: `src/hooks/media/useGeminiLive.ts:232-249`

4. **Frame Sending:**
   - Webcam frames sent via `liveServiceRef.current.sendRealtimeMedia()`
   - Same service instance that handles voice
   - Location: `App.tsx:773`

---

## The Real Problem: 1007 Error Closes Session

**The issue is NOT that webcam isn't connected to voice.**

**The issue is that the Live API session is closing with error 1007 ("Request contains an invalid argument"), which breaks everything:**

1. Session starts
2. 1007 error occurs
3. Session closes
4. **Both voice AND webcam stop working** (because session is closed)

---

## Fixes Applied

1. ✅ Removed empty `inputAudioTranscription: {}` and `outputAudioTranscription: {}`
2. ✅ Fixed `generationConfig` deprecation (moved `temperature` to top level)
3. ✅ Fixed WebcamPreview dependency array (prevents stream restart)
4. ✅ Fixed const assignment error

---

## After Fixes

Once the 1007 error is resolved:
- ✅ Webcam frames will send to Live API
- ✅ Voice audio will send to Live API  
- ✅ AI will see both webcam AND hear voice
- ✅ AI can respond with voice about what it sees

**They're already connected - the session just needs to stay open!**
