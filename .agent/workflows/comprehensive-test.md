---
description: Comprehensive browser test for all features - text chat, voice, webcam, screen share, PDF flow, email, transcript
---

# Comprehensive Browser Feature Test

// turbo-all

## Prerequisites
1. Ensure all servers are running:
```bash
pnpm dev:all
```
Wait for all three servers to show "ready":
- Frontend: http://localhost:3000
- WebSocket: port 3001
- API: http://localhost:3002

## Test Flow

### 1. Initial Setup & Onboarding
1. Open http://localhost:3000 in browser
2. Click "START LIVE CHAT"
3. Complete onboarding:
   - Name: Test User
   - Email: test@example.com
   - Enable Voice, Webcam, Location permissions
   - Agree to terms
   - Click "Start Session"

### 2. Text Chat Test
1. Open the chat panel (click chat icon or "Open Chat")
2. Type: "Hello, I'm interested in AI consulting for my startup"
3. ✅ Verify: AI responds with relevant discovery question
4. Check console for errors (F12 → Console)

### 3. Voice Test
1. Click the microphone/voice button
2. ✅ Verify: Voice session starts (no 1007 errors in console)
3. Speak: "Tell me about your AI workshops"
4. ✅ Verify: AI responds with audio
5. Check server logs for "Live API session opened" (not 1007 error)

### 4. Webcam Test
1. Enable webcam if not already on
2. ✅ Verify: Webcam preview shows your video
3. Say or type: "What do you see?"
4. ✅ Verify: AI acknowledges visual context

### 5. Screen Share Test
1. Click screen share button
2. Select a window/screen to share
3. ✅ Verify: Screen preview appears
4. Ask: "What's on my screen?"
5. ✅ Verify: AI describes screen content

### 6. Context Sharing Test
1. Continue conversation with specific details about your company
2. ✅ Verify: AI remembers and references earlier context
3. Check that personalization builds over conversation

### 7. PDF Agent Flow Test
1. Have a discovery conversation covering:
   - Goals, Pain points, Data readiness
   - Budget, Success metrics
2. ✅ Verify: Stage transitions (Discovery → Scoring → Pitch)
3. Request a summary: "Can you summarize our conversation?"

### 8. Summary Download Test
1. Look for "Download Summary" or PDF button
2. Click to download PDF
3. ✅ Verify: PDF downloads and opens correctly (not corrupted)
4. ✅ Verify: PDF contains conversation summary

### 9. Email Summary Test
1. Click "Email Summary" or similar button
2. Enter email address if prompted
3. ✅ Verify: Email sends successfully
4. Check inbox for PDF attachment
5. ✅ Verify: PDF attachment is valid (not corrupted)

### 10. Transcript Download Test
1. Look for "Download Transcript" button
2. Click to download
3. ✅ Verify: Transcript file downloads
4. ✅ Verify: Contains conversation history

## Common Issues & Fixes

### Error 1007 (Voice)
- Check `server/live-api/config-builder.ts`
- Ensure no empty `inputAudioTranscription: {}` or `outputAudioTranscription: {}`
- Restart WebSocket server after changes

### PDF Corrupted
- Check `api/send-pdf-summary/route.ts`
- Ensure no double base64 encoding

### Webcam Not Working
- Check browser permissions
- Check `api/tools/webcam.ts` body parsing
- Ensure `req.body` is accessed directly (not as string)

### Voice Not Responding
- Check WebSocket connection in Network tab
- Look for heartbeat/pong messages
- Check server logs: `fly logs` or terminal output

## Server Logs to Monitor
```bash
# In separate terminal, watch WebSocket server output
# Look for:
# ✅ "Live API session opened"
# ❌ "Live API session closed" with code 1007
```
