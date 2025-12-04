# Unified Tool Integration Master Plan

**Date:** 2025-12-04  
**Status:** Ready for Implementation  
**Based on:** v5 → v7 → v8 → v10 Evolution Analysis + Gemini Live API Documentation + Current Codebase Patterns

---

## Executive Summary

This plan unifies tool execution across **Chat** (Text API), **Voice** (Gemini Live API), and **Webcam** modalities while preserving all existing patterns and combining the best features from v7→v8→v10 evolution.

**Key Findings:**
- **v5:** Early AI SDK adoption, client-side service layer with Zod validation, API route pattern
- **v7:** Added ToolRuntime with strict validation and deadlines, but client-side execution (security issue)
- **v8:** Removed ToolRuntime, kept client-side execution (simpler but less secure)
- **v10:** Moved to server-side (secure), but lost validation, deadlines, and AI SDK pattern
- **Plan:** Combines v5's AI SDK pattern + v7's validation + v10's server-side execution + adds retry + unified registry

---

## Historical Analysis: v5 → v7 → v8 → v10 Evolution

### v5 Architecture (Early Implementation)

**Tool Service (`src/core/services/tool-service.ts`):**
- **Size:** ~148 lines
- **Pattern:** Client-side service layer with Zod schemas
- **Features:**
  - Zod schema validation for tool inputs
  - Client-side validation before API calls
  - Service functions wrap API calls (`handleROICalculation`, `handleVoiceTranscript`, etc.)
  - Error handling with try/catch
- **Tools Available:** ROI calculation, voice transcript, video-to-app, screen share, webcam capture

**AI SDK Tools (`lib/ai/tools.ts`):**
- **Pattern:** AI SDK `tool()` function definitions
- **Features:**
  - Simple tool definitions using Vercel AI SDK
  - Zod schemas for parameters
  - Direct execution functions
- **Tools:** `roiCalculator`, `webSearch` (placeholder)

**Tool Actions Hook (`hooks/use-tool-actions.ts`):**
- **Pattern:** React hook for calling tools
- **Features:**
  - `callTool()` function for API calls
  - Rate limiting headers
  - Idempotency key support
  - Toast notifications for errors
- **Usage:** Client-side tool execution via API routes

**API Routes (`app/api/tools/*`):**
- **Pattern:** Scattered API routes for each tool
- **Routes:** `/api/tools/search`, `/api/tools/roi`, `/api/tools/calc`, etc.
- **Features:**
  - Rate limiting per session
  - Idempotency support
  - Capability tracking
  - Google Grounding integration for search

**Live Server (`server/live-server.ts`):**
- **Size:** ~607 lines (simpler than v7)
- **Pattern:** Basic WebSocket server
- **Tool Handling:** Not clearly defined (likely forwarded to client)

**Key v5 Features:**
- ✅ Zod schema validation (client-side)
- ✅ AI SDK Tools integration (early adoption)
- ✅ Service layer pattern
- ✅ Rate limiting and idempotency
- ❌ Client-side execution (security concern)
- ❌ No unified tool registry
- ❌ No retry logic
- ❌ No timeout handling

**Major Milestone:** AI SDK Tools migration (Sept 2025) - introduced AI SDK `tool()` pattern

### v7 Architecture (Earlier Implementation)

**Tool Runtime (`server/tools/runtime.ts`):**
- **Pattern:** Strict schema validation with Zod
- **Features:**
  - Schema validation before execution
  - Deadline enforcement (`deadlineMs`)
  - Cancellation support (`AbortSignal`)
  - Parallel execution tracking
  - Tool result format: `{ id, name, success, data?, error?, durationMs }`
- **Tools Available:** `search_web`, `capture_screen_snapshot`, `capture_webcam_snapshot`, `get_dashboard_stats`
- **Execution:** Tools forwarded to client via WebSocket (except `get_dashboard_stats`)

**Live Server (`server/live-server.ts`):**
- **Size:** ~1726 lines (monolithic)
- **Pattern:** ToolRuntime validates, then forwards to client
- **Validation:** Strict Zod schemas before forwarding
- **Error Handling:** Validation errors sent back to Live API immediately

**Tool Executor (`src/core/tools/tool-executor.ts`):**
- **Status:** Identical to v8/v10 (per comparison)
- **Used by:** Chat agents only

