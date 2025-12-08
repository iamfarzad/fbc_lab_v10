---
description: Kill all dev server ports and restart fresh
---

# Restart All Development Servers

// turbo-all

## 1. Kill processes on all dev ports
```bash
lsof -ti :3000 | xargs kill -9 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :3002 | xargs kill -9 2>/dev/null || true
lsof -ti :5173 | xargs kill -9 2>/dev/null || true
```

## 2. Verify ports are free
```bash
lsof -i :3000 -i :3001 -i :3002 -i :5173 2>/dev/null || echo "All ports are free"
```

## 3. Clear any node processes that might be stuck
```bash
pkill -f "vite" 2>/dev/null || true
pkill -f "live-server" 2>/dev/null || true
pkill -f "vercel dev" 2>/dev/null || true
```

## 4. Clear Vite cache (optional but helps with stale builds)
```bash
rm -rf node_modules/.vite 2>/dev/null || true
```

## 5. Start all servers
```bash
pnpm dev:all
```

Wait for all three to show ready:
- ✅ Frontend: `Local: http://localhost:3000`
- ✅ WebSocket: `WebSocket server listening`
- ✅ API: `Ready! Available at http://localhost:3002`

## Alternative: Start servers individually

### Frontend only
```bash
pnpm dev
```

### WebSocket only
```bash
pnpm dev:server
```

### API only
```bash
pnpm dev:api:3002
```

## Troubleshooting

### Port still in use after killing
```bash
# Find the stubborn process
lsof -i :3000

# Force kill by PID
kill -9 <PID>
```

### Node modules corrupted
```bash
rm -rf node_modules
pnpm install
pnpm dev:all
```

### Permission denied
```bash
sudo lsof -ti :3000 | xargs sudo kill -9
```
