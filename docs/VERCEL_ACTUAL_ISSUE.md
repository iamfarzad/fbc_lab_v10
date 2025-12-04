# Actual Vercel Issue - After Env Vars Verified

## Status

**Environment Variables:** ✅ **VERIFIED SET** in Vercel Production:
- `NEXT_PUBLIC_SUPABASE_URL` ✅
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✅
- `SUPABASE_SERVICE_ROLE_KEY` ✅
- `GEMINI_API_KEY` ✅

**Error:** `FUNCTION_INVOCATION_FAILED` on `/api/chat`

## Potential Issue: Absolute Import Resolution

**Problem:** `src/core/supabase/client.ts` uses **absolute imports**:

```typescript
import { getSupabaseServer, getSupabaseService } from 'src/lib/supabase';
import { Database } from 'src/core/database.types'
```

**Why this might fail:**
- Vercel serverless functions may not resolve absolute imports (`src/`) the same way as the build
- Build succeeds (TypeScript compilation works)
- Runtime fails (module resolution fails)

**Solution:** Convert absolute imports to relative imports in `src/core/supabase/client.ts`:

```typescript
// Change from:
import { getSupabaseServer, getSupabaseService } from 'src/lib/supabase';
import { Database } from 'src/core/database.types'

// To:
import { getSupabaseServer, getSupabaseService } from '../../lib/supabase.js';
import { Database } from '../database.types.js'
```

## Next Steps

1. **Check Vercel runtime logs** (not build logs) for actual error message
2. **If error mentions module resolution**, convert absolute imports to relative
3. **Test endpoint** after fix

## Alternative Causes

If not import resolution, check:
- Runtime error in `getSupabaseService()` try-catch block
- Supabase client initialization failing
- Other module-level code executing before handler

