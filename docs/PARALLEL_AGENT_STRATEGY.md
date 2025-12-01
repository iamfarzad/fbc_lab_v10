# Parallel Agent Strategy for Codebase Import

## Overview

This strategy uses Cursor's parallel agents (up to 8) to import and validate the codebase **incrementally**, ensuring each phase:
1. ✅ Respects dependency order
2. ✅ Passes type checking
3. ✅ Passes linting
4. ✅ Builds successfully
5. ✅ Services can start
6. ✅ No regressions introduced

## Core Principle: **Incremental Validation**

**Each agent must:**
- Import files in dependency order
- Run validation after their batch
- Fix issues before proposing changes
- Verify services can start
- Document what works and what doesn't

## Phase-Based Parallel Strategy

### Phase 1: Foundation (Agents 1-4)

**Goal:** Import foundation files with zero dependencies

#### Agent 1: Types Foundation
**Files (10):**
- `types.ts`
- `src/types/core.ts`
- `src/types/conversation-flow.ts`
- `src/core/database.types.ts`
- `src/core/live/types.ts`
- `src/core/tools/tool-types.ts`
- `src/core/tools/types.ts`
- `src/core/queue/job-types.ts`
- `server/message-types.ts`
- `server/message-payload-types.ts`

**Validation:**
```bash
pnpm type-check    # Must pass
pnpm lint          # Must pass
```

**Success Criteria:**
- ✅ All types compile
- ✅ No type errors
- ✅ No lint errors
- ✅ Can import types in other files

#### Agent 2: Config Foundation
**Files (5):**
- `config.ts`
- `src/config/constants.ts`
- `src/config/env.ts`
- `src/config/live-tools.ts`
- `src/lib/ai/retry-config.ts`

**Validation:**
```bash
pnpm type-check    # Must pass
pnpm lint          # Must pass
# Verify config can be imported
```

**Success Criteria:**
- ✅ All config files compile
- ✅ Environment variables are accessible
- ✅ Constants are properly typed

#### Agent 3: Core Utilities (No Dependencies)
**Files (15):**
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase-parsers.ts`
- `src/lib/hash-utils.ts`
- `src/lib/exit-detection.ts`
- `src/lib/json.ts`
- `src/lib/vercel-cache.ts`
- `src/lib/ai-client.ts`
- `src/lib/text-utils.ts`
- `src/lib/code-quality.ts`
- `utils/browser-compat.ts`
- `utils/audioUtils.ts`
- `utils/visuals/store.ts`
- `utils/pdfUtils.ts`

**Validation:**
```bash
pnpm type-check    # Must pass
pnpm lint          # Must pass
# Test utilities can be imported
```

**Success Criteria:**
- ✅ All utilities compile
- ✅ Can import and use utilities
- ✅ No circular dependencies

#### Agent 4: Schemas & Validation
**Files (3):**
- `src/schemas/supabase.ts`
- `src/schemas/agents.ts`
- `src/schemas/admin.ts`

**Validation:**
```bash
pnpm type-check    # Must pass
pnpm lint          # Must pass
```

**Success Criteria:**
- ✅ All schemas compile
- ✅ Schemas can validate data

### Phase 1 Validation Gate

**After all 4 agents complete:**

```bash
# 1. Type check entire codebase
pnpm type-check

# 2. Lint entire codebase
pnpm lint

# 3. Check for circular dependencies
pnpm check:circular

# 4. Check for unused exports
pnpm check:unused

# 5. Verify no secrets
pnpm check:secrets

