---
description: Troubleshoot voice/Live API issues including 1007 errors
---

# Debug Voice / Live API Issues

// turbo-all

## 1. Check if servers are running
```bash
lsof -i :3000 -i :3001 -i :3002 | head -20
```

## 2. Check WebSocket server logs for errors
```bash
grep -r "1007\|error\|Error\|failed" logs/ 2>/dev/null | tail -20 || echo "No log files found"
```

## 3. Verify Live API config-builder has no invalid parameters
```bash
cat server/live-api/config-builder.ts | grep -A5 "inputAudioTranscription\|outputAudioTranscription"
```

## 4. Check for empty transcription objects (causes 1007)
If you see `inputAudioTranscription: {}` or `outputAudioTranscription: {}`, these MUST be removed or set to valid values.

## 5. Check GeminiLiveService connection code
```bash
grep -n "connect\|session_started\|1007\|error" services/geminiLiveService.ts | head -30
```

## 6. Validate the model name
```bash
grep "GEMINI_LIVE_MODEL\|native-audio" server/live-api/config-builder.ts .env.local
```
Expected model: `gemini-2.5-flash-native-audio-preview` or similar

## 7. Restart WebSocket server
```bash
pkill -f "live-server" || true
pnpm dev:server &
```

## 8. Test voice in browser
1. Open http://localhost:3000
2. Complete onboarding with voice permission enabled
3. Click microphone button
4. Watch console for:
   - ✅ "Live API session opened"
   - ❌ "code: 1007" = Invalid argument error

## Common Fixes

### Error 1007 - Invalid Argument
- Remove empty `inputAudioTranscription: {}` from config
- Remove empty `outputAudioTranscription: {}` from config
- Ensure `tools` array doesn't have unsupported tool definitions
- Check model supports the requested features

### Voice connects but no audio
- Check browser microphone permissions
- Verify AudioContext is created after user interaction
- Check `public/audio-processor.js` exists

### Session timeout
- Check `geminiLiveService.ts` timeout value (should be 20s+)
- Look for `setup_complete` or `session_started` events
