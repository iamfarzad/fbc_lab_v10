# Import Strategy & File Structure Plan

## Decision: Which System to Keep?

Based on the import map, we have duplicates. **Decision: Keep `src/` structure, migrate `api/_lib/` code**

Reasoning:
- `src/` is more standard for Next.js/React projects
- `api/_lib/` appears to be legacy/migration code
- `src/` has cleaner separation
- **IMPORTANT**: We need to compare duplicates BEFORE importing to ensure all functions are preserved

## Duplicate Comparison Process

**CRITICAL**: Before importing any file that has a duplicate:

1. **Identify duplicates** using `compare-duplicates.js`
2. **Compare both versions** side-by-side
3. **Extract unique functions/exports** from each
4. **Merge into unified version** in target location (`src/`)
5. **Update import paths** to point to merged version
6. **Verify no functionality is lost**

### Known Duplicates to Compare:

**Tools System:**
- `api/_lib/core/tools/*` vs `src/core/tools/*` (10 files)
  - calculate-roi.ts
  - draft-follow-up-email.ts
  - extract-action-items.ts
  - generate-proposal.ts
  - generate-summary-preview.ts
  - shared-tool-registry.ts
  - shared-tools.ts
  - tool-executor.ts
  - tool-types.ts
  - types.ts

**Context System:**
- `api/_lib/context/multimodal-context.ts` vs `src/core/context/multimodal-context.ts`
- `api/_lib/context/context-storage.ts` vs `src/core/context/context-storage.ts`

**Analytics:**
- `api/_lib/core/analytics/agent-analytics.ts` vs `src/core/analytics/agent-analytics.ts`
- `api/_lib/core/analytics/tool-analytics.ts` vs `src/core/analytics/tool-analytics.ts`

**Supabase:**
- `api/_lib/supabase/client.ts` vs `src/core/supabase/client.ts`

**Config:**
- `api/_lib/config/constants.ts` vs `src/config/constants.ts`
- `api/_lib/config/env.ts` vs `src/config/env.ts`

## Project Configuration

**Build Tool:** ✅ Vite + React (confirmed by `vite.config.ts`)

**Import Strategy:** ✅ **Absolute paths from root** (NO `@/` alias)

- Use: `components/X`, `services/Y`, `src/Z`
- Don't use: `@/components/X` or `../components/X`

See `PROJECT_CONFIG.md` for details.

## Clean File Structure

```
fbc_lab_v10/
├── components/                 # React components (root level)
│   └── chat/                 # Chat components
├── services/                  # Frontend services (root level)
├── utils/                     # Pure utility functions (root level)
│   └── visuals/              # Visual utilities
├── context/                   # React context (root level)
├── src/                       # Core source code
│   ├── core/                 # Core business logic
│   │   ├── context/         # Context management
│   │   ├── agents/          # AI agents
│   │   ├── tools/           # Tool implementations
│   │   ├── live/            # Live/WebSocket functionality
│   │   └── queue/           # Background jobs
│   ├── lib/                  # Shared utilities
│   ├── config/               # Configuration
│   ├── types/                 # TypeScript types
│   └── hooks/                 # React hooks
├── api/                       # API routes
├── server/                     # WebSocket server
├── types.ts                    # Root types file
└── config.ts                  # Root config file
```

## Import Order (Bottom-Up Approach)

### Phase 1: Foundation Files (No Dependencies)
These files have no imports - start here:

**Types:**
- `types.ts` (root)
- `src/types/core.ts`
- `src/types/conversation-flow.ts`
- `src/core/database.types.ts`
- `src/core/live/types.ts`
- `src/core/tools/tool-types.ts`
- `server/message-types.ts`
- `server/message-payload-types.ts`

**Config:**
- `config.ts` (root)
- `src/config/constants.ts`
- `src/config/env.ts`
- `src/config/live-tools.ts`
- `src/lib/ai/retry-config.ts`

**Pure Utils (no imports):**
- `utils/browser-compat.ts`
- `utils/audioUtils.ts`
- `utils/visuals/store.ts`
- `src/lib/errors.ts`
- `src/lib/logger.ts`
- `src/lib/hash-utils.ts`
- `src/lib/exit-detection.ts`
- `src/lib/supabase.ts`
- `src/lib/supabase-parsers.ts`
- `src/lib/supabase-logger.ts`
- `src/lib/audio/index.ts`
- `src/lib/audio/player.ts`
- `src/lib/text-utils.ts`

