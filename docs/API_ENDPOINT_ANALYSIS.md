# Complete API Endpoint Analysis & Connection Map
## F.B/c AI System - How Every API Endpoint is Connected

**Date:** 2025-12-02  
**Project:** fbc_lab_v10  
**Scope:** Complete mapping of all API endpoints, their connections, and what's working vs broken

---

## Executive Summary

### Current State
- ✅ **Frontend (Vite)**: Running on port 3000
- ✅ **API Server (Express)**: Running on port 3002 via `api-local-server.ts`
- ✅ **WebSocket Server**: Running on port 3001 (or Fly.io production)
- ⚠️ **Route Coverage**: Only 7 of 23+ API endpoints registered in local server
- ❌ **Missing Routes**: 16+ admin endpoints not accessible via local dev

---

## 1. API Server Architecture

### 1.1 Two-Server Setup

```
┌─────────────────────────────────────────────────────────────┐
│  Frontend (Vite - Port 3000)                                │
│  - React App                                                │
│  - Vite Dev Server                                          │
│  - Proxies /api/* → http://localhost:3002                  │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  API Server (Express - Port 3002)                           │
│  - api-local-server.ts                                      │
│  - Wraps Vercel/Next.js route handlers                     │
│  - Runs locally without Vercel CLI                          │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│  API Routes (api/*.ts files)                                │
│  - Vercel Request/Response format                           │
│  - Next.js Web API format (Request/Response)                │
│  - Shared code in src/core/*                                │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 Server Startup Options

#### Option 1: Local Express Server (Current - Recommended)
```bash
pnpm dev:api:local
# Runs: tsx api-local-server.ts
```
- ✅ No Vercel CLI required
- ✅ Faster startup
- ✅ Full control
- ⚠️ Manual route registration needed

#### Option 2: Vercel CLI
```bash
pnpm dev:api:3002
# Runs: PORT=3002 vercel dev --yes --listen 3002
```
- ✅ Auto-discovers routes
- ❌ Requires Vercel project linking
- ❌ Slower startup

**Current Setup:** Uses `dev:api:local` via `dev:all` script

---

## 2. Complete API Endpoint Map

### 2.1 Registered Routes (Currently Working)

These routes are **registered in `api-local-server.ts`** and accessible:

| Method | Route | Handler Type | Status |
|--------|-------|--------------|--------|
| `POST` | `/api/chat` | Vercel Handler | ✅ Registered |
| `POST` | `/api/chat/persist-message` | Vercel Handler | ✅ Registered |
| `POST` | `/api/chat/persist-batch` | Vercel Handler | ✅ Registered |
| `GET` | `/api/admin/sessions` | Next.js Handler | ✅ Registered |
| `POST` | `/api/admin/sessions` | Next.js Handler | ✅ Registered |
| `DELETE` | `/api/admin/sessions` | Next.js Handler | ✅ Registered |
| `GET` | `/api/admin/token-costs` | Next.js Handler | ✅ Registered |
| `GET` | `/health` | Express Route | ✅ Registered |

**Total Registered: 7 endpoints**

### 2.2 Missing Routes (Exist but NOT Registered)

These routes **exist as files** but are **NOT registered** in `api-local-server.ts`:

#### Chat & Communication
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `POST` | `/api/live` | `api/live.ts` | ❌ Missing |
| `POST` | `/api/send-pdf-summary` | `api/send-pdf-summary/route.ts` | ❌ Missing |

#### Admin Authentication
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `POST` | `/api/admin/login` | `api/admin/login/route.ts` | ❌ Missing |
| `POST` | `/api/admin/logout` | `api/admin/logout/route.ts` | ❌ Missing |

#### Admin Analytics & Monitoring
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `GET` | `/api/admin/stats` | `api/admin/stats/route.ts` | ❌ Missing |
| `GET` | `/api/admin/analytics` | `api/admin/analytics/route.ts` | ❌ Missing |
| `GET` | `/api/admin/interaction-analytics` | `api/admin/interaction-analytics/route.ts` | ❌ Missing |
| `GET` | `/api/admin/ai-performance` | `api/admin/ai-performance/route.ts` | ❌ Missing |
| `GET` | `/api/admin/system-health` | `api/admin/system-health/route.ts` | ❌ Missing |
| `GET` | `/api/admin/real-time-activity` | `api/admin/real-time-activity/route.ts` | ❌ Missing |

#### Admin Data Management
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `GET` | `/api/admin/conversations` | `api/admin/conversations/route.ts` | ❌ Missing |
| `GET`<br>`POST`<br>`PATCH`<br>`DELETE` | `/api/admin/meetings` | `api/admin/meetings/route.ts` | ❌ Missing |
| `GET`<br>`POST`<br>`PATCH`<br>`DELETE` | `/api/admin/email-campaigns` | `api/admin/email-campaigns/route.ts` | ❌ Missing |
| `GET`<br>`POST`<br>`PATCH`<br>`DELETE` | `/api/admin/failed-conversations` | `api/admin/failed-conversations/route.ts` | ❌ Missing |

#### Admin Security & Logs
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `GET`<br>`POST` | `/api/admin/security-audit` | `api/admin/security-audit/route.ts` | ❌ Missing |
| `GET` | `/api/admin/logs` | `api/admin/logs/route.ts` | ❌ Missing |

#### Admin Infrastructure
| Method | Route | File Location | Status |
|--------|-------|---------------|--------|
| `GET` | `/api/admin/flyio/usage` | `api/admin/flyio/usage/route.ts` | ❌ Missing |
| `POST` | `/api/admin/flyio/settings` | `api/admin/flyio/settings/route.ts` | ❌ Missing |

**Total Missing: 16+ endpoint files (some with multiple HTTP methods)**

---

## 3. Request Flow Architecture

### 3.1 Frontend to API Server

```typescript
// vite.config.ts - Proxy Configuration
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:3002',  // → Express server
      changeOrigin: true,
    },
  },
}
```

**Flow:**
1. Frontend makes request: `fetch('/api/chat', { ... })`
2. Vite proxy intercepts `/api/*` requests
3. Proxy forwards to `http://localhost:3002/api/chat`
4. Express server in `api-local-server.ts` receives request

### 3.2 Express Route Handling

#### Vercel Handler Pattern (POST routes)
```typescript
// api-local-server.ts
app.post('/api/chat', async (req, res) => {
  const { default: handler } = await import('./api/chat')
  await runVercelHandler(handler, req, res)
})
```

**Process:**
1. Express receives request
2. Dynamically imports route handler from `api/chat.ts`
3. Converts Express `req/res` → Vercel `VercelRequest/VercelResponse`
4. Calls handler function
5. Converts Vercel response → Express response

#### Next.js Handler Pattern (GET/POST/DELETE routes)
```typescript
// api-local-server.ts
app.get('/api/admin/sessions', async (req, res) => {
  const { GET: handler } = await import('./api/admin/sessions/route')
  await runNextHandler(handler, req, res)
})
```

**Process:**
1. Express receives request
2. Dynamically imports named export (GET/POST/DELETE) from `route.ts`
3. Converts Express `req/res` → Web API `Request/Response`
4. Calls handler function
5. Copies Web API response → Express response

### 3.3 Handler Type Detection

**Pattern Recognition:**

| File Structure | Handler Type | Wrapper Function |
|---------------|--------------|------------------|
| `api/chat.ts` (default export) | Vercel Handler | `runVercelHandler()` |
| `api/admin/*/route.ts` (named exports) | Next.js Handler | `runNextHandler()` |
| Express route (inline) | Express Route | Direct handler |

---

## 4. Current Working State (From Browser Logs)

### 4.1 What's Working ✅

Based on `/Users/farzad/Downloads/localhost-1764685116555.log`:

1. **Agent Chat API** ✅
   ```
   [App] Agent response received: {
     success: true, 
     agent: 'Discovery Agent', 
     hasOutput: true
   }
   ```
   - `/api/chat` endpoint working
   - Messages successfully routed to Discovery Agent
   - Responses returned successfully

2. **WebSocket Connection** ✅ (with retries)
   ```
   🔌 [LiveClient] WebSocket opened successfully
   [GeminiLiveService] Connected to Fly.io server: 99c4f8b5-...
   [GeminiLiveService] Session started: {connectionId: '...', languageCode: 'en-US', voiceName: 'Kore'}
   ```
   - Initial connection fails → auto-reconnect works
   - Connection established after 1-2 retries
   - Session starts successfully

3. **Lead Research** ✅
   ```
   🔍 [Lead Research] Starting for: farzad@talktoeve.com
   🎯 Using known profile for Farzad Bayat
   ```
   - Research service initializes
   - Uses cached/known profiles

4. **Webcam & Permissions** ✅
   ```
   [App] Webcam permission granted, enabling camera
   [App] Location access granted: {lat: 59.918..., lng: 10.935...}
   ```
   - Permissions granted successfully
   - Camera access working
   - Location access working

### 4.2 What's Broken ❌

1. **Rate Limiting (Critical)** 🔴
   ```
   [GeminiLiveService] Error: Rate limit exceeded. Try again in 60s
   ```
   - **Frequency**: Every ~250ms
   - **Impact**: Voice mode completely unusable
   - **Root Cause**: Server sending rate limit errors repeatedly
   - **Likely Issue**: Rate limiter not properly checking client ID or connection state

2. **WebSocket Initial Connection** ⚠️
   ```
   🔌 [LiveClient] WebSocket error: {
     url: 'ws://localhost:3001/', 
     readyState: 3,  // CLOSED
     connectionId: null
   }
   ```
   - **First attempt**: Always fails
   - **Recovery**: Auto-reconnect succeeds after retry
   - **Impact**: User sees error before success

3. **Session Not Ready Error** ⚠️
   ```
   [GeminiLiveService] Error: Session not ready
   ```
   - Happens immediately after `session_started` event
   - Likely race condition in session initialization

4. **Missing API Routes** ⚠️
   - Admin dashboard endpoints return 404 in local dev
   - Frontend tries to call routes that don't exist in `api-local-server.ts`

---

## 5. Request/Response Flow Diagrams

### 5.1 Chat API Flow (Working)

```
User Input (MultimodalChat)
    │
    ▼
