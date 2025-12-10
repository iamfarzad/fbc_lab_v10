# Issues TODO with File Dependencies & Imports

**Date:** 2025-12-10  
**Purpose:** Complete mapping of all issues to files, paths, dependencies, and imports

---

## 🔴 CRITICAL ISSUES

### 1. Rate Limiting Fixes (4 related issues)

#### Issue 1.1: Add MEDIA_RATE_LIMIT (300 frames/minute)

**Files to Modify:**
- `server/rate-limiting/websocket-rate-limiter.ts`

**Current Imports:**
```typescript
import { MESSAGE_TYPES } from '../message-types.js'
import { ensureWsAdmin } from '../utils/admin-check.js'
import { serverLogger } from '../utils/env-setup'
```

**Dependencies:**
- `server/message-types.ts` - MESSAGE_TYPES enum
- `server/utils/admin-check.ts` - ensureWsAdmin()
- `server/utils/env-setup.ts` - serverLogger

**Changes Required:**
- Add `MEDIA_RATE_LIMIT` constant after `AUDIO_RATE_LIMIT` (line 19)
- Export constant for use in other files

**Code Location:**
- Lines 15-19: Rate limit constants
- Add after line 19

---

#### Issue 1.2: Update ConnectionState Type

**Files to Modify:**
- `server/rate-limiting/websocket-rate-limiter.ts`

**Current Type Definition:**
```typescript
export type ConnectionState = {
  isReady: boolean
  lastPing: number
  messageCount: number
  lastMessageAt: number
  audioCount: number
  audioLastAt: number
}
```

**Dependencies:**
- None (standalone type)

**Files That Use ConnectionState:**
- `server/websocket/connection-manager.ts` - Initializes ConnectionState
- `server/handlers/realtime-input-handler.ts` - Reads ConnectionState
- `server/handlers/audio-handler.ts` - May read ConnectionState
- `server/handlers/context-update-handler.ts` - May read ConnectionState

**Changes Required:**
- Add `mediaCount: number` to ConnectionState (line 12)
- Add `mediaLastAt: number` to ConnectionState (line 13)
- Update default initialization in `checkRateLimit()` (lines 67-74)

---

#### Issue 1.3: Modify checkRateLimit() for Media Detection

**Files to Modify:**
- `server/rate-limiting/websocket-rate-limiter.ts`

**Current Function Signature:**
```typescript
export function checkRateLimit(
  connectionId: string,
  sessionId?: string,
  messageType?: string
): { allowed: boolean; remaining?: number }
```

**Dependencies:**
- `MESSAGE_TYPES` from `../message-types.js`
- `connectionStates` Map (line 22)
- `MEDIA_RATE_LIMIT` (to be added)

**Files That Call checkRateLimit():**
- `server/handlers/realtime-input-handler.ts` (line 41)
- `server/handlers/audio-handler.ts` (if present)
- `server/handlers/context-update-handler.ts` (if present)

**Changes Required:**
- Update function signature to accept `mimeType?: string` parameter
- Add media detection logic after audio check (after line 93)
- Check for `image/` or `video/` MIME types
- Apply `MEDIA_RATE_LIMIT` instead of `CLIENT_RATE_LIMIT` for media

**Code Location:**
- Lines 46-112: `checkRateLimit()` function
- Add media check after line 93 (after audio check)

---

#### Issue 1.4: Update realtime-input-handler.ts to Pass mimeType

**Files to Modify:**
- `server/handlers/realtime-input-handler.ts`

**Current Imports:**
```typescript
import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend } from '../utils/websocket-helpers'
import { checkRateLimit, connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { MESSAGE_TYPES } from '../message-types'
import type { RealtimeInputPayload } from '../message-payload-types'
```

**Dependencies:**
- `server/rate-limiting/websocket-rate-limiter.ts` - checkRateLimit()
- `server/message-types.ts` - MESSAGE_TYPES
- `server/message-payload-types.ts` - RealtimeInputPayload
- `server/utils/websocket-helpers.ts` - safeSend()
- `server/utils/env-setup.ts` - serverLogger

