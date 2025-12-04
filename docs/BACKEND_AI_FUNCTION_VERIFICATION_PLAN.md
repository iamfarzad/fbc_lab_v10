# Backend & AI Function Verification Plan

**Date:** 2025-12-04  
**Purpose:** Step-by-step plan to ensure all backend services and AI functions work as envisioned  
**Focus:** Backend services, AI agents, tool execution, WebSocket server, API routes

---

## Executive Summary

This plan provides a systematic approach to verify and fix all backend and AI functions, starting from the foundation (imports, configuration) and working up to complex orchestration (agents, tools, WebSocket).

**Key Principles:**
1. **Bottom-up approach:** Fix foundation first (imports, config), then build up
2. **Context-aware:** Different rules for frontend vs API routes vs server
3. **Preserve patterns:** Don't break existing working code
4. **Test incrementally:** Verify after each step

**Test Coverage Status:**
- ✅ **25 test files** exist (193 tests passing)
- ⚠️ **27% coverage** of verification plan phases
- ✅ **Good coverage:** Services, tool registry, orchestrator
- ❌ **Critical gaps:** API routes, server handlers, tool implementations
- 📊 **See:** `docs/TEST_COVERAGE_ANALYSIS.md` for detailed test mapping

---

## Phase 1: Foundation - Import Resolution & Configuration ✅

**Status:** Mostly complete, but needs verification

### Step 1.1: Verify API Route Imports
**Goal:** Ensure all API routes use relative imports (Vercel serverless requirement)

**Files to Check:**
- [ ] `api/chat.ts` - Verify all imports are relative
- [ ] `api/chat/persist-message.ts` - Verify imports
- [ ] `api/chat/persist-batch.ts` - Verify imports
- [ ] `api/admin/route.ts` - Verify imports
- [ ] `api/tools/webcam.ts` - Verify imports
- [ ] `api/send-pdf-summary/route.ts` - Verify imports
- [ ] All other API routes in `api/` directory

**Tests:**
- ❌ No existing tests for import resolution
- ⚠️ **Recommendation:** Add tests for import path validation

**Pattern:**
```typescript
// ✅ CORRECT (API routes - relative imports)
import { routeToAgent } from '../src/core/agents/orchestrator.js'

// ❌ WRONG (API routes - absolute imports)
import { routeToAgent } from 'src/core/agents/orchestrator'
```

**Action:**
- Run grep to find absolute imports in `api/` directory
- Convert any remaining absolute imports to relative
- Test: `pnpm type-check` should pass

### Step 1.2: Verify Server Imports
**Goal:** Ensure server code uses absolute imports (Fly.io deployment)

**Files to Check:**
- [ ] `server/live-server.ts`
- [ ] `server/live-api/tool-processor.ts`
- [ ] `server/utils/tool-implementations.ts`
- [ ] All files in `server/` directory

**Pattern:**
```typescript
// ✅ CORRECT (Server code - absolute imports)
import { executeUnifiedTool } from 'src/core/tools/unified-tool-registry'

// ❌ WRONG (Server code - relative imports)
import { executeUnifiedTool } from '../../src/core/tools/unified-tool-registry'
```

**Action:**
- Verify server code uses absolute imports (should already be correct)
- Test: `pnpm type-check` should pass

### Step 1.3: Verify Frontend Imports
**Goal:** Ensure frontend code uses absolute imports (Vite requirement)

**Files to Check:**
- [ ] `services/*.ts` - All service files
- [ ] `components/**/*.tsx` - All component files
- [ ] `App.tsx` - Main app file

**Pattern:**
```typescript
// ✅ CORRECT (Frontend - absolute imports)
import { standardChatService } from 'services/standardChatService'

// ❌ WRONG (Frontend - relative imports unless necessary)
import { standardChatService } from './services/standardChatService'
```

**Action:**
- Verify frontend code uses absolute imports
- Test: `pnpm build` should succeed

### Step 1.4: Verify Environment Variables
**Goal:** Ensure all required env vars are documented and loaded