ChatInputDock.onSendMessage()
    │
    ▼
App.handleSendMessage()
    │
    ▼
AIBrainService.sendMessage()
    │
    ▼
fetch('/api/chat', {
  method: 'POST',
  body: JSON.stringify({
    messages: [...],
    sessionId: '...',
    intelligenceContext: {...}
  })
})
    │
    ▼
[Vite Proxy] /api/chat → http://localhost:3002/api/chat
    │
    ▼
api-local-server.ts (Express)
    │
    ▼
runVercelHandler() → api/chat.ts
    │
    │
    ▼
routeToAgent() → src/core/agents/orchestrator.ts
    │
    ▼
Discovery Agent → Google Generative AI
    │
    ▼
Response: {
  success: true,
  output: "...",
  agent: "Discovery Agent",
  metadata: {...}
}
    │
    ▼
AIBrainService → App → MultimodalChat → User sees response
```

### 5.2 Voice API Flow (Partially Working)

```
User clicks "Start Voice"
    │
    ▼
GeminiLiveService.connect()
    │
    ▼
LiveClientWS.connect('ws://localhost:3001')
    │
    ├─→ [First Attempt: FAILS]
    │   └─→ Auto-reconnect after 3000ms
    │
    └─→ [Second Attempt: SUCCESS]
        │
        ▼
