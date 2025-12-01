# Testing & Cleanup Strategy

Comprehensive strategy for cleaning up and testing the codebase using MCP tools and custom scripts.

## Available MCP Tools

### 1. **Cursor Browser Extension MCP** 🌐
**Purpose:** End-to-end testing, visual verification, accessibility testing

**Why use it:**
- ✅ **Real browser testing** - Tests actual user interactions
- ✅ **Visual verification** - See if UI renders correctly
- ✅ **Accessibility testing** - Check a11y compliance
- ✅ **E2E workflows** - Test complete user flows
- ✅ **Cross-browser testing** - Test in different browsers

**When to use:**
- After importing UI components
- Before deploying to production
- When testing user flows
- When verifying responsive design
- When checking accessibility

**How to use:**
```typescript
// Example: Test landing page loads
1. Navigate to http://localhost:3000
2. Take snapshot to see page structure
3. Check for key elements (buttons, forms)
4. Test interactions (clicks, form submissions)
5. Verify no console errors
```

### 2. **Vercel MCP** 🚀
**Purpose:** Deployment verification, environment checks, production testing

**Why use it:**
- ✅ **Deployment health** - Verify deployments work
- ✅ **Environment verification** - Check env vars are set
- ✅ **Production testing** - Test deployed versions
- ✅ **Build verification** - Check builds succeed
- ✅ **Performance monitoring** - Check deployment metrics

**When to use:**
- After deploying to Vercel
- When verifying production environment
- When checking deployment health
- When testing production builds
- When verifying environment variables

**How to use:**
```typescript
// Example: Verify deployment
1. List Vercel projects
2. Get deployment status
3. Check build logs for errors
4. Verify environment variables
5. Test production URL
```

### 3. **Custom Scripts** 🛠️
**Purpose:** Code quality, dependency analysis, cleanup detection

**Why use them:**
- ✅ **Static analysis** - Analyze code without running it
- ✅ **Dependency tracking** - Find circular deps, unused code
- ✅ **Pattern detection** - Find duplicates, inconsistencies
- ✅ **Fast feedback** - Run locally, no deployment needed
- ✅ **Comprehensive** - Check entire codebase at once

## Testing Strategy

### Phase 1: Static Analysis (Before Runtime)

**Tools:** Custom scripts + TypeScript + ESLint

```bash
# Run all static checks
pnpm check:all

# Individual checks
pnpm type-check      # Type errors
pnpm lint            # Code quality
pnpm check:circular  # Circular dependencies
pnpm check:unused    # Unused exports
pnpm check:naming    # Naming consistency
pnpm check:secrets   # Secret detection
```

**Why first:**
- Fast (no runtime needed)
- Catches most issues early
- Prevents broken code from being committed
- Works on incomplete codebase

### Phase 2: Unit Tests (Component/Function Level)

**Tools:** Vitest + React Testing Library

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test:coverage

# UI mode
pnpm test:ui
```

**What to test:**
- Individual functions
- React components in isolation
- Utility functions
- Service functions
- Type guards

**Why:**
- Fast feedback
- Isolated testing
- Easy to debug
- High coverage possible

### Phase 3: Integration Tests (Feature Level)

**Tools:** Vitest + Custom test utilities

**What to test:**
- Service integrations
- API route handlers
- Database operations
- Context providers
- Multi-component interactions

**Why:**
- Tests real interactions
- Catches integration issues
- Verifies data flow

### Phase 4: E2E Testing (Browser)

**Tools:** Cursor Browser Extension MCP

**What to test:**
- Complete user flows
- Form submissions
- Navigation
- Real-time features (WebSocket)
- Error handling
- Loading states

**Why:**
- Tests actual user experience
- Catches browser-specific issues
- Verifies visual correctness
- Tests accessibility

**Example workflow:**
```typescript
// 1. Start dev server
pnpm dev

// 2. Use browser MCP to:
- Navigate to app
- Test chat functionality
- Test WebSocket connection
- Test form submissions
- Check for console errors
- Verify accessibility
```

### Phase 5: Deployment Verification

**Tools:** Vercel MCP + Browser Extension

**What to verify:**
- Production build succeeds
- Environment variables set
- Production URL works
- No runtime errors
- Performance is acceptable

**Why:**
- Ensures production readiness
- Catches deployment-specific issues
- Verifies environment config

## Cleanup Strategy

### 1. Code Cleanup (Static Analysis)

**Tools:** Custom scripts

```bash
# Find duplicates
node scripts/compare-duplicates.js

# Find circular deps
pnpm check:circular

# Find unused code
pnpm check:unused

# Check naming
pnpm check:naming
```

**Process:**
1. Run all checks
2. Review findings
3. Fix issues one by one
4. Re-run checks
5. Commit fixes

### 2. Import Cleanup

**Tools:** Dependency analysis scripts

```bash
# Analyze dependencies
node scripts/analyze-dependencies.js

# Check import patterns
node scripts/analyze-import-patterns.js
```

**What to clean:**
- Unused imports
- Circular dependencies
- Inconsistent import paths
- Duplicate imports

### 3. Test Cleanup

**Tools:** Vitest + Coverage reports

```bash
# Run with coverage
pnpm test:coverage