**Check:**
- [ ] `server/utils/env-setup.ts` - All env vars loaded
- [ ] `.env.example` - All required vars documented
- [ ] `docs/ENVIRONMENT_FILES.md` - Documentation updated

**Required Env Vars:**
- `GEMINI_API_KEY` - Gemini API access
- `SUPABASE_URL` - Supabase connection
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase admin access
- `FLY_IO_API_TOKEN` - Fly.io deployment (optional)
- `VERCEL_API_TOKEN` - Vercel deployment (optional)

**Action:**
- Verify all env vars are loaded in `env-setup.ts`
- Test: Server should start without missing env var errors

---

## Phase 2: Core Infrastructure - Database & Context ✅

**Status:** Mostly complete, but needs verification

### Step 2.1: Verify Supabase Connection
**Goal:** Ensure Supabase client works in all contexts

**Check:**
- [ ] `src/core/supabase/client.ts` - Client initialization
- [ ] `server/utils/tool-implementations.ts` - Uses Supabase correctly
- [ ] `api/chat.ts` - Uses Supabase correctly
- [ ] All files that use Supabase

**Test:**
```typescript
// Test Supabase connection
const { supabaseService } = await import('src/core/supabase/client')
const { data, error } = await supabaseService.from('conversations').select('id').limit(1)
// Should not error
```

**Action:**
- Verify Supabase client is initialized correctly
- Test: Run a simple query to verify connection

### Step 2.2: Verify Context Management
**Goal:** Ensure multimodal context works for both chat and voice

**Check:**
- [ ] `src/core/context/multimodal-context.ts` - Context manager
- [ ] `server/live-api/tool-processor.ts` - Tracks tool calls
- [ ] `api/chat.ts` - Loads context correctly
- [ ] `server/handlers/context-update-handler.ts` - Updates context

**Test:**
```typescript
// Test context storage
const { multimodalContextManager } = await import('src/core/context/multimodal-context')
await multimodalContextManager.addMessage('test-session', { content: 'test', role: 'user' })
const context = await multimodalContextManager.getContext('test-session')
// Should contain the message
```

**Action:**
- Verify context manager works for both chat and voice
- Test: Store and retrieve context

### Step 2.3: Verify Capability Tracking
**Goal:** Ensure capabilities are tracked correctly

**Check:**
- [ ] `src/core/context/capabilities.ts` - Capability tracking
- [ ] `server/live-api/tool-processor.ts` - Records capabilities (line 133-145)
- [ ] `src/core/tools/tool-executor.ts` - Records capabilities (if applicable)

**Test:**
```typescript
// Test capability tracking
const { recordCapabilityUsed } = await import('src/core/context/capabilities')
await recordCapabilityUsed('test-session', 'search', { tool: 'search_web' })
// Should not error
```

**Action:**
- Verify capability tracking works
- Test: Record a capability and verify it's stored

---

## Phase 3: Tool System - Unified Registry & Execution ✅

**Status:** Implemented, but needs verification

### Step 3.1: Verify Unified Tool Registry
**Goal:** Ensure unified registry works correctly

**Check:**
- [ ] `src/core/tools/unified-tool-registry.ts` - All tools defined
- [ ] Schema validation works (Zod schemas)
- [ ] `validateToolArgs()` function works
- [ ] `executeUnifiedTool()` routes correctly

**Test:**
```typescript
// Test validation
const { validateToolArgs } = await import('src/core/tools/unified-tool-registry')
const result = validateToolArgs('search_web', { query: 'test' })
// Should return { valid: true }

// Test invalid args
const invalid = validateToolArgs('search_web', {})
// Should return { valid: false, error: '...' }
```

**Action:**
- Verify all 9 tools have schemas
- Test validation with valid and invalid args
- Test execution routing

### Step 3.2: Verify Tool Implementations
**Goal:** Ensure all tool implementations work

