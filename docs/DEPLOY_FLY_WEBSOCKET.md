# Deploy WebSocket Server to Fly.io

## Quick Deploy Steps

### 1. Commit Changes (if needed)

```bash
cd /Users/farzad/fbc_lab_v10

# Check what needs to be committed
git status

# Add server files (if not already committed)
git add server/Dockerfile server/package.json server/live-api/tool-processor.ts

# Commit
git commit -m "feat: add capability tracking and deployment fixes"
```

### 2. Install Fly CLI (if not installed)

```bash
# macOS
curl -L https://fly.io/install.sh | sh

# Or via Homebrew
brew install flyctl

# Verify installation
flyctl version
```

### 3. Authenticate with Fly.io

```bash
flyctl auth login
```

### 4. Verify Configuration

The `fly.toml` is already configured:
- App: `fb-consulting-websocket`
- Region: `iad`
- Port: `8080`
- Dockerfile: `server/Dockerfile`

### 5. Set/Verify Secrets

```bash
# List current secrets
flyctl secrets list -a fb-consulting-websocket

# Set secrets if needed (only if missing)
flyctl secrets set GOOGLE_API_KEY=your_key -a fb-consulting-websocket
flyctl secrets set GEMINI_API_KEY=your_key -a fb-consulting-websocket
flyctl secrets set SUPABASE_URL=your_url -a fb-consulting-websocket
flyctl secrets set SUPABASE_SERVICE_ROLE_KEY=your_key -a fb-consulting-websocket
```

### 6. Deploy from Root

**CRITICAL: Deploy from ROOT directory, not from server/**

```bash
cd /Users/farzad/fbc_lab_v10

# Deploy
flyctl deploy -a fb-consulting-websocket

# Or if flyctl is in PATH as 'fly'
fly deploy -a fb-consulting-websocket
```

### 7. Monitor Deployment

```bash
# Watch logs during deployment
flyctl logs -a fb-consulting-websocket

# Check status
flyctl status -a fb-consulting-websocket

# Test health endpoint
curl https://fb-consulting-websocket.fly.dev/health
```

## What Gets Deployed

The Dockerfile builds:
1. **Server code** from `server/` directory
2. **Shared code** from `src/` directory (copied to `/app/src`)
3. **Dependencies** from `server/package.json`
4. **TypeScript runtime** (`tsx`) for running `.ts` files directly

## Deployment Process

1. Fly.io reads `fly.toml` at root
2. Builds using `server/Dockerfile`
3. Dockerfile copies:
   - `server/package.json` → installs dependencies
   - `server/*.ts` → server entry points
   - `server/**/*` → all server subdirectories
   - `src/` → shared source code
   - `tsconfig.json` → TypeScript config
4. Runs: `pnpm tsx live-server.ts` (from `/app`)

## Verification

After deployment:

```bash
# Health check
curl https://fb-consulting-websocket.fly.dev/health
# Should return: OK

# Check logs
flyctl logs -a fb-consulting-websocket

# SSH into instance (if needed)
flyctl ssh console -a fb-consulting-websocket
```

## Troubleshooting

### Build Fails

```bash
# Check Dockerfile syntax
docker build -f server/Dockerfile -t test-build .

# Check for missing files
ls -la server/Dockerfile server/package.json
```

### Server Won't Start

```bash
# Check logs
flyctl logs -a fb-consulting-websocket

# Check secrets are set
flyctl secrets list -a fb-consulting-websocket

# Restart app
flyctl apps restart fb-consulting-websocket
```

### Import Errors

- Ensure deploying from **root**, not `server/`
- Verify `src/` directory exists and is copied in Dockerfile
- Check `tsconfig.json` includes both `server/` and `src/`

## Current Changes to Deploy

Based on analysis:
- ✅ `server/Dockerfile` - Path resolution fixes
- ✅ `server/package.json` - Missing dependencies added
- ⚠️ `server/live-api/tool-processor.ts` - Capability tracking (uncommitted)

**Recommendation:** Commit all changes before deploying.

