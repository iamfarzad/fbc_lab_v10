---
description: Diagnose WebSocket connection and streaming issues
---

# Debug WebSocket Connection Issues

// turbo-all

## 1. Check if WebSocket server is running
```bash
lsof -i :3001 | head -5
```

## 2. Test WebSocket health endpoint
```bash
curl -s http://localhost:3001/health 2>/dev/null || echo "Server not responding"
```

## 3. Check WebSocket server startup logs
```bash
cat logs/websocket-*.log 2>/dev/null | tail -30 || echo "No WebSocket logs found"
```

## 4. Check server configuration
```bash
cat server/live-server.ts | head -50
```

## 5. Verify CORS and allowed origins
```bash
grep -n "cors\|origin\|ALLOWED" server/live-server.ts server/websocket/*.ts 2>/dev/null
```

## 6. Check for connection handlers
```bash
grep -n "on('connection'\|onopen\|onclose\|onerror" server/websocket/*.ts services/geminiLiveService.ts | head -20
```

## 7. Test WebSocket connection manually
```bash
node test-websocket.js 2>/dev/null || echo "test-websocket.js not found or failed"
```

## 8. Restart WebSocket server
```bash
pkill -f "live-server" || true
sleep 1
pnpm dev:server &
```

## Browser Debugging Steps

1. Open DevTools → Network tab → WS filter
2. Look for WebSocket connection to `localhost:3001` or `wss://...fly.dev`
3. Check Messages tab for:
   - ✅ `session_started` or `setup_complete`
   - ✅ Regular `audio` messages
   - ❌ Error messages or unexpected closes

## Common Issues & Fixes

### Connection refused
- WebSocket server not running
- Wrong port (should be 3001 locally)
- Run: `pnpm dev:server`

### Connection closes immediately
- CORS issue - check allowed origins
- SSL issue in production
- Check server logs for error

### No messages received
- Live API session not started
- Check for 1007 errors (run /debug-voice)
- Audio not being captured

### Production WebSocket not connecting
- Check Fly.io deployment: `fly status`
- Check Fly.io logs: `fly logs`
- Verify `WSS_URL` environment variable
