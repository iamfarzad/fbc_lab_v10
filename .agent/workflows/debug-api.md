---
description: Debug Vercel API 500 errors and serverless function issues
---

# Debug API / Vercel Serverless Errors

// turbo-all

## 1. Check if local API server is running
```bash
lsof -i :3002 | head -5
```

## 2. Test chat API endpoint
```bash
curl -s -X POST http://localhost:3002/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"test"}]}' \
  2>/dev/null | head -20 || echo "API not responding"
```

## 3. Check for ESM import issues (common cause of 500s)
```bash
grep -rn "from 'src/" api/ | head -20
```
If results found → Need to convert to relative imports with .js

## 4. Check for missing .js extensions in dynamic imports
```bash
grep -rn "import('./" api/ server/ | grep -v ".js'" | head -10
```

## 5. Check environment variables are set
```bash
grep "GEMINI_API_KEY\|SUPABASE" .env.local | head -5
```

## 6. Verify API route structure
```bash
ls -la api/
ls -la api/chat/
```

## 7. Check Vercel function config
```bash
cat vercel.json
```

## 8. Test specific endpoints
```bash
# Health check
curl -s http://localhost:3002/api/health 2>/dev/null || echo "No health endpoint"

# Agent stage
curl -s -X POST http://localhost:3002/api/agent-stage \
  -H "Content-Type: application/json" \
  -d '{"message":"test","sessionId":"test-123"}' \
  2>/dev/null | head -20
```

## Common 500 Error Causes

### ERR_MODULE_NOT_FOUND
```
Cannot find module 'src/core/...'
```
**Fix:** Change `'src/...'` to relative path `'../../src/...'` with `.js` extension

### Missing environment variable
```
GEMINI_API_KEY is not defined
```
**Fix:** Add to `.env.local` and Vercel dashboard

### Supabase connection error
```
ECONNREFUSED
```
**Fix:** Check `SUPABASE_URL` and `SUPABASE_ANON_KEY`

### Worker/Queue errors
```
No handler registered for job type
```
**Fix:** Check `src/core/queue/workers.ts` imports have `.js` extensions

## Vercel Production Debugging

```bash
# Check Vercel logs
vercel logs --follow

# Check function list
vercel ls

# Redeploy
vercel --prod
```

## Files to Check for API Issues
- `api/chat.ts` - Main chat endpoint
- `api/chat/unified.ts` - Unified chat handler
- `api/agent-stage.ts` - Agent routing
- `vercel.json` - Function configuration