# 6. Build (should work with foundation files)
pnpm build
```

**Gate Criteria:**
- ✅ All checks pass
- ✅ Build succeeds
- ✅ No type errors
- ✅ No lint errors
- ✅ No circular dependencies

**If gate fails:** Agents must fix issues before proceeding.

---

### Phase 2: Duplicate Comparison & Merging (Agents 5-6)

**Goal:** Compare and merge duplicate files before importing dependent code

#### Agent 5: Tools Duplicates
**Task:**
- Compare `api/_lib/core/tools/` vs `src/core/tools/`
- Identify unique functions
- Merge into unified `src/core/tools/`
- Document what was merged

**Files to compare:**
- All tool files in both locations
- Extract unique functions
- Merge into single version

**Validation:**
```bash
pnpm type-check
pnpm lint
# Verify merged tools can be imported
```

#### Agent 6: Context & Analytics Duplicates
**Task:**
- Compare `api/_lib/context/` vs `src/core/context/`
- Compare `api/_lib/core/analytics/` vs `src/core/analytics/`
- Compare `api/_lib/supabase/` vs `src/core/supabase/`
- Merge unique code

**Validation:**
```bash
pnpm type-check
pnpm lint
```

### Phase 2 Validation Gate

**After duplicates merged:**

```bash
pnpm check:all
pnpm build
# Verify merged files work
```

---

### Phase 3: Core Infrastructure (Agents 1-4)

**Goal:** Import core infrastructure that depends on foundation

#### Agent 1: Supabase & Database
**Files:**
- `src/core/supabase/client.ts` (merged)
- `src/core/supabase/queries.ts`
- Database utilities

**Validation:**
```bash
pnpm type-check
pnpm lint
# Test Supabase client can initialize (mock)
```

#### Agent 2: Context System
**Files:**
- `src/core/context/multimodal-context.ts` (merged)
- Context utilities

**Validation:**
```bash
pnpm type-check
pnpm lint
```

#### Agent 3: Tools System
**Files:**
- `src/core/tools/` (merged)
- Tool processors
- Tool utilities

**Validation:**
```bash
pnpm type-check
pnpm lint
# Test tools can be imported
```

#### Agent 4: Analytics & Queue
**Files:**
- `src/core/analytics/` (merged)
- `src/core/queue/`
- Queue processors

**Validation:**
```bash
pnpm type-check
pnpm lint
```

### Phase 3 Validation Gate

```bash
pnpm check:all
pnpm build
# Verify core systems can be imported
```

---

### Phase 4: Agents Migration (Agents 5-8)

**Goal:** Migrate and validate agent system

#### Agent 5: Agent Core
**Files:**
- `src/core/agents/orchestrator.ts`
- Agent base classes
- Agent utilities

#### Agent 6: Business Agents
**Files:**
- Discovery agent
- Scoring agent
- Proposal agent
- Closer agent

#### Agent 7: Sales Agents
**Files:**
- Workshop sales agent
- Consulting sales agent
- Retargeting agent

#### Agent 8: Admin & Intelligence Agents
**Files:**
- Admin agent
- Lead intelligence agent
- Summary agent

**Validation (each agent):**
```bash
pnpm type-check
pnpm lint
# Test agents can be imported
```

### Phase 4 Validation Gate

```bash
pnpm check:all
pnpm build
# Verify agents can be imported and initialized (mock)
```

---

### Phase 5: Services (Agents 1-4)

**Goal:** Import frontend services

#### Agent 1: Core Services
**Files:**
- `services/geminiLiveService.ts`
- `services/standardChatService.ts`

#### Agent 2: AI Services
**Files:**
- `services/aiBrainService.ts`
- `services/chromeAiService.ts`

#### Agent 3: Research Services
**Files:**
- `services/leadResearchService.ts`
- Research utilities

#### Agent 4: Context Services
**Files:**
- `services/unifiedContext.ts`
- Context utilities

**Validation (each agent):**
```bash
pnpm type-check
pnpm lint
# Test services can be imported
```

### Phase 5 Validation Gate

```bash
pnpm check:all
pnpm build
# Test services can be imported
# Verify no circular dependencies
```

---

### Phase 6: Components (Agents 1-6)

**Goal:** Import React components

**Split by component type:**
- Agent 1: Core UI components
- Agent 2: Chat components
- Agent 3: Admin components
- Agent 4: Landing page components
- Agent 5: Control panel components
- Agent 6: Utility components

**Validation (each agent):**
```bash
pnpm type-check
pnpm lint
# Test components can be imported
```

### Phase 6 Validation Gate

```bash
pnpm check:all
pnpm build
# Verify components compile
# Test app can start (may need mocks)
```

---

### Phase 7: Server Files (Agents 1-4)

**Goal:** Import WebSocket server

#### Agent 1: Server Core
**Files:**
- `server/live-server.ts`
- Server utilities
- Connection manager

#### Agent 2: WebSocket Handlers
**Files:**
- `server/websocket/`
- Message router
- WebSocket utilities

#### Agent 3: Request Handlers
**Files:**
- `server/handlers/`
- All handler files

#### Agent 4: Server Context
**Files:**
- `server/context/`
- Conversation history
- Orchestrator sync

**Validation (each agent):**
```bash
pnpm type-check
pnpm lint
# Test server files can be imported
```

### Phase 7 Validation Gate

```bash
pnpm check:all
pnpm build:server
# Test server can start (may need env vars)
pnpm dev:server  # Should start without errors
```

**Success Criteria:**
- ✅ Server compiles
- ✅ Server can start (even if not fully functional)
- ✅ No import errors

---

### Phase 8: Entry Points & Integration (Agent 1)

**Goal:** Import entry points and verify app works

#### Agent 1: Entry Points
**Files:**
- `index.tsx`
- `App.tsx`
- Root components

**Validation:**
```bash
pnpm type-check
pnpm lint
pnpm build
pnpm build:server
```

### Phase 8 Validation Gate

```bash
# 1. All checks
pnpm check:all

# 2. Build frontend
pnpm build

# 3. Build server
pnpm build:server

# 4. Test services can start
pnpm dev:all  # Should start all services