**Check:**
- [ ] `server/utils/tool-implementations.ts` - All 9 tools implemented
- [ ] Each tool returns `ToolResult` format
- [ ] Error handling is correct
- [ ] Session-based tools work (webcam/screen snapshots)

**Test:**
```typescript
// Test tool execution
const { executeSearchWeb } = await import('server/utils/tool-implementations')
const result = await executeSearchWeb({ query: 'test' })
// Should return { success: true, data: {...} } or { success: false, error: '...' }
```

**Action:**
- Test each tool implementation
- Verify error handling
- Test session-based tools (webcam/screen)

**Tests:**
- ❌ **No existing tests** for tool implementations (critical gap)
- ⚠️ **Recommendation:** Add unit tests for each `execute*` function
- ✅ Tested indirectly via E2E tests (`test/tool-integration-e2e.test.ts`)

### Step 3.3: Verify Voice Tool Processing
**Goal:** Ensure voice tools work via Live API

**Check:**
- [ ] `server/live-api/tool-processor.ts` - Uses unified registry
- [ ] Retry logic works (2 attempts)
- [ ] Timeout handling works (25s)
- [ ] Response format is correct
- [ ] Capability tracking only on final success

**Test:**
```typescript
// Test tool processor
const { processToolCall } = await import('server/live-api/tool-processor')
// Mock WebSocket and activeSessions
const result = await processToolCall(
  'test-connection',
  mockWs,
  { functionCalls: [{ name: 'search_web', args: { query: 'test' } }] },
  mockActiveSessions
)
// Should return true if successful
```

**Action:**
- Verify tool processor uses unified registry
- Test retry logic with transient errors
- Test timeout handling
- Verify response format

**Tests:**
- ✅ **Has tests:** `server/live-api/__tests__/tool-processor.test.ts` (10+ tests)
- ✅ Tests schema validation, retry logic, timeout, response format
- ✅ Good coverage

### Step 3.4: Verify Chat Tool Execution
**Goal:** Ensure chat tools work via agents

**Check:**
- [ ] `src/core/tools/tool-executor.ts` - Retry logic works
- [ ] `src/core/tools/unified-tool-registry.ts` - `getChatToolDefinitions()` works
- [ ] Agents use unified tools correctly
- [ ] ToolExecutor wraps unified tools correctly

**Test:**
```typescript
// Test chat tool definitions
const { getChatToolDefinitions } = await import('src/core/tools/unified-tool-registry')
const tools = getChatToolDefinitions('test-session', 'Test Agent')
// Should return object with tool definitions

// Test tool executor
const { toolExecutor } = await import('src/core/tools/tool-executor')
const result = await toolExecutor.execute({
  toolName: 'search_web',
  sessionId: 'test-session',
  agent: 'Test Agent',
  inputs: { query: 'test' },
  handler: async () => ({ success: true, data: {} })
})
// Should return ToolExecutionResult
```

**Action:**
- Verify chat tools are available to agents
- Test tool executor retry logic
- Verify caching works for read-only tools

---

## Phase 4: AI Agents - Orchestration & Routing ✅

**Status:** Implemented, but needs verification

### Step 4.1: Verify Agent Orchestrator
**Goal:** Ensure agent routing works correctly

**Check:**
- [ ] `src/core/agents/orchestrator.ts` - Routes to correct agents
- [ ] Stage determination works
- [ ] Objection detection works
- [ ] Fast-track logic works (qualified leads)

**Test:**
```typescript
// Test orchestrator
const { routeToAgent } = await import('src/core/agents/orchestrator')
const result = await routeToAgent({
  messages: [{ role: 'user', content: 'Hello' }],
  sessionId: 'test-session',
  currentStage: 'DISCOVERY',
  intelligenceContext: {},
  multimodalContext: {},
  trigger: 'chat'
})
// Should return AgentResult with output, agent, model
```

**Action:**
- Test routing for each stage
- Test objection override
- Test fast-track logic
- Verify agent selection

### Step 4.2: Verify Individual Agents
**Goal:** Ensure each agent works correctly