**Current Code (lines 34-45):**
```typescript
const chunks = Array.isArray(payload?.chunks) ? payload.chunks : []
const chunk = chunks[0]
const mimeType = chunk?.mimeType || ''
const isAudioChunk = mimeType.startsWith('audio/') || mimeType.includes('pcm') || mimeType.includes('rate=')

const rateLimit = checkRateLimit(
  connectionId, 
  client.sessionId, 
  isAudioChunk ? MESSAGE_TYPES.USER_AUDIO : MESSAGE_TYPES.REALTIME_INPUT
)
```

**Changes Required:**
- Pass `mimeType` as 4th parameter to `checkRateLimit()`
- Update call at line 41-44

---

### 2. Screen Share Hallucination Fix

**Files to Modify:**
- `server/context/injection.ts`
- `server/live-api/config-builder.ts` (may need updates)

**Current Imports (injection.ts):**
```typescript
import { serverLogger } from '../utils/env-setup'
import { VOICE_CONFIG } from 'src/config/constants'
```

**Dependencies:**
- `server/utils/env-setup.ts` - serverLogger
- `src/config/constants.ts` - VOICE_CONFIG
- Live API session object (from client)

**Files That Use injection.ts:**
- `server/handlers/context-update-handler.ts` - Calls `scheduleDebouncedInjection()`

**Current Problem (lines 68-101):**
- Analysis text is generated but never sent to Live API
- Only image data is sent via `sendRealtimeInput()`
- Text cannot be sent via `sendRealtimeInput()` (causes 1007 error)

**Solution Options:**
1. **Inject analysis into systemInstruction** during session setup/update
2. **Use a different Live API method** (if available) for text context
3. **Periodically rebuild systemInstruction** with latest analyses

**Files to Check:**
- `server/live-api/config-builder.ts` - Builds systemInstruction
- `services/geminiLiveService.ts` - Manages Live API session
- `server/handlers/context-update-handler.ts` - Receives context updates

**Changes Required:**
- Modify `buildLiveConfig()` to include screen/webcam analysis in systemInstruction
- OR: Find alternative method to inject text context into Live API
- Update `scheduleDebouncedInjection()` to trigger systemInstruction rebuild

---

### 3. URL Analysis in All Modes

#### Issue 3.1: Add URL Analysis to standardChatService

**Files to Modify:**
- `services/standardChatService.ts`

**Current Imports:**
```typescript
import { GoogleGenAI, Type } from '@google/genai';
import type { Content, Part, Tool } from '@google/genai';
import { TranscriptItem, ResearchResult } from 'types';
import { GEMINI_MODELS } from 'src/config/constants';
import { unifiedContext } from './unifiedContext';
```

**Dependencies:**
- `@google/genai` - GoogleGenAI, Type, Content, Part, Tool
- `types` - TranscriptItem, ResearchResult
- `src/config/constants.ts` - GEMINI_MODELS
- `./unifiedContext.ts` - unifiedContext

**URL Analysis Function:**
- `src/core/intelligence/url-context-tool.ts` - `analyzeUrl()` function

**Current URL Analysis Location:**
- `src/core/agents/discovery-agent.ts` (lines 66-105)
- Only runs when `intelligenceContext` exists

**Changes Required:**
- Import `analyzeUrl` from `src/core/intelligence/url-context-tool.ts`
- Add URL detection in `sendMessage()` method (around line 103)
- Extract URLs from message text using regex
- Call `analyzeUrl()` for each URL
- Add URL context to systemInstruction or context block

**Code Location:**
- `sendMessage()` method starts at line 103
- Add URL detection after message processing (around line 260)

---

#### Issue 3.2: Add URL Analysis to geminiLiveService

**Files to Modify:**
- `services/geminiLiveService.ts`

**Current Imports:**
```typescript
import { LiveClientWS } from 'src/core/live/client';
import { createPcmBlob, base64ToBytes, decodeAudioData } from '../utils/audioUtils';
import { LiveServiceConfig, TranscriptItem, ResearchResult } from 'types';
import { AppConfig } from '../config';
import { unifiedContext } from './unifiedContext';
import { logger } from 'src/lib/logger'
```

