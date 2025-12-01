# MCP Tools Guide

Quick reference for using MCP tools to test and clean up the codebase.

## Available MCP Tools

### 1. 🌐 Browser Extension MCP
**Best for:** E2E testing, visual verification, accessibility

**Why use it:**
- Tests in real browser (not headless)
- Visual verification of UI
- Accessibility testing built-in
- Tests actual user interactions
- Can test WebSocket connections
- Can check console/network errors

**When to use:**
- ✅ After importing UI components
- ✅ Before deploying
- ✅ Testing user flows
- ✅ Debugging runtime issues
- ✅ Testing WebSocket functionality
- ✅ Verifying responsive design

**Example workflow:**
```typescript
// 1. Start dev server
pnpm dev

// 2. Navigate to app
browser_navigate({ url: "http://localhost:3000" })

// 3. Take snapshot (shows page structure + a11y)
browser_snapshot()

// 4. Test interactions
browser_click({ element: "Submit button", ref: "button-123" })
browser_fill_form({ fields: [...] })

// 5. Check for errors
browser_console_messages()
browser_network_requests()

// 6. Test WebSocket (if applicable)
// Navigate to page with WebSocket
// Check network tab for WS connection
// Send test messages
```

**Run guide:** `pnpm test:e2e:guide`

### 2. 🚀 Vercel MCP
**Best for:** Deployment verification, production testing

**Why use it:**
- Verify deployments work
- Check build logs
- Verify environment variables
- Test production URLs
- Monitor deployment health
- Debug production issues

**When to use:**
- ✅ After deploying to Vercel
- ✅ Verifying production environment
- ✅ Checking deployment status
- ✅ Debugging production issues
- ✅ Verifying env vars are set

**Example workflow:**
```typescript
// 1. List projects
mcp_Vercel_list_projects({ teamId: "team_xxx" })

// 2. Get project
mcp_Vercel_get_project({ projectId: "prj_xxx", teamId: "team_xxx" })

// 3. List deployments
mcp_Vercel_list_deployments({ projectId: "prj_xxx", teamId: "team_xxx" })

// 4. Get deployment details
mcp_Vercel_get_deployment({ idOrUrl: "deployment-url", teamId: "team_xxx" })

// 5. Check build logs
mcp_Vercel_get_deployment_build_logs({ idOrUrl: "deployment-url", teamId: "team_xxx" })

// 6. Test production URL (use browser MCP)
browser_navigate({ url: "https://your-app.vercel.app" })
```

**Run guide:** `pnpm verify:deployment:guide`

### 3. 🎨 shadcn MCP
**Best for:** UI component reference (development)

**Why use it:**
- Component documentation
- Code examples
- Best practices
- Component API reference

**When to use:**
- ✅ When building new components
- ✅ When looking for component examples
- ✅ When checking component APIs

**Note:** This is for reference, not testing/cleanup.

## Testing Strategy with MCPs

### Phase 1: Static Analysis (No MCP needed)
```bash
pnpm check:all
```
- Type checking
- Linting
- Circular dependencies
- Unused code
- Naming consistency

### Phase 2: Unit Tests (No MCP needed)
```bash
pnpm test
```
- Component tests
- Function tests
- Service tests

### Phase 3: E2E Testing (Browser MCP)
```bash
pnpm dev  # Start server
# Then use Browser Extension MCP
```
- Navigate to app
- Test interactions
- Check console/network
- Verify accessibility

### Phase 4: Deployment Verification (Vercel MCP)
```bash
# After deploying
# Use Vercel MCP to verify
```
- Check deployment status
- Review build logs
- Verify environment
- Test production URL

## Cleanup Strategy with MCPs

### Code Cleanup (Custom Scripts)
```bash
pnpm check:all
```
- Finds duplicates
- Finds circular deps
- Finds unused code
- Checks naming

### Runtime Cleanup (Browser MCP)
- Check console errors
- Check network errors
- Test all features
- Verify performance

### Deployment Cleanup (Vercel MCP)
- Verify deployments work
- Check for build errors
- Verify environment config
- Test production

## Recommended Workflow

### Daily Development
1. **Static checks** (custom scripts)
   ```bash
   pnpm check:all
   ```

2. **Unit tests** (Vitest)
   ```bash
   pnpm test --watch
   ```

3. **Browser test** (Browser MCP) - when needed
   - Test new features
   - Verify UI changes
   - Check for errors

### Before Deployment
1. **All static checks**
   ```bash
   pnpm check:all
   ```

2. **All tests**
   ```bash
   pnpm test:coverage
   ```

3. **Build**
   ```bash
   pnpm build
   ```

4. **Browser test** (Browser MCP)
   - Test preview build
   - Verify all features

5. **Deploy**
   - Push to main (auto-deploys)

6. **Verify deployment** (Vercel MCP)
   - Check deployment status
   - Review build logs
   - Test production URL

## Why This Combination?

### Custom Scripts (Static Analysis)
- ✅ **Fast** - No runtime needed
- ✅ **Comprehensive** - Checks entire codebase
- ✅ **Early feedback** - Catch issues before running
- ✅ **Automated** - Runs in hooks

### Browser MCP (E2E Testing)
- ✅ **Real** - Tests actual browser
- ✅ **Visual** - See what users see
- ✅ **Complete** - Test full workflows
- ✅ **Accessible** - Built-in a11y testing

### Vercel MCP (Deployment)
- ✅ **Production** - Test real deployment
- ✅ **Environment** - Verify config
- ✅ **Health** - Monitor deployment
- ✅ **Logs** - Debug production issues

## Quick Commands

```bash
# Static analysis
pnpm check:all

# Unit tests
pnpm test

# E2E guide
pnpm test:e2e:guide

# Deployment guide
pnpm verify:deployment:guide

# Full workflow
pnpm check:all && pnpm test && pnpm build
```

## See Also

- [Testing & Cleanup Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) - Complete strategy
- [Cleanup Checklist](./CLEANUP_CHECKLIST.md) - What to check
- [Git Workflow](./GIT_WORKFLOW.md) - Pre-commit/pre-push hooks