**Check:**
- [ ] `src/core/agents/discovery-agent.ts` - Discovery agent
- [ ] `src/core/agents/pitch-agent.ts` - Pitch agent
- [ ] `src/core/agents/objection-agent.ts` - Objection agent
- [ ] `src/core/agents/closer-agent.ts` - Closer agent
- [ ] `src/core/agents/summary-agent.ts` - Summary agent
- [ ] `src/core/agents/admin-agent.ts` - Admin agent (if exists)

**Test:**
```typescript
// Test each agent
const { discoveryAgent } = await import('src/core/agents/discovery-agent')
const result = await discoveryAgent(
  [{ role: 'user', content: 'Hello' }],
  { sessionId: 'test', intelligenceContext: {}, multimodalContext: {} }
)
// Should return AgentResult
```

**Action:**
- Test each agent individually
- Verify tools are available to agents
- Verify system prompts are correct
- Test agent-specific tools (e.g., `create_chart` in closer-agent)

### Step 4.3: Verify Tool Availability in Agents
**Goal:** Ensure agents can use unified tools

**Check:**
- [ ] `src/core/agents/closer-agent.ts` - Uses unified tools
- [ ] `src/core/agents/admin-agent.ts` - Uses unified tools
- [ ] Other agents that should use tools

**Test:**
```typescript
// Test agent with tools
const { closerAgent } = await import('src/core/agents/closer-agent')
const result = await closerAgent(
  [{ role: 'user', content: 'Calculate ROI for $100k investment' }],
  { sessionId: 'test', intelligenceContext: {}, multimodalContext: {} }
)
// Should call calculate_roi tool
```

**Action:**
- Verify agents can call tools
- Test tool execution in agent context
- Verify tool results are used correctly

---

## Phase 5: API Routes - Chat, Tools, Admin ✅

**Status:** Implemented, but needs verification

### Step 5.1: Verify Chat API Route
**Goal:** Ensure `/api/chat` works correctly

**Check:**
- [ ] `api/chat.ts` - Main chat endpoint
- [ ] Rate limiting works
- [ ] Message validation works
- [ ] Agent routing works
- [ ] Error handling works

**Test:**
```bash
# Test chat endpoint
curl -X POST https://your-domain.vercel.app/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "sessionId": "test-session"
  }'
# Should return { success: true, output: "...", agent: "..." }
```

**Action:**
- Test chat endpoint locally
- Verify rate limiting
- Test with different stages
- Test error handling

**Tests:**
- ❌ **No existing tests** for API routes (critical gap)
- ⚠️ **Recommendation:** Add unit tests using Vercel test utilities or mock request/response
- 🔴 **Priority:** HIGH - Main API endpoint untested

### Step 5.2: Verify Tool API Routes
**Goal:** Ensure tool endpoints work

**Check:**
- [ ] `api/tools/webcam.ts` - Webcam tool endpoint
- [ ] Other tool endpoints (if any)

**Test:**
```bash
# Test webcam endpoint
curl -X POST https://your-domain.vercel.app/api/tools/webcam \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session", "imageData": "..."}'
# Should return analysis
```

**Action:**
- Test tool endpoints
- Verify authentication/authorization
- Test error handling

### Step 5.3: Verify Admin API Routes
**Goal:** Ensure admin endpoints work

**Check:**
- [ ] `api/admin/route.ts` - Admin endpoint
- [ ] `api/admin/analytics/route.ts` - Analytics
- [ ] `api/admin/conversations/route.ts` - Conversations
- [ ] All other admin routes

**Test:**
```bash
# Test admin endpoint (requires auth)
curl -X GET https://your-domain.vercel.app/api/admin \
  -H "Authorization: Bearer YOUR_TOKEN"
# Should return admin data
```

**Action:**
- Test admin endpoints
- Verify authentication
- Test admin-only tools

---

## Phase 6: WebSocket Server - Live API ✅

**Status:** Implemented, but needs verification

### Step 6.1: Verify WebSocket Server
**Goal:** Ensure WebSocket server starts correctly