**Key v7 Features:**
- ✅ Schema validation (Zod)
- ✅ Deadline enforcement
- ✅ Cancellation support
- ❌ Tools executed client-side (security concern)
- ❌ No retry logic (client-side retries)

### v8 Architecture (Previous Implementation)

**Tool Processor (`server/live-api/tool-processor.ts`):**
- **Size:** ~187 lines
- **Pattern:** Hybrid approach
  - Only `get_dashboard_stats` executed server-side (admin-only)
  - All other tools forwarded to client via WebSocket (`MESSAGE_TYPES.TOOL_CALL`)
  - Client handled tool execution and sent results back
- **No retry logic** - failures forwarded to client
- **No timeout handling** - relied on client-side timeouts
- **Error handling:** Simple try/catch, forwarded errors to client

**Tool Executor (`src/core/tools/tool-executor.ts`):**
- **Status:** Identical to v10 (per duplicate comparison)
- **Pattern:** Full retry logic, caching, logging
- **Used by:** Chat agents only (not Live API)

**Tool Implementations:**
- **v8:** No `server/utils/tool-implementations.ts`
- Tools handled via:
  - API routes (`app/api/tools/*`)
  - Client-side execution
  - Shared tool registry for chat agents

### v10 Architecture (Current Implementation)

**Tool Processor (`server/live-api/tool-processor.ts`):**
- **Size:** ~192 lines
- **Pattern:** Server-side execution (ALL tools)
  - All tools executed server-side via `server/utils/tool-implementations.ts`
  - No client forwarding (except for legacy compatibility)
  - More secure, more reliable
