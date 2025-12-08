# Multimodal Testing Guide

**Purpose:** Comprehensive testing procedures to verify text, voice, webcam, and screenshare work correctly, stream data, and share context.

---

## Prerequisites

### 1. Enable Debug Logging

**Browser Console:**
```javascript
// Enable verbose logging
localStorage.setItem('debug', 'true');
// Reload page
```

**Backend (Fly.io):**
```bash
# View real-time logs
fly logs --app fb-consulting-websocket
```

### 2. Open Developer Tools

- **Browser Console:** F12 → Console tab
- **Network Tab:** F12 → Network tab (filter: WS for WebSocket)
- **Application Tab:** F12 → Application → Local Storage

---

## Testing Checklist

### ✅ Text Input

#### Test 1: Basic Text Message
1. Type a message in chat input
2. Press Enter or click Send
3. **Verify:**
   - [ ] Message appears in chat transcript
   - [ ] Message sent to `/api/chat/persist-message` (Network tab)
   - [ ] Response received from AI
   - [ ] Response appears in chat

#### Test 2: Text with File Upload
1. Click file upload button
2. Select an image file
3. Type a message
4. Send
5. **Verify:**
   - [ ] File preview appears
   - [ ] Message includes attachment
   - [ ] `/api/chat/persist-message` includes file data
   - [ ] AI response references the image

#### Test 3: Context Sharing (Text)
1. Send a text message
2. Check browser console for:
   ```
   [MultimodalContextManager] Text message added
   ```
3. **Verify:**
   - [ ] Message stored in `MultimodalContextManager`
   - [ ] Context available to agents

**Expected Console Logs:**
```
[App] Message sent: "your message"
[MultimodalContextManager] addTextMessage: { text: "...", timestamp: ... }
```

---

### ✅ Voice Input/Output

#### Test 1: Voice Connection
1. Click "Start Voice" or microphone button
2. **Verify:**
   - [ ] Connection state changes to `CONNECTING` then `CONNECTED`
   - [ ] Browser console shows: `[GeminiLiveService] Connected`
   - [ ] WebSocket connection established (Network tab → WS filter)
   - [ ] Connection ID received

**Expected Console Logs:**
```
[GeminiLiveService] Connecting to Live API...
[GeminiLiveService] Connected: connectionId=xxx
[LiveClientWS] WebSocket connected
```

#### Test 2: Voice Input (Speaking)
1. With voice connected, speak into microphone
2. **Verify:**
   - [ ] Microphone indicator shows activity
   - [ ] Audio chunks sent via WebSocket (Network tab)
   - [ ] Transcription appears in real-time
   - [ ] Backend receives `REALTIME_INPUT` messages

**Expected Console Logs:**
```
[GeminiLiveService] Audio chunk sent: size=xxx
[LiveClientWS] Sending REALTIME_INPUT: { type: 'audio', ... }
```

**Backend Logs (Fly.io):**
```bash
fly logs --app fb-consulting-websocket | grep REALTIME_INPUT
# Should show: REALTIME_INPUT received for connectionId=xxx
```

#### Test 3: Voice Output (AI Speaking)
1. With voice connected, ask a question
2. **Verify:**
   - [ ] AI response audio plays
   - [ ] Audio chunks received via WebSocket
   - [ ] Transcription appears in chat

**Expected Console Logs:**
```
[GeminiLiveService] Audio response received
[AudioWorklet] Processing audio chunk
```

#### Test 4: Voice Context Sharing
1. With voice connected, speak about a topic
2. Check backend logs for context updates:
   ```bash
   fly logs --app fb-consulting-websocket | grep CONTEXT_UPDATE
   ```
3. **Verify:**
   - [ ] Voice transcript stored in context
   - [ ] Context available to agents
   - [ ] Backend receives context updates

**Expected Backend Logs:**
```
CONTEXT_UPDATE received: { modality: 'voice', analysis: '...' }
Context persisted to MultimodalContextManager
```

---

### ✅ Webcam

#### Test 1: Webcam Activation
1. Click webcam button or enable webcam
2. **Verify:**
   - [ ] Camera permission requested
   - [ ] Webcam preview appears (top-right)
   - [ ] Video stream active
   - [ ] No errors in console

**Expected Console Logs:**
```
[WebcamPreview] Camera access granted
[WebcamPreview] Video stream started
```

#### Test 2: Webcam Frame Streaming
1. With webcam active AND voice connected
2. **Verify:**
   - [ ] Frames sent to Live API
   - [ ] Console shows: `[App] Webcam frame sent to Live API`
   - [ ] WebSocket messages sent (Network tab)
   - [ ] Backend receives `REALTIME_INPUT` with `mimeType: 'image/jpeg'`

**Expected Console Logs:**
```
[App] Webcam frame sent to Live API: size=xxx
[GeminiLiveService] sendRealtimeMedia: { mimeType: 'image/jpeg', ... }
```

**Backend Logs:**
```bash
fly logs --app fb-consulting-websocket | grep "REALTIME_INPUT.*image"
# Should show: REALTIME_INPUT received: { mimeType: 'image/jpeg', ... }
```