**Check:**
- [ ] `server/live-server.ts` - Server initialization
- [ ] `server/websocket/server.ts` - WebSocket server
- [ ] `server/websocket/connection-manager.ts` - Connection management
- [ ] Environment variables loaded

**Test:**
```bash
# Test server startup
cd server
pnpm start
# Should start without errors
# Should listen on configured port
```

**Action:**
- Verify server starts
- Check for missing dependencies
- Verify port configuration
- Test health check endpoint

### Step 6.2: Verify Live API Integration
**Goal:** Ensure Gemini Live API integration works

**Check:**
- [ ] `server/live-api/config-builder.ts` - Config builder
- [ ] `server/live-api/session-manager.ts` - Session manager
- [ ] `server/handlers/start-handler.ts` - Start handler
- [ ] `server/handlers/audio-handler.ts` - Audio handler

**Test:**
```typescript
// Test Live API config
const { buildLiveAPIConfig } = await import('server/live-api/config-builder')
const config = buildLiveAPIConfig('test-session', {})
// Should return valid Live API config
```

**Action:**
- Verify Live API config is correct
- Test session creation
- Test audio streaming
- Verify tool declarations are included

### Step 6.3: Verify WebSocket Handlers
**Goal:** Ensure all WebSocket handlers work

**Check:**
- [ ] `server/handlers/start-handler.ts` - Start handler
- [ ] `server/handlers/audio-handler.ts` - Audio handler
- [ ] `server/handlers/tool-result-handler.ts` - Tool result handler
- [ ] `server/handlers/context-update-handler.ts` - Context update handler
- [ ] `server/handlers/close-handler.ts` - Close handler

**Test:**
```typescript
// Test handler routing
const { messageRouter } = await import('server/websocket/message-router')
// Mock WebSocket message
// Should route to correct handler
```

**Action:**
- Test each handler
- Verify message routing
- Test error handling
- Verify state management

**Tests:**
- ❌ **No existing tests** for WebSocket handlers (critical gap)
- ⚠️ **Recommendation:** Add unit tests for each handler with mocked WebSocket connections
- 🔴 **Priority:** HIGH - All 6 handlers untested

### Step 6.4: Verify Tool Calling in Voice
**Goal:** Ensure tools work in voice mode

**Check:**
- [ ] `server/live-api/tool-processor.ts` - Tool processor
- [ ] Tools are declared in Live API config
- [ ] Tool responses are sent correctly
- [ ] Retry and timeout work

**Test:**
```typescript
// Test tool calling in voice
// Start voice session
// Trigger tool call via voice
// Verify tool executes
// Verify response is sent back
```

**Action:**
- Test tool calling in voice mode
- Verify retry logic
- Test timeout handling
- Verify response format

---

## Phase 7: Integration Testing - End-to-End ✅

**Status:** Needs implementation

### Step 7.1: Test Chat Flow
**Goal:** Verify complete chat flow works

**Test Flow:**
1. Send message to `/api/chat`
2. Verify agent routes correctly
3. Verify tools are available
4. Verify response is returned
5. Verify context is updated

**Action:**
- Create integration test
- Test with different stages
- Test with tool calls
- Verify error handling

### Step 7.2: Test Voice Flow
**Goal:** Verify complete voice flow works

**Test Flow:**
1. Connect to WebSocket
2. Start voice session
3. Send audio
4. Trigger tool call
5. Verify tool executes
6. Verify response is sent
7. Close session

**Action:**
- Create integration test
- Test with different tools
- Test retry logic
- Test timeout handling

### Step 7.3: Test Multimodal Flow
**Goal:** Verify multimodal features work

**Test Flow:**
1. Upload image/file
2. Send message with image
3. Verify context includes image
4. Verify agent can use image
5. Test webcam capture
6. Test screen share

**Action:**
- Create integration test
- Test image upload
- Test webcam capture
- Test screen share
- Verify context tracking

---

## Phase 8: Production Readiness - Deployment & Monitoring ✅