**Schemas:**
- `src/schemas/admin.ts`
- `src/schemas/agents.ts`
- `src/schemas/supabase.ts`

**Agent Index:**
- `api/_lib/agents/index.ts` (no imports)
- `api/_lib/agents/intent.ts` (no imports)

### Phase 2: Simple Dependencies (1-2 levels)
Files that only depend on Phase 1:

**Utils with simple deps:**
- `utils/pdfUtils.ts` → `types.ts`
- `utils/visuals/types.ts` → `types.ts`
- `utils/visuals/mathHelpers.ts` → `utils/visuals/types.ts`
- `utils/visuals/agentShapes.ts` → `utils/visuals/mathHelpers.ts`, `utils/visuals/types.ts`
- `utils/visuals/geometricShapes.ts` → `utils/visuals/mathHelpers.ts`, `utils/visuals/types.ts`
- `utils/visuals/cosmicShapes.ts` → `utils/visuals/mathHelpers.ts`, `utils/visuals/types.ts`
- `utils/visuals/complexShapes.ts` → `utils/visuals/geometricShapes.ts`, `utils/visuals/mathHelpers.ts`, `utils/visuals/store.ts`, `utils/visuals/types.ts`
- `utils/visuals/index.ts` → `types.ts`, all visuals files

**Lib with simple deps:**
- `src/lib/json.ts` → `src/lib/errors.ts`
- `src/lib/vercel-cache.ts` → `src/lib/logger.ts`
- `src/lib/code-quality.ts` → `src/lib/text-utils.ts`
- `src/lib/ai-client.ts` (check deps)

### Phase 3: Core Infrastructure
**Context System:**
- `src/core/context/context-types.ts` (no imports - types only)
- `src/core/context/context-storage.ts` → context-types, json-guards, retry-config, supabase-parsers, supabase
- `src/core/context/context-summarizer.ts` → constants, ai-client
- `src/core/context/multimodal-context.ts` → (complex - many deps)

**Supabase:**
- `src/core/supabase/client.ts` → database.types, supabase

**Queue:**
- `src/core/queue/job-types.ts` (types only)
- `src/core/queue/redis-queue.ts` → job-types, workers, retry-config, vercel-cache
- `src/core/queue/workers.ts` → context-storage, context-types, email-service, job-types, redis-queue

### Phase 4: Services Layer
**Frontend Services:**
- `services/unifiedContext.ts` → (check deps)
- `services/standardChatService.ts` → unifiedContext, constants, types
- `services/leadResearchService.ts` → constants, types
- `services/aiBrainService.ts` → unifiedContext, types
- `services/chromeAiService.ts` → (check deps)
- `services/geminiLiveService.ts` → config, unifiedContext, live/client, types, audioUtils

### Phase 5: Components
**Simple Components:**
- `components/Logo.tsx` (no imports)
- `components/ServiceIcon.tsx` (no imports)
- `components/ServiceIconParticles.tsx` (no imports)
- `components/TermsOverlay.tsx` (no imports)
- `components/Transcript.tsx` (no imports)
- `components/ui/Toast.tsx` (no imports)

**Components with deps:**
- `components/BrowserCompatibility.tsx` → browser-compat
- `components/AntigravityCanvas.tsx` → visuals/index
- `components/chat/UIHelpers.tsx` (check deps)
- `components/chat/CalendarWidget.tsx` (check deps)
- `components/chat/MarkdownRenderer.tsx` (check deps)
- `components/chat/Attachments.tsx` → UIHelpers
- `components/chat/WebcamPreview.tsx` → visuals/store
- `components/chat/ChatInputDock.tsx` → Attachments, UIHelpers, types
- `components/chat/ChatMessage.tsx` → Attachments, CalendarWidget, MarkdownRenderer, UIHelpers, types
- `components/ControlPanel.tsx` → types
- `components/LandingPage.tsx` → AntigravityCanvas, ServiceIcon, CalendarWidget, types
- `components/MultimodalChat.tsx` → Attachments, ChatInputDock, ChatMessage, UIHelpers, types
- `components/AdminDashboard.tsx` → Attachments, leadResearchService, types

