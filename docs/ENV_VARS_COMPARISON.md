# Environment Variables Comparison

**Date:** 2025-12-04  
**Purpose:** Compare `.env.local` and `.env.local.bak` to identify what should be in Vercel

## Key Differences Between Files

**Only difference:**
- `.env.local.bak`: `PORT="3000"`
- `.env.local`: `API_PORT="3002"`

## Required Variables for `/api/chat` Endpoint

Both files contain these **critical variables**:

### ✅ Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

### ✅ Gemini API Key
```
FT-OU
```

**Also available as:**
```

```

## Verification Checklist for Vercel

**Check in Vercel Dashboard → Settings → Environment Variables → Production:**

- [ ] `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` = (matches `.env.local`)
- [ ] `SUPABASE_SERVICE_ROLE_KEY` = (matches `.env.local`)
- [ ] `GEMINI_API_KEY` = `your_gemini_api_key_here`
- [ ] `NODE_ENV` = `production` (if not set, `requireEnv()` won't throw errors but will use placeholders)

## Additional Variables in `.env.local`

These are also present but may not be required for `/api/chat`:
- `NEXT_PUBLIC_LIVE_SERVER_URL=wss://fb-consulting-websocket.fly.dev`
- `GOOGLE_APPLICATION_CREDENTIALS=./service-account-key-v2.json` (for Live API)
- Various Redis/Upstash variables
- Various feature flags

## Next Steps

1. **Verify in Vercel Dashboard** that all 4 required variables match `.env.local`
2. **Check runtime logs** (not build logs) for actual error message
3. **Verify `NODE_ENV`** is set to `production` in Vercel
4. **Test endpoint** after verification

## Notes

- Build logs show successful build, so issue is **runtime**, not build-time
- `FUNCTION_INVOCATION_FAILED` is generic - need actual error message from runtime logs
- The code imports `supabaseService` at module load time, which calls `getSupabaseService()` → `requireEnv()`
- If `NODE_ENV !== 'production'`, `requireEnv()` won't throw but will return placeholders, which might cause issues

