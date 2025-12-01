#!/usr/bin/env node

/**
 * Helper script for monitoring logs
 * Provides commands and guidance for local vs production logging
 */

const args = process.argv.slice(2)
const environment = args[0] || 'local'

console.log(`
=== Log Monitoring Guide ===

Environment: ${environment}

${environment === 'local' ? `
## Local Development Logging

### Browser Console (Frontend)
1. Start dev server: pnpm dev
2. Open http://localhost:3000
3. Open DevTools (F12)
4. Check Console tab for logs
5. Check Network tab for requests

### Terminal (Backend)
1. Frontend server: pnpm dev (in one terminal)
2. WebSocket server: (in another terminal)
3. Watch for errors, warnings, info logs

### Using Browser Extension MCP
- browser_console_messages() - Get all console logs
- browser_network_requests() - Get all network requests
- browser_snapshot() - See page state

### Commands
pnpm dev                    # Start dev server
pnpm dev 2>&1 | grep error  # Filter errors
` : `
## Production Logging

### Vercel (Frontend)
1. Dashboard: Project → Deployments → Logs
2. CLI: vercel logs [deployment-url]
3. MCP: mcp_Vercel_get_deployment_build_logs()

### Fly.io (WebSocket Server)
1. CLI: fly logs -a your-app-name
2. Dashboard: App → Metrics → Logs
3. Follow: fly logs --follow

### Supabase (Database)
1. Dashboard: Project → Logs
2. CLI: supabase logs

### Browser (Production URL)
1. Open production URL
2. Open DevTools (F12)
3. Check Console tab
4. Check Network tab

### Using MCPs
- Vercel MCP: Get deployment logs
- Browser MCP: Test production URL console/network
`}

## Quick Commands

### Local
${environment === 'local' ? `
# Start dev server
pnpm dev

# Watch logs with filtering
pnpm dev 2>&1 | grep -i error
pnpm dev 2>&1 | grep -i warn

# Browser MCP commands
browser_console_messages()
browser_network_requests()
` : `
# Vercel logs
vercel logs [deployment-url]
vercel logs --follow

# Fly.io logs
fly logs -a your-app-name
fly logs --follow

# Filter logs
fly logs | grep -i error
fly logs | grep -i websocket

# Vercel MCP
mcp_Vercel_get_deployment_build_logs({
  idOrUrl: "deployment-url",
  teamId: "team_xxx"
})
`}

## What to Monitor

### Errors
- Console errors
- Network errors (4xx, 5xx)
- Build errors
- Runtime errors

### Warnings
- Deprecated APIs
- Performance warnings
- Security warnings

### Info
- User actions
- API calls
- State changes

### Performance
- Slow requests
- Memory usage
- CPU usage
- Bundle size

See docs/LOGGING_AND_MONITORING.md for complete guide.
`)

