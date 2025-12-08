# Vercel Environment Variables Validation

**Date:** 2025-01-10  
**Project:** fbc_lab_v10  
**Project ID:** `prj_vmGCbLrbJ8as9EcNq1YzmovfM2ZS`  
**Team ID:** `team_02T3uhzn4NP4J826vRn1Fzfw`

## Required Environment Variables

Based on the codebase analysis, these variables are **required** for the application to function correctly:

### ✅ Critical Supabase Variables (REQUIRED)

1. **`NEXT_PUBLIC_SUPABASE_URL`**
   - **Purpose:** Supabase project URL
   - **Format:** `https://[project-ref].supabase.co`
   - **Used in:** `src/lib/supabase.ts` (lines 75, 110)
   - **Client-side:** ✅ Yes (exposed to browser)
   - **Server-side:** ✅ Yes (API routes)

2. **`NEXT_PUBLIC_SUPABASE_ANON_KEY`**
   - **Purpose:** Supabase anonymous/public key
   - **Format:** JWT token starting with `eyJ...`
   - **Used in:** `src/lib/supabase.ts` (line 76)
   - **Client-side:** ✅ Yes (exposed to browser)
   - **Server-side:** ✅ Yes (API routes)

3. **`SUPABASE_SERVICE_ROLE_KEY`** (Server-side only)
   - **Purpose:** Supabase service role key for admin operations
   - **Format:** JWT token starting with `eyJ...`
   - **Used in:** `src/lib/supabase.ts` (line 111), `src/core/admin/handlers/security-audit.ts`
   - **Client-side:** ❌ No (server-only)
   - **Server-side:** ✅ Yes (API routes)

### ⚠️ Important Notes

**Naming Convention:**
- The codebase uses `NEXT_PUBLIC_` prefix even though this is a **Vite project** (not Next.js)
- The code in `src/lib/supabase.ts` checks both:
  - `import.meta.env[name]` (Vite browser builds)
  - `process.env[name]` (Node.js / Vercel Edge)
- This dual-check ensures compatibility with both Vite and Vercel's runtime

## Manual Verification Steps

### Step 1: Access Vercel Dashboard

1. Go to: https://vercel.com/dashboard
2. Navigate to: **iamfarzads-projects** → **fbc_lab_v10**
3. Click: **Settings** → **Environment Variables**

### Step 2: Verify Required Variables

Check that these variables are set for **PRODUCTION** environment:

```
✅ NEXT_PUBLIC_SUPABASE_URL
✅ NEXT_PUBLIC_SUPABASE_ANON_KEY
✅ SUPABASE_SERVICE_ROLE_KEY
```

### Step 3: Compare with Local `.env.local`

Your local `.env.local` contains:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `GEMINI_API_KEY`

**Action Required:**
1. Copy the values from `.env.local` (you can view them locally)
2. Ensure they match exactly in Vercel Dashboard
3. Verify they are set for **Production** environment (not just Preview/Development)

### Step 4: Verify Environment Scope

For each variable, ensure:
- ✅ **Production** - Checked (required)
- ⚪ **Preview** - Optional (recommended)
- ⚪ **Development** - Optional

### Step 5: Redeploy After Changes

If you add or update any environment variables:
1. Go to: **Deployments** tab
2. Click: **⋯** (three dots) on latest deployment
3. Click: **Redeploy**

Or trigger a new deployment by pushing to the `main` branch.

## Validation Checklist

- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set in Vercel Production
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set in Vercel Production
- [ ] `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel Production
- [ ] Values match `.env.local` exactly
- [ ] All variables are enabled for **Production** environment
- [ ] Redeployed after setting/updating variables

## How to Verify Variables Are Working

### Option 1: Check Browser Console

1. Visit your production site: https://fbclabv10.vercel.app
2. Open browser DevTools → Console
3. Look for:
   - ❌ **Error:** `Missing required env var: NEXT_PUBLIC_SUPABASE_URL` → Variable not set
   - ⚠️ **Warning:** `⚠️ Supabase not configured - using placeholder` → Variable missing or invalid
   - ✅ **No warnings** → Variables are set correctly

### Option 2: Check API Endpoints

Test an endpoint that uses Supabase:
```bash
curl https://fbclabv10.vercel.app/api/admin/security-audit
```

Expected responses:
- ✅ `200 OK` with data → Variables working
- ❌ `500 Error` or `disabled: true` → Variables missing

### Option 3: Check Deployment Logs

1. Go to Vercel Dashboard → **Deployments**
2. Click on latest deployment
3. Check **Build Logs** and **Function Logs**
4. Look for:
   - ❌ `Missing required env var` errors
   - ⚠️ `Supabase not configured` warnings

## Common Issues

### Issue: Variables Set But Not Working

**Possible Causes:**
1. Variables set for wrong environment (Preview instead of Production)
2. Variables not redeployed after setting
3. Typo in variable name (check exact spelling)
4. Variable value has extra spaces or quotes

**Solution:**
1. Verify exact variable names match codebase
2. Ensure Production environment is checked
3. Redeploy after changes

### Issue: Build Succeeds But Runtime Fails

**Possible Causes:**
1. Variables available at build time but not runtime
2. Variables set in wrong scope (Preview vs Production)

**Solution:**
1. Check Function Logs (not Build Logs)
2. Verify variables are set for Production environment
3. Ensure variables are available to both Build and Runtime

## Additional Variables (Optional)

These are also used but may have fallbacks:

- `GEMINI_API_KEY` - For AI features
- `NEXT_PUBLIC_LIVE_SERVER_URL` - WebSocket server URL
- `NEXT_PUBLIC_API_URL` - API endpoint URL

## Quick Reference

**Vercel Dashboard URL:**
```
https://vercel.com/iamfarzads-projects/fbc_lab_v10/settings/environment-variables
```

**Production Site:**
```
https://fbclabv10.vercel.app
https://www.farzadbayat.com
```

**Latest Deployment:**
- ID: `dpl_4vHnt5roo3bqaVRXSuvQMEvwkTQe`
- URL: `fbclabv10-1gbofzjd1-iamfarzads-projects.vercel.app`
- Status: ✅ READY
- Commit: `07a0353c5fbff48c4b3546ec95eaec5ae698281f`

## Next Steps

1. ✅ Verify variables in Vercel Dashboard
2. ✅ Compare with `.env.local` values
3. ✅ Redeploy if variables were updated
4. ✅ Test production site for Supabase warnings
5. ✅ Check browser console for errors

---

**Last Updated:** 2025-01-10  
**Validated Against:** Latest deployment `dpl_4vHnt5roo3bqaVRXSuvQMEvwkTQe`