### Phase 6: Context & Hooks
- `context/ToastContext.tsx` → Toast
- `src/hooks/useWebSocketManager.ts` → (check deps)
- `src/hooks/voice/connection/connection-state.ts` (check deps)
- `src/hooks/voice/connection/websocket-manager.ts` (check deps)

### Phase 7: Entry Points
- `index.tsx` → App, ToastContext, browser-compat
- `App.tsx` → all components, services, types, constants, pdfUtils

## Files to SKIP (Archived/Disabled)

**Skip entirely:**
- `api/_admin-disabled/**` (12 files)
- `api/_archive/**` (archived code)
- `server/src/config/**` (duplicate)
- `api/_lib/**` (keeping `src/` instead)

**Decision needed:**
- ✅ `api/_lib/agents/**` - **KEEP**: Migrate to `src/core/agents/` (agents are needed)
- ✅ `api/_lib/core/**` - **MIGRATE**: Compare with `src/core/` and merge
- ✅ WebSocket server - **KEEP**: Import `server/` directory

## Decisions Made

1. **Agent orchestration system:** ✅ **KEEP** - Migrate `api/_lib/agents/` → `src/core/agents/`
   - 11 specialized agents (discovery, scoring, proposal, closer, retargeting, summary, workshop-sales, consulting-sales, admin, lead-intelligence, orchestrator)
   - Compare each agent file for differences before migrating

2. **WebSocket server:** ✅ **KEEP** - Import `server/` directory
   - Needed for live/real-time functionality

3. **Context system:** 
   - **Target**: `src/core/context/multimodal-context.ts`
   - **Action**: Compare with `api/_lib/context/multimodal-context.ts` and merge unique code

4. **Tools system:**
   - **Target**: `src/core/tools/`
   - **Action**: Compare each tool file with `api/_lib/core/tools/` and merge unique functions

## Import Checklist

For each file:
- [ ] **Check if it has duplicates** - Use `compare-duplicates.js`
- [ ] **If duplicate exists**: Compare both versions, extract unique functions, merge
- [ ] Check if it's in skip list
- [ ] Verify all dependencies are already imported
- [ ] Update import paths to match new structure
- [ ] Test that imports resolve correctly
- [ ] Verify no functionality is lost in merge

## Agent Migration Plan

**Agents to migrate from `api/_lib/agents/` to `src/core/agents/`:**

1. `orchestrator.ts` - Main agent coordinator
2. `discovery-agent.ts` - Discovery phase agent
3. `scoring-agent.ts` - Lead scoring agent
4. `proposal-agent.ts` - Proposal generation agent
5. `closer-agent.ts` - Closing agent
6. `retargeting-agent.ts` - Retargeting agent
7. `summary-agent.ts` - Summary generation agent
8. `workshop-sales-agent.ts` - Workshop sales agent
9. `consulting-sales-agent.ts` - Consulting sales agent
10. `admin-agent.ts` - Admin operations agent
11. `lead-intelligence-agent.ts` - Lead intelligence agent
12. `agent-persistence.ts` - Agent state persistence
13. `intent.ts` - Intent detection
14. `index.ts` - Agent exports
15. `types.ts` - Agent types

**Dependencies to handle:**
- Agents depend on `tool-executor.ts` - ensure merged version is used
- Agents depend on `context-storage.ts` - ensure merged version is used
- Agents depend on `ai-client.ts` - ensure unified version

## Next Steps

1. **Set up file structure** (create directories)
2. **Compare duplicates** for each file that has one
3. **Start with Phase 1** (foundation files - no duplicates)
4. **Import one file at a time**
5. **For duplicates**: Merge before importing
6. **Verify each import works** before moving to next
7. **Update import paths** to match new structure
8. **Skip archived/disabled code**

## Duplicate Comparison Workflow

For each duplicate pair:

```bash
# 1. Compare files
node compare-duplicates.js

# 2. Manually review differences
# 3. Extract unique functions from api/_lib version
# 4. Merge into src/ version
# 5. Update imports in merged file
# 6. Import merged file
# 7. Update all files that import the duplicate
```