- **No retry logic** - fails immediately (regression from v8's client-side retries)
- **No timeout handling** - no explicit timeouts
- **Error handling:** Try/catch with ToolResult format

**Tool Implementations (`server/utils/tool-implementations.ts`):**
- **NEW in v10:** Centralized server-side tool implementations
- **Pattern:** Each tool returns `ToolResult { success, data?, error? }`
- **No retry/timeout** - direct execution

**Tool Executor (`src/core/tools/tool-executor.ts`):**
- **Status:** Identical to v8
- **Used by:** Chat agents only

### Key Architectural Changes v5 → v7 → v8 → v10

| Aspect | v5 | v7 | v8 | v10 | Plan |
|--------|----|----|----|-----|------|
| **Tool Execution Location** | Client-side | Client-side (except admin) | Client-side (except admin) | Server-side (ALL) | Server-side ✅ |
| **Security** | Client handles tools | Client handles tools | Client handles tools | Server handles tools | Server-side ✅ |
| **Schema Validation** | ✅ Zod (client-side) | ✅ Zod (strict, ToolRuntime) | ❌ None | ❌ None | ✅ Zod (restore) |
| **AI SDK Tools** | ✅ Early adoption | ❌ None | ❌ None | ❌ None | ✅ AI SDK pattern |
| **Deadline/Timeout** | ❌ None | ✅ deadlineMs | ❌ None | ❌ None | ✅ 25s timeout |
| **Retry Logic (Voice)** | Client-side (implicit) | Client-side (implicit) | Client-side (implicit) | None | ✅ Server-side (2 attempts) |
| **Retry Logic (Chat)** | ❌ None | toolExecutor | toolExecutor | toolExecutor | toolExecutor ✅ |
| **Error Handling** | Client-side | Client-side | Client-side | Server-side ✅ | Server-side ✅ |
| **Tool Implementations** | Scattered (API routes) | Scattered (API routes) | Scattered (API routes) | Centralized ✅ | Centralized ✅ |
| **Service Layer** | ✅ tool-service.ts | ❌ None | ❌ None | ❌ None | ✅ Unified Registry |
| **Tool Runtime** | ❌ None | ✅ ToolRuntime class | ❌ None | ❌ None | ✅ Unified Registry |

**Evolution Summary:**
- **v5:** Early AI SDK adoption, client-side service layer with Zod validation, API route pattern
- **v7:** Added ToolRuntime with strict validation and deadlines, but client-side execution (security issue)
- **v8:** Removed ToolRuntime, kept client-side execution (simpler but less secure)
- **v10:** Moved to server-side execution (secure), but lost validation, deadlines, and AI SDK pattern
- **Plan:** Combines v5's AI SDK pattern + v7's validation + v10's server-side execution + adds retry + unified registry

---

## Current State Analysis

### Voice Path (Gemini Live API)

**File:** `server/live-api/tool-processor.ts`

**Current Flow:**
```
Live API → processToolCall() → switch statement → tool-implementations.ts → ToolResult
```

**Patterns:**
- ✅ Server-side execution (secure)
- ✅ ToolResult format: `{ success, data?, error? }`
- ✅ Response format: `{ name, response: ToolResult }`
- ✅ Capability tracking (on success only)
- ✅ Multimodal context tracking (all calls)
- ❌ No retry logic
- ❌ No timeout handling
- ❌ No validation beyond try/catch

**Tools Available:**
- `search_web`
- `extract_action_items`
- `calculate_roi`
- `generate_summary_preview`
- `draft_follow_up_email`
- `generate_proposal_draft`
- `capture_screen_snapshot`
- `capture_webcam_snapshot`
- `get_dashboard_stats` (admin)

### Chat Path (Text API)

**File:** `api/chat.ts` → `routeToAgent()` → agents → `toolExecutor`

**Current Flow:**
```
Chat → routeToAgent() → agent → toolExecutor.execute() → handler → result
```

**Patterns:**
- ✅ Retry logic (3 attempts, exponential backoff)
- ✅ Caching (configurable)
- ✅ Audit logging
- ✅ Transient error detection
- ✅ Performance metrics
- ❌ No timeout wrapper (relies on Vercel 30s limit)
- ❌ Tools defined per-agent (not unified)

**Tools Available:**
- Agent-specific (e.g., `create_chart`, `create_calendar_widget` in closer-agent)
- Shared tools via `shared-tool-registry.ts` (but not fully integrated)

### Webcam Path

**File:** `api/tools/webcam.ts`

**Current Flow:**
```
Webcam capture → /api/tools/webcam → Gemini Vision API → analysis
```

**Patterns:**
- ✅ Standalone endpoint
- ✅ Can be triggered manually
- ✅ Can be retrieved via voice tool (`capture_webcam_snapshot`)
- ❌ Not integrated with unified tool system

---

## Gemini Live API Documentation Analysis

### Function Response Format

**Required Format:**
```typescript
{
  functionResponses: [{
    name: string,        // Must match function declaration name
    response: any        // Can be any object (no strict schema)
  }]
}
```

**Current Implementation:** ✅ Correct
- Uses `{ name, response: ToolResult }` format
- ToolResult is `{ success, data?, error? }`

### Manual Tool Response Handling

**Documentation:** Live API requires manual handling (unlike `generateContent` API)

**Current Implementation:** ✅ Correct
- `processToolCall()` executes tools server-side
- `sendToolResponse()` sends results back manually

### Known Issues (from Documentation)

1. **Inconsistent Behavior:** Some users report tools treated as executable code
2. **Empty Responses:** Some tools return empty responses
3. **Model Limitations:** Certain models don't perform function calls as expected

**Mitigation Strategy:**
- Add retry logic for transient failures
- Validate response format before sending
- Handle empty/malformed responses gracefully

### Timeout Considerations

**Vercel (Text API):**
- Hard limit: 30 seconds (`vercel.json: maxDuration: 30`)
- Functions terminate after 30s

**Fly.io (Live API):**
- Connection timeout: 30 seconds (seen in `start-handler.ts:204`)
- No hard limit for tool execution
- WebSocket-based (different timeout model)

**Recommendation:**
- Text API: 25s timeout wrapper (stay under 30s limit)
- Live API: 25s timeout wrapper (prevent hanging)
- Make timeout configurable per tool

---

## Master Implementation Plan

### Phase 1: Create Unified Tool Registry

**File:** `src/core/tools/unified-tool-registry.ts` (NEW)

**Purpose:** Single source of truth for tool execution across all modalities

**Key Features:**
- Routes to appropriate implementation based on context (voice vs chat)
- Preserves existing ToolResult format
- Supports both execution paths (voice via processToolCall, chat via toolExecutor)
- **Adds schema validation** (restore v7's Zod validation pattern)
- No breaking changes to existing implementations

**Structure:**
```typescript
import { z } from 'zod'

// Tool schemas (restore v7's strict validation pattern)
const ToolSchemas = {
  search_web: z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    urls: z.array(z.string().url()).optional()
  }),
  // ... other tools
} as const

export interface ToolExecutionContext {
  sessionId: string
  connectionId?: string  // For voice sessions
  agent?: string          // For chat agents
  activeSessions?: any    // For voice context access
}

export interface UnifiedToolResult {
  success: boolean
  data?: any
  error?: string
}

export function validateToolArgs(toolName: string, args: any): { valid: boolean; error?: string }

export async function executeUnifiedTool(
  toolName: string,
  args: any,
  context: ToolExecutionContext
): Promise<UnifiedToolResult>

export function getChatToolDefinitions(sessionId: string): Record<string, ToolDefinition>
```

**Implementation Strategy:**
- **Add schema validation** (restore v5/v7's Zod pattern):
  - Validate args before execution
  - Return validation errors immediately
  - Use strict Zod schemas (like v5's tool-service.ts and v7's ToolRuntime)
- **Consider AI SDK pattern** (restore v5's approach):
  - Use AI SDK `tool()` function for chat tool definitions
  - Keep server-side execution (v10's security)
  - Combine with unified registry
- Import from existing implementations:
  - `server/utils/tool-implementations.ts` (voice implementations)
  - `src/core/tools/shared-tool-registry.ts` (chat shared tools)
  - `src/core/intelligence/search.ts` (searchWeb core function)
- Route based on context:
  - Voice context → use `tool-implementations.ts` functions
  - Chat context → use `shared-tool-registry.ts` or `toolExecutor` (with AI SDK pattern)
- Preserve all existing patterns (ToolResult format, error handling)

### Phase 2: Add Retry Logic to Live API

**File:** `server/live-api/tool-processor.ts`

**Changes:**
- Wrap tool execution with retry logic (similar to toolExecutor)
- Use same transient error detection patterns
- Track capabilities only on final success (not per attempt)
- Preserve existing error handling pattern

**Implementation:**
```typescript
import { retry } from 'src/lib/code-quality'

// Wrap each tool execution
const result = await retry(
  () => executeUnifiedTool(call.name, call.args, context),
  2, // max attempts (fewer than chat since voice is real-time)
  1000, // delay
  2, // backoff multiplier
  (error) => isTransientError(error) // same logic as toolExecutor
)
```

**Key Points:**
- Use 2 attempts max (voice is real-time, faster than chat)
- Same transient error detection as toolExecutor
- Capability tracking only on final success
- Preserve ToolResult format

### Phase 3: Add Timeout Handling

**File:** `server/live-api/tool-processor.ts` + `src/core/tools/tool-executor.ts`

**Changes:**
- Add timeout wrapper to Live API tool execution (25s)
- Add timeout wrapper to chat tool execution (25s)
- Make timeout configurable per tool
- Exclude timeout for known slow tools (proposal generation)

**Implementation:**
```typescript
import { withTimeout } from 'src/lib/code-quality'

// Live API timeout
const result = await withTimeout(
  executeUnifiedTool(...),
  25000, // 25 seconds
  `Tool ${call.name} timed out`
)

// Chat timeout (wrap toolExecutor.execute)
const result = await withTimeout(
  toolExecutor.execute(...),
  25000,
  `Tool ${toolName} timed out`
)
```

**Key Points:**
- 25s timeout (stays under Vercel 30s limit, prevents hanging)
- Configurable per tool (some tools may need longer)
- Exclude timeout for slow tools (proposal generation ~30-45s)

### Phase 4: Update Voice Tool Processor

**File:** `server/live-api/tool-processor.ts`

**Changes:**
- Replace switch statement with unified registry call
- **Add schema validation** (restore v7's validation pattern)
- Add retry wrapper
- Add timeout wrapper
- Preserve all existing patterns (capability tracking, context tracking, response format)

**Before:**
```typescript
switch (call.name) {
  case 'search_web':
    result = await executeSearchWeb(call.args)
    break
  // ... more cases
}
```

**After:**
```typescript
// Validate args first (restore v7's validation pattern)
const validation = validateToolArgs(call.name, call.args)
if (!validation.valid) {
  result = {
    success: false,
    error: validation.error || 'Invalid tool arguments'
  }
} else {
  const result = await withTimeout(
    retry(
      () => executeUnifiedTool(call.name, call.args, {
        sessionId: client.sessionId || 'anonymous',
        connectionId,
        activeSessions
      }),
      2, 1000, 2, isTransientError
    ),
    25000,
    `Tool ${call.name} timed out`
  )
}
```

**Preserved:**
- Capability tracking (lines 114-139)
- Multimodal context tracking (lines 174-187)
- Response format (lines 149-152)
- Error handling pattern (lines 141-147)

### Phase 5: Update Chat Agents

**Files:**
- `src/core/agents/closer-agent.ts`
- `src/core/agents/admin-agent.ts`
- Other agents (as needed)

**Changes:**
- Import `getChatToolDefinitions` from unified registry
- Add unified tools to agent tool definitions
- Keep agent-specific tools (e.g., `create_chart`, `create_calendar_widget`)
- Wrap unified tools with `toolExecutor` for logging/caching

**Example (closer-agent.ts):**
```typescript
import { getChatToolDefinitions } from '../tools/unified-tool-registry'

const unifiedTools = getChatToolDefinitions(sessionId)

const tools = {
  ...unifiedTools, // Adds search_web, calculate_roi, etc.
  create_chart: {
    // ... existing chart tool
  },
  create_calendar_widget: {
    // ... existing calendar tool
  }
}
```

**Key Points:**
- Unified tools wrapped with toolExecutor (preserves caching/logging)
- Agent-specific tools remain unchanged
- No breaking changes to existing tool definitions

### Phase 6: Add Response Validation

**File:** `server/live-api/tool-processor.ts`

**Changes:**
- Validate response format before sending
- Handle empty/null responses
- Ensure name matches function declaration

**Implementation:**
```typescript
// Validate response before adding to functionResponses
if (!result || typeof result !== 'object') {
  result = {
    success: false,
    error: 'Invalid tool response format'
  }
}

if (!result.success && !result.error) {
  result.error = 'Tool execution failed without error message'
}

functionResponses.push({
  name: call.name,
  response: result
})
```

**Key Points:**
- Non-breaking validation (only adds safety checks)
- Preserves existing ToolResult format
- Handles edge cases (empty responses, malformed data)

### Phase 7: Create Integration Tests

**File:** `test/tool-integration.test.ts` (NEW)

**Test Cases:**
1. Voice executes `search_web` via unified registry
2. Chat executes `search_web` via unified registry
3. Both use same `searchWeb` core function
4. Retry logic works for transient errors
5. Timeout handling prevents hanging
6. Response format validation
7. Capability tracking (only on final success)
8. Tool consistency (same tools available in both paths)

**Mock Strategy:**
- Mock `executeUnifiedTool` for unit tests
- Mock `tool-implementations.ts` functions
- Mock `shared-tool-registry.ts` functions
- Test actual integration in integration tests

---

## Implementation Checklist

### Phase 1: Unified Registry
- [ ] Create `src/core/tools/unified-tool-registry.ts`
- [ ] **Add Zod schemas for all tools** (restore v7's validation pattern)
- [ ] Implement `validateToolArgs()` function
- [ ] Implement `executeUnifiedTool()` function
- [ ] Implement `getChatToolDefinitions()` function
- [ ] Add unified executors for each tool
- [ ] Test registry routes correctly to implementations
- [ ] Test schema validation catches invalid args

### Phase 2: Retry Logic
- [ ] Add retry wrapper to `processToolCall()`
- [ ] Use same transient error detection as toolExecutor
- [ ] Ensure capability tracking only on final success
- [ ] Test retry logic with transient errors

### Phase 3: Timeout Handling
- [ ] Add timeout wrapper to Live API tool execution
- [ ] Add timeout wrapper to chat tool execution (optional)
- [ ] Make timeout configurable per tool
- [ ] Test timeout scenarios

### Phase 4: Update Voice Processor
- [ ] Replace switch statement with unified registry
- [ ] **Add schema validation** (validate args before execution)
- [ ] Add retry wrapper
- [ ] Add timeout wrapper
- [ ] Preserve capability tracking
- [ ] Preserve context tracking
- [ ] Preserve response format

### Phase 5: Update Chat Agents
- [ ] Update `closer-agent.ts` to use unified tools
- [ ] Update `admin-agent.ts` to use unified tools
- [ ] Update other agents (as needed)
- [ ] Test agents can use unified tools

### Phase 6: Response Validation
- [ ] Add response format validation
- [ ] Handle empty/null responses
- [ ] Test validation with edge cases

### Phase 7: Integration Tests
- [ ] Create `test/tool-integration.test.ts`
- [ ] Test voice path
- [ ] Test chat path
- [ ] Test shared implementations
- [ ] Test retry logic
- [ ] Test timeout handling

### Phase 8: Validation & Documentation
- [ ] Run `pnpm type-check` (should pass)
- [ ] Run `pnpm lint` (should pass)
- [ ] Run `pnpm test` (all tests pass)
- [ ] Update `PROJECT_STATUS.md`
- [ ] Update architecture documentation

---

## Patterns to Preserve (CRITICAL)

### 1. ToolResult Format
```typescript
export interface ToolResult {
  success: boolean
  data?: any
  error?: string
}
```
**DO NOT CHANGE** - Used throughout codebase

### 2. Response Format (Live API)
```typescript
{
  name: string,
  response: ToolResult
}
```
**DO NOT CHANGE** - Required by Gemini Live API

### 3. Capability Tracking Pattern
```typescript
if (result.success && client.sessionId) {
  await recordCapabilityUsed(...) // Only on success
}
```
**DO NOT CHANGE** - Only track on final success (not per retry attempt)

### 4. Error Handling Pattern
```typescript
try {
  result = await executeTool(...)
} catch (error) {
  result = {
    success: false,
    error: error instanceof Error ? error.message : 'Tool execution failed'
  }
}
```
**DO NOT CHANGE** - Consistent across codebase

### 5. Multimodal Context Tracking
```typescript
await multimodalContextManager.addToolCallToLastTurn(sessionId, {
  name: call.name,
  args: call.args || {},
  id: call.id
})
```
**DO NOT CHANGE** - Tracks all calls (success or failure)

---

## Risk Mitigation

### Risk 1: Breaking Existing Functionality
**Mitigation:**
- Preserve all existing patterns
- Unified registry routes to existing implementations (doesn't replace them)
- Test thoroughly before deployment

### Risk 2: Retry Causing Duplicate Capability Tracking
**Mitigation:**
- Track capabilities only on final success (after all retries)
- Use same pattern as toolExecutor (already proven)

### Risk 3: Timeout Breaking Long-Running Tools
**Mitigation:**
- Make timeout configurable per tool
- Exclude timeout for known slow tools (proposal generation)
- Default timeout: 25s (safe for most tools)

### Risk 4: Response Format Validation Too Strict
**Mitigation:**
- Validation only checks for null/undefined
- Doesn't enforce strict schema (preserves flexibility)
- Falls back to error response if invalid

### Risk 5: Unified Registry Adding Complexity
**Mitigation:**
- Registry is thin wrapper (routes to existing implementations)
- No changes to underlying implementations
- Can be removed if needed (all existing code still works)

---

## Success Criteria

### Functional Requirements
- ✅ Voice can execute all tools via unified registry
- ✅ Chat can execute all tools via unified registry
- ✅ Both use same underlying implementations
- ✅ Retry logic works for transient errors
- ✅ Timeout handling prevents hanging
- ✅ Response validation catches edge cases

### Non-Functional Requirements
- ✅ No breaking changes to existing code
- ✅ All existing tests pass
- ✅ Type-check passes (0 errors)
- ✅ Lint passes (0 warnings)
- ✅ Performance: No degradation (retry/timeout add minimal overhead)

### Quality Requirements
- ✅ Code follows existing patterns
- ✅ Error handling consistent across modalities
- ✅ Logging comprehensive (for debugging)
- ✅ Documentation updated

---

## Timeline Estimate

- **Phase 1:** 2-3 hours (unified registry)
- **Phase 2:** 1-2 hours (retry logic)
- **Phase 3:** 1-2 hours (timeout handling)
- **Phase 4:** 1-2 hours (update voice processor)
- **Phase 5:** 2-3 hours (update chat agents)
- **Phase 6:** 1 hour (response validation)
- **Phase 7:** 3-4 hours (integration tests)
- **Phase 8:** 1 hour (validation & docs)

**Total:** ~12-18 hours

---

## Next Steps

1. **Review this plan** - Ensure alignment with requirements
2. **Approve implementation** - Confirm approach is correct
3. **Begin Phase 1** - Create unified registry
4. **Iterate** - Test after each phase
5. **Deploy** - After all phases complete and validated

---

## Appendix: Code Comparison

### v8 vs v10 Tool Processor

**v8 Pattern:**
```typescript
// Only handled get_dashboard_stats server-side
if (dashboardStatsCall && isAdmin(client?.sessionId)) {
  // Execute server-side
  await client.session.sendToolResponse({ functionResponses: [...] })
  return true // Handled
}

// Forward everything else to client
safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: toolCall }))
return false // Forwarded
```

**v10 Pattern:**
```typescript
// Handle ALL tools server-side
for (const call of functionCalls) {
  switch (call.name) {
    case 'search_web':
      result = await executeSearchWeb(call.args)
      break
    // ... all tools handled server-side
  }
  functionResponses.push({ name: call.name, response: result })
}
await client.session.sendToolResponse({ functionResponses })
return true // All handled server-side
```

**Evolution:** v10 improved security and reliability by moving all execution server-side.

### Tool Executor (v8 = v10)

**Status:** Identical (per duplicate comparison)

**Pattern:**
- Retry logic (3 attempts, exponential backoff)
- Caching (configurable)
- Audit logging
- Transient error detection
- Performance metrics

**Used by:** Chat agents only (not Live API)

---

## Conclusion

This plan builds on v10's architectural improvements (server-side execution) while adding proven patterns from toolExecutor (retry, timeout) and creating a unified registry for consistency across modalities.

**Key Principles:**
1. Preserve all existing patterns (no breaking changes)
2. Add new features (retry, timeout) using proven patterns
3. Unify execution paths while maintaining separation
4. Test thoroughly at each phase

**Ready for implementation:** ✅

---

## Quick Reference: v5 vs v7 vs v8 vs v10 vs Plan Comparison

| Feature | v5 | v7 | v8 | v10 (Current) | Plan (Proposed) |
|---------|----|----|----|----|----------------|
| **Tool Execution** | Client-side | Client-side (except admin) | Client-side (except admin) | Server-side (ALL) | Server-side (ALL) ✅ |
| **Schema Validation** | ✅ Zod (client-side) | ✅ Zod (strict) | ❌ None | ❌ None | ✅ Zod (restore) ✅ |
| **AI SDK Pattern** | ✅ Early adoption | ❌ None | ❌ None | ❌ None | ✅ Restore v5 ✅ |
| **Deadline/Timeout** | ❌ None | ✅ deadlineMs | ❌ None | ❌ None | ✅ 25s timeout ✅ |
| **Retry Logic (Voice)** | Client-side (implicit) | Client-side (implicit) | Client-side (implicit) | None ❌ | Server-side (2 attempts) ✅ |
| **Retry Logic (Chat)** | ❌ None | toolExecutor ✅ | toolExecutor ✅ | toolExecutor ✅ | toolExecutor ✅ |
| **Service Layer** | ✅ tool-service.ts | ❌ None | ❌ None | ❌ None | ✅ Unified Registry |
| **Unified Registry** | No | No | No | No | Yes ✅ |
| **Response Validation** | Client-side | Client-side | Client-side | Basic | Enhanced ✅ |
| **Security** | Lower (client execution) | Lower (client execution) | Lower (client execution) | Higher (server execution) | Higher ✅ |
| **Error Handling** | Client-side | Client-side | Client-side | Server-side ✅ | Server-side ✅ |
| **Tool Implementations** | Scattered (API routes) | Scattered (API routes) | Scattered (API routes) | Centralized ✅ | Centralized ✅ |

**Summary:** 
- **v5:** Early AI SDK adoption, client-side service layer with Zod validation, API route pattern
- **v7:** Added ToolRuntime with strict validation and deadlines, but client-side execution (security issue)
- **v8:** Removed validation, kept client-side execution
- **v10:** Moved to server-side (secure) but lost validation/deadlines/AI SDK pattern
- **Plan:** Combines v5's AI SDK pattern + v7's validation + v10's server-side execution + adds retry + unified registry

