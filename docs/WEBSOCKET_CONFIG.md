# WebSocket Configuration

Guide for configuring WebSocket connections in local vs production environments.

## Environment-Specific Configuration

### Local Development
**WebSocket URL:** `ws://localhost:3000` or `ws://localhost:8080`

### Production (Fly.io)
**WebSocket URL:** `wss://fb-consulting-websocket.fly.dev`

## Configuration Strategy

### Option 1: Environment Variables (Recommended)

**Frontend Configuration:**

```typescript
// src/config/websocket.ts
export const getWebSocketUrl = (): string => {
  // Production: Use Fly.io URL
  if (import.meta.env.PROD) {
    return import.meta.env.VITE_WEBSOCKET_URL || 'wss://fb-consulting-websocket.fly.dev'
  }
  
  // Development: Use localhost
  return import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:8080'
}
```

**Environment Variables:**

```bash
# .env (local)
VITE_WEBSOCKET_URL=ws://localhost:8080

# .env.production (or Vercel env vars)
VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev
```

### Option 2: Config File

```typescript
// src/config/websocket.ts
const config = {
  development: {
    websocketUrl: 'ws://localhost:8080',
  },
  production: {
    websocketUrl: 'wss://fb-consulting-websocket.fly.dev',
  },
}

export const getWebSocketUrl = (): string => {
  const env = import.meta.env.MODE || 'development'
  return config[env as keyof typeof config]?.websocketUrl || config.development.websocketUrl
}
```

## Setup Instructions

### 1. Local Development

**Frontend (.env):**
```bash
VITE_WEBSOCKET_URL=ws://localhost:8080
```

**WebSocket Server:**
```bash
# Run server locally
pnpm dev:server

# Server runs on port 8080 (or 3000, depending on your setup)
```

**Connection:**
```typescript
const ws = new WebSocket('ws://localhost:8080')
```

### 2. Production (Vercel + Fly.io)

**Vercel Environment Variables:**
```bash
# Set in Vercel dashboard
VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev
```

**Fly.io Configuration:**
- App name: `fb-consulting-websocket`
- Region: `iad`
- Port: `8080`
- Health check: `/health`

**Connection:**
```typescript
const ws = new WebSocket('wss://fb-consulting-websocket.fly.dev')
```

## Implementation Example

### Frontend WebSocket Client

```typescript
// src/lib/websocket-client.ts
import { getWebSocketUrl } from 'src/config/websocket'

export class WebSocketClient {
  private ws: WebSocket | null = null
  private url: string

  constructor() {
    this.url = getWebSocketUrl()
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return
    }

    this.ws = new WebSocket(this.url)
    
    this.ws.onopen = () => {
      console.log('WebSocket connected:', this.url)
    }

    this.ws.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    this.ws.onclose = () => {
      console.log('WebSocket disconnected')
    }
  }

  send(data: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data))
    }
  }

  disconnect(): void {
    this.ws?.close()
  }
}
```

### Server Health Check

```typescript
// server/live-server.ts or server entry point
import express from 'express'

const app = express()

// Health check endpoint (required by Fly.io)
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  })
})

// WebSocket server setup...
```

## Environment Variable Setup

### Local Development

**`.env` (gitignored):**
```bash
# WebSocket
VITE_WEBSOCKET_URL=ws://localhost:8080

# Other vars...
```

### Production

**Vercel Dashboard:**
1. Go to project → Settings → Environment Variables
2. Add: `VITE_WEBSOCKET_URL` = `wss://fb-consulting-websocket.fly.dev`
3. Set for: Production, Preview, Development

**Fly.io:**
- App name: `fb-consulting-websocket`
- Port: `8080`
- Health check: `/health`

## Fly.io Configuration

**`fly.toml` (at root):**
```toml
app = "fb-consulting-websocket"
primary_region = "iad"

[build]
  dockerfile = "server/Dockerfile"

[env]
  NODE_ENV = "production"
  PORT = "8080"

[http_service]
  auto_start_machines = true
  auto_stop_machines = "suspend"
  force_https = true
  internal_port = 8080
  min_machines_running = 1

  [[http_service.checks]]
    interval = "45s"
    path = "/health"
    timeout = "10s"

[[vm]]
  cpu_kind = "shared"
  cpus = 1
  memory = "2gb"
```

## Testing

### Local Testing

```bash
# Terminal 1: Start WebSocket server
pnpm dev:server
# Server runs on localhost:8080

# Terminal 2: Start frontend
pnpm dev
# Frontend connects to ws://localhost:8080
```

### Production Testing

```bash
# Deploy to Fly.io
fly deploy

# Check health
curl https://fb-consulting-websocket.fly.dev/health

# Test WebSocket connection
# Use browser console or WebSocket client
```

## Troubleshooting

### Local: Can't Connect

**Check:**
- Server is running: `pnpm dev:server`
- Port matches: `localhost:8080` (or `3000`)
- URL in code matches server port
- No firewall blocking

### Production: Can't Connect

**Check:**
- Fly.io app is deployed: `fly status`
- Health check works: `curl https://fb-consulting-websocket.fly.dev/health`
- Vercel env var is set: `VITE_WEBSOCKET_URL`
- Using `wss://` (secure WebSocket) not `ws://`
- CORS is configured correctly

### Common Issues

**Issue:** WebSocket connection fails in production
- **Solution:** Ensure using `wss://` (secure) not `ws://`
- **Solution:** Check Fly.io app is running: `fly status`

**Issue:** Local connection fails
- **Solution:** Verify server is running on correct port
- **Solution:** Check `VITE_WEBSOCKET_URL` in `.env`

**Issue:** CORS errors
- **Solution:** Configure CORS on WebSocket server
- **Solution:** Allow origin from Vercel domain

## Security Notes

- ✅ Use `wss://` (secure WebSocket) in production
- ✅ Use `ws://` (non-secure) only in local development
- ✅ Never commit WebSocket URLs with real values
- ✅ Use environment variables for all URLs
- ✅ Validate WebSocket connections on server

## See Also

- [Deployment Guide](./DEPLOYMENT.md) - General deployment
- [Fly.io Deployment](./FLY_DEPLOYMENT.md) - Fly.io setup
- [Secrets Management](./SECRETS_MANAGEMENT.md) - Environment variables

