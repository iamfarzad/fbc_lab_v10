# Agent Deployment Instructions

## Overview
10 agents are ready to fix all 208 type errors across 45 files.

## Quick Start

### Option 1: Deploy All Agents in Parallel (Recommended)

1. **Open 10 Cursor chat windows** (or as many as you can manage)

2. **Copy each agent prompt:**
   ```bash
   # View all prompts
   ls docs/error-fix-prompts/
   
   # Copy a specific prompt
   cat docs/error-fix-prompts/agent-01-admin.md
   ```

3. **Paste each prompt into a separate chat window**

4. **Monitor progress:**
   ```bash
   # Run monitoring script
   node scripts/monitor-error-fix-progress.js
   ```

### Option 2: Deploy Sequentially

Deploy agents one at a time, waiting for each to complete before starting the next.

## Agent List

1. **Agent 1: Admin** (3 files, 16 errors) - `agent-01-admin.md`
2. **Agent 2: API** (3 files, 7 errors) - `agent-02-api.md`
3. **Agent 3: Components-1** (6 files, 20 errors) - `agent-03-components-1.md`
4. **Agent 4: Components-2** (5 files, 28 errors) - `agent-04-components-2.md`
5. **Agent 5: Services** (5 files, 9 errors) - `agent-05-services.md`
6. **Agent 6: Server-1** (5 files, 26 errors) - `agent-06-server-1.md`
7. **Agent 7: Server-2** (5 files, 8 errors) - `agent-07-server-2.md`
8. **Agent 8: Core** (8 files, 24 errors) - `agent-08-core.md`
9. **Agent 9: Utils** (3 files, 39 errors) - `agent-09-utils.md`
10. **Agent 10: Root** (2 files, 31 errors) - `agent-10-root.md`

## Monitoring

### Check Progress
```bash
# View current error count
node scripts/monitor-error-fix-progress.js

# Check specific file errors
pnpm type-check 2>&1 | grep "filename.ts"

# Count total errors
pnpm type-check 2>&1 | grep -c "error TS"
```

### Expected Progress
- **Initial:** 208 errors
- **After Agent 1:** ~192 errors (16 fixed)
- **After Agent 2:** ~185 errors (7 fixed)
- **After Agent 3:** ~165 errors (20 fixed)
- **After Agent 4:** ~137 errors (28 fixed)
- **After Agent 5:** ~128 errors (9 fixed)
- **After Agent 6:** ~102 errors (26 fixed)
- **After Agent 7:** ~94 errors (8 fixed)
- **After Agent 8:** ~70 errors (24 fixed)
- **After Agent 9:** ~31 errors (39 fixed)
- **After Agent 10:** ~0 errors (31 fixed)

## Validation

After all agents complete:

```bash
# Type check
pnpm type-check

# Tests
pnpm test

# Lint
pnpm lint
```

## Notes

- Some errors may be "expected" (missing modules for future phases)
- Agents should work independently
- If an agent encounters a blocking dependency, they should note it
- Missing module errors for complex dependencies (admin-chat-service, orchestrator, etc.) are expected

---

**Status:** Ready to deploy
**Total Agents:** 10
**Total Files:** 45
**Total Errors:** 208