**Dependencies:**
- `src/core/live/client.ts` - LiveClientWS
- `../utils/audioUtils.ts` - Audio utilities
- `types` - LiveServiceConfig, TranscriptItem, ResearchResult
- `../config.ts` - AppConfig
- `./unifiedContext.ts` - unifiedContext
- `src/lib/logger.ts` - logger

**URL Analysis Function:**
- `src/core/intelligence/url-context-tool.ts` - `analyzeUrl()` function

**Changes Required:**
- Import `analyzeUrl` from `src/core/intelligence/url-context-tool.ts`
- Detect URLs in transcript or context updates
- Call `analyzeUrl()` when URLs detected
- Inject URL context into Live API systemInstruction via `sendContext()` or config rebuild

**Code Location:**
- `sendContext()` method (if exists)
- `setResearchContext()` method (line 92)
- Context update handlers

---

### 4. Text Input During Voice/Webcam Mode

**Files to Modify:**
- `App.tsx`
- `components/chat/ChatInputDock.tsx` (may need to check if input is disabled)

**Current Imports (App.tsx):**
```typescript
// Many imports - check file for full list
```

**Current Code (App.tsx lines 404-424):**
```typescript
const shouldUseVoice = connectionState === LiveConnectionState.CONNECTED && liveServiceRef.current;

if (shouldUseVoice) {
    // Text sending is disabled - only media is sent
    if (file) {
         liveServiceRef.current?.sendRealtimeMedia(file);
    }
    // Text sending removed - causes 1007 error
}
```

**Dependencies:**
- `liveServiceRef` - GeminiLiveService instance
- `connectionState` - LiveConnectionState enum
- `standardChatService` or `aiBrainService` - For text routing

**Files to Check:**
- `components/chat/ChatInputDock.tsx` - Check if input is disabled during voice
- `services/standardChatService.ts` - For text processing
- `services/aiBrainService.ts` - For agent routing

**Changes Required:**
- Allow text input field to remain enabled during voice mode
- Route text to `standardChatService` or `aiBrainService` when voice is active
- Do NOT send text via `liveServiceRef.current.sendText()` (causes 1007)
- Update systemInstruction in Live API with text message context (if possible)

**Code Location:**
- `App.tsx` lines 404-424: Text sending logic
- `ChatInputDock.tsx`: Input field enable/disable logic

---

## 🟡 HIGH PRIORITY ISSUES

### 5. Vision Accuracy Improvements

**Files to Modify:**
- `src/hooks/media/useScreenShare.ts`
- `src/hooks/media/useCamera.ts`
- `api/tools/webcam.ts` (if exists)

**Current Imports (useScreenShare.ts):**
```typescript
// Check file for imports
```

**Dependencies:**
- Screen capture APIs
- Image analysis APIs
- Frame quality validation libraries (to be added)

**Changes Required:**
- Add frame quality validation (brightness, contrast, blur detection)
- Implement frame buffering
- Increase capture frequency during active interaction
- Add confidence scoring to analysis responses

**Files to Check:**
- `api/tools/webcam.ts` - Webcam analysis endpoint
- `server/handlers/realtime-input-handler.ts` - Frame processing

---

### 6. Tool Calling Integration

**Files to Modify:**
- `server/live-api/config-builder.ts`
- `services/geminiLiveService.ts`
- `src/core/tools/unified-tool-registry.ts`

**Current Imports (config-builder.ts):**
```typescript
import { serverLogger } from '../utils/env-setup'
import { isAdmin } from '../utils/admin-check.js'
import type { FunnelStage } from 'src/core/types/funnel-stage.js'
```

**Dependencies:**
- `server/utils/env-setup.ts` - serverLogger
- `server/utils/admin-check.ts` - isAdmin()
- `src/core/types/funnel-stage.ts` - FunnelStage
- `src/core/tools/unified-tool-registry.ts` - Tool definitions

**Files That Use Tools:**
- `server/utils/tool-implementations.ts` - Tool implementations
- `server/handlers/tool-result-handler.ts` - Tool result handling

**Changes Required:**
- Verify tools are registered in `unified-tool-registry.ts`
- Enable tools in Live API config (in `buildLiveConfig()`)
- Add tool declarations to `systemInstruction` or config
- Test weather, location, stock price tools

