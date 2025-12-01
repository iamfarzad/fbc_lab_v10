# Deployment Architecture

## Overview

The project uses a multi-platform deployment strategy:

1. **Frontend** → Vercel
2. **WebSocket Server** → Fly.io
3. **Database** → Supabase

Each platform manages its own environment variables and secrets.

## Platform-Specific Configuration

### Vercel (Frontend)

**What runs on Vercel:**
- React frontend application
- API routes (Next.js API routes if using Next.js)
- Static assets

**Environment Variables:**
- Set in Vercel dashboard: Settings → Environment Variables
- Available as `process.env.VARIABLE_NAME` or `import.meta.env.VITE_*` (Vite)
- Separate for: Production, Preview, Development

**Common Variables:**
```bash
# Public (exposed to client)
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# Server-side only (API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
OPENAI_API_KEY=sk-...
GEMINI_API_KEY=...
```

**Configuration Files:**
- `vercel.json` - Vercel deployment configuration
- Environment variables managed in Vercel dashboard

### Fly.io (WebSocket Server)

**What runs on Fly.io:**
- WebSocket server (`server/live-server.ts`)
- Real-time communication handlers
- Background workers (if any)

**Environment Variables:**
- Set via Fly.io CLI or dashboard
- Available as `process.env.VARIABLE_NAME`
- Managed per app: `fly secrets set KEY=value`

**Common Variables:**
```bash
# WebSocket server config
WS_PORT=3001
NODE_ENV=production

# API keys for server-side
GOOGLE_API_KEY=AIza...
GEMINI_API_KEY=...
OPENAI_API_KEY=sk-...

# Database
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# JWT & Auth
JWT_SECRET=...
```

**Configuration Files:**
- `fly.toml` - Fly.io app configuration (at root)
- Secrets: `fly secrets set KEY=value`

**Deployment Location:**
- **Deploy from ROOT directory** (not from `server/`)
- Server imports from `src/`, so root deployment is required
- Entry point: `server/live-server.ts`

**App Configuration:**
- App name: `fb-consulting-websocket`
- Region: `iad`
- Port: `8080`
- Health check: `/health`

**Deployment:**
```bash
# From root directory
cd /Users/farzad/fbc_lab_v10

# Set secrets
fly secrets set GOOGLE_API_KEY=value
fly secrets set SUPABASE_SERVICE_ROLE_KEY=value

# Deploy (from root)
fly deploy
```

**WebSocket URLs:**
- Local: `ws://localhost:8080`
- Production: `wss://fb-consulting-websocket.fly.dev`

See [Fly.io Deployment Guide](./FLY_DEPLOYMENT.md) and [WebSocket Configuration](./WEBSOCKET_CONFIG.md) for detailed setup.

### Supabase (Database)

**What's in Supabase:**
- PostgreSQL database
- Authentication
- Storage
- Edge Functions (if used)

**Environment Variables:**
- Managed in Supabase dashboard
- Project Settings → API → Keys
- Migration files in `supabase/migrations/`

**Common Variables:**
- `SUPABASE_URL` - Project URL
- `SUPABASE_ANON_KEY` - Public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)

**Migration Files:**
- `supabase/migrations/` - SQL migration files
- Version controlled
- Applied via Supabase CLI or dashboard

## Environment Variable Strategy

### Local Development

**Use `.env` file (gitignored):**
```bash
# .env (local only, never commit)
GOOGLE_API_KEY=your_local_key
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Load with:**
```typescript
// For Vite
import.meta.env.VITE_GOOGLE_API_KEY

// For Node.js
process.env.GOOGLE_API_KEY
```

### Vercel Deployment

**Set in Vercel Dashboard:**
1. Go to project → Settings → Environment Variables
2. Add variables for each environment:
   - Production
   - Preview
   - Development

**Or via CLI:**
```bash
vercel env add GOOGLE_API_KEY production
```

### Fly.io Deployment

**Set secrets:**
```bash
fly secrets set GOOGLE_API_KEY=value
fly secrets set SUPABASE_SERVICE_ROLE_KEY=value
```

**List secrets:**
```bash
fly secrets list
```

**Remove secret:**
```bash
fly secrets unset KEY_NAME
```

### Supabase

**Access via:**
- Dashboard: Project Settings → API
- Environment variables in Supabase dashboard
- Migration files for schema changes

## Configuration Files

### Vercel

**`vercel.json`** (if needed):
```json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/api/(.*)",
      "destination": "/api/$1"
    }
  ]
}
```

### Fly.io

**`fly.toml`**:
```toml
app = "your-app-name"
primary_region = "iad"

[build]

[env]
  NODE_ENV = "production"
  PORT = "3001"

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
```

### Supabase

**`supabase/config.toml`** (local development):
```toml
[api]
enabled = true
port = 54321

[db]
port = 54322
```

**Migration files:**
- `supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql`

## Deployment Workflow

### Frontend (Vercel)

```bash
# 1. Set environment variables in Vercel dashboard
# 2. Push to main branch (auto-deploys)
# Or deploy manually:
vercel --prod
```

### WebSocket Server (Fly.io)

```bash
# 1. Set secrets
fly secrets set KEY=value

# 2. Deploy
fly deploy

# 3. Check status
fly status
fly logs
```

### Database (Supabase)

```bash
# 1. Create migration
supabase migration new migration_name

# 2. Write SQL in migration file
# supabase/migrations/YYYYMMDDHHMMSS_migration_name.sql

# 3. Apply locally
supabase db reset

# 4. Push to remote
supabase db push
```

## Environment Variable Naming

### Public (Client-Side)

**Vite prefix:**
```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

**Access:**
```typescript
import.meta.env.VITE_SUPABASE_URL
```

### Server-Side Only

**No prefix:**
```bash
GOOGLE_API_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
JWT_SECRET=...
```

**Access:**
```typescript
process.env.GOOGLE_API_KEY
```

## Security Best Practices

### ✅ DO

- ✅ Use Vercel dashboard for frontend secrets
- ✅ Use Fly.io secrets for server secrets
- ✅ Use Supabase dashboard for database config
- ✅ Keep `.env` files local only
- ✅ Use `.env.example` for documentation
- ✅ Never commit real secrets
- ✅ Rotate secrets if exposed

### ❌ DON'T

- ❌ Commit `.env` files with real values
- ❌ Hardcode secrets in source code
- ❌ Share secrets in chat/email
- ❌ Use same secrets across environments
- ❌ Expose service role keys to client

## Troubleshooting

### Vercel

**Variables not available:**
- Check environment (Production vs Preview)
- Redeploy after adding variables
- Check variable names match code

### Fly.io

**Secrets not available:**
```bash
# Check secrets are set
fly secrets list

# Restart app
fly apps restart your-app-name

# Check logs
fly logs
```

### Supabase

**Connection issues:**
- Verify URL and keys in dashboard
- Check network access
- Verify service role key (server-side only)

## See Also

- [Secrets Management](./SECRETS_MANAGEMENT.md) - How to handle secrets
- [Git Workflow](./GIT_WORKFLOW.md) - Commit guidelines
- [Project Configuration](./PROJECT_CONFIG.md) - Build configuration