**Status:** Needs verification

### Step 8.1: Verify Vercel Deployment
**Goal:** Ensure frontend and API routes deploy correctly

**Check:**
- [ ] `vercel.json` - Configuration correct
- [ ] API routes deploy
- [ ] Frontend builds correctly
- [ ] Environment variables set

**Action:**
- Deploy to Vercel
- Test API routes
- Test frontend
- Verify environment variables

### Step 8.2: Verify Fly.io Deployment
**Goal:** Ensure WebSocket server deploys correctly

**Check:**
- [ ] `server/Dockerfile` - Dockerfile correct
- [ ] `server/fly.toml` - Fly.io config correct
- [ ] Server starts correctly
- [ ] Health check works

**Action:**
- Deploy to Fly.io
- Test WebSocket connection
- Test health check
- Verify environment variables

### Step 8.3: Verify Monitoring
**Goal:** Ensure logging and monitoring work

**Check:**
- [ ] `src/lib/logger.ts` - Logger works
- [ ] `server/utils/env-setup.ts` - Server logger works
- [ ] Error tracking works
- [ ] Performance monitoring works

**Action:**
- Test logging
- Verify error tracking
- Test performance monitoring
- Set up alerts

---

## Verification Checklist

### Foundation ✅
- [ ] All API routes use relative imports
- [ ] All server code uses absolute imports
- [ ] All frontend code uses absolute imports
- [ ] Environment variables loaded correctly

### Core Infrastructure ✅
- [ ] Supabase connection works
- [ ] Context management works
- [ ] Capability tracking works

### Tool System ✅
- [ ] Unified registry works
- [ ] Tool implementations work
- [ ] Voice tool processing works
- [ ] Chat tool execution works

### AI Agents ✅
- [ ] Agent orchestrator works
- [ ] Individual agents work
- [ ] Tools available to agents

### API Routes ✅
- [ ] Chat API works
- [ ] Tool APIs work
- [ ] Admin APIs work

### WebSocket Server ✅
- [ ] WebSocket server starts
- [ ] Live API integration works
- [ ] Handlers work
- [ ] Tool calling in voice works

### Integration ✅
- [ ] Chat flow works end-to-end
- [ ] Voice flow works end-to-end
- [ ] Multimodal flow works end-to-end

### Production ✅
- [ ] Vercel deployment works
- [ ] Fly.io deployment works
- [ ] Monitoring works

---

## Priority Order

**Start Here:**
1. **Phase 1** - Foundation (imports, config) - CRITICAL
2. **Phase 2** - Core Infrastructure (DB, context) - CRITICAL
3. **Phase 3** - Tool System - HIGH
4. **Phase 4** - AI Agents - HIGH
5. **Phase 5** - API Routes - MEDIUM
6. **Phase 6** - WebSocket Server - MEDIUM
7. **Phase 7** - Integration Testing - MEDIUM
8. **Phase 8** - Production Readiness - LOW

**Why this order:**
- Foundation must be solid before building on top
- Core infrastructure is used by everything
- Tool system is used by agents and API routes
- Agents are the core AI functionality
- API routes and WebSocket are deployment concerns
- Integration testing verifies everything works together
- Production readiness is final step

---

## Success Criteria

**All phases complete when:**
- ✅ All imports resolve correctly
- ✅ All tools execute successfully
- ✅ All agents route correctly
- ✅ Chat API works end-to-end
- ✅ Voice API works end-to-end
- ✅ WebSocket server runs correctly
- ✅ All tests pass
- ✅ Production deployments work
- ✅ Monitoring and logging work

---

## Next Steps

1. **Start with Phase 1** - Verify foundation
2. **Work through each phase** - Don't skip steps
3. **Test incrementally** - Verify after each step
4. **Document issues** - Track any problems found
5. **Fix as you go** - Don't accumulate technical debt

---

**Status:** Ready for implementation  
**Estimated Time:** 2-3 days for full verification  
**Priority:** HIGH - Critical for system stability