#### Test 3: Webcam Analysis & Context
1. With webcam active, show something to camera
2. Wait for analysis (may take a few seconds)
3. **Verify:**
   - [ ] Analysis performed (check console)
   - [ ] Context update sent
   - [ ] Backend receives `CONTEXT_UPDATE` with modality: 'webcam'

**Expected Console Logs:**
```
[useCamera] Analysis completed: "..."
[useCamera] Context update sent
```

**Backend Logs:**
```bash
fly logs --app fb-consulting-websocket | grep "CONTEXT_UPDATE.*webcam"
# Should show: CONTEXT_UPDATE received: { modality: 'webcam', analysis: '...' }
```

#### Test 4: Webcam + Voice Integration
1. Enable both voice and webcam
2. Speak while showing something to camera
3. **Verify:**
   - [ ] Both audio and video frames sent
   - [ ] AI responds to both voice and visual input
   - [ ] Context includes both modalities

---

### ✅ Screen Share

#### Test 1: Screen Share Activation
1. Click screen share button
2. Select screen/window to share
3. **Verify:**
   - [ ] Screen share preview appears (top-right)
   - [ ] Preview shows current screen
   - [ ] No errors in console

**Expected Console Logs:**
```
[useScreenShare] Screen share started
[useScreenShare] Stream captured
```

#### Test 2: Screen Share Frame Streaming
1. With screen share active AND voice connected
2. **Verify:**
   - [ ] Frames captured every 4 seconds (default interval)
   - [ ] Console shows: `📺 Screen frame streamed to Live API`
   - [ ] WebSocket messages sent
   - [ ] Backend receives `REALTIME_INPUT` with screen frames

**Expected Console Logs:**
```
[useScreenShare] Screen frame streamed to Live API
[App] handleSendRealtimeInput: chunks=[{ mimeType: 'image/jpeg', ... }]
```

**Backend Logs:**
```bash
fly logs --app fb-consulting-websocket | grep "REALTIME_INPUT.*image"
# Should show screen frames being received
```

#### Test 3: Screen Share Analysis & Context
1. With screen share active, show content on screen
2. Wait for analysis (first analysis may take longer)
3. **Verify:**
   - [ ] Analysis performed (check console after ~4 seconds)
   - [ ] Console shows: `[App] Screen share analysis: "..."`
   - [ ] Context update sent
   - [ ] Backend receives `CONTEXT_UPDATE` with modality: 'screen'

**Expected Console Logs:**
```
[useScreenShare] Analysis completed: "..."
[App] Screen share analysis: "..."
[App] handleSendContextUpdate called
```

**Backend Logs:**
```bash
fly logs --app fb-consulting-websocket | grep "CONTEXT_UPDATE.*screen"
# Should show: CONTEXT_UPDATE received: { modality: 'screen', analysis: '...' }
```

#### Test 4: Screen Share + Voice Integration
1. Enable both voice and screen share
2. Speak while sharing screen
3. **Verify:**
   - [ ] Both audio and screen frames sent
   - [ ] AI responds to both voice and screen content
   - [ ] Context includes both modalities
   - [ ] `voiceConnectionId` included in screen share metadata

---

## Combined Modality Tests

### Test 1: All Modalities Active
1. Enable: Text, Voice, Webcam, Screen Share
2. **Verify:**
   - [ ] All previews visible (webcam + screen share)
   - [ ] All streams active
   - [ ] No conflicts or errors
   - [ ] AI can process all inputs

### Test 2: Context Aggregation
1. Send text message
2. Speak with voice
3. Show webcam
4. Share screen
5. **Verify:**
   - [ ] All context stored in `MultimodalContextManager`
   - [ ] Agents receive all context
   - [ ] AI responses reference multiple modalities

**Check Backend:**
```bash
fly logs --app fb-consulting-websocket | grep "CONTEXT_UPDATE"
# Should show context updates from all modalities
```

---

## Verification Commands

### Browser Console Checks

```javascript
// Check connection state
window.liveServiceRef?.current?.getConnectionId()

// Check if webcam is active
document.querySelector('video[data-webcam]')?.srcObject

// Check if screen share is active
document.querySelector('video[data-screenshare]')?.srcObject

// Check WebSocket connection
// In Network tab → WS filter → Check "Messages" tab
```

### Backend Log Checks

```bash
# Check WebSocket connections
fly logs --app fb-consulting-websocket | grep "WebSocket.*connected"

# Check realtime input (voice/video)
fly logs --app fb-consulting-websocket | grep "REALTIME_INPUT"

# Check context updates
fly logs --app fb-consulting-websocket | grep "CONTEXT_UPDATE"

# Check for errors
fly logs --app fb-consulting-websocket | grep -i error

# Monitor all activity
fly logs --app fb-consulting-websocket --follow
```

### Network Tab Checks