# Review coverage report
# Find untested code
# Add tests for critical paths
```

**What to clean:**
- Dead test code
- Duplicate tests
- Tests for removed code
- Outdated mocks

### 4. Runtime Cleanup (Browser Testing)

**Tools:** Browser Extension MCP

**What to check:**
- Console errors
- Network errors
- Performance issues
- Memory leaks
- Unused resources

**Process:**
1. Open app in browser
2. Check console for errors
3. Check network tab for failed requests
4. Test all features
5. Monitor performance
6. Fix issues found

## Recommended Workflow

### Daily Development

```bash
# 1. Before starting work
pnpm check:all

# 2. While developing
pnpm type-check:watch  # In separate terminal
pnpm test --watch      # In separate terminal

# 3. Before committing
pnpm check:all
pnpm test

# 4. After committing (pre-push runs automatically)
# Tests and all checks run
```

### After Importing Files

```bash
# 1. Static checks
pnpm check:all

# 2. Run tests
pnpm test

# 3. Browser test (if UI component)
# Use browser MCP to test in real browser

# 4. Fix issues
# 5. Re-run checks
# 6. Commit
```

### Before Deployment

```bash
# 1. All static checks
pnpm check:all

# 2. All tests
pnpm test:coverage

# 3. Build
pnpm build

# 4. Browser test production build
pnpm preview
# Use browser MCP to test

# 5. Deploy to Vercel
# Use Vercel MCP to verify deployment

# 6. Test production URL
# Use browser MCP to test live site
```

## MCP Tool Selection Guide

### Use Browser Extension MCP When:
- ✅ Testing UI components
- ✅ Testing user interactions
- ✅ Verifying visual correctness
- ✅ Testing accessibility
- ✅ Debugging runtime issues
- ✅ Testing WebSocket connections
- ✅ Testing form submissions

### Use Vercel MCP When:
- ✅ Verifying deployments
- ✅ Checking build status
- ✅ Reviewing deployment logs
- ✅ Verifying environment variables
- ✅ Testing production URLs
- ✅ Monitoring deployment health

### Use Custom Scripts When:
- ✅ Analyzing code structure
- ✅ Finding duplicates
- ✅ Detecting circular dependencies
- ✅ Checking code quality
- ✅ Verifying naming consistency
- ✅ Detecting secrets
- ✅ Fast feedback during development

## Testing Checklist

### Before Committing
- [ ] `pnpm type-check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm check:secrets` passes
- [ ] `pnpm check:circular` (no critical cycles)
- [ ] All tests pass: `pnpm test`

### Before Pushing
- [ ] All pre-commit checks pass
- [ ] `pnpm check:all` passes
- [ ] `pnpm test --run` passes
- [ ] No console errors (manual check)

### Before Deploying
- [ ] All checks pass
- [ ] All tests pass with coverage
- [ ] Build succeeds: `pnpm build`
- [ ] Preview works: `pnpm preview`
- [ ] Browser test passes (use browser MCP)
- [ ] Production deployment verified (use Vercel MCP)

## Cleanup Checklist

### Code Quality
- [ ] No circular dependencies
- [ ] No unused exports
- [ ] Consistent naming
- [ ] No duplicate code
- [ ] No secrets in code
- [ ] All imports resolve

### Tests
- [ ] Tests pass
- [ ] Good coverage (>80% for critical code)
- [ ] No duplicate tests
- [ ] No dead test code
- [ ] Tests are fast

### Runtime
- [ ] No console errors
- [ ] No network errors
- [ ] Good performance
- [ ] No memory leaks
- [ ] Accessibility passes

## Why This Combination?

### Static Analysis First (Custom Scripts)
- **Fast** - No runtime needed
- **Comprehensive** - Checks entire codebase
- **Early feedback** - Catch issues before running
- **Automated** - Runs in CI/CD

### Unit Tests (Vitest)
- **Isolated** - Test components in isolation
- **Fast** - Quick feedback loop
- **Reliable** - Deterministic results
- **Coverage** - Measure what's tested

### E2E Tests (Browser MCP)
- **Real** - Tests actual browser
- **Visual** - See what users see
- **Complete** - Test full workflows
- **Accessible** - Check a11y compliance

### Deployment Verification (Vercel MCP)
- **Production** - Test real deployment
- **Environment** - Verify config
- **Health** - Monitor deployment
- **Logs** - Debug production issues

## Integration Example

```bash
# Complete workflow after importing a component

# 1. Static checks
pnpm check:all
# ✅ Type check passes
# ✅ Lint passes
# ✅ No circular deps
# ✅ No unused exports

# 2. Unit tests
pnpm test components/NewComponent.test.tsx
# ✅ Tests pass

# 3. Build
pnpm build
# ✅ Build succeeds

# 4. Browser test (using browser MCP)
# - Navigate to localhost:3000
# - Test component interaction
# - Check console for errors
# - Verify accessibility
# ✅ All browser tests pass

# 5. Deploy (if ready)
# - Push to main (auto-deploys to Vercel)
# - Use Vercel MCP to verify deployment
# - Use browser MCP to test production URL
# ✅ Production works
```

## See Also

- [Type Check & Lint Setup](./TYPE_CHECK_AND_LINT.md) - Static analysis setup
- [Git Workflow](./GIT_WORKFLOW.md) - Pre-commit/pre-push hooks
- [Cleanup Checklist](./CLEANUP_CHECKLIST.md) - Comprehensive cleanup guide

