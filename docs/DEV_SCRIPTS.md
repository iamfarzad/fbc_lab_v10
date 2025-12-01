# Development Scripts Guide

## Running Multiple Services

The project runs multiple services simultaneously during development:

1. **Frontend (Vite)** - Port 3000
2. **WebSocket Server** - Port 3001 (local) / 8080 (production)
3. **Agent API Server** - Port 3002

## Quick Start

### Run All Services

```bash
pnpm dev:all
```

This runs all three services in parallel with color-coded output:
- 🔵 **Frontend** (blue) - Vite dev server
- 🟢 **WebSocket** (green) - Live server
- 🟡 **API** (yellow) - Agent API server

### Clean Install + Run All

```bash
pnpm dev:all:clean
```

Installs dependencies and starts all services.

## Individual Services

### Frontend Only

```bash
pnpm dev
# Runs on http://localhost:3000
```

### WebSocket Server Only

```bash
pnpm dev:server
# Runs on ws://localhost:3001 (or port from env)
```

### Agent API Only

```bash
pnpm dev:api
# Runs on http://localhost:3002
```

## Service Configuration

### Ports

**Local Development:**
- Frontend: `3000` (Vite default)
- WebSocket: `3001` (or `8080` - check `server/live-server.ts`)
- Agent API: `3002` (check `api/server.ts` or similar)

**Production:**
- Frontend: Vercel (auto-assigned)
- WebSocket: `8080` (Fly.io)
- Agent API: Vercel API routes (if using Vercel) or separate server

### Environment Variables

**`.env.local`:**
```bash
# Frontend
VITE_WEBSOCKET_URL=ws://localhost:3001
VITE_AGENT_API_URL=http://localhost:3002/api/chat

# WebSocket Server
PORT=3001
NODE_ENV=development

# Agent API
API_PORT=3002
NODE_ENV=development
```

## Troubleshooting

### Port Already in Use

If a port is already in use:

```bash
# Find process using port
lsof -i :3000
lsof -i :3001
lsof -i :3002

# Kill process
kill -9 <PID>
```

### Service Not Starting

**Check:**
1. Dependencies installed: `pnpm install`
2. Environment variables set: `.env.local` exists
3. Ports available: No conflicts
4. TypeScript errors: `pnpm type-check`

### Concurrently Not Found

```bash
pnpm install
# concurrently is in devDependencies
```

## Customization

### Adjust Ports

Edit `package.json` scripts:

```json
{
  "scripts": {
    "dev": "vite --port 3000",
    "dev:server": "tsx watch server/live-server.ts --port 3001",
    "dev:api": "tsx watch api/server.ts --port 3002"
  }
}
```

### Add More Services

Update `dev:all` script:

```json
{
  "scripts": {
    "dev:all": "concurrently -n frontend,websocket,api,db -c blue,green,yellow,red \"pnpm dev\" \"pnpm dev:server\" \"pnpm dev:api\" \"pnpm dev:db\""
  }
}
```

### Change Output Colors

The `-c` flag in `concurrently` sets colors:
- `blue,green,yellow` = frontend,websocket,api
- Add more colors: `red,magenta,cyan,white`

## Background Processes

### Run in Background

```bash
# Start all services in background
pnpm dev:all &

# Or use screen/tmux
screen -S dev
pnpm dev:all
# Ctrl+A, D to detach
```

### Stop All Services

```bash
# If running in foreground: Ctrl+C
# If running in background: Find and kill
pkill -f "vite|tsx|node"
```

## Production vs Development

### Development (Local)

```bash
pnpm dev:all
# All services run locally
# Frontend: localhost:3000
# WebSocket: localhost:3001
# API: localhost:3002
```

### Production

- **Frontend:** Vercel (auto-deployed)
- **WebSocket:** Fly.io (`wss://fb-consulting-websocket.fly.dev`)
- **API:** Vercel API routes or separate server

No need to run `dev:all` in production - services are deployed separately.

## See Also

- [WebSocket Configuration](./WEBSOCKET_CONFIG.md) - WebSocket setup
- [Deployment Guide](./DEPLOYMENT.md) - Production deployment
- [Environment Files](./ENVIRONMENT_FILES.md) - Environment variables

