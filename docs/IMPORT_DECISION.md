# Import Execution Strategy

**Decision:** Hybrid Approach - Validate First, Then Parallel Agents

## Strategy

### Phase 1A: Manual Validation (Me)
**Purpose:** Validate the import process works correctly

**Files (3-5 critical files):**
1. `types.ts` - Root types (no dependencies)
2. `config.ts` - Root config (no dependencies)
3. `src/config/constants.ts` - Core constants

**Why:**
- Establishes the pattern
- Validates import script works
- Ensures path updates work correctly
- Catches any issues early

**Time:** ~10-15 minutes

---

### Phase 1B: Parallel Agents (4 Agents)
**Purpose:** Import remaining foundation files in parallel

**Agent Distribution:**

**Agent 1: Types & Core Types** (10 files)
- `src/types/core.ts`
- `src/types/conversation-flow.ts`
- `src/core/database.types.ts`
- `src/core/live/types.ts`
- `src/core/tools/tool-types.ts`
- `src/core/tools/types.ts`
- `src/core/queue/job-types.ts`
- `server/message-types.ts`
- `server/message-payload-types.ts`

**Agent 2: Config & Environment** (5 files)
- `src/config/env.ts`
- `src/config/live-tools.ts`
- `src/lib/ai/retry-config.ts`
- (config.ts already done)

**Agent 3: Core Utilities** (15+ files)
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

**Agent 4: Schemas** (3 files)
- `src/schemas/supabase.ts`
- `src/schemas/agents.ts`
- `src/schemas/admin.ts`

---

## Execution Plan

### Step 1: Manual Validation (Now)
```bash
# I'll import first 3 files manually
node scripts/import-file.js types.ts --validate
node scripts/import-file.js config.ts --validate
node scripts/import-file.js src/config/constants.ts --validate
```

**Validation:**
- ✅ Files imported correctly
- ✅ Import paths updated
- ✅ Type check passes
- ✅ Lint passes
- ✅ Status updated

### Step 2: Generate Agent Prompts
```bash
node scripts/generate-agent-prompts.js phase-1
```

### Step 3: Deploy Agents
- Agent 1: Types
- Agent 2: Config
- Agent 3: Utilities
- Agent 4: Schemas

### Step 4: Monitor & Validate
```bash
node scripts/monitor-agents.js phase-1
pnpm check:all
```

---

## Why This Approach?

### Benefits:
1. **Safety First:** Validate process before scaling
2. **Speed:** Parallel agents for bulk import
3. **Quality:** Each agent focuses on related files
4. **Coordination:** Clear separation of concerns

### Risks Mitigated:
- ✅ Process validated before parallel execution
- ✅ Issues caught early
- ✅ Pattern established for agents to follow

---

## Timeline Estimate

- **Phase 1A (Manual):** 10-15 minutes
- **Phase 1B (Agents):** 30-45 minutes (parallel)
- **Total Phase 1:** ~1 hour

---

## Decision: Proceed with Hybrid Approach

**Action:** Start with manual validation, then deploy parallel agents.

