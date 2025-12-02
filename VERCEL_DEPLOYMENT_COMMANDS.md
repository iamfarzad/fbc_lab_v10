# Vercel Deployment Commands

**Date:** 2025-12-02  
**Project:** fbc-ai-agent  
**Vercel URL:** https://vercel.com/iamfarzads-projects/fbc-ai-agent

---

## 🎯 Deployment Strategy (Best Practice)

1. ✅ Link to existing project (preserve history)
2. ✅ Deploy to preview first (test fixes)
3. ✅ Verify preview works
4. ✅ Deploy to production

---

## 📋 Pre-Deployment Checklist

- [x] All critical fixes implemented
- [x] Type checking passed
- [x] No errors in modified files
- [ ] Manual testing completed (optional but recommended)
- [ ] Environment variables verified in Vercel dashboard

---

## 🚀 Phase 1: Link to Existing Project

### Step 1: Install Vercel CLI (if needed)
```bash
npm i -g vercel
```

### Step 2: Login to Vercel
```bash
vercel login
```
This will open a browser window for authentication.

### Step 3: Link to Existing Project
```bash
cd /Users/farzad/fbc_lab_v10
vercel link
```

**When prompted:**
- ✅ **Link to existing project?** → `Yes`
- **Project name:** → `fbc-ai-agent`
- **Directory:** → `./`

This will create/update `.vercel/project.json` with:
```json
{
  "projectId": "...",
  "orgId": "..."
}
```

### Step 4: Verify Project Link
```bash
cat .vercel/project.json
```

---

## 🌐 Phase 2: Deploy to Preview

### Step 1: Deploy Preview Environment
```bash
cd /Users/farzad/fbc_lab_v10
vercel --yes
```

**What this does:**
- Creates a preview deployment
- Generates a unique preview URL (e.g., `fbc-ai-agent-abc123.vercel.app`)
- Does NOT affect production

### Step 2: Note Preview URL
The command will output something like:
```
🔗  Preview: https://fbc-ai-agent-abc123.vercel.app
```

**Save this URL for testing!**

### Step 3: Verify Environment Variables for Preview

**Check in Vercel Dashboard:**
1. Go to: https://vercel.com/iamfarzads-projects/fbc-ai-agent/settings/environment-variables
2. Verify all required variables are set for **Preview** environment
3. Copy from Production if needed

**Required Environment Variables:**
```bash
# Public (client-side) - Use NEXT_PUBLIC_ or VITE_ prefix
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_LIVE_SERVER_URL=wss://fb-consulting-websocket.fly.dev

# Server-side only (API routes)
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GEMINI_API_KEY=...
GOOGLE_API_KEY=...
ADMIN_PASSWORD=...
```

**Add missing variables:**
```bash
# Via CLI
vercel env add VARIABLE_NAME preview

# Or via dashboard (recommended)
# Settings → Environment Variables → Add
```

### Step 4: Test Preview Deployment

**Test critical fixes:**
1. Open preview URL in browser
2. Test agent chat
3. Test voice mode (rate limiting fix)
4. Test admin routes (if accessible)
5. Check browser console for errors

**Expected Results:**
- ✅ No rate limit errors in voice mode
- ✅ Admin routes accessible (or return proper auth errors, not 404)
- ✅ WebSocket connects successfully
- ✅ Session starts without "Session not ready" errors

---

## 🎯 Phase 3: Deploy to Production

### ⚠️ IMPORTANT: Only deploy after preview is verified!

### Step 1: Deploy to Production
```bash
cd /Users/farzad/fbc_lab_v10
vercel --prod
```

**What this does:**
- Deploys to production domain
- Replaces current production deployment
- v9 will remain in deployment history (can be rolled back)

### Step 2: Verify Production Environment Variables

**Check in Vercel Dashboard:**
1. Go to: https://vercel.com/iamfarzads-projects/fbc-ai-agent/settings/environment-variables
2. Verify all required variables are set for **Production** environment
3. Ensure they match preview environment

### Step 3: Monitor Production Deployment

