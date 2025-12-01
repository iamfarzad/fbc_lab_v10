# Environment Files Guide

Guide for managing environment files in local vs production.

## Vite Environment File Loading Order

Vite loads environment files in this order (later files override earlier):

1. `.env` - Loaded in all cases
2. `.env.local` - Loaded in all cases, **gitignored** (local overrides)
3. `.env.[mode]` - Only loaded in specified mode (development/production)
4. `.env.[mode].local` - Only loaded in specified mode, **gitignored**

**Modes:**
- `development` - When running `pnpm dev`
- `production` - When running `pnpm build` or `pnpm preview`

## Recommended Setup

### For This Project

**You DON'T need `.env.production`** because:
- ✅ Vercel manages production env vars (dashboard)
- ✅ Fly.io manages server secrets (CLI)
- ✅ No need for local `.env.production` file

**You DO need:**
- ✅ `.env.example` - Committed, shows what vars are needed
- ✅ `.env.local` - Gitignored, for local development (optional but recommended)

## File Structure

```
fbc_lab_v10/
├── .env.example          ✅ Committed (template)
├── .env.local            ❌ Gitignored (local overrides)
├── .env                  ❌ Gitignored (if you use it)
└── .env.production       ❌ NOT NEEDED (Vercel handles this)
```

## Recommended Approach

### Option 1: Single `.env.local` (Recommended)

**Create `.env.local` (gitignored):**
```bash
# .env.local (gitignored - for local development)
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_key_here

# Server-side (if running locally)
GOOGLE_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here
SUPABASE_SERVICE_ROLE_KEY=your_key_here
```

**Why `.env.local`?**
- ✅ Gitignored automatically
- ✅ Won't be committed
- ✅ Overrides `.env` if it exists
- ✅ Works for all modes (dev/prod)

### Option 2: `.env` for Development

**Create `.env` (gitignored):**
```bash
# .env (gitignored - for local development)
VITE_WEBSOCKET_URL=ws://localhost:8080
# ... other vars
```

**Why `.env`?**
- ✅ Simple
- ✅ Works for development
- ⚠️ Less explicit than `.env.local`

## What You DON'T Need

### ❌ `.env.production`

**Why not needed:**
- Vercel dashboard manages production env vars
- Fly.io CLI manages server secrets
- No local production builds (deploy to Vercel instead)

**If you need local production testing:**
- Use `.env.production.local` (gitignored)
- Or set vars manually: `VITE_MODE=production pnpm build`

### ❌ `.env.development`

**Why not needed:**
- `.env.local` or `.env` works for development
- Vite defaults to development mode

## Environment Variable Strategy

### Local Development

**Use:**
- `.env.local` (recommended) OR
- `.env`

**Contains:**
- `VITE_WEBSOCKET_URL=ws://localhost:8080`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`
- Server secrets (if running server locally)

### Production (Vercel)

**Use:**
- Vercel Dashboard → Settings → Environment Variables

**Set:**
- `VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev`
- `VITE_SUPABASE_URL=...`
- `VITE_SUPABASE_ANON_KEY=...`

**No `.env.production` file needed!**

### Production (Fly.io)

**Use:**
- Fly.io CLI: `fly secrets set KEY=value`

**Set:**
- `GOOGLE_API_KEY=...`
- `GEMINI_API_KEY=...`
- `SUPABASE_SERVICE_ROLE_KEY=...`

**No `.env.production` file needed!**

## Setup Instructions

### Step 1: Create `.env.example` (Already Done)

```bash
# .env.example (committed)
VITE_WEBSOCKET_URL=ws://localhost:8080
VITE_SUPABASE_URL=https://your-project.supabase.co
# ... other vars
```

### Step 2: Create `.env.local` (For You)

```bash
# Copy example and fill in real values
cp .env.example .env.local

# Edit .env.local with your actual values
# This file is gitignored, so safe to commit real values locally
```

### Step 3: Verify `.gitignore`

Make sure `.gitignore` includes:
```
.env
.env.local
.env.*.local
```

## Quick Reference

### Local Development
```bash
# Create .env.local with your values
VITE_WEBSOCKET_URL=ws://localhost:8080
```

### Production (Vercel)
```bash
# Set in Vercel dashboard
VITE_WEBSOCKET_URL=wss://fb-consulting-websocket.fly.dev
```

### Production (Fly.io)
```bash
# Set via CLI
fly secrets set GOOGLE_API_KEY=value
```

## Best Practices

### ✅ DO

- ✅ Use `.env.example` as template (committed)
- ✅ Use `.env.local` for local development (gitignored)
- ✅ Set production vars in Vercel/Fly.io dashboards
- ✅ Never commit `.env.local` or `.env`
- ✅ Document all required vars in `.env.example`

### ❌ DON'T

- ❌ Create `.env.production` (not needed)
- ❌ Commit `.env.local` or `.env`
- ❌ Hardcode URLs in code
- ❌ Use `.env.production` for Vercel (use dashboard instead)

## Troubleshooting

### Issue: Variables not loading

**Solution:**
- Check file name: `.env.local` not `.env.local.txt`
- Check Vite prefix: Must use `VITE_` for client-side vars
- Restart dev server after changing `.env` files

### Issue: Production vars not working

**Solution:**
- Check Vercel dashboard (not `.env.production` file)
- Verify `VITE_` prefix for client-side vars
- Rebuild after setting vars in Vercel

### Issue: Local vs production confusion

**Solution:**
- Use `.env.local` for local (gitignored)
- Use Vercel dashboard for production
- Never create `.env.production` file

## Summary

**What you need:**
- ✅ `.env.example` - Template (committed)
- ✅ `.env.local` - Local development (gitignored, optional but recommended)

**What you DON'T need:**
- ❌ `.env.production` - Vercel handles this
- ❌ `.env.development` - `.env.local` works

**Answer: No, you don't need `.env.production` or `.env.local` is required, but `.env.local` is recommended for local development.**

## See Also

- [Secrets Management](./SECRETS_MANAGEMENT.md) - How to handle secrets
- [Deployment](./DEPLOYMENT.md) - Production deployment
- [WebSocket Configuration](./WEBSOCKET_CONFIG.md) - WebSocket setup