WebSocket opened → Server sends 'connected'
    │
    ▼
LiveClientWS.send('start', {...})
    │
    ▼
Server sends 'start_ack' → 'session_started'
    │
    ▼
Audio capture starts → WebSocket streaming
    │
    ├─→ [Rate Limit Errors Every 250ms]
    │   └─→ Voice mode unusable
    │
    └─→ [When Working]
        │
        ▼
Audio → WebSocket → Server → Gemini Live API
    │
    ▼
Server → WebSocket → Client → Audio playback
```

### 5.3 Admin API Flow (Broken - Routes Not Registered)

```
Admin Dashboard loads
    │
    ▼
useAdminChat() → fetch('/api/admin/sessions')
    │
    ├─→ [If route registered] ✅
    │   └─→ api-local-server.ts → api/admin/sessions/route.ts
    │
    └─→ [If route NOT registered] ❌
        └─→ 404 Not Found
```

---

## 6. Handler Wrapper Functions

### 6.1 Vercel Handler Wrapper

```typescript
// api-local-server.ts
async function runVercelHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined> | VercelResponse,
  expressReq: Request,
  expressRes: Response
) {
  const vercelReq = toVercelRequest(expressReq)
  const vercelRes = toVercelResponse(expressRes)
  await handler(vercelReq, vercelRes)
}
```

**Conversion:**
- Express `req.query` → `VercelRequest.query`
- Express `req.body` → `VercelRequest.body`
- Express `req.headers.cookie` → `VercelRequest.cookies`
- Express `res.json()` → `VercelResponse.json()`

### 6.2 Next.js Handler Wrapper

```typescript
// api-local-server.ts
async function runNextHandler(
  handler: (req: globalThis.Request) => Promise<globalThis.Response>,
  expressReq: Request,
  expressRes: Response
) {
  const url = `http://localhost:${PORT}${expressReq.url}`
  const webReq = new globalThis.Request(url, {
    method: expressReq.method,
    headers: new Headers(expressReq.headers as Record<string, string>),
    body: expressReq.method !== 'GET' ? JSON.stringify(expressReq.body) : undefined
  })
  
  const webRes = await handler(webReq)
  
  expressRes.status(webRes.status)
  webRes.headers.forEach((value, key) => {
    expressRes.setHeader(key, value)
  })
  const body = await webRes.text()
  expressRes.send(body)
}
```

**Conversion:**
- Express Request → Web API Request object
- Web API Response → Express response headers + body

---

## 7. Missing Route Registration

### 7.1 Routes That Need Registration

To make all admin routes work locally, add these to `api-local-server.ts`:

```typescript
// Admin Authentication
app.post('/api/admin/login', async (req, res) => {
  const { POST: handler } = await import('./api/admin/login/route')
  await runNextHandler(handler, req, res)
})