**Check deployment status:**
- Vercel Dashboard → Deployments
- Look for latest deployment (should show "Ready")
- Check build logs if there are issues

**Production URL:**
- Should be: `https://fbc-ai-agent.vercel.app` (or custom domain)

### Step 4: Test Production Deployment

**Quick smoke tests:**
1. ✅ Homepage loads
2. ✅ Agent chat works
3. ✅ Voice mode initializes
4. ✅ No console errors
5. ✅ API routes respond

---

## 🔄 Phase 4: Post-Deployment

### Keep v9 as Backup

**v9 deployment history:**
- Available in Vercel dashboard → Deployments
- Can be rolled back if needed
- Keep for 1-2 weeks, then archive

### Rollback Procedure (if needed)

**Option 1: Via Dashboard**
1. Go to Vercel Dashboard → Deployments
2. Find v9 deployment
3. Click "..." menu → "Promote to Production"

**Option 2: Via CLI**
```bash
vercel rollback
# Or specify deployment
vercel rollback <deployment-url>
```

### Update Documentation

**Update PROJECT_STATUS.md:**
```markdown
## Deployment Status

- **Production URL:** https://fbc-ai-agent.vercel.app
- **Preview URL:** https://fbc-ai-agent-abc123.vercel.app
- **Deployed:** 2025-12-02
- **Version:** v10
- **Status:** ✅ Live
```

---

## 📝 Quick Command Reference

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Link to existing project
vercel link
# → Select: Link to existing
# → Project: fbc-ai-agent
# → Directory: ./

# Deploy to preview
vercel --yes

# Deploy to production
vercel --prod

# Check deployment status
vercel ls

# View logs
vercel logs

# Rollback
vercel rollback

# List environment variables
vercel env ls

# Add environment variable
vercel env add VARIABLE_NAME production

# Remove environment variable
vercel env rm VARIABLE_NAME production
```

---

## 🔐 Environment Variables Checklist

### Required for Production

**Public (Client-Side):**
- [ ] `NEXT_PUBLIC_SUPABASE_URL`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- [ ] `NEXT_PUBLIC_LIVE_SERVER_URL`

**Server-Side (API Routes):**
- [ ] `SUPABASE_SERVICE_ROLE_KEY`
- [ ] `GEMINI_API_KEY`
- [ ] `GOOGLE_API_KEY`
- [ ] `ADMIN_PASSWORD`

### Optional (if used)
- [ ] `OPENAI_API_KEY`
- [ ] `JWT_SECRET`
- [ ] Other API keys as needed

---

## 🐛 Troubleshooting

### Issue: "Project not found"
**Solution:**
- Verify project name: `fbc-ai-agent`
- Check you're in the correct directory
- Try `vercel link` again

### Issue: "Build failed"
**Solution:**
- Check build logs in Vercel dashboard
- Verify environment variables are set
- Check TypeScript errors locally: `pnpm type-check`

### Issue: "Environment variables missing"
**Solution:**
- Go to Settings → Environment Variables
- Ensure variables are set for correct environment (Production/Preview)
- Copy from Production to Preview if needed

### Issue: "Rate limit errors still happening"
**Solution:**
- Clear browser cache
- Check WebSocket server is running on Fly.io
- Verify `NEXT_PUBLIC_LIVE_SERVER_URL` is correct

---

## ✅ Success Criteria

Deployment is successful when:

1. ✅ Preview deployment works
2. ✅ All critical fixes verified in preview
3. ✅ Production deployment completes
4. ✅ Production site loads correctly
5. ✅ No critical errors in browser console
6. ✅ Voice mode works (rate limiting fixed)
7. ✅ Admin routes accessible

---

## 📞 Support

**Vercel Dashboard:** https://vercel.com/dashboard  
**Project Settings:** https://vercel.com/iamfarzads-projects/fbc-ai-agent/settings  
**Deployments:** https://vercel.com/iamfarzads-projects/fbc-ai-agent/deployments

---

**Ready to deploy?** Start with Phase 1: Link to Existing Project!



