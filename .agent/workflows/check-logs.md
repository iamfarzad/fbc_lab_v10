---
description: Monitor all logs - frontend console, WebSocket server, and API
---

# Check All Logs

// turbo-all

## 1. Check if servers are running
```bash
lsof -i :3000 -i :3001 -i :3002 | grep LISTEN | head -10
```

## 2. Check local WebSocket server logs
```bash
ls -la logs/ 2>/dev/null && tail -50 logs/*.log 2>/dev/null || echo "No log files in logs/"
```

## 3. Check for recent errors in any log files
```bash
find . -name "*.log" -mmin -60 -exec tail -20 {} \; 2>/dev/null | head -50
```

## 4. Watch Fly.io WebSocket logs (production)
```bash
fly logs --app fb-consulting-websocket | head -50
```

## 5. Watch Vercel logs (production)
```bash
vercel logs | head -50
```

## Browser Console Debugging

1. Open DevTools (F12 or Cmd+Option+I)
2. Go to Console tab
3. Filter by:
   - `[App]` - Main app logs
   - `[GeminiLive]` - Voice service logs
   - `[AIBrain]` - Chat service logs
   - `error` - All errors
   - `warn` - All warnings

## Network Tab Debugging

1. Open DevTools → Network tab
2. Important requests to watch:
   - `POST /api/chat` - Text chat
   - `POST /api/agent-stage` - Agent routing
   - `WS localhost:3001` or `wss://...fly.dev` - Voice WebSocket

## Common Log Patterns

### Success indicators
```
✅ "Live API session opened"
✅ "session_started" 
✅ "Connected to WebSocket"
✅ "Agent response received"
```

### Error indicators
```
❌ "code: 1007" - Invalid argument to Live API
❌ "ECONNREFUSED" - Server not running
❌ "500" - API error
❌ "ERR_MODULE_NOT_FOUND" - Import issue
❌ "timeout" - Connection or API timeout
```

## Continuous Log Monitoring

### Watch all servers in split terminal
```bash
# Terminal 1 - Frontend
pnpm dev

# Terminal 2 - WebSocket
pnpm dev:server

# Terminal 3 - API
pnpm dev:api:3002
```

### Use the built-in log watcher
```bash
pnpm logs:watch
```

## Production Log Commands

```bash
# Fly.io (WebSocket)
fly logs --app fb-consulting-websocket

# Vercel (Frontend + API)
vercel logs --follow

# Supabase (if needed)
# Check Supabase dashboard → Logs
```
