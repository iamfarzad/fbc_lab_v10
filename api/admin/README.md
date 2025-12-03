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
- **Method:** Dynamically imports handlers from old route files at runtime

## Why Old Route Files Still Exist

**IMPORTANT:** The old route handler files in `api/admin/*/route.ts` are **NOT deleted** because:

1. **Dynamic Imports Required:** The router module dynamically imports handlers from these files at runtime
2. **Vercel Redirects:** The `redirects` configuration in `vercel.json` prevents Vercel from treating these files as separate Serverless Functions
3. **Code Reuse:** The actual handler logic remains in the original files - we're just routing through a single entry point

### Old Route Files (Still Used, Not Counted as Functions)
```
api/admin/analytics/route.ts          → GET handler
api/admin/sessions/route.ts           → GET, POST, DELETE handlers
api/admin/login/route.ts              → POST handler
api/admin/logout/route.ts             → POST handler
api/admin/stats/route.ts              → GET handler
api/admin/logs/route.ts               → GET handler
api/admin/meetings/route.ts           → GET, POST, PATCH, DELETE handlers
api/admin/conversations/route.ts      → GET handler
api/admin/email-campaigns/route.ts   → GET, POST, PATCH, DELETE handlers
api/admin/failed-conversations/route.ts → GET handler
api/admin/ai-performance/route.ts    → GET handler
api/admin/interaction-analytics/route.ts → GET handler
api/admin/real-time-activity/route.ts → GET handler
api/admin/security-audit/route.ts     → GET, POST handlers
api/admin/system-health/route.ts      → GET handler
api/admin/token-costs/route.ts        → GET handler
api/admin/flyio/usage/route.ts       → GET handler
api/admin/flyio/settings/route.ts    → POST handler
```

## Vercel Configuration

The `vercel.json` file includes critical redirects:

```json
{
  "redirects": [
    { "source": "/api/(.*)", "destination": "/app/api/$1" }
  ],
  "rewrites": [
    { "source": "/api/admin/(.*)", "destination": "/api/admin?path=$1" }
  ]
}
```

**Why this works:**
- `redirects` tells Vercel to ignore the old `api/` folder structure
- `rewrites` handles backward compatibility for any direct calls
- Only `api/admin/route.ts` is counted as a Serverless Function

## Migration Status

✅ **Complete:** All frontend components updated to use new `?path=` format  
✅ **Complete:** Router module created and tested  
✅ **Complete:** Vercel configuration updated  
✅ **Complete:** Build passes with 0 TypeScript errors

## Function Count

- **Before:** 24 functions (19 admin + 5 other)
- **After:** 6 functions (1 admin + 5 other)
- **Result:** Under Vercel Hobby's 12 function limit ✅

## Notes

- Old route files are **intentionally kept** for dynamic imports
- Do **NOT** delete old route files - they're still needed
- All new code should use the `?path=` format
- The `rewrites` rule provides backward compatibility if needed

## File Status

### Active (Counted as Functions)
- ✅ `api/admin/route.ts` - **THE ONLY admin function Vercel counts**

### Still Used (NOT Counted as Functions)
All files in `api/admin/*/route.ts` are:
- ✅ **Still used** - dynamically imported by router
- ✅ **Still needed** - contain the actual handler logic
- ❌ **NOT counted** - Vercel ignores them due to redirects
- ⚠️ **DO NOT DELETE** - required for dynamic imports to work

Each old route file has a header comment explaining this.

