# Admin Routes Architecture

## Overview

All admin routes are consolidated into a **single Serverless Function** (`api/admin/route.ts`) to stay under Vercel Hobby's 12 function limit.

## How It Works

### Single Entry Point
- **File:** `api/admin/route.ts`
- **Purpose:** Single function that handles all admin requests
- **Routing:** Uses `?path=` query parameter to route to specific handlers

### Request Format
All admin API calls use the new format:
```
GET  /api/admin?path=analytics
POST /api/admin?path=login
DELETE /api/admin?path=sessions&id=123
```

### Router Module
- **File:** `src/core/admin/admin-router.ts`
- **Purpose:** Maps path names to dynamic imports of route handlers
- **Method:** Dynamically imports handlers from `src/core/admin/handlers/` at runtime

## Handler Location (Crucial Fix)

**IMPORTANT:** The route handler logic has been moved OUT of `api/` to avoid Vercel counting them as Serverless Functions.

- **Old Location:** `api/admin/[name]/handler.ts` (Counted as function!)
- **New Location:** `src/core/admin/handlers/[name].ts` (Not counted)

This ensures Vercel only sees **one** admin function: `api/admin/route.ts`.

### Vercel Configuration

The `vercel.json` file includes rewrites for backward compatibility:

```json
{
  "rewrites": [
    { "source": "/api/admin/(.*)", "destination": "/api/admin?path=$1" }
  ]
}
```

**Why this works:**
- `rewrites` handles backward compatibility for any direct calls
- Handlers in `src/` are part of the bundle, not separate endpoints
- Only `api/admin/route.ts` is deployed as a Serverless Function

## Migration Status

✅ **Complete:** All frontend components updated to use new `?path=` format  
✅ **Complete:** Router module updated to import from `src/core/admin/handlers/`  
✅ **Complete:** Handlers moved to `src/core/admin/handlers/`  
✅ **Complete:** Vercel configuration updated  

## Function Count

- **Before (Failed):** 25+ functions (18 handlers in api/ + others) -> Error
- **After (Fixed):** ~7 functions (1 admin + 6 others)
- **Result:** Under Vercel Hobby's 12 function limit ✅
