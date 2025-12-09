# Deployment Workflow

**Standard workflow for deploying to Fly.io (server) and Vercel (frontend)**

---

## 🎯 Quick Start

```bash
# 1. Run pre-deployment checks
pnpm pre-deploy

# 2. If all green, deploy
pnpm deploy:all
```

---

## 📋 Detailed Workflow

### Step 1: Pre-Deployment Checks

Run the automated pre-deployment script:

```bash
pnpm pre-deploy
```

**What it checks:**
- ✅ Type checking (`pnpm type-check`)
- ✅ Linting (`pnpm lint`)
- ✅ Frontend build (`pnpm build`)
- ✅ Server build (`pnpm build:server`)
- ✅ Git status (warns if uncommitted changes)
- ✅ Environment variables

**If checks pass:** ✅ Ready to deploy  
**If checks fail:** ❌ Fix issues first

---

### Step 2: Deploy to Fly.io (WebSocket Server)

**Prerequisites:**
- Fly.io CLI installed (`flyctl` or `fly`)
- Logged in: `fly auth login`
- App configured: `fly.toml` exists

**Deploy:**
```bash
# From project root
pnpm deploy:fly

# Or manually
fly deploy

# Deploy to specific app
fly deploy --app fb-consulting-websocket
```

**Verify:**
```bash
# Check status
fly status

# Check logs
fly logs

# Test health endpoint
curl https://fb-consulting-websocket.fly.dev/health
```

**Expected:** ✅ Health check returns 200 OK

---

### Step 3: Deploy to Vercel (Frontend + API)

**Prerequisites:**
- Vercel CLI installed (`vercel`)
- Logged in: `vercel login`
- Project linked: `vercel link` (if not auto-linked)

**Deploy:**
```bash
# Deploy to production
pnpm deploy:vercel

# Or manually
vercel --prod

# Preview deployment first (optional)
vercel
```

**Verify:**
```bash
# Check deployment
vercel inspect

# Check logs
vercel logs

# Test frontend
# Open your Vercel URL in browser
```

**Expected:** ✅ Frontend loads, API routes work

---

## 🔄 Full Deployment Flow

### Automated (All-in-One)

```bash
# Run checks + deploy both
pnpm deploy:all
```

**What it does:**
1. Runs pre-deployment checks
2. If checks pass → Deploys to Fly.io
3. If Fly.io succeeds → Deploys to Vercel
4. Reports final status

### Manual (Step-by-Step)

```bash
# 1. Pre-deployment checks
pnpm pre-deploy

# 2. Deploy server (Fly.io)
pnpm deploy:fly

# 3. Wait for Fly.io to be healthy
fly status

# 4. Deploy frontend (Vercel)
pnpm deploy:vercel

# 5. Verify both
fly logs
vercel inspect
```

---

## 🧪 Testing After Deployment

### 1. Health Checks

**Fly.io:**
```bash
curl https://fb-consulting-websocket.fly.dev/health
# Expected: {"status":"ok"}
```

**Vercel:**
```bash
# Open frontend URL
# Check browser console for errors
```

### 2. Functional Tests

- [ ] Frontend loads
- [ ] Text chat works
- [ ] Voice connection works (if testing)
- [ ] WebSocket connects
- [ ] API routes respond
- [ ] No 500 errors

### 3. Log Monitoring

**Fly.io:**
```bash
fly logs --app fb-consulting-websocket
```

**Vercel:**
```bash
vercel logs
```

---

## 🚨 Troubleshooting

### Build Fails Locally

```bash
# Check specific error
pnpm build 2>&1 | tail -50

# Common fixes:
# - Clear node_modules: rm -rf node_modules && pnpm install
# - Clear build cache: rm -rf dist
# - Check TypeScript errors: pnpm type-check
```

### Fly.io Deployment Fails

```bash
# Check logs
fly logs --app fb-consulting-websocket

# Common issues:
# - Dockerfile errors
# - Missing environment variables
# - Port conflicts
```

### Vercel Deployment Fails

```bash
# Check build logs in Vercel dashboard
# Or via CLI:
vercel inspect

# Common issues:
# - Build command fails
# - Missing environment variables
# - API route errors
```

### WebSocket Connection Fails

1. **Check Fly.io status:**
   ```bash
   fly status
   ```

2. **Check WebSocket URL:**
   - Should be: `wss://fb-consulting-websocket.fly.dev`
   - Not: `ws://localhost:3001`

3. **Check CORS settings:**
   - Verify `fly.toml` has correct CORS config
   - Check Vercel frontend URL is allowed

---

## 📝 Environment Variables

### Fly.io

Set via Fly.io dashboard or CLI:
```bash
fly secrets set GEMINI_API_KEY=your_key
fly secrets set GOOGLE_SEARCH_API_KEY=your_key
fly secrets set GOOGLE_SEARCH_ENGINE_ID=your_id
```

### Vercel

Set via Vercel dashboard or CLI:
```bash
vercel env add GEMINI_API_KEY
vercel env add NEXT_PUBLIC_API_URL
```

**Required for both:**
- `GEMINI_API_KEY` - Gemini API access
- `GOOGLE_SEARCH_API_KEY` - Web search (if using)
- `GOOGLE_SEARCH_ENGINE_ID` - Web search (if using)

---

## 🔐 Security Checklist

Before deploying:

- [ ] No secrets in code (run `pnpm check:secrets`)
- [ ] Environment variables set in Fly.io
- [ ] Environment variables set in Vercel
- [ ] CORS configured correctly
- [ ] Rate limiting enabled (if applicable)
- [ ] HTTPS enforced (Fly.io + Vercel default)

---

## 📊 Deployment Status

After deployment, verify:

```bash
# Fly.io
fly status
fly logs --app fb-consulting-websocket

# Vercel
vercel inspect
vercel logs

# Test endpoints
curl https://fb-consulting-websocket.fly.dev/health
curl https://your-app.vercel.app/api/health
```

---

## 🎯 Best Practices

1. **Always run pre-deployment checks first**
   ```bash
   pnpm pre-deploy
   ```

2. **Deploy server first, then frontend**
   - Server must be healthy before frontend connects

3. **Test in preview/staging first** (if available)
   ```bash
   vercel  # Preview deployment
   ```

4. **Monitor logs after deployment**
   ```bash
   fly logs --app fb-consulting-websocket
   vercel logs
   ```

5. **Keep deployment configs in sync**
   - `fly.toml` for Fly.io
   - `vercel.json` for Vercel
   - `server/Dockerfile` for server build

---

## 🚀 Quick Reference

```bash
# Pre-deployment
pnpm pre-deploy

# Deploy server
pnpm deploy:fly

# Deploy frontend
pnpm deploy:vercel

# Deploy both
pnpm deploy:all

# Check status
fly status
vercel inspect

# View logs
fly logs
vercel logs
```

