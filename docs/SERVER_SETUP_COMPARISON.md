# Server Setup Comparison: v9 vs v10

**Date:** 2025-12-01  
**Purpose:** Compare server setup between original (fbc-lab-9) and clean version (fbc_lab_v10)

---

## Key Differences

### Version 9 (Original)

**3 Servers:**
1. **Frontend (Vite)** - Port 3000
2. **WebSocket Server** - Port 3001
3. **Local API Server** - Port 3002 (`api-local-server.ts`)

**Scripts:**
```json
{
  "dev": "vite",
  "dev:api": "vercel dev",
  "dev:api:3002": "PORT=3002 vercel dev --yes --listen 3002",
  "dev:api:local": "tsx api-local-server.ts",  // ← Local API server
  "server": "pnpm exec --dir server tsx live-server.ts",
  "server:3001": "LIVE_SERVER_PORT=3001 pnpm exec --dir server tsx live-server.ts",
  "dev:all": "concurrently -n \"vite,ws\" -c \"blue,green\" \"pnpm dev\" \"pnpm server:3001\"",
  "dev:local:full": "concurrently \"pnpm dev:all\" \"pnpm dev:api:local\"",  // ← All 3 servers
  "dev:all:clean": "rm -rf node_modules && pnpm install && pnpm dev:all"
}
```

**Start Scripts:**
- `start-dev.sh` - Runs all 3 servers (frontend + websocket + local API)
- `start-local-dev.sh` - Alternative startup script

**Local API Server:**
- File: `api-local-server.ts` (Express-based local server)
- Runs API routes locally without Vercel CLI
- Port: 3002

---

### Version 10 (Current)

**3 Servers:**
1. **Frontend (Vite)** - Port 3000 ✅
2. **WebSocket Server** - Port 3001 ✅
3. **Vercel Dev Server** - Port 3002 (`vercel dev`) ⚠️

**Scripts:**
```json
{
  "dev": "vite",
  "dev:server": "tsx watch server/live-server.ts",
  "start:server": "tsx server/live-server.ts",
  "dev:api": "echo 'API routes are handled by Vercel - use pnpm dev for frontend'",  // ← Just echo
  "dev:all": "concurrently -n frontend,websocket,api -c blue,green,yellow \"pnpm dev\" \"pnpm dev:server\" \"pnpm dev:api\"",
  "dev:all:clean": "pnpm install && pnpm dev:all"
}
```

**Missing:**
- ❌ `api-local-server.ts` - Local API server file
- ❌ `dev:api:local` - Script to run local API server
- ❌ `dev:local:full` - Script to run all 3 servers
- ❌ `start-dev.sh` / `start-local-dev.sh` - Startup scripts

**Current Approach:**
- Uses `vercel dev` for API routes (requires Vercel CLI and project linking)
- No standalone local API server

---

## Comparison Table

| Feature | v9 (Original) | v10 (Current) | Status |
|---------|---------------|---------------|--------|
| **Frontend** | Vite (port 3000) | Vite (port 3000) | ✅ Same |
| **WebSocket** | `server/live-server.ts` (port 3001) | `server/live-server.ts` (port 3001) | ✅ Same |
| **API Server** | `api-local-server.ts` (Express, port 3002) | `vercel dev` (port 3002) | ⚠️ Different |
| **Start Script** | `start-dev.sh` / `start-local-dev.sh` | Manual: `pnpm dev:all` + `vercel dev` | ⚠️ Missing scripts |
| **Local API** | Express server (`api-local-server.ts`) | Vercel CLI (`vercel dev`) | ⚠️ Different approach |

---

## What's Missing in v10

### 1. ❌ `api-local-server.ts`

**Purpose:** Standalone Express server for local API route testing  
**Location in v9:** `/Users/farzad/fbc-lab-9/api-local-server.ts`  
**Status:** Not imported to v10

**Why it matters:**
- Doesn't require Vercel CLI
- Faster startup
- No project linking needed
- Works offline

---

### 2. ❌ `dev:api:local` Script

**Purpose:** Run local API server  
**v9 Script:** `"dev:api:local": "tsx api-local-server.ts"`  
**Status:** Not in v10 package.json

---

### 3. ❌ `dev:local:full` Script

**Purpose:** Run all 3 servers together  
**v9 Script:** `"dev:local:full": "concurrently \"pnpm dev:all\" \"pnpm dev:api:local\""`  
**Status:** Not in v10 package.json

---

### 4. ❌ Startup Scripts

**Files:**
- `start-dev.sh` - Main startup script
- `start-local-dev.sh` - Alternative startup script

**Status:** Not imported to v10

---

## Recommendation

### Option 1: Import `api-local-server.ts` (Recommended)

**Benefits:**
- ✅ Matches original setup
- ✅ No Vercel CLI dependency
- ✅ Faster local development
- ✅ Works offline

**Action:**
1. Import `api-local-server.ts` from v9
2. Add `dev:api:local` script
3. Add `dev:local:full` script
4. Update `dev:all` to use local API instead of echo

---

### Option 2: Keep Vercel Dev (Current)

**Benefits:**
- ✅ Matches production environment
- ✅ Tests Vercel serverless functions directly

**Drawbacks:**
- ❌ Requires Vercel CLI
- ❌ Requires project linking
- ❌ Slower startup
- ❌ More complex setup

---

## Implementation Plan

### If Importing `api-local-server.ts`:

1. **Import file:**
   ```bash
   cp /Users/farzad/fbc-lab-9/api-local-server.ts /Users/farzad/fbc_lab_v10/api-local-server.ts
   ```

2. **Update package.json:**
   ```json
   {
     "dev:api:local": "tsx api-local-server.ts",
     "dev:local:full": "concurrently \"pnpm dev:all\" \"pnpm dev:api:local\"",
     "dev:all": "concurrently -n frontend,websocket,api -c blue,green,yellow \"pnpm dev\" \"pnpm dev:server\" \"pnpm dev:api:local\""
   }
   ```

3. **Fix import paths** in `api-local-server.ts` (if needed)

4. **Test:**
   ```bash
   pnpm dev:local:full
   ```

---

## Current Workaround

**To run all 3 servers in v10:**

```bash
# Terminal 1: Frontend + WebSocket
pnpm dev:all

# Terminal 2: API Server (Vercel)
vercel dev --yes --listen 3002
```

**vs v9:**

```bash
# Single command
pnpm dev:local:full
# OR
./start-dev.sh
```

---

## Conclusion

**v10 is missing the local API server setup from v9.** The current approach uses `vercel dev` which works but is less convenient than the original Express-based local server.

**Recommendation:** Import `api-local-server.ts` and add the missing scripts to match v9's setup for better local development experience.

