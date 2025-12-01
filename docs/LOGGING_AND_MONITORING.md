# Logging & Monitoring Strategy

How to monitor logs when testing locally vs live/production environments.

## Local Development Logging

### Console Logging

**Frontend (Browser Console):**
```typescript
// Development - verbose logging
if (import.meta.env.DEV) {
  console.log('Debug info:', data)
  console.warn('Warning:', message)
  console.error('Error:', error)
}

// Production - minimal logging
if (import.meta.env.PROD) {
  console.error('Error:', error) // Only errors
}
```

**Backend/Server (Terminal):**
```typescript
// Use logger utility
import { logger } from 'src/lib/logger'

logger.info('Server started')
logger.warn('Deprecated API used')
logger.error('Error occurred', { error })
```

### Monitoring Local Logs

**1. Browser Console (Frontend)**
- Open DevTools (F12)
- Console tab - see all console.log/warn/error
- Filter by log level
- Filter by source (network, console, etc.)

**2. Terminal (Backend/Server)**
- Watch server logs in terminal
- Use `pnpm dev` to see Vite logs
- Use separate terminal for WebSocket server

**3. Network Tab (Browser)**
- DevTools → Network tab
- See all HTTP requests
- See WebSocket messages
- Check request/response payloads
- Check for failed requests

**4. React DevTools**
- Install React DevTools extension
- Inspect component state
- See component props
- Monitor re-renders

### Local Logging Tools

**Browser Extension MCP:**
```typescript
// Get console messages
browser_console_messages()
// Returns all console.log/warn/error messages

// Get network requests
browser_network_requests()
// Returns all HTTP/WebSocket requests
```

**Terminal Commands:**
```bash
# Watch server logs
pnpm dev

# Watch WebSocket server logs (separate terminal)
cd server && pnpm dev

# Watch with filtering
pnpm dev 2>&1 | grep -i error
```

## Production Logging

### Vercel Logging (Frontend)

**Access Logs:**
1. **Vercel Dashboard:**
   - Go to project → Deployments
   - Click on deployment
   - View "Logs" tab
   - See build logs and runtime logs

2. **Vercel CLI:**
   ```bash
   vercel logs [deployment-url]
   vercel logs --follow  # Stream logs
   ```

3. **Vercel MCP:**
   ```typescript
   // Get build logs
   mcp_Vercel_get_deployment_build_logs({
     idOrUrl: "deployment-url",
     teamId: "team_xxx",
     limit: 100
   })
   ```

**What to Monitor:**
- Build errors
- Runtime errors
- API route errors
- Environment variable issues
- Performance issues

### Fly.io Logging (WebSocket Server)

**Access Logs:**
1. **Fly.io CLI:**
   ```bash
   # View logs
   fly logs

   # Follow logs (stream)
   fly logs -a your-app-name

   # Filter logs
   fly logs | grep -i error
   fly logs | grep -i websocket
   ```

2. **Fly.io Dashboard:**
   - Go to app → Metrics
   - View logs in dashboard
   - Filter by time, level, etc.

**What to Monitor:**
- WebSocket connection errors
- Server errors
- API errors
- Memory/CPU usage
- Connection counts

### Supabase Logging (Database)

**Access Logs:**
1. **Supabase Dashboard:**
   - Go to project → Logs
   - View API logs
   - View database logs
   - View auth logs

2. **Supabase CLI:**
   ```bash
   supabase logs
   ```

**What to Monitor:**
- Database query errors
- API errors
- Auth errors
- Performance issues
- Rate limiting

### Browser Console (Production)

**Access:**
- Open production URL
- Open DevTools (F12)
- Console tab
- Network tab

**What to Monitor:**
- Client-side errors
- Failed API calls
- WebSocket connection issues
- Performance warnings

## Logging Best Practices

### Structured Logging

**Use consistent format:**
```typescript
// Good
logger.info('User action', {
  userId: user.id,
  action: 'login',
  timestamp: new Date().toISOString()
})

// Bad
console.log('User logged in') // No context
```

### Log Levels

```typescript
// Development - all levels
logger.debug('Detailed debug info')
logger.info('General information')
logger.warn('Warning message')
logger.error('Error occurred', { error })

// Production - errors and warnings only
if (process.env.NODE_ENV === 'production') {
  // Only log errors and warnings
  logger.error('Error occurred', { error })
  logger.warn('Warning message')
}
```

