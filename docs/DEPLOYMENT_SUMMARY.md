# Deployment Summary

Quick reference for the multi-platform deployment setup.

## Architecture

```
┌─────────────┐      ┌──────────────┐      ┌─────────────┐
│   Vercel    │      │   Fly.io     │      │  Supabase   │
│  (Frontend) │      │ (WebSocket)  │      │ (Database)  │
└─────────────┘      └──────────────┘      └─────────────┘
     │                      │                      │
     │                      │                      │
     └──────────────────────┴──────────────────────┘
                    Environment Variables
```

## Where to Set Secrets

### Vercel (Frontend)
- **Location:** Vercel Dashboard → Project → Settings → Environment Variables
- **Access:** `process.env.VARIABLE` or `import.meta.env.VITE_*`
- **Public vars:** Use `VITE_` prefix (exposed to client)
- **Private vars:** No prefix (server-side only)
- **WebSocket URL:** `VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev`

### Fly.io (WebSocket)
- **Location:** Fly.io CLI or Dashboard
- **Command:** `fly secrets set KEY=value`
- **Access:** `process.env.VARIABLE`
- **View:** `fly secrets list`
- **App:** `fb-consulting-websocket`
- **URL:** `wss://fb-consulting-websocket.fly.dev`
- **Port:** `8080`

### Supabase (Database)
- **Location:** Supabase Dashboard → Project Settings → API
- **Access:** Via Supabase client
- **Keys:**
  - `SUPABASE_URL` - Project URL
  - `SUPABASE_ANON_KEY` - Public key (client-safe)
  - `SUPABASE_SERVICE_ROLE_KEY` - Private key (server-only)

## Quick Commands

### Vercel
```bash
# Deploy
vercel --prod

# Set env var (or use dashboard)
vercel env add KEY production
```

### Fly.io
```bash
# Set secret
fly secrets set GOOGLE_API_KEY=value

# List secrets
fly secrets list

# Deploy
fly deploy

# View logs
fly logs
```

### Supabase
```bash
# Create migration
supabase migration new migration_name

# Apply locally
supabase db reset

# Push to remote
supabase db push
```

## Config Files

**Never commit (gitignored):**
- `fly.toml` (with real values)
- `vercel.json` (with real values)
- `supabase/config.toml` (with real values)
- `.env` (with real values)

**Always commit:**
- `fly.toml.example` ✅
- `vercel.json.example` ✅
- `supabase/config.toml.example` ✅
- `.env.example` ✅
- `supabase/migrations/*.sql` ✅ (migrations are safe)

## Environment Variable Checklist

Before deploying, ensure:

- [ ] Vercel has all frontend env vars set
  - [ ] `VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev` (production)
- [ ] Fly.io has all server secrets set
- [ ] Supabase config is correct
- [ ] No secrets in committed files
- [ ] `.env.example` documents all needed vars
  - [ ] `VITE_WEBSOCKET_URL=ws://localhost:8080` (local)
- [ ] Migration files are up to date

## See Also

- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [Secrets Management](./SECRETS_MANAGEMENT.md) - How to handle secrets

