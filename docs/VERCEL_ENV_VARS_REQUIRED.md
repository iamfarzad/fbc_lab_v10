# Required Vercel Environment Variables

**Issue:** `FUNCTION_INVOCATION_FAILED` error on `/api/chat` endpoint

**Status:** ⚠️ **INVESTIGATING** - Need to verify actual runtime error, not just assumptions

**Note:** The `.env.local` file shows these variables ARE configured locally:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`

**Next Steps:**
1. Check Vercel Dashboard → Settings → Environment Variables to verify Production env vars match `.env.local`
2. Check Vercel runtime logs (not build logs) for actual error message
3. Verify `NODE_ENV` is set correctly in Vercel (should be 'production')

## Required Environment Variables

**From `.env.local` (local development):**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (set)
- ✅ `GEMINI_API_KEY` = `your_gemini_api_key_here`

**Action Required:**
1. **Verify in Vercel Dashboard** → Settings → Environment Variables → Production
2. **Compare** each variable from `.env.local` to what's set in Vercel
3. **Check** that `NODE_ENV` is set to `production` in Vercel (if not, `requireEnv()` won't throw and will use placeholders)
4. **Check runtime logs** (not build logs) for actual error message

## Why This Might Be Failing

The `/api/chat` endpoint imports `supabaseService` at module load time:
```typescript
import { supabaseService } from '../src/core/supabase/client.js';
```

This calls `getSupabaseService()` which uses `requireEnv()`:
```typescript
function requireEnv(name: string): string {
  if (!v) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error(`Missing required env var: ${name}`); // ❌ CRASHES HERE
    }
  }
}
```

**Possible causes:**
1. **Env vars not set in Vercel** (but user says they are)
2. **NODE_ENV not set to 'production'** in Vercel (so `requireEnv()` doesn't throw, but might cause other issues)
3. **Different variable names** in Vercel vs `.env.local`
4. **Runtime error** unrelated to env vars (need to check actual runtime logs)

## How to Add

1. Go to Vercel Dashboard
2. Select your project (`fbclabv10`)
3. Settings → Environment Variables
4. Add each variable for **Production** environment
5. Redeploy (or wait for next deployment)

## Verification

**From `.env.local` files, these variables ARE configured locally:**
- ✅ `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (set)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` = (set)
- ✅ `GEMINI_API_KEY` = `your_gemini_api_key_here`

**Action Required:**
1. **Compare** Vercel Production env vars with `.env.local` values
2. **Check runtime logs** (not build logs) for actual error message
3. **Verify `NODE_ENV=production`** is set in Vercel

**Test endpoint:**
```bash
curl -X POST https://fbclabv10.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"sessionId":"test"}'
```

Should return JSON response (not `FUNCTION_INVOCATION_FAILED`).

**See:** `docs/ENV_VARS_COMPARISON.md` for detailed comparison.