### Error Logging

```typescript
// Always include context
try {
  // code
} catch (error) {
  logger.error('Operation failed', {
    error: error.message,
    stack: error.stack,
    context: {
      userId: user.id,
      operation: 'processPayment'
    }
  })
}
```

## Monitoring Tools

### Local Development

**1. Browser DevTools**
- Console tab - client-side logs
- Network tab - HTTP/WebSocket requests
- Performance tab - performance metrics
- Application tab - storage, cache

**2. Terminal**
- Server logs
- Build logs
- Test output

**3. Browser Extension MCP**
- `browser_console_messages()` - Get console logs
- `browser_network_requests()` - Get network logs
- `browser_snapshot()` - See page state

### Production

**1. Vercel Dashboard**
- Deployment logs
- Function logs
- Build logs
- Analytics

**2. Fly.io Dashboard/CLI**
- Application logs
- Metrics
- Alerts

**3. Supabase Dashboard**
- API logs
- Database logs
- Auth logs

**4. Browser (Production)**
- DevTools console
- Network tab
- Performance tab

## Comparison: Local vs Production

### Local Development

**Advantages:**
- ✅ Full access to console
- ✅ Can use debugger
- ✅ Can modify code on the fly
- ✅ See all logs (debug, info, warn, error)
- ✅ Network tab shows all requests
- ✅ Can inspect state

**Tools:**
- Browser DevTools
- Terminal
- Browser Extension MCP
- React DevTools

**Logging:**
- Verbose (all levels)
- Detailed error messages
- Stack traces
- Source maps

### Production

**Advantages:**
- ✅ Real user data
- ✅ Real performance
- ✅ Real errors
- ✅ Production environment

**Limitations:**
- ⚠️ Limited console access
- ⚠️ No debugger
- ⚠️ Can't modify code
- ⚠️ Need proper logging setup

**Tools:**
- Vercel Dashboard/CLI
- Fly.io Dashboard/CLI
- Supabase Dashboard
- Browser DevTools (limited)
- Vercel MCP
- Browser Extension MCP

**Logging:**
- Errors and warnings only
- Sanitized data (no PII)
- Aggregated logs
- Performance metrics

## Logging Setup

### Frontend Logger

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.debug('[DEBUG]', ...args)
    }
  },
  info: (...args: any[]) => {
    if (import.meta.env.DEV) {
      console.info('[INFO]', ...args)
    }
  },
  warn: (...args: any[]) => {
    console.warn('[WARN]', ...args)
  },
  error: (...args: any[]) => {
    console.error('[ERROR]', ...args)
    // In production, send to error tracking service
    if (import.meta.env.PROD) {
      // Send to Sentry, LogRocket, etc.
    }
  }
}
```

### Backend Logger

```typescript
// src/lib/logger.ts
export const logger = {
  debug: (message: string, meta?: object) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, meta)
    }
  },
  info: (message: string, meta?: object) => {
    console.info(`[INFO] ${message}`, meta)
  },
  warn: (message: string, meta?: object) => {
    console.warn(`[WARN] ${message}`, meta)
  },
  error: (message: string, error?: Error, meta?: object) => {
    console.error(`[ERROR] ${message}`, { error, ...meta })
    // In production, send to error tracking
  }
}
```

## Quick Reference

### Local Testing

```bash
# Frontend logs (browser)
1. Open http://localhost:3000
2. Open DevTools (F12)
3. Check Console tab
4. Check Network tab

# Backend logs (terminal)
pnpm dev  # Vite dev server
# Separate terminal for WebSocket server

# Using Browser MCP
browser_console_messages()
browser_network_requests()
```

### Production Testing

```bash
# Vercel logs
vercel logs [deployment-url]
vercel logs --follow

# Fly.io logs
fly logs -a your-app-name
fly logs --follow

# Supabase logs
# Via dashboard or CLI

# Using MCPs
mcp_Vercel_get_deployment_build_logs({...})
browser_console_messages()  # On production URL
browser_network_requests()  # On production URL
```

## See Also

- [Testing & Cleanup Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) - Testing approach
- [MCP Tools Guide](./MCP_TOOLS_GUIDE.md) - How to use MCP tools
- [Deployment](./DEPLOYMENT.md) - Deployment setup

