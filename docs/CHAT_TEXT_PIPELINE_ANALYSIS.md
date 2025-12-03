# Core Chat/Text Pipeline Analysis

> **⚠️ REFERENCE DOCUMENT - ORIGINAL ANALYSIS**  
> **Status:** This document is from the original analysis phase (Dec 2, 2025). The system has been significantly updated during the 7-day sprint (Days 1-5).  
> **For current system status, see:** [7_DAY_SPRINT_COMPLETE.md](./7_DAY_SPRINT_COMPLETE.md)  
> **Key Changes:** Agents unified (12+ → 6), funnel simplified (12 → 7 stages), 100% structured output, Google Grounding enabled.

**Date:** 2025-12-02  
**Scope:** Complete end-to-end analysis of chat/text message flow from UI input to backend processing and response display

---

## Overview

The FBC chat system uses a **multi-agent orchestration architecture** with intelligent routing, context management, and fallback mechanisms. Messages flow through multiple layers: UI → Services → API → Orchestrator → Agents → Response.

---

## 1. Frontend UI/UX Layer

### 1.1 Input Components

#### `ChatInputDock.tsx` - Primary Input Interface

**Location:** `components/chat/ChatInputDock.tsx`

**Features:**
- **Text Input:** Expandable textarea with auto-height adjustment
- **File Upload:** Drag-and-drop or click to upload (images, PDFs, text files, CSV, JSON)
- **Webcam Capture:** Real-time camera feed integration
- **Voice Dictation:** Web Speech API for speech-to-text
- **Local AI Tools:** Chrome AI integration for rewrite/proofread (client-side)
- **Suggestions:** Quick-action chips for common queries

**Key Functions:**
```typescript
// File processing
processFile(file: File) → Base64 encoding + metadata extraction

// Message sending
handleSendMessage() → Calls onSendMessage(text, filePayload)

// Voice dictation
toggleDictation() → Web Speech API → Updates inputValue
```

**UI States:**
- **Collapsed:** Floating pill at bottom (keyboard icon)
- **Expanded:** Full input dock with staging area, suggestions, action buttons
- **Processing:** Loading states for local AI actions

---

### 1.2 Display Components

#### `ChatMessage.tsx` - Message Rendering

**Location:** `components/chat/ChatMessage.tsx`

**Message Types Handled:**
1. **System Messages:** `[System: ...]` → Centered pill with orange indicator
2. **Research Cards:** Verified handshake cards with person/company context
3. **Calendar Widgets:** Booking interface embedded in chat
4. **Standard Messages:** User (dark) vs AI (light) bubbles
5. **Attachments:** Images (zoomable), text files (preview), documents (metadata)

**Rendering Features:**
- **Markdown Support:** Via `MarkdownRenderer` component
- **Streaming State:** Shimmer loader while `status === 'streaming'`
- **Thought Process:** Collapsible reasoning section (orange theme)
- **Grounding Metadata:** Research queries + verified sources (web preview cards)
- **Copy Action:** Hover-to-reveal copy button

**Visual Design:**
- User messages: Dark background (`bg-[#1a1a1a]`), right-aligned
- AI messages: Light background (`bg-white/70`), left-aligned
- Rounded corners with tail (24px radius, asymmetric)
- Backdrop blur for glassmorphism effect

---

#### `MarkdownRenderer.tsx` - Content Formatting

**Location:** `components/chat/MarkdownRenderer.tsx`

