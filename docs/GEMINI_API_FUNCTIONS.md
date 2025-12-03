# Gemini API and Live API Functions Reference

Complete list of all Gemini API and Live API functions, their file paths, functionality, and model usage.

## Table of Contents
1. [Live API Functions](#live-api-functions)
2. [Standard Gemini API Functions](#standard-gemini-api-functions)
3. [AI Client Wrapper Functions](#ai-client-wrapper-functions)
4. [Service Classes](#service-classes)
5. [API Endpoints](#api-endpoints)
6. [Model Configuration](#model-configuration)

---

## Live API Functions

### Server-Side Live API

#### `createLiveApiClient()`
- **File:** `server/live-api/session-manager.ts`
- **Function:** Creates a GoogleGenAI instance for Live API with proper authentication handling
- **Model:** Uses `getLiveApiModel()` which returns `gemini-2.5-flash-native-audio-preview-09-2025` (DEFAULT_VOICE)
- **What it does:**
  - Tries service account first (from `GOOGLE_APPLICATION_CREDENTIALS` environment variable)
  - Falls back to API key if service account not available
  - Handles auth cleanup to prevent SDK conflicts
  - Returns configured GoogleGenAI instance

#### `getLiveApiModel()`
- **File:** `server/live-api/session-manager.ts`
- **Function:** Returns the model name for Live API
- **Model:** `gemini-2.5-flash-native-audio-preview-09-2025` (DEFAULT_VOICE)
- **What it does:**
  - Reads from `GEMINI_LIVE_MODEL` env var or uses default
  - Validates model is audio-capable (must include 'audio' in name)
  - Returns formatted model path: `models/{modelName}`

#### `buildLiveConfig()`
- **File:** `server/live-api/config-builder.ts`
- **Function:** Builds Live API session configuration
- **Model:** Uses model from `getLiveApiModel()` (default: `gemini-2.5-flash-native-audio-preview-09-2025`)
- **What it does:**
  - Constructs system instruction with personalization context
  - Loads session context from database
  - Adds multimodal context snapshot
  - Configures voice settings (default: 'Puck')
  - Sets up function declarations (tools)
  - Returns complete Live API config object

#### `handleStart()`
- **File:** `server/handlers/start-handler.ts`
- **Function:** Handles WebSocket START message to initialize Live API session
- **Model:** `gemini-2.5-flash-native-audio-preview-09-2025` (via `getLiveApiModel()`)
- **What it does:**
  - Creates Live API client
  - Builds session configuration
  - Initializes Live API session with GoogleGenAI
  - Sets up event handlers (transcripts, audio, tool calls)
  - Manages session lifecycle

#### `processToolCall()`
- **File:** `server/live-api/tool-processor.ts`
- **Function:** Processes tool calls from Live API (server-side execution)
- **Model:** N/A (executes tools, doesn't call Gemini directly)
- **What it does:**
  - Receives tool calls from Live API session
  - Executes tools server-side (search_web, extract_action_items, etc.)
  - Sends results back to Live API session
  - Records capability usage

### Client-Side Live API

#### `LiveClientWS` class
- **File:** `src/core/live/client.ts`
- **Function:** WebSocket client for connecting to Fly.io Live API server
- **Model:** N/A (client-side WebSocket wrapper)
- **What it does:**
  - Connects to WebSocket server (Fly.io)
  - Manages connection lifecycle (connect, reconnect, heartbeat)
  - Sends/receives Live API messages
  - Handles events (connected, session_started, transcripts, audio, tool calls)
  - Manages buffer health and connection state

#### `GeminiLiveService` class
- **File:** `services/geminiLiveService.ts`
- **Function:** High-level service for Live API voice interactions
- **Model:** Uses Live API via WebSocket (model configured server-side)
- **What it does:**
  - Manages audio input/output (microphone, speakers)
  - Connects to Live API via LiveClientWS
  - Handles real-time audio streaming
  - Processes transcripts (input/output)
  - Sends context updates (chat history, research, location)
  - Manages video frames (webcam, screen share)
  - Provides volume analysis for UI

---

## Standard Gemini API Functions

### Core AI Client Functions

#### `generateText()`
- **File:** `src/lib/ai-client.ts`
- **Function:** Wrapper for AI SDK `generateText` with Gemini provider
- **Model:** Configurable (defaults vary by caller)
- **What it does:**
  - Ensures Gemini is configured
  - Calls AI SDK `generateText` with Google provider
  - Standardizes configuration and retries

#### `streamText()`
- **File:** `src/lib/ai-client.ts`
- **Function:** Wrapper for AI SDK `streamText` with Gemini provider
- **Model:** Configurable
- **What it does:**
  - Ensures Gemini is configured
  - Calls AI SDK `streamText` for streaming responses

#### `generateObject()`
- **File:** `src/lib/ai-client.ts`
- **Function:** Wrapper for AI SDK `generateObject` with Gemini provider
- **Model:** Configurable
- **What it does:**
  - Ensures Gemini is configured
  - Calls AI SDK `generateObject` for structured outputs

#### `google()` provider
- **File:** `src/lib/ai-client.ts`
- **Function:** Google Generative AI provider wrapper
- **Model:** Takes model ID as parameter
- **What it does:**
  - Creates Google provider instance with resolved API key
  - Returns model function for AI SDK

### Retry Model Functions

#### `createRetryableGemini()`
- **File:** `src/lib/ai/retry-model.ts`
- **Function:** Creates Gemini model with retry logic
- **Model:** `gemini-3-pro-preview` (default from RETRY_CONFIG)
- **What it does:**
  - Wraps model with exponential backoff retry logic
  - Handles transient failures
  - Configurable max attempts and delays

#### `createRetryableGeminiStream()`
- **File:** `src/lib/ai/retry-model.ts`
- **Function:** Creates streaming Gemini model with retry logic
- **Model:** Default from RETRY_CONFIG
- **What it does:**
  - Same as `createRetryableGemini()` but for streaming

#### `createRetryableGeminiReliable()`
- **File:** `src/lib/ai/retry-model.ts`
- **Function:** Creates reliable Gemini model (higher timeout/retries)
- **Model:** Default from RETRY_CONFIG
- **What it does:**
  - Enhanced retry configuration for critical operations

### Safe Generation Functions

#### `safeGenerateText()`
- **File:** `src/lib/gemini-safe.ts`
- **Function:** Generate text with automatic fallback
- **Model:** 
  - Primary: `gemini-3-pro-preview`
  - Fallback: `gemini-2.5-flash`
- **What it does:**
  - Tries Gemini 3 Pro first
  - Falls back to Flash if Pro fails
  - Reduces context size for Flash fallback

### Standard Chat Service

#### `StandardChatService.sendMessage()`
- **File:** `services/standardChatService.ts`
- **Function:** Sends chat message using GoogleGenAI SDK
- **Model:** 
  - Default: `gemini-3-pro-preview` (DEFAULT_CHAT)
  - Configurable via constructor or modelOverride
- **What it does:**
  - Processes chat history
  - Builds system instruction with research context
  - Configures tools (Google Search, dashboard, code execution)
  - Sends message via GoogleGenAI SDK
  - Returns text, reasoning, grounding metadata, tool calls
  - Handles tool errors with retry without tools

#### `StandardChatService.performQuickAction()`
- **File:** `services/standardChatService.ts`
- **Function:** Fast text rewriting/proofreading
- **Model:** `gemini-2.5-flash-lite` (DEFAULT_FAST)
- **What it does:**
  - Performs quick text operations (rewrite, proofread)
  - Uses Flash Lite for speed/cost
  - Includes research context if available

---

## Intelligence Functions

### Search Functions

#### `searchWeb()`
- **File:** `src/core/intelligence/search.ts`
- **Function:** Performs grounded web search using Gemini
- **Model:** `gemini-3-pro-preview` (GEMINI_3_PRO_PREVIEW)
- **What it does:**
  - Uses Gemini with Google Search grounding
  - Returns search results and grounded answer
  - Supports URL prioritization

### Analysis Functions

#### `extractActionItems()`
- **File:** `src/core/intelligence/analysis.ts`
- **Function:** Extracts action items from conversation transcript
- **Model:** `gemini-3-pro-preview` (GEMINI_3_PRO_PREVIEW)
- **What it does:**
  - Uses `generateObject` with structured schema
  - Returns prioritized action items list
  - Identifies if follow-up meeting needed

#### `generateSummary()`
- **File:** `src/core/intelligence/analysis.ts`
- **Function:** Generates conversation summary
- **Model:** `gemini-3-pro-preview` (GEMINI_3_PRO_PREVIEW)
- **What it does:**
  - Summarizes conversation concisely
  - Highlights key decisions and topics

#### `draftFollowUpEmail()`
- **File:** `src/core/intelligence/analysis.ts`
- **Function:** Drafts follow-up email from transcript
- **Model:** `gemini-3-pro-preview` (GEMINI_3_PRO_PREVIEW)
- **What it does:**
  - Uses `generateObject` with email schema
  - Returns structured email (subject, body, tone)

#### `generateProposal()`
- **File:** `src/core/intelligence/analysis.ts`
- **Function:** Generates proposal draft from transcript
- **Model:** `gemini-3-pro-preview` (GEMINI_3_PRO_PREVIEW)
- **What it does:**
  - Creates markdown proposal structure
  - Based on requirements from conversation

---

## API Endpoints

### `/api/chat`
- **File:** `api/chat.ts`
- **Method:** POST
- **Function:** Main chat endpoint for agent orchestration
- **Model:** Determined by agent orchestrator (varies by stage)
- **What it does:**
  - Validates and normalizes messages
  - Determines funnel stage
  - Routes to appropriate agent
  - Returns agent response with metadata

### `/api/live`
- **File:** `api/live.ts`
- **Method:** GET, OPTIONS
- **Function:** WebSocket proxy endpoint (placeholder)
- **Model:** N/A (not implemented)
- **What it does:**
  - Currently returns info endpoint
  - TODO: Implement WebSocket proxy to Gemini Live API

### `/api/tools/webcam`
- **File:** `api/tools/webcam.ts`
- **Method:** POST
- **Function:** Analyzes webcam image with Gemini Vision
- **Model:** `GEMINI_MODELS.DEFAULT_WEBCAM` (`gemini-3-pro-preview`)
- **What it does:**
  - Receives base64 image
  - Analyzes with Gemini Vision API
  - Returns analysis text

---

## Model Configuration

### Model Constants
- **File:** `src/config/constants.ts`
- **GEMINI_MODELS:**
  - `DEFAULT_CHAT`: `gemini-3-pro-preview`
  - `DEFAULT_VOICE`: `gemini-2.5-flash-native-audio-preview-09-2025`
  - `DEFAULT_MULTIMODAL`: `gemini-3-pro-preview`
  - `DEFAULT_WEBCAM`: `gemini-3-pro-preview`
  - `DEFAULT_SCREEN`: `gemini-3-pro-preview`
  - `DEFAULT_FAST`: `gemini-2.5-flash-lite`
  - `DEFAULT_RELIABLE`: `gemini-2.5-flash`
  - `GEMINI_3_PRO_PREVIEW`: `gemini-3-pro-preview`
  - `FLASH_LATEST`: `gemini-2.5-flash`
  - `FLASH_LITE_LATEST`: `gemini-2.5-flash-lite`
  - `AUDIO_2025_09`: `gemini-2.5-flash-native-audio-preview-09-2025`

### API Endpoints
- **File:** `src/config/constants.ts`
- **GEMINI_ENDPOINTS:**
  - `LIVE_API`: `generativelanguage.googleapis.com/v1beta/models`
  - `STANDARD_API`: `generativelanguage.googleapis.com/v1/models`
  - `STREAMING_API`: `generativelanguage.googleapis.com/v1beta/models`
  - `V1_ALPHA_API`: `generativelanguage.googleapis.com/v1alpha/models`

---

## Summary by Model

### `gemini-3-pro-preview`
Used by:
- Standard chat (`StandardChatService.sendMessage()`)
- Intelligence functions (search, analysis, proposals)
- Safe generation fallback primary
- Webcam/screen analysis
- Multimodal operations

### `gemini-2.5-flash-native-audio-preview-09-2025`
Used by:
- Live API voice sessions (DEFAULT_VOICE)
- Real-time audio streaming

### `gemini-2.5-flash`
Used by:
- Safe generation fallback
- Reliable operations (DEFAULT_RELIABLE)
- Research operations

### `gemini-2.5-flash-lite`
Used by:
- Quick actions (rewrite, proofread)
- Fast operations (DEFAULT_FAST)

### `gemini-1.5-flash`
Used by:
- None (deprecated - replaced with `GEMINI_MODELS.DEFAULT_WEBCAM` which uses `gemini-3-pro-preview`)

---

## Credential Management

### `getResolvedGeminiApiKey()`
- **File:** `src/config/env.ts`
- **Function:** Resolves Gemini API key from environment variables
- **What it does:**
  - Checks multiple env var names:
    - `GEMINI_API_KEY`
    - `GOOGLE_GEMINI_API_KEY`
    - `GOOGLE_GENERATIVE_AI_API_KEY`
    - `GOOGLE_API_KEY`
  - Returns key without mutating global process.env
  - Throws error if no key found

---

## Gaps & Recommendations

### 1. Dead Code & Placeholders
- **`/api/live` Endpoint:**
  - **Status:** ❌ Placeholder
  - **Details:** `api/live.ts` returns a 200 OK with "implementation pending" JSON. It is **not** a functional WebSocket proxy. The application relies on a separate Fly.io WebSocket server (`server/live-server.ts`), making this Next.js API route misleading and potentially dead code.
  - **Recommendation:** Either implement a true Vercel WebSocket proxy (if supported) or remove this endpoint and document the Fly.io dependency explicitly.

- **Admin Route Registration:**
  - **Status:** ❌ Missing Logic
  - **Details:** `PROJECT_STATUS.md` claims admin routes are registered in `api-local-server.ts`, but this file **does not exist** in the current workspace. `server/live-server.ts` only handles WebSockets, not REST API routes.
  - **Recommendation:** Restore `api-local-server.ts` or implement API route mounting in `server/live-server.ts` to support local development of admin features.

### 2. Unimplemented Features (TODOs)
- **Google Grounding:**
  - **Status:** ⚠️ Partial / Prompt-Based
  - **Details:** `src/core/intelligence/search.ts` uses a system prompt ("You are a helpful research assistant...") rather than the official Google Grounding API configuration (e.g., `tools: [{ googleSearch: {} }]`). This may yield less accurate or uncited results compared to true grounding.
  - **Recommendation:** Update `searchWeb()` to use the `googleSearch` tool definition in the Gemini SDK configuration.

- **ROI Charts:**
  - **Status:** ❌ Placeholder
  - **Details:** `src/core/pdf/templates/base-template.ts` contains a hardcoded `<div>ROI Charts Placeholder</div>` with a TODO. PDF reports will lack visual charts until `generateROIChartsHTML` is properly integrated.
  - **Recommendation:** Implement the async generation logic for ROI charts in the PDF generation pipeline.

- **AI Caching:**
  - **Status:** ❌ Stub
  - **Details:** `src/lib/ai-cache.ts` is a stub that logs a warning ("caching not implemented") and returns functions as-is.
  - **Recommendation:** Implement Redis or in-memory caching to reduce API costs and latency for repetitive queries.

### 3. Model Inconsistency
- **Status:** ⚠️ Partial
- **Details:** 
  - `api/tools/webcam.ts` ✅ Now uses `GEMINI_MODELS.DEFAULT_WEBCAM` (fixed)
  - `src/lib/gemini-safe.ts` uses string literals (`gemini-3-pro-preview`) instead of constants.
- **Recommendation:** Refactor remaining direct model string usage (e.g., in `gemini-safe.ts`) to import from `GEMINI_MODELS` in `src/config/constants.ts` to ensure a single source of truth.

### 4. Testing Gaps
- **Status:** ❌ Critical Missing Tests
- **Details:** 
  - `src/core/context/multimodal-context.ts` (Core "Brain" logic): **0 Tests**
  - `server/live-api/`: **0 Tests** for WebSocket handlers
  - `LiveClientWS`: **0 Tests** for client-side connectivity
- **Recommendation:** Prioritize unit tests for `multimodal-context.ts` and integration smoke tests for the Live API connection.

