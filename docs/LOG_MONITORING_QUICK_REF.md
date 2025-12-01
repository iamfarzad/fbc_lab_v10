# Log Monitoring Quick Reference

## Local Development

### Browser Console (Frontend)
```bash
# 1. Start dev server
pnpm dev

# 2. Open browser
http://localhost:3000

# 3. Open DevTools (F12)
# - Console tab: All console.log/warn/error
# - Network tab: HTTP/WebSocket requests
# - Performance tab: Performance metrics
```

### Terminal (Backend)
```bash
# Frontend server logs
pnpm dev

# WebSocket server logs (separate terminal)
cd server && pnpm dev

# Filter logs
pnpm dev 2>&1 | grep -i error
pnpm dev 2>&1 | grep -i warn
```

### Browser Extension MCP
```typescript
// Get console messages
browser_console_messages()
// Returns: All console.log/warn/error from page

// Get network requests
browser_network_requests()
// Returns: All HTTP/WebSocket requests with status

// Navigate and test
browser_navigate({ url: "http://localhost:3000" })
browser_snapshot()  // See page structure + a11y
```

**Run guide:** `pnpm logs:local`

## Production

### Vercel (Frontend)

**Dashboard:**
1. Go to project → Deployments
2. Click deployment
3. View "Logs" tab

**CLI:**
```bash
vercel logs [deployment-url]
vercel logs --follow  # Stream logs
```

**Vercel MCP:**
```typescript
// Get build logs
mcp_Vercel_get_deployment_build_logs({
  idOrUrl: "deployment-url",
  teamId: "team_xxx",
  limit: 100
})

// Get deployment details
mcp_Vercel_get_deployment({
  idOrUrl: "deployment-url",
  teamId: "team_xxx"
})
```

### Fly.io (WebSocket Server)

**CLI:**
```bash
# View logs
fly logs -a your-app-name

# Follow logs (stream)
fly logs --follow

# Filter
fly logs | grep -i error
fly logs | grep -i websocket
```

**Dashboard:**
- App → Metrics → Logs

### Supabase (Database)

**Dashboard:**
- Project → Logs
  - API logs
  - Database logs
  - Auth logs

**CLI:**
```bash
supabase logs
```

### Browser (Production URL)

**Same as local:**
1. Open production URL
2. Open DevTools (F12)
3. Console tab
4. Network tab

**Browser Extension MCP:**
```typescript
// Test production URL
browser_navigate({ url: "https://your-app.vercel.app" })
browser_console_messages()
browser_network_requests()
```

**Run guide:** `pnpm logs:prod`

## Comparison

| Aspect | Local | Production |
|--------|-------|------------|
| **Console Access** | Full (DevTools) | Limited (DevTools) |
| **Log Levels** | All (debug, info, warn, error) | Errors & warnings only |
| **Terminal Logs** | Direct (pnpm dev) | Via CLI/dashboard |
| **Network Logs** | DevTools Network tab | DevTools + platform logs |
| **Error Details** | Full stack traces | Sanitized |
| **Debugging** | Can use debugger | No debugger |
| **MCP Tools** | Browser MCP | Browser MCP + Vercel MCP |

## What to Monitor

### Always Monitor
- ✅ Errors (console.error, 4xx/5xx responses)
- ✅ Warnings (console.warn, deprecations)
- ✅ Failed requests (network tab)
- ✅ Build failures

### Local Only
- ✅ Debug logs (console.debug)
- ✅ Info logs (console.info)
- ✅ Component state (React DevTools)
- ✅ Performance profiling

### Production
- ✅ Error rates
- ✅ Response times
- ✅ Memory/CPU usage
- ✅ User-reported issues

## Quick Commands

```bash
# Local monitoring
pnpm logs:local          # Show local monitoring guide
pnpm dev                 # Start dev server (see logs)
browser_console_messages()  # Get console logs (MCP)

# Production monitoring
pnpm logs:prod          # Show production monitoring guide
vercel logs --follow    # Vercel logs (stream)
fly logs --follow       # Fly.io logs (stream)
mcp_Vercel_get_deployment_build_logs({...})  # Vercel MCP
```

## See Also

- [Logging & Monitoring](./LOGGING_AND_MONITORING.md) - Complete guide
- [Testing & Cleanup Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) - Testing approach

