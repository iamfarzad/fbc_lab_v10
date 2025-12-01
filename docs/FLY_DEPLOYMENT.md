# Fly.io Deployment Guide

## Deployment Location

**Deploy from: ROOT directory** (`/Users/farzad/fbc_lab_v10/`)

**Why root?**
- Server code imports from `src/` directory (shared code)
- Server entry point: `server/live-server.ts`
- Shared dependencies need to be accessible
- Single `package.json` at root manages all dependencies

## Project Structure

```
fbc_lab_v10/              ← Deploy from HERE
├── server/               ← Server code
│   ├── live-server.ts    ← Entry point
│   ├── handlers/
│   ├── websocket/
│   └── utils/
├── src/                  ← Shared code (server imports from here)
│   ├── config/
│   ├── core/
│   └── lib/
├── package.json          ← Dependencies
├── tsconfig.json         ← TypeScript config
└── fly.toml              ← Fly.io config (at root)
```

## Fly.io Configuration

### `fly.toml` (at root)

```toml
app = "your-websocket-server-name"
primary_region = "iad"

[build]
  # Build from root, but output server code
  build = "pnpm install && pnpm build:server"

[env]
  NODE_ENV = "production"
  PORT = "3001"

# HTTP service configuration
[[services]]
  internal_port = 3001
  protocol = "tcp"

  [[services.ports]]
    port = 80
    handlers = ["http"]
    force_https = true

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  # Health check
  [[services.http_checks]]
    interval = "10s"
    timeout = "2s"
    grace_period = "5s"
    method = "GET"
    path = "/health"

# Process configuration
[processes]
  app = "node server/live-server.js"  # Or use tsx/ts-node for TypeScript
```

### Alternative: TypeScript Runtime

If running TypeScript directly:

```toml
[processes]
  app = "tsx server/live-server.ts"  # Using tsx
  # OR
  app = "node --loader ts-node/esm server/live-server.ts"  # Using ts-node
```

## Build Configuration

### Option 1: Build Server Separately

Add to `package.json`:

```json
{
  "scripts": {
    "build:server": "tsc --project tsconfig.server.json",
    "start:server": "node server/live-server.js"
  }
}
```

Create `tsconfig.server.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/server",
    "rootDir": "./"
  },
  "include": [
    "server/**/*",
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist",
    "components",
    "services"
  ]
}
```

### Option 2: Use TypeScript Runtime (Recommended)

Use `tsx` or `ts-node` to run TypeScript directly:

```json
{
  "scripts": {
    "start:server": "tsx server/live-server.ts"
  },
  "dependencies": {
    "tsx": "^4.7.0"
  }
}
```

Then in `fly.toml`:

```toml
[processes]
  app = "tsx server/live-server.ts"
```

## Deployment Steps

### 1. Initialize Fly.io App (from root)

```bash
cd /Users/farzad/fbc_lab_v10
fly launch
```

This will:
- Create `fly.toml` (or use existing)
- Set up Fly.io app
- Configure deployment

### 2. Configure fly.toml

Copy `fly.toml.example` to `fly.toml` and customize:

```bash
cp fly.toml.example fly.toml
# Edit fly.toml with your app name and settings
```

### 3. Set Secrets

```bash
fly secrets set GOOGLE_API_KEY=value
fly secrets set GEMINI_API_KEY=value
fly secrets set SUPABASE_URL=value
fly secrets set SUPABASE_SERVICE_ROLE_KEY=value
fly secrets set JWT_SECRET=value
fly secrets set NODE_ENV=production
fly secrets set PORT=3001
```

### 4. Deploy

```bash
# From root directory
fly deploy
```

## Directory Structure in Deployment

When deployed, Fly.io will:

1. **Copy entire project** (from root)
2. **Run build command** (if specified)
3. **Start process** (from root, pointing to server entry)

**Working directory:** Root (`/app` in container)
**Entry point:** `server/live-server.ts` (or compiled `.js`)

## Import Paths

Since deploying from root, imports work as expected:

```typescript
// In server/live-server.ts
import { constants } from 'src/config/constants'  // ✅ Works
import { logger } from 'src/lib/logger'            // ✅ Works
import { handler } from 'server/handlers/start'    // ✅ Works
```

## Health Check

Add health check endpoint in `server/live-server.ts`:

```typescript
// server/live-server.ts
import express from 'express'

const app = express()

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// ... WebSocket server code
```

## Environment Variables

Set in Fly.io (not in code):

```bash
# Required
GOOGLE_API_KEY=...
GEMINI_API_KEY=...
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
NODE_ENV=production
PORT=3001

# Optional
WS_PORT=3001
LOG_LEVEL=info
```

## Monitoring

```bash
# View logs
fly logs -a your-app-name

# Follow logs
fly logs --follow

# Check status
fly status

# SSH into instance
fly ssh console
```

## Troubleshooting

### Issue: Cannot find module 'src/...'

**Solution:** Ensure deploying from root, not from `server/` directory.

### Issue: Build fails

**Solution:** Check `package.json` has all dependencies, including server dependencies.

### Issue: Server won't start

**Solution:** 
- Check entry point in `fly.toml` matches actual file
- Verify all environment variables are set
- Check logs: `fly logs`

### Issue: Imports not resolving

**Solution:** 
- Ensure TypeScript config includes both `server/` and `src/`
- Check import paths use absolute paths from root
- Verify build output includes all necessary files

## Best Practices

1. ✅ **Deploy from root** - Server needs access to `src/`
2. ✅ **Use TypeScript runtime** - Easier than building separately
3. ✅ **Set all secrets** - Never commit secrets
4. ✅ **Health check endpoint** - For monitoring
5. ✅ **Monitor logs** - `fly logs --follow`
6. ✅ **Test locally first** - Before deploying

## See Also

- [Deployment Guide](./DEPLOYMENT.md) - General deployment info
- [Secrets Management](./SECRETS_MANAGEMENT.md) - How to handle secrets