**Code Location:**
- `server/live-api/config-builder.ts` lines 87-381: `buildLiveConfig()` function
- `src/core/tools/unified-tool-registry.ts`: Tool definitions

---

### 7. Intelligence Context Validation

**Files to Modify:**
- `api/chat.ts`

**Current Imports:**
```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ChatMessage, IntelligenceContext, MultimodalContextData, AgentMetadata, AgentResult } from '../src/core/agents/types.js';
import type { FunnelStage } from '../src/core/types/funnel-stage.js';
import type { ConversationFlowState } from '../src/types/conversation-flow-types.js';
import { routeToAgent } from '../src/core/agents/orchestrator.js';
import { logger } from '../src/lib/logger.js';
import { multimodalContextManager } from '../src/core/context/multimodal-context.js';
import { rateLimit } from '../src/lib/rate-limiter.js';
import { supabaseService } from '../src/core/supabase/client.js';
```

**Dependencies:**
- `@vercel/node` - VercelRequest, VercelResponse
- `../src/core/agents/types.ts` - IntelligenceContext, etc.
- `../src/core/agents/orchestrator.ts` - routeToAgent()
- `../src/core/supabase/client.ts` - supabaseService

**Changes Required:**
- Validate that provided `intelligenceContext` matches current session
- Check session ID matches
- Prevent stale/wrong data usage
- Add validation before passing to `routeToAgent()`

**Code Location:**
- `api/chat.ts` lines 115-185: Request processing
- Add validation after line 116 (after extracting body)

---

### 8. Remove Hardcoded Fallback in lead-research.ts

**Files to Modify:**
- `src/core/intelligence/lead-research.ts`

**Current Imports:**
```typescript
// Check file for imports
```

**Current Code (lines 189-219):**
```typescript
// Known profile fallback for Farzad Bayat
if (email === 'farzad@talktoeve.com' && (name?.toLowerCase().includes('farzad') || !name)) {
  // Returns hardcoded data
}
```

**Dependencies:**
- Google Grounded Search API
- Research result types

**Changes Required:**
- Remove hardcoded fallback (lines 189-219)
- OR: Make it configurable via environment variable
- OR: Move to a proper lookup table/database

**Code Location:**
- `src/core/intelligence/lead-research.ts` lines 189-219

---

### 9. Performance Optimizations

#### Issue 9.1: Parallelize Context Loading

**Files to Modify:**
- `api/chat.ts`

**Current Code (lines 205-225):**
```typescript
// Load multimodal context if not provided and sessionId exists
let finalMultimodalContext = multimodalContext
if (!finalMultimodalContext && sessionId) {
    try {
        const contextData = await multimodalContextManager.prepareChatContext(
            sessionId,
            true, // include visual
            true  // include audio
        )
        finalMultimodalContext = contextData.multimodalContext
    } catch (err) {
        // ...
    }
}
```

**Dependencies:**
- `multimodalContextManager` from `../src/core/context/multimodal-context.js`
- Intelligence context loading (if separate)

**Changes Required:**
- Load multimodal context and intelligence context in parallel using `Promise.all()`
- Don't await sequentially

**Code Location:**
- `api/chat.ts` lines 205-225: Context loading

---

#### Issue 9.2: Non-Blocking Stage Persistence

**Files to Modify:**
- `api/chat.ts`

**Current Code (lines 187-203):**
```typescript
// Persist stage so reloads don't reset (safe fallback if table/column missing)
if (sessionId && supabaseService && typeof (supabaseService as { from?: (table: string) => unknown })?.from === 'function') {
  try {
    const { error } = await supabaseService
      .from('conversations')
      .update({ stage: currentStage })
      .eq('session_id', sessionId)
    
    if (error) throw error
  } catch (err) {
    // Non-blocking — survives if column/table missing (pre-deploy safety)
    logger.debug('Stage persistence failed (safe):', { 
      error: err instanceof Error ? err.message : String(err), 
      sessionId 
    })
  }
}
```

**Dependencies:**
- `supabaseService` from `../src/core/supabase/client.js`
- `logger` from `../src/lib/logger.js`

**Changes Required:**
- Remove `await` - make it fire-and-forget
- Don't block response waiting for database update

