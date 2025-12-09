# Pre-Deployment Checklist

**Use this checklist before deploying to Fly.io and Vercel**

---

## 🟢 Phase 1: Local Verification (MUST PASS)

### 1.1 Static Analysis
```bash
# Type checking
pnpm type-check
# Expected: ✅ 0 errors

# Linting
pnpm lint
# Expected: ✅ No errors (warnings OK)

# Full static checks
pnpm check:all
# Expected: ✅ All checks pass
```

### 1.2 Build Verification
```bash
# Frontend build
pnpm build
# Expected: ✅ Build succeeds, no errors

# Server build (if changed)
pnpm build:server
# Expected: ✅ Build succeeds
```

### 1.3 Unit Tests
```bash
# Run unit tests
pnpm test
# Expected: ✅ All tests pass

# Or specific test suites
pnpm test -- test/tool-integration.test.ts
pnpm test -- services/__tests__/aiBrainService.test.ts
```

### 1.4 Local Runtime Test
```bash
# Start all services locally
pnpm dev:all
# This starts:
# - Frontend (Vite) on :5173
# - WebSocket server on :3001
# - API server on :3002
```

**Manual Smoke Test:**
- [ ] Open `http://localhost:5173`
- [ ] Text chat works
- [ ] Voice connection works (if testing)
- [ ] Webcam works (if testing)
- [ ] File upload works
- [ ] PDF generation works
- [ ] No console errors

---

## 🟡 Phase 2: Integration Tests (RECOMMENDED)

### 2.1 E2E Tool Tests
```bash
# With mocks
pnpm test:e2e:tools

# With real tools (requires API keys)
pnpm test:e2e:tools:real
```

### 2.2 Browser E2E Tests
```bash
# Playwright smoke test
pnpm test:e2e:browser

# Or with UI
pnpm test:e2e:browser:ui
```

---

## 🔴 Phase 3: Pre-Deployment Checks

### 3.1 Environment Variables
```bash
# Check for secrets in code
pnpm check:secrets
# Expected: ✅ No secrets found

# Verify required env vars:
# - GEMINI_API_KEY
# - GOOGLE_SEARCH_API_KEY (if using search)
# - GOOGLE_SEARCH_ENGINE_ID (if using search)
# - SUPABASE_URL (if using Supabase)
# - SUPABASE_ANON_KEY (if using Supabase)
```

### 3.2 Deployment Configs
- [ ] `fly.toml` exists and is valid
- [ ] `vercel.json` exists and is valid
- [ ] `server/Dockerfile` is up to date
- [ ] No hardcoded localhost URLs in production code

### 3.3 Git Status
```bash
git status
# Expected: ✅ All changes committed or stashed
# ⚠️ Don't deploy with uncommitted changes
```

---

## ✅ Phase 4: Deployment Readiness

### Checklist:
- [ ] ✅ All Phase 1 checks pass
- [ ] ✅ Build succeeds (`pnpm build`)
- [ ] ✅ Type-check passes (`pnpm type-check`)
- [ ] ✅ Local runtime test successful
- [ ] ✅ No console errors in browser
- [ ] ✅ Environment variables configured
- [ ] ✅ Git is clean (all changes committed)
- [ ] ✅ Deployment configs valid

**Status:** 🟢 **READY TO DEPLOY** when all checked

---

## 🚀 Phase 5: Deployment

### 5.1 Deploy to Fly.io (WebSocket Server)
```bash
# From project root
fly deploy

# Or with specific app
fly deploy --app fb-consulting-websocket

# Verify deployment
fly status
fly logs
```

### 5.2 Deploy to Vercel (Frontend + API)
```bash
# Deploy to production
vercel --prod

# Or push to main branch (if auto-deploy enabled)
git push origin main
```

### 5.3 Post-Deployment Verification
- [ ] Fly.io health check passes (`/health` endpoint)
- [ ] Vercel build succeeds
- [ ] Frontend loads correctly
- [ ] WebSocket connects
- [ ] API routes respond
- [ ] No 500 errors in logs

---

## 🐛 If Something Fails

### Build Fails
1. Check error message
2. Fix issues locally
3. Re-run Phase 1 checks
4. Don't deploy until build passes

### Tests Fail
1. Run failing test in isolation
2. Check test environment setup
3. Fix issues or skip if non-critical
4. Document known issues

### Runtime Errors
1. Check browser console
2. Check server logs (`fly logs` or `vercel logs`)
3. Verify environment variables
4. Rollback if critical

---

## 📝 Quick Command Reference

```bash
# Full pre-deployment check
pnpm check:all && pnpm build && pnpm type-check

# Local full stack
pnpm dev:all

# Deploy to Fly.io
fly deploy

# Deploy to Vercel
vercel --prod

# Check deployment status
fly status
vercel inspect
```