# 5. Verify no runtime errors (check logs)
# 6. Test basic functionality (if possible)
```

**Success Criteria:**
- ✅ All builds succeed
- ✅ Services can start
- ✅ No import errors
- ✅ No runtime crashes (basic startup)

---

## Agent Workflow Template

**Each agent should follow this workflow:**

### 1. Pre-Import Checklist
- [ ] Read `PROJECT_STATUS.md` (current state)
- [ ] Read `docs/IMPORT_ORDER.md` (file list)
- [ ] Check for duplicates (compare if needed)
- [ ] Verify dependencies are imported
- [ ] Check import paths strategy

### 2. Import Process
- [ ] Import files in dependency order
- [ ] Update import paths (absolute from root)
- [ ] Remove `@/` aliases
- [ ] Fix obvious type errors
- [ ] Add missing dependencies to `package.json` (if needed)

### 3. Validation
- [ ] Run `pnpm type-check` (must pass)
- [ ] Run `pnpm lint` (must pass)
- [ ] Run `pnpm check:circular` (no critical cycles)
- [ ] Fix all errors before proposing

### 4. Testing
- [ ] Test files can be imported
- [ ] Test basic functionality (if possible)
- [ ] Document what works
- [ ] Document what doesn't work (and why)

### 5. Documentation
- [ ] Update `PROJECT_STATUS.md` with:
  - Files imported
  - Issues found
  - What works
  - What needs fixing
- [ ] Document any decisions made

### 6. Propose Changes
- [ ] Create clear diff
- [ ] Include validation results
- [ ] Note any blockers
- [ ] Suggest next steps

---

## Validation Gates Between Phases

**After each phase, run:**

```bash
# Comprehensive validation
pnpm check:all          # All static checks
pnpm build              # Frontend build
pnpm build:server       # Server build (if applicable)
pnpm check:circular     # No circular deps
pnpm check:unused       # No dead code
```

**Gate must pass before next phase.**

---

## Service Validation

### After Phase 7 (Server Files)

```bash
# Test server can start
pnpm dev:server

# Should see:
# - Server starts without errors
# - WebSocket server initializes
# - No import errors
# - Health check works (if implemented)
```

### After Phase 8 (Entry Points)

```bash
# Test all services
pnpm dev:all

# Should see:
# - Frontend starts (port 3000)
# - WebSocket server starts (port 3001)
# - Agent API starts (port 3002)
# - No import errors
# - No runtime crashes
```

---

## Error Handling Strategy

### If Agent Finds Errors

1. **Type Errors:**
   - Fix if obvious (missing types, wrong imports)
   - Document if complex (needs investigation)
   - Don't proceed with broken types

2. **Lint Errors:**
   - Auto-fix if possible: `pnpm lint:fix`
   - Fix manually if needed
   - Document if requires decision

3. **Circular Dependencies:**
   - Identify the cycle
   - Document the issue
   - May need to refactor (document for later)

4. **Missing Dependencies:**
   - Add to `package.json`
   - Document why needed
   - Note version used

5. **Import Path Issues:**
   - Update to absolute paths
   - Remove `@/` aliases
   - Verify paths resolve

### If Validation Gate Fails

**All agents must:**
1. Stop importing new files
2. Fix issues in their batch
3. Re-run validation
4. Document fixes
5. Wait for gate to pass

---

## Success Metrics

**After each phase:**
- ✅ Type check passes
- ✅ Lint passes
- ✅ Build succeeds (if applicable)
- ✅ No circular dependencies
- ✅ Services can start (if applicable)

**After all phases:**
- ✅ All 180 files imported
- ✅ All services start
- ✅ Frontend loads
- ✅ WebSocket connects
- ✅ No runtime errors
- ✅ Codebase is clean and organized

---

## Parallel Agent Assignment Example

### Example: Phase 1 (Foundation)

**Prompt for Agent 1:**
```
Import types foundation files (10 files):
- types.ts
- src/types/core.ts
- src/types/conversation-flow.ts
- ... (see docs/IMPORT_ORDER.md)

Requirements:
1. Import in order listed
2. Update import paths to absolute from root
3. Remove @/ aliases
4. Run pnpm type-check (must pass)
5. Run pnpm lint (must pass)
6. Update PROJECT_STATUS.md
7. Document any issues

See docs/PARALLEL_AGENT_STRATEGY.md for full workflow.
```

**Similar prompts for Agents 2-4 with their file lists.**

---

## Key Differences from Simple Split

| Simple Split | This Strategy |
|-------------|---------------|
| Split by file type | Split by dependency level |
| No validation | Validation after each batch |
| No testing | Test services can start |
| Import everything | Incremental, working codebase |
| Hope it works | Ensure it works at each step |

---

## See Also

- [Import Order](./IMPORT_ORDER.md) - File import sequence
- [Import Strategy](./IMPORT_STRATEGY.md) - Overall strategy
- [Duplicate Comparison](./DUPLICATE_COMPARISON_CHECKLIST.md) - Duplicate process
- [Testing Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) - Testing approach
- [Project Status](../PROJECT_STATUS.md) - Current state