**Code Location:**
- `api/chat.ts` lines 187-203: Stage persistence

---

#### Issue 9.3: Start SSE Streaming Immediately

**Files to Modify:**
- `api/chat.ts`

**Current Code (lines 234-241):**
```typescript
if (shouldStream) {
    logger.info('[API /chat] Starting SSE streaming', { sessionId, messageCount: validMessages.length });
    
    // Return SSE stream
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', '*');
```

**Dependencies:**
- VercelResponse object
- No external dependencies

**Changes Required:**
- Move SSE header setup before context loading
- Send initial status message immediately
- Load context in background

**Code Location:**
- `api/chat.ts` lines 234-241: SSE setup
- Move before line 205 (context loading)

---

#### Issue 9.4: Cache Intelligence Context

**Files to Modify:**
- `api/chat.ts`
- May need Redis/session cache setup

**Dependencies:**
- Redis client (if using Redis)
- OR: In-memory cache (if using session cache)

**Changes Required:**
- Don't reload intelligence context from database every request
- Use Redis/session cache
- Invalidate cache on updates

**Code Location:**
- `api/chat.ts` - Where intelligence context is loaded

---

#### Issue 9.5: Optimize Lead Research

**Files to Modify:**
- `src/core/intelligence/lead-research.ts`
- `App.tsx` (where research is called)

**Dependencies:**
- Google Grounded Search API
- Research result caching

