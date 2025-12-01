# Phase 1 Import - Ready to Start

**Status:** ✅ Manual validation complete, agents ready

## ✅ Completed (Manual Validation)

1. **`types.ts`** - ✅ Imported, type-check passes
2. **`config.ts`** - ✅ Imported, type-check passes
3. **`src/config/constants.ts`** - ✅ Imported

**Validation:**
- ✅ Type check: PASSED
- ⚠️ Lint: Warnings (console statements, `any` types) - will fix in cleanup phase

---

## 🚀 Deploy Parallel Agents

### Step 1: Open Agent Chats

In Cursor, click **"New Agent"** 4 times to create 4 parallel agent chats.

### Step 2: Copy Agent Prompts

**Agent 1: Types Foundation**
```bash
cat scripts/agent-prompts/phase-1-agent-1.txt
```
Copy the entire prompt and paste into Agent 1 chat.

**Agent 2: Config Foundation**
```bash
cat scripts/agent-prompts/phase-1-agent-2.txt
```
Copy the entire prompt and paste into Agent 2 chat.

**Agent 3: Core Utilities**
```bash
cat scripts/agent-prompts/phase-1-agent-3.txt
```
Copy the entire prompt and paste into Agent 3 chat.

**Agent 4: Schemas**
```bash
cat scripts/agent-prompts/phase-1-agent-4.txt
```
Copy the entire prompt and paste into Agent 4 chat.

### Step 3: Monitor Progress

```bash
# Check agent progress
pnpm monitor:phase-1

# Or manually check
ls -la scripts/agent-prompts/phase-1-*.done 2>/dev/null || echo "Agents still working..."
```

### Step 4: Validate After Completion

Once all agents report completion:

```bash
# Run full validation
pnpm validate:phase-1

# This runs:
# - pnpm check:all (secrets, type-check, lint, circular, unused, naming)
# - pnpm build
```

---

## 📋 Agent Responsibilities

### Agent 1: Types Foundation (9 files)
- `src/types/core.ts`
- `src/types/conversation-flow.ts`
- `src/core/database.types.ts`
- `src/core/live/types.ts`
- `src/core/tools/tool-types.ts`
- `src/core/tools/types.ts`
- `src/core/queue/job-types.ts`
- `server/message-types.ts`
- `server/message-payload-types.ts`

**Validation:** `pnpm type-check` must pass

### Agent 2: Config Foundation (4 files)
- `src/config/env.ts`
- `src/config/live-tools.ts`
- `src/lib/ai/retry-config.ts`

**Note:** `config.ts` and `src/config/constants.ts` already imported manually.

**Validation:** `pnpm type-check` must pass

### Agent 3: Core Utilities (15 files)
- `src/lib/errors.ts`
- `src/lib/logger.ts` (already exists - verify/update)
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

**Validation:** `pnpm type-check` must pass

### Agent 4: Schemas (3 files)
- `src/schemas/supabase.ts`
- `src/schemas/agents.ts`
- `src/schemas/admin.ts`

**Validation:** `pnpm type-check` must pass

---

## ✅ Success Criteria

After all agents complete:

1. **Type Check:** ✅ `pnpm type-check` passes
2. **All Files Imported:** ✅ 31 files total (3 manual + 28 agent)
3. **Import Paths Updated:** ✅ No `@/` aliases, all absolute
4. **Status Updated:** ✅ `PROJECT_STATUS.md` reflects progress

---

## 🐛 Troubleshooting

### If an agent fails:

1. **Check the error:**
   ```bash
   pnpm type-check
   ```

2. **Fix the issue:**
   - Missing dependencies? Add to `package.json`
   - Import path wrong? Update to absolute path
   - Type error? Fix the type

3. **Re-run validation:**
   ```bash
   pnpm check:all
   ```

### If agents conflict:

- Each agent works on different files (no overlap)
- If conflicts occur, check `PROJECT_STATUS.md` for current state
- Resolve manually if needed

---

## 📊 Progress Tracking

**Phase 1 Total:** 31 files
- ✅ Manual: 3 files
- ⏳ Agent 1: 9 files
- ⏳ Agent 2: 4 files
- ⏳ Agent 3: 15 files
- ⏳ Agent 4: 3 files

**Status:** Ready to deploy agents

---

## 🎯 Next Steps After Phase 1

1. **Phase 2:** Compare and merge duplicates
2. **Phase 3:** Migrate agents
3. **Phase 4+:** Continue with remaining files

---

**Ready to start?** Deploy the 4 agents now!

