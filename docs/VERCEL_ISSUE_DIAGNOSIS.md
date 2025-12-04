# Vercel `/api/chat` Issue Diagnosis

## The Problem

**Error:** `FUNCTION_INVOCATION_FAILED` on `https://fbclabv10.vercel.app/api/chat`

## Root Cause Analysis

### Code Flow That Fails:

1. **Module Load Time** (Line 8 of `api/chat.ts`):
   ```typescript
   import { supabaseService } from '../src/core/supabase/client.js';
   ```

2. **This triggers** (Line 22 of `src/core/supabase/client.ts`):
   ```typescript
   export const supabaseService = getSupabaseService();
   ```

3. **Which calls** (`src/lib/supabase.ts`):
   ```typescript
   function requireEnv(name: string): string {
     if (!v) {
       if (process.env.NODE_ENV === 'production') {
         throw new Error(`Missing required env var: ${name}`); // ❌ CRASHES HERE
       }
     }
   }
   ```

### The Issue:

**These variables exist in `.env.local` (local dev) but are likely NOT set in Vercel Production:**

1. `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
2. `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key_here`
3. `SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key_here`
4. `GEMINI_API_KEY` = `your_gemini_api_key_here`

### Why It Fails:

- **Local dev:** `.env.local` is loaded → variables exist → works ✅
- **Vercel Production:** Variables NOT in Vercel Dashboard → `requireEnv()` throws → `FUNCTION_INVOCATION_FAILED` ❌

### Additional Check:

- **`NODE_ENV`** must be set to `production` in Vercel
  - If not set, `requireEnv()` won't throw but will return placeholders
  - Placeholders might cause issues later in the code

## Solution

**Add these 4 variables to Vercel Dashboard:**

1. Go to: Vercel Dashboard → Project (`fbc_lab_v10`) → Settings → Environment Variables
2. Add for **Production** environment:
   - `NEXT_PUBLIC_SUPABASE_URL` = `https://your-project.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `your_supabase_anon_key_here`
   - `SUPABASE_SERVICE_ROLE_KEY` = `your_supabase_service_role_key_here`
   - `GEMINI_API_KEY` = `your_gemini_api_key_here`

3. **Also verify:**
   - `NODE_ENV` = `production` (should be set automatically by Vercel, but verify)

4. **Redeploy** or wait for next deployment

## Why This Happens

- `.env.local` is **gitignored** and only works locally
- Vercel Production needs variables set in **Vercel Dashboard**
- Module-level imports execute **before** the handler runs
- Missing env vars cause **module initialization to fail** → `FUNCTION_INVOCATION_FAILED`

## Verification

After adding variables, test:
```bash
curl -X POST https://fbclabv10.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}],"sessionId":"test"}'
```

Should return JSON response (not `FUNCTION_INVOCATION_FAILED`).