**Changes Required:**
- Make research truly async (don't block response)
- Cache research results
- Return response immediately
- Update context in background

**Code Location:**
- `App.tsx` - Where `performResearch()` is called
- `src/core/intelligence/lead-research.ts` - Research function

---

## 🟢 MEDIUM PRIORITY ISSUES

### 10. Periodic Context Refresh

**Files to Modify:**
- `server/context/injection.ts`
- `server/live-api/config-builder.ts`

**Dependencies:**
- Live API session management
- Context update handlers

**Changes Required:**
- Implement periodic systemInstruction updates
- Include latest screen/webcam analyses
- Update every N seconds or on significant context changes

---

### 11. Hybrid Mode Support

**Files to Modify:**
- `App.tsx`
- `services/geminiLiveService.ts`
- `services/standardChatService.ts`

**Dependencies:**
- All service instances
- Context synchronization

**Changes Required:**
- Allow simultaneous voice + text + webcam
- Route inputs to appropriate services
- Sync context across all modalities

---

### 12. Context Validation in discovery-agent.ts

**Files to Modify:**
- `src/core/agents/discovery-agent.ts`

**Current Imports:**
```typescript
import { streamText, google } from '../../lib/ai-client.js'
import { formatMessagesForAI } from '../../lib/format-messages.js'
import { buildModelSettings } from '../../lib/multimodal-helpers.js'
import { detectExitIntent } from '../../lib/exit-detection.js'
import type { AgentContext, ChatMessage, ChainOfThoughtStep, AgentResult, FunnelStage } from './types.js'
import type { ConversationFlowState, ConversationCategory } from '../../types/conversation-flow-types.js'
import { GEMINI_MODELS, CALENDAR_CONFIG } from '../../config/constants.js'
import { PHRASE_BANK } from '../chat/conversation-phrases.js'
import { extractCompanySize, extractBudgetSignals, extractTimelineUrgency } from './utils/index.js'
import { analyzeUrl } from '../intelligence/url-context-tool.js'
import { extractGeminiMetadata } from '../../lib/extract-gemini-metadata.js'
import { logger } from '../../lib/logger.js'
```

**Dependencies:**
- Intelligence context types
- Session ID validation

**Changes Required:**
- Warn if context seems stale or mismatched
- Don't use wrong data
- Validate context before URL analysis (line 76)

**Code Location:**
- `src/core/agents/discovery-agent.ts` line 76: URL analysis condition

---

### 13. TypeScript Build Errors

**Files to Modify:**
- `api/tsconfig.json`

**Dependencies:**
- TypeScript compiler
- Next.js/Vercel build system

**Changes Required:**
- Fix invalid compiler options:
  - `resolveJsonModule`
  - `moduleResolution`
  - `allowImportingTsExtensions`

**Code Location:**
- `api/tsconfig.json` - Check compiler options

---

### 14. Increase AUDIO_RATE_LIMIT (Optional)

**Files to Modify:**
- `server/rate-limiting/websocket-rate-limiter.ts`

**Current Code (line 19):**
```typescript
export const AUDIO_RATE_LIMIT = { windowMs: 1000, max: 200 } // 200 audio chunks/second
```

**Changes Required:**
- Increase from 200 to 300/second if audio bursts continue

**Code Location:**
- `server/rate-limiting/websocket-rate-limiter.ts` line 19

---

### 15. Add URL Analysis Tool to unified-tool-registry

**Files to Modify:**
- `src/core/tools/unified-tool-registry.ts`

**Current Imports:**
```typescript
import { z } from 'zod'
import { toolExecutor } from './tool-executor.js'
import { withTimeout } from '../../lib/code-quality.js'
import type { ToolExecutionResult } from './types.js'
```

**Dependencies:**
- `src/core/intelligence/url-context-tool.ts` - analyzeUrl()
- Tool execution infrastructure

**Changes Required:**
- Add `analyze_url` tool schema to `ToolSchemas`
- Add execution logic in `executeUnifiedTool()`
- Add to `getChatToolDefinitions()`

**Code Location:**
- `src/core/tools/unified-tool-registry.ts`:
  - Lines 79-150: ToolSchemas
  - Lines 192-289: executeUnifiedTool()
  - Lines 307-384: getChatToolDefinitions()

---

## 📝 TESTING ISSUES

### 16. Vision Accuracy Test Cases

**Files to Create/Modify:**
- Test files (to be created)
- `src/hooks/media/useScreenShare.ts` - For testing
- `src/hooks/media/useCamera.ts` - For testing

**Test Cases:**
- Hold up 1-5 fingers, verify AI counts correctly
- Test with different lighting conditions
- Test with movement/gestures

---

### 17. Screen Share Analysis Test

**Files to Create/Modify:**
- Test files (to be created)
- `src/hooks/media/useScreenShare.ts` - For testing

**Test Cases:**
- Share browser with known URL
- Verify AI reads actual content (not hallucinate)
- Test with different websites

---

### 18. URL Analysis Test

**Files to Create/Modify:**
- Test files (to be created)
- `services/standardChatService.ts` - For testing
- `services/geminiLiveService.ts` - For testing

**Test Cases:**
- Paste URL in chat mode
- Paste URL during voice mode
- Verify URL is fetched and analyzed

---

### 19. Text Input During Voice Test

**Files to Create/Modify:**
- Test files (to be created)
- `App.tsx` - For testing

**Test Cases:**
- Enable voice mode
- Try to type and send text
- Verify text is received and processed

---

### 20. Tool Calling Test

**Files to Create/Modify:**
- Test files (to be created)
- `server/live-api/config-builder.ts` - For testing

**Test Cases:**
- Request weather data
- Request location
- Request stock prices
- Verify tools are called and return data

---

### 21. Rate Limiting Test

**Files to Create/Modify:**
- Test files (to be created)
- `server/rate-limiting/websocket-rate-limiter.ts` - For testing

**Test Cases:**
- Screen share for 5+ minutes
- Webcam accuracy
- Audio bursts
- Combined modalities
- Verify no rate limit warnings

---

## File Dependency Graph

### Core Rate Limiting Files
```
server/rate-limiting/websocket-rate-limiter.ts
  ├── server/message-types.ts (MESSAGE_TYPES)
  ├── server/utils/admin-check.ts (ensureWsAdmin)
  └── server/utils/env-setup.ts (serverLogger)

server/handlers/realtime-input-handler.ts
  ├── server/rate-limiting/websocket-rate-limiter.ts (checkRateLimit)
  ├── server/message-types.ts (MESSAGE_TYPES)
  └── server/message-payload-types.ts (RealtimeInputPayload)
```

### Context Injection Files
```
server/context/injection.ts
  ├── server/utils/env-setup.ts (serverLogger)
  └── src/config/constants.ts (VOICE_CONFIG)

server/handlers/context-update-handler.ts
  └── server/context/injection.ts (scheduleDebouncedInjection)

server/live-api/config-builder.ts
  ├── server/utils/env-setup.ts (serverLogger)
  ├── server/utils/admin-check.ts (isAdmin)
  └── src/core/types/funnel-stage.ts (FunnelStage)
```

### URL Analysis Files
```
src/core/intelligence/url-context-tool.ts
  ├── ../../lib/ai-client.js (generateObject, google)
  └── ../../config/constants.js (GEMINI_MODELS)

src/core/agents/discovery-agent.ts
  └── ../intelligence/url-context-tool.js (analyzeUrl)

services/standardChatService.ts
  └── (needs import) src/core/intelligence/url-context-tool.ts (analyzeUrl)

services/geminiLiveService.ts
  └── (needs import) src/core/intelligence/url-context-tool.ts (analyzeUrl)
```

### Service Files
```
services/standardChatService.ts
  ├── @google/genai (GoogleGenAI, Type, Content, Part, Tool)
  ├── types (TranscriptItem, ResearchResult)
  ├── src/config/constants (GEMINI_MODELS)
  └── ./unifiedContext (unifiedContext)

services/geminiLiveService.ts
  ├── src/core/live/client (LiveClientWS)
  ├── ../utils/audioUtils (audio utilities)
  ├── types (LiveServiceConfig, TranscriptItem, ResearchResult)
  ├── ../config (AppConfig)
  └── ./unifiedContext (unifiedContext)

services/unifiedContext.ts
  └── (central context management)
```

### API Files
```
api/chat.ts
  ├── @vercel/node (VercelRequest, VercelResponse)
  ├── ../src/core/agents/types.js (IntelligenceContext, etc.)
  ├── ../src/core/agents/orchestrator.js (routeToAgent)
  ├── ../src/core/context/multimodal-context.js (multimodalContextManager)
  ├── ../src/lib/rate-limiter.js (rateLimit)
  └── ../src/core/supabase/client.js (supabaseService)
```

### Tool Files
```
src/core/tools/unified-tool-registry.ts
  ├── zod (z)
  ├── ./tool-executor.js (toolExecutor)
  └── ../../lib/code-quality.js (withTimeout)

server/utils/tool-implementations.ts
  └── (tool execution implementations)
```

---

## Import Path Notes

### ESM vs CommonJS
- All server files use `.js` extensions in imports (ESM)
- Example: `import { checkRateLimit } from '../rate-limiting/websocket-rate-limiter.js'`
- Client files may use `.ts` or `.js` extensions

### Relative vs Absolute Paths
- Server files: Use relative paths (e.g., `../utils/env-setup`)
- Client files: May use `src/` prefix (e.g., `src/config/constants`)
- API files: Use relative paths to `src/` (e.g., `../src/core/agents/types.js`)

### Type Imports
- Use `import type` for type-only imports
- Example: `import type { RealtimeInputPayload } from '../message-payload-types'`

---

## Summary of File Changes

### Files Requiring Modifications (Critical + High Priority)

1. **server/rate-limiting/websocket-rate-limiter.ts** - 4 changes (rate limiting)
2. **server/handlers/realtime-input-handler.ts** - 1 change (pass mimeType)
3. **server/context/injection.ts** - 1 change (screen share hallucination)
4. **server/live-api/config-builder.ts** - 2 changes (screen share, tool calling)
5. **services/standardChatService.ts** - 1 change (URL analysis)
6. **services/geminiLiveService.ts** - 1 change (URL analysis)
7. **App.tsx** - 1 change (text input during voice)
8. **api/chat.ts** - 5 changes (validation, performance)
9. **src/core/intelligence/lead-research.ts** - 1 change (hardcoded fallback)
10. **src/core/tools/unified-tool-registry.ts** - 1 change (URL tool)
11. **src/core/agents/discovery-agent.ts** - 1 change (context validation)

**Total: 19 file modifications for Critical + High Priority issues**

---

## Next Steps

1. Start with rate limiting fixes (blocking multimodal functionality)
2. Fix screen share hallucination (analysis never reaches AI)
3. Add URL analysis to all modes
4. Enable text input during voice mode
5. Then proceed with high priority optimizations