**Supported Markdown:**
- Headers (`##`, `###`)
- Lists (`*`, `-`)
- Blockquotes (`>`)
- Code blocks (```language)
- Inline code (backticks)
- Links (auto-detected URLs)

**Rendering Logic:**
- Line-by-line parsing with state machine
- Code block buffering until closing ```
- List item accumulation until non-list line
- Inline formatting (bold, italic, code) via regex

---

## 2. Frontend Service Layer

### 2.1 AIBrainService - Multi-Agent Orchestrator Client

**Location:** `services/aiBrainService.ts`

**Purpose:** Primary service for routing messages to the multi-agent backend system.

**Key Methods:**

#### `chat(messages, options)`
```typescript
// Converts transcript to API format
// Sends POST to /api/chat
// Returns AgentResponse with output, agent, model, metadata
```

**Message Format:**
```typescript
{
  role: 'user' | 'model',
  content: string,
  attachments?: Array<{ mimeType: string, data: string }>
}
```

#### `transcriptToMessages(transcript)`
```typescript
// Static method to convert TranscriptItem[] to API format
// Filters empty messages (unless has attachment)
// Preserves 'model' role (not 'assistant')
// Extracts attachments from transcript items
```

**Base URL Resolution:**
- Dev: `http://localhost:3002` (or `VITE_AGENT_API_URL`)
- Prod: Relative path (uses Vercel proxy)
- SSR: `http://localhost:3002` fallback

---

### 2.2 StandardChatService - Fallback Chat

**Location:** `services/standardChatService.ts`

**Purpose:** Direct Gemini API integration when agent system fails.

**Key Features:**
- History processing (last 20 messages)
- Context injection from `UnifiedContext`
- Tool support (Google Search, Maps)
- Grounding metadata extraction
- Reasoning display (if available)

**Usage:** Fallback when `AIBrainService` returns error or empty response.

---

### 2.3 ChromeAiService - Local AI

**Location:** `services/chromeAiService.ts`

**Purpose:** Client-side AI using Chrome's experimental `window.ai` API.

**Capabilities:**
- **Language Model:** Text generation
- **Rewriter:** Tone adjustment (formal/casual/short)
- **Summarizer:** Text summarization
- **Proofreader:** Grammar/spelling fixes

**Usage:** Quick actions in `ChatInputDock` (magic menu).

---

### 2.4 UnifiedContext - Centralized State

**Location:** `services/unifiedContext.ts`

**Purpose:** Single source of truth for conversation context.

**Stored Context:**
- `sessionId`: Unique conversation identifier
- `researchContext`: Lead research results
- `location`: User geolocation
- `conversationFlow`: Funnel stage tracking
- `intelligenceContext`: Lead scores, fit scores, email, etc.

**Methods:**
- `getSnapshot()`: Read current state
- `setResearchContext()`: Update research
- `setIntelligenceContext()`: Update intelligence
- `ensureLocation()`: Get/request location

---

## 3. Main App Flow (`App.tsx`)

### 3.1 Message Sending Flow

**Entry Point:** `handleSendMessage(text, file)`

**Routing Logic:**
```typescript
const route = smartRouteModel(text, !!file)
// Determines: 'voice' | 'agents' | 'standard' | 'local'
```

**Flow Decision Tree:**

1. **Voice Mode** (if `connectionState === CONNECTED`):
   - Send via `GeminiLiveService` (WebSocket)
   - Real-time bidirectional communication
   - Media attachments sent via `sendRealtimeMedia()`

2. **Agent Mode** (default):
   - Use `AIBrainService.chat()`
   - Route to `/api/chat` endpoint
   - Multi-agent orchestration

3. **Fallback to StandardChat**:
   - If agent fails/returns error/empty
   - Use `StandardChatService.sendMessage()`
   - Direct Gemini API call

---

### 3.2 Message Processing Steps

**Step 1: User Message Creation**
```typescript
const userItem: TranscriptItem = {
  id: Date.now().toString(),
  role: 'user',
  text: text.trim(),
  timestamp: new Date(),
  isFinal: true,
  ...(file && { attachment: { ...file, type: 'image' | 'file' } })
}
```

**Step 2: Add to Transcript**
```typescript
setTranscript(prev => [...prev, userItem])
```

**Step 3: Create Loading Placeholder**
```typescript
const loadingId = Date.now() + 1
setTranscript(prev => [...prev, {
  id: loadingId.toString(),
  role: 'model',
  text: '',
  status: 'streaming'
}])
```

**Step 4: Context Preparation**
```typescript
// Merge research, location, intelligence context
const intelligencePayload = {
  ...unifiedSnapshot.intelligenceContext,
  ...intelligenceContextRef.current,
  ...(researchContext && { research: researchContext }),
  ...(location && { location })
}
```

**Step 5: Convert Transcript to Messages**
```typescript
const messages = AIBrainService.transcriptToMessages(currentHistory)
// Adds attachments if file/webcam active
```

**Step 6: Send to Backend**
```typescript
const agentResponse = await aiBrainRef.current.chat(messages, {
  conversationFlow: conversationFlowRef.current,
  intelligenceContext: intelligencePayload
})
```

**Step 7: Update Transcript with Response**
```typescript
setTranscript(prev => prev.map(item =>
  item.id === loadingId.toString()
    ? {
        ...item,
        text: agentResponse.output,
        isFinal: true,
        status: 'complete',
        ...(agentResponse.metadata && { metadata: agentResponse.metadata })
      }
    : item
))
```

**Step 8: Persist to Server** (non-blocking)
```typescript
await persistMessageToServer(sessionId, 'model', responseText, new Date())
```

---

## 4. Backend API Layer

### 4.1 `/api/chat` - Main Chat Endpoint

**Location:** `api/chat.ts`

**Method:** `POST`

**Request Body:**
```typescript
{
  messages: Array<{
    role: 'user' | 'assistant' | 'system',
    content: string,
    attachments?: Array<{ mimeType: string, data: string }>
  }>,
  sessionId?: string,
  conversationFlow?: ConversationFlowState,
  intelligenceContext?: IntelligenceContext,
  trigger?: 'chat' | 'voice' | 'admin' | 'proposal_request' | 'conversation_end'
}
```

**Validation:**
1. **Message Structure:**
   - Must have `role` (string)
   - Must have `content` (string) OR `attachments` (array)
   - Filters out invalid messages

2. **Role Normalization:**
   - `'model'` → `'assistant'` (Gemini API → AI SDK)
   - Preserves `'user'`, `'system'`, `'assistant'`
   - Defaults to `'user'` if invalid

3. **Attachment Filtering:**
   - Only user messages can have attachments
   - Removed from assistant/system messages

**Response:**
```typescript
{
  success: boolean,
  output: string,        // Agent response text
  agent: string,         // Agent name (e.g., "Discovery Agent")
  model: string,         // Model used (e.g., "gemini-2.0-flash-exp")
  metadata: {
    stage: FunnelStage,
    conversationFlow?: ConversationFlowState,
    error?: string,
    [key: string]: unknown
  },
  error?: string
}
```

**Error Handling:**
- 400: Invalid request (missing messages, no valid messages)
- 500: Server error (with stack trace in dev mode)

---

### 4.2 `/api/chat/persist-message` - Message Persistence

**Location:** `api/chat/persist-message.ts`

**Purpose:** Save messages to Supabase without triggering response.

**Request:**
```typescript
{
  sessionId: string,
  role: 'user' | 'model',
  content: string,
  timestamp: string,
  attachment?: { ... }
}
```

**Logic:**
- Skips if content is empty and no attachment
- Uses `multimodalContextManager.addConversationTurn()`
- Non-blocking (fire-and-forget in frontend)

---

## 5. Backend Orchestration Layer

### 5.1 `routeToAgent()` - Agent Router

**Location:** `src/core/agents/orchestrator.ts`

**Purpose:** Routes messages to appropriate specialized agent based on conversation stage.

**Routing Logic:**

#### Pre-Processing:
1. **Intent Detection:**
   - `preProcessIntent()` checks for booking/exit keywords
   - `BOOKING` → Immediate calendar widget response
   - `EXIT` → Force summary agent

2. **Usage Limits:**
   - Checks `usageLimiter.checkLimit(sessionId, 'message')`
   - Blocks if limit reached (returns limit message)

3. **Multimodal Context:**
   - Loads from `multimodalContextManager.prepareChatContext()`
   - Includes recent images, audio, uploads
   - Merges with provided context from request

#### Stage Determination:
```typescript
determineFunnelStage({
  conversationFlow,
  intelligenceContext,
  trigger
}): FunnelStage
```

**Stage Logic:**
- **DISCOVERY:** < 4 categories covered
- **SCORING:** 4+ categories, no fit score
- **WORKSHOP_PITCH:** Fit score workshop > 0.7
- **CONSULTING_PITCH:** Fit score consulting > 0.7
- **CLOSING:** Pitch delivered, no booking
- **SUMMARY:** Conversation ended
- **PROPOSAL:** Explicit proposal request
- **ADMIN:** Admin trigger
- **RETARGETING:** Scheduled retargeting

#### Agent Execution:
```typescript
switch (stage) {
  case 'DISCOVERY': result = await discoveryAgent(messages, enhancedContext)
  case 'SCORING': result = await scoringAgent(messages, enhancedContext)
  case 'WORKSHOP_PITCH': result = await workshopSalesAgent(messages, enhancedContext)
  case 'CONSULTING_PITCH': result = await consultingSalesAgent(messages, enhancedContext)
  case 'CLOSING': result = await closerAgent(messages, enhancedContext)
  case 'SUMMARY': result = await summaryAgent(messages, enhancedContext)
  case 'PROPOSAL': result = await proposalAgent(messages, enhancedContext)
  case 'ADMIN': result = await adminAgent(messages, context)
  // ...
}
```

**Post-Processing:**
1. **Usage Tracking:** `usageLimiter.trackUsage(sessionId, 'message')`
2. **Context Update:** Updates `conversationFlow` from agent metadata
3. **Persistence:** Non-blocking `agentPersistence.persistAgentResult()`
4. **Analytics:** Non-blocking audit logging + analytics

**Error Handling:**
- Catches agent execution errors
- Returns standardized error response
- Logs to audit system

---

### 5.2 Agent Types

Each agent is a specialized function that:
- Takes `messages: ChatMessage[]` and `context: AgentContext`
- Returns `AgentResult` with `output`, `agent`, `model`, `metadata`

**Available Agents:**
1. **Discovery Agent:** Initial conversation, gathers requirements
2. **Scoring Agent:** Calculates lead/fit scores
3. **Workshop Sales Agent:** Pitches workshop services
4. **Consulting Sales Agent:** Pitches consulting services
5. **Closer Agent:** Final push for booking
6. **Summary Agent:** Conversation summary generation
7. **Proposal Agent:** Generates proposals
8. **Admin Agent:** Admin queries
9. **Retargeting Agent:** Follow-up campaigns

---

## 6. Message Persistence

### 6.1 Frontend Persistence

**Location:** `App.tsx` → `persistMessageToServer()`

**Flow:**
```typescript
await fetch('/api/chat/persist-message', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    role: 'user' | 'model',
    content: text,
    timestamp: date.toISOString(),
    attachment
  })
})
```

**Timing:** After message is displayed (non-blocking).

---

### 6.2 Backend Persistence

**Location:** `src/core/context/multimodal-context.ts`

**Storage:**
- **Supabase Table:** `multimodal_conversations`
- **Schema:** Session-based with turn-by-turn storage
- **Archive:** Full conversation archived on `conversation_end`

**Methods:**
- `addConversationTurn()`: Add single message
- `prepareChatContext()`: Load full context for agent
- `archiveConversation()`: Final archive before summary

---

## 7. Response Flow Summary

### Complete Pipeline:

```
1. USER INPUT
   └─> ChatInputDock (text/file/voice/webcam)
       └─> handleSendMessage()

2. FRONTEND PROCESSING
   └─> Create user TranscriptItem
   └─> Add to transcript state
   └─> Create loading placeholder
   └─> Prepare context (research, location, intelligence)
   └─> Convert transcript to messages format

3. SERVICE ROUTING
   └─> AIBrainService.chat()
       └─> POST /api/chat
           └─> Validate & normalize messages
           └─> Build AgentContext
           └─> routeToAgent()

4. ORCHESTRATION
   └─> Pre-process intent
   └─> Check usage limits
   └─> Load multimodal context
   └─> Determine funnel stage
   └─> Route to specialized agent
       └─> Agent executes (LLM call, tools, etc.)
       └─> Returns AgentResult

5. RESPONSE HANDLING
   └─> Update transcript with response
   └─> Persist to server (non-blocking)
   └─> Display in ChatMessage component
       └─> MarkdownRenderer formats content
       └─> Shows attachments, reasoning, metadata

6. FALLBACK (if agent fails)
   └─> StandardChatService.sendMessage()
       └─> Direct Gemini API call
       └─> Same display flow
```

---

## 8. Key Design Patterns

### 8.1 Multi-Agent Orchestration
- **Stage-based routing:** Conversation funnel determines agent
- **Context preservation:** Full context passed between agents
- **Non-blocking persistence:** Background saves don't block responses

### 8.2 Fallback Strategy
- **Primary:** Multi-agent system (`AIBrainService`)
- **Fallback:** Direct Gemini API (`StandardChatService`)
- **Graceful degradation:** Always returns a response

### 8.3 Context Management
- **UnifiedContext:** Single source of truth
- **Multimodal Context:** Images, audio, uploads tracked
- **Intelligence Context:** Lead scores, fit scores, research

### 8.4 Error Handling
- **Validation:** Message structure validated at API layer
- **Error Responses:** Standardized error format
- **Retry Logic:** (Planned but not currently used)

---

## 9. Performance Optimizations

1. **Non-blocking Persistence:** Messages saved async after display
2. **Context Caching:** UnifiedContext avoids redundant lookups
3. **Message Filtering:** Only last 20 messages sent to API
4. **Lazy Loading:** Multimodal context loaded only when needed
5. **Streaming Support:** (Planned for future - currently full response)

---

## 10. Security Considerations

1. **Message Validation:** Strict validation at API layer
2. **Attachment Filtering:** Only user messages can have attachments
3. **Role Normalization:** Prevents role injection
4. **Usage Limits:** Prevents abuse via rate limiting
5. **Audit Logging:** All agent routing logged (production)

---

## 11. Future Enhancements

1. **Streaming Responses:** SSE/WebSocket for real-time token streaming
2. **Retry Logic:** Exponential backoff for failed agent calls
3. **Caching:** Response caching for common queries
4. **Analytics:** Enhanced analytics on message flow
5. **Multi-turn Context:** Better long-context handling

---

## 12. File Locations Reference

### Frontend:
- `components/chat/ChatInputDock.tsx` - Input UI
- `components/chat/ChatMessage.tsx` - Message display
- `components/chat/MarkdownRenderer.tsx` - Content formatting
- `services/aiBrainService.ts` - Agent client
- `services/standardChatService.ts` - Fallback chat
- `services/chromeAiService.ts` - Local AI
- `services/unifiedContext.ts` - Context management
- `App.tsx` - Main flow orchestration

### Backend:
- `api/chat.ts` - Main chat endpoint
- `api/chat/persist-message.ts` - Message persistence
- `src/core/agents/orchestrator.ts` - Agent routing
- `src/core/agents/*-agent.ts` - Individual agents
- `src/core/context/multimodal-context.ts` - Context storage

---

**End of Analysis**