app.post('/api/admin/logout', async (req, res) => {
  const { POST: handler } = await import('./api/admin/logout/route')
  await runNextHandler(handler, req, res)
})

// Admin Analytics
app.get('/api/admin/stats', async (req, res) => {
  const { GET: handler } = await import('./api/admin/stats/route')
  await runNextHandler(handler, req, res)
})

app.get('/api/admin/analytics', async (req, res) => {
  const { GET: handler } = await import('./api/admin/analytics/route')
  await runNextHandler(handler, req, res)
})

// ... (14 more routes)
```

### 7.2 Auto-Registration Strategy

Instead of manual registration, consider:

1. **Route Discovery**: Scan `api/` directory and auto-register
2. **Dynamic Imports**: Use Express router with dynamic path matching
3. **Vercel CLI**: Use `dev:api:3002` for auto-discovery (slower but automatic)

---

## 8. Environment & Configuration

### 8.1 Port Configuration

| Service | Port | Env Var | Default |
|---------|------|---------|---------|
| Frontend (Vite) | 3000 | - | 3000 |
| API Server | 3002 | `API_PORT` or `PORT` | 3002 |
| WebSocket Server | 3001 | `PORT` (in server/) | 3001 |

### 8.2 Environment File Loading

```typescript
// api-local-server.ts loads .env.local
dotenv.config({ path: rootEnvLocal, override: true })
```

**Priority:**
1. `.env.local` (root directory) - Highest priority
2. Environment variables from shell
3. Default values in code

### 8.3 CORS Configuration

```typescript
// api-local-server.ts
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, ...')
  // ...
})
```

**Note:** Allows all origins (`*`) - should be restricted in production

---

## 9. Error Patterns & Solutions

### 9.1 404 Not Found

**Symptom:** Admin routes return 404 in local dev

**Cause:** Route not registered in `api-local-server.ts`

**Solution:** Add route registration or use Vercel CLI mode

### 9.2 500 Internal Server Error

**Symptom:** Route exists but throws errors

**Causes:**
- Missing environment variables
- Import path errors
- Database connection failures
- Missing dependencies

**Debug:** Check server console logs

### 9.3 Rate Limit Errors

**Symptom:** Continuous rate limit errors every 250ms

**Cause:** Rate limiter not checking connection state properly

**Solution:** Fix rate limiting logic in WebSocket server

### 9.4 WebSocket Connection Failures

**Symptom:** First connection attempt always fails

**Cause:** Server not ready or connection timeout too short

**Solution:** 
- Increase connection timeout
- Add server ready check
- Implement connection retry with exponential backoff

---

## 10. Recommendations

### 10.1 Immediate Actions

1. **Register Missing Admin Routes** 🔴
   - Add all 16+ missing routes to `api-local-server.ts`
   - Or implement auto-discovery

2. **Fix Rate Limiting** 🔴
   - Investigate rate limiter in WebSocket server
   - Check if client ID tracking is working
   - Verify rate limit thresholds

3. **Improve Error Messages** 🟡
   - Add specific error messages for missing routes
   - Show route registration status in health check

### 10.2 Future Improvements

1. **Auto-Route Discovery**
   - Scan `api/` directory automatically
   - Register routes dynamically based on file structure

2. **Route Health Check**
   - Add `/api/health/routes` endpoint
   - List all registered vs available routes

3. **Better Error Handling**
   - Consistent error response format
   - Error code enum for client handling

4. **Documentation**
   - API endpoint documentation
   - Request/response examples
   - OpenAPI/Swagger spec

---

## 11. Summary

### Current State

| Category | Status | Count |
|----------|--------|-------|
| **Total API Routes** | Found | 23+ files |
| **Registered Routes** | Working | 7 endpoints |
| **Missing Routes** | Not accessible | 16+ endpoints |
| **Working Features** | ✅ | Chat, WebSocket (with retries) |
| **Broken Features** | ❌ | Rate limiting, many admin routes |

### Key Findings

1. ✅ **Core chat functionality works** - `/api/chat` successfully routes to agents
2. ✅ **WebSocket connects** - After retries, voice mode can establish connection
3. ❌ **Rate limiting broken** - Voice mode unusable due to continuous rate limit errors
4. ❌ **Most admin routes missing** - 16+ endpoints not registered in local server
5. ⚠️ **Initial WebSocket connection fails** - Auto-reconnect works but shows errors

### Next Steps Priority

1. 🔴 **Critical**: Fix rate limiting in WebSocket server
2. 🔴 **Critical**: Register missing admin routes or implement auto-discovery
3. 🟡 **Important**: Improve WebSocket connection reliability
4. 🟡 **Important**: Add route health check endpoint
5. 🟢 **Nice-to-have**: Auto-route discovery mechanism

---

**Document Version:** 1.0  
**Last Updated:** 2025-12-02  
**Next Review:** After route registration implementation

