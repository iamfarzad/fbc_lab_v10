---
description: Debug webcam and screen share - video capture, MediaPipe, and streaming
---

# Debug Webcam & Screen Share

// turbo-all

## 1. Check if all servers are running
```bash
lsof -i :3000 -i :3001 -i :3002 | grep LISTEN
```

## 2. Check webcam API endpoint
```bash
curl -s -X POST http://localhost:3002/api/tools/webcam \
  -H "Content-Type: application/json" \
  -d '{"imageData":"test"}' \
  2>/dev/null | head -10
```

## 3. Verify WebcamPreview component
```bash
grep -n "videoRef\|captureFrame\|MediaPipe\|sendRealtimeMedia" components/chat/WebcamPreview.tsx | head -20
```

## 4. Verify ScreenSharePreview component
```bash
grep -n "captureFrame\|sendRealtimeInput\|getDisplayMedia" components/chat/ScreenSharePreview.tsx | head -20
```

## 5. Check hooks for webcam/screenshare in App.tsx
```bash
grep -n "webcam\|screenShare\|useWebcam\|useScreenShare\|handleSendVideoFrame" App.tsx | head -20
```

## 6. Check GeminiLiveService video methods
```bash
grep -n "sendRealtimeMedia\|sendContextUpdate\|video\|image" services/geminiLiveService.ts | head -20
```

## 7. Check audio-processor exists (for AudioWorklet)
```bash
ls -la public/audio-processor.js
```

---

## Browser Debugging

### Webcam Issues
1. Open DevTools → Console
2. Check for:
   - ❌ `WebGL: INVALID_VALUE` → Video not ready before processing
   - ❌ `memory access out of bounds` → MediaPipe race condition
   - ❌ `NotAllowedError` → Permission denied

3. Test webcam permissions manually:
```javascript
navigator.mediaDevices.getUserMedia({video: true})
  .then(s => console.log('✅ Webcam works'))
  .catch(e => console.log('❌ Webcam error:', e))
```

### Screen Share Issues
1. Network tab → WS → Check for `screen` or `image` messages
2. Console → Filter by `[ScreenShare]`
3. Verify frames are being captured and sent

---

## Common Webcam Issues

### "WebGL: INVALID_VALUE"
**Cause:** Processing before video is ready
**Fix:** Ensure `onLoadedData` fires before processing starts
```bash
grep -n "onLoadedData\|videoWidth\|processFrame" components/chat/WebcamPreview.tsx | head -10
```

### "memory access out of bounds"
**Cause:** MediaPipe receiving 0x0 frames
**Fix:** Add dimension checks before sending to MediaPipe

### Webcam preview works but AI doesn't see it
**Cause:** Frames not being sent to LiveService
**Fix:** Check `sendRealtimeMedia` is being called
```bash
grep -n "liveServiceRef\|sendRealtimeMedia" App.tsx | head -15
```

---

## Common Screen Share Issues

### Screen share works but AI doesn't analyze
**Cause:** Missing `sendRealtimeInput` callback in hook
```bash
grep -n "sendRealtimeInput\|sendContextUpdate" App.tsx | head -15
```

### Can't start screen share
1. Check browser supports `getDisplayMedia`
2. Must be triggered by user gesture
3. Check for permission errors in console

---

## Key Files

| File | Purpose |
|------|---------|
| `components/chat/WebcamPreview.tsx` | Webcam capture & preview |
| `components/chat/ScreenSharePreview.tsx` | Screen capture & preview |
| `services/geminiLiveService.ts` | Video streaming methods |
| `api/tools/webcam.ts` | Webcam image processing API |
| `public/audio-processor.js` | AudioWorklet processor |
| `App.tsx` | Hook wiring & callbacks |

---

## Quick Test in Browser

1. Open http://localhost:3000
2. Complete onboarding with webcam permission
3. Click webcam button
4. Say "What do you see?" (voice) or type it
5. AI should describe what it sees
6. Check console for any errors