1. Open Network tab (F12)
2. Filter by "WS" (WebSocket)
3. Click on WebSocket connection
4. Go to "Messages" tab
5. **Verify:**
   - [ ] Outgoing: `REALTIME_INPUT` messages (voice/video)
   - [ ] Outgoing: `CONTEXT_UPDATE` messages
   - [ ] Incoming: Audio chunks, responses

---

## Common Issues & Debugging

### Issue: Voice Not Connecting

**Check:**
1. Browser console for connection errors
2. WebSocket connection in Network tab
3. Backend logs for connection attempts
4. `connectionState` in React DevTools

**Debug:**
```javascript
// In browser console
console.log('Connection State:', window.connectionState)
console.log('Live Service:', window.liveServiceRef?.current)
```

### Issue: Webcam Frames Not Sending

**Check:**
1. Is voice connected? (webcam requires voice connection)
2. Console for: `[App] Webcam frame sent to Live API`
3. `handleSendVideoFrame` being called
4. `connectionState === CONNECTED`

**Debug:**
```javascript
// Check if callback exists
console.log('handleSendVideoFrame:', typeof handleSendVideoFrame)
```

### Issue: Screen Share Not Streaming

**Check:**
1. Is voice connected? (screen share requires voice connection)
2. Console for: `📺 Screen frame streamed to Live API`
3. `sendRealtimeInput` callback provided to `useScreenShare`
4. `connectionState === CONNECTED`

**Debug:**
```javascript
// Check hook configuration
// In App.tsx, verify useScreenShare has sendRealtimeInput
```

### Issue: Context Not Sharing

**Check:**
1. Is analysis completing? (check console for analysis results)
2. Is `sendContextUpdate` callback provided?
3. Is `connectionState === CONNECTED`?
4. Is `isSessionReady === true`?
5. Backend logs for `CONTEXT_UPDATE` messages

**Debug:**
```javascript
// Check if context update is being called
// Add breakpoint in handleSendContextUpdate in App.tsx
```

### Issue: Analysis Not Running

**Check:**
1. Is `sessionId` provided to hook?
2. Has enough time passed since last analysis? (ANALYSIS_INTERVAL_MS)
3. Is `uploadToBackend` succeeding?
4. Check Network tab for analysis API calls

**Debug:**
```bash
# Check backend analysis endpoint
fly logs --app fb-consulting-websocket | grep "analysis\|analyze"
```

---

## Automated Test Script

Create a test script to verify all modalities:

```bash
#!/bin/bash
# scripts/test-multimodal.sh

echo "🧪 Multimodal System Test"
echo "========================"

# Check if all key files exist
echo "📁 Checking files..."
./scripts/check-multimodal-integration.sh

# Check backend health
echo ""
echo "🏥 Checking backend health..."
curl -s https://fb-consulting-websocket.fly.dev/health

# Check WebSocket endpoint
echo ""
echo "🔌 Checking WebSocket endpoint..."
# (WebSocket check requires browser or specialized tool)

echo ""
echo "✅ Manual testing required:"
echo "1. Open app in browser"
echo "2. Enable voice connection"
echo "3. Test each modality"
echo "4. Check browser console and backend logs"
```

---

## Test Report Template

After testing, document results:

```markdown
## Test Report - [Date]

### Text Input
- [ ] Basic message: ✅/❌
- [ ] File upload: ✅/❌
- [ ] Context sharing: ✅/❌

### Voice
- [ ] Connection: ✅/❌
- [ ] Input streaming: ✅/❌
- [ ] Output playback: ✅/❌
- [ ] Context sharing: ✅/❌

### Webcam
- [ ] Activation: ✅/❌
- [ ] Frame streaming: ✅/❌
- [ ] Analysis: ✅/❌
- [ ] Context sharing: ✅/❌

### Screen Share
- [ ] Activation: ✅/❌
- [ ] Frame streaming: ✅/❌
- [ ] Analysis: ✅/❌
- [ ] Context sharing: ✅/❌

### Combined
- [ ] All modalities: ✅/❌
- [ ] Context aggregation: ✅/❌

### Issues Found:
- [List any issues]

### Backend Logs:
[Paste relevant logs]
```

---

## Quick Test Sequence

**5-Minute Quick Test:**
1. ✅ Send text message → Verify response
2. ✅ Enable voice → Verify connection
3. ✅ Speak → Verify transcription
4. ✅ Enable webcam → Verify preview + frames sent
5. ✅ Enable screen share → Verify preview + frames sent
6. ✅ Check backend logs → Verify all messages received

**15-Minute Comprehensive Test:**
1. Follow all individual modality tests
2. Test combinations
3. Verify context sharing for each
4. Check backend logs
5. Test error scenarios
6. Document results

---

## Related Documentation

- `docs/MULTIMODAL_BREAKAGE_INVESTIGATION.md` - Investigation guide
- `docs/WEBCAM_SCREENSHARE_BREAKAGE_ANALYSIS.md` - Example analysis
- `docs/MULTIMODAL_AGENT_INTEGRATION.md` - Integration overview
- `scripts/check-multimodal-integration.sh` - Diagnostic script

