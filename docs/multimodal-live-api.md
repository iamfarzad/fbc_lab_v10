# Multimodal Live API Functions

This document summarizes the server-side functions that power the Gemini Live (multimodal) experience and how they compose the voice session behavior.

## `server/live-api/config-builder.ts`
- `buildLiveConfig` creates the full Live API configuration for a session, including system prompts, tool declarations, and audio transcription options.
- It layers context from the session (personalization, funnel stage, conversation flow, multimodal snapshots, prior chat context) before appending the voice-specific instructions so the prompt stays grounded in current user data.
- Admin sessions receive a Jarvis-style persona plus extra tools, while client sessions are guided by a structured discovery script with stage-specific supplements (e.g., discovery vs. closing).
- The function always enables audio transcription for both input and output, sets a default voice (overridable per request), and constrains prompt length to 4,000 characters to reduce token bloat.
- Tooling combines Google Search with the unified function declarations (and admin-only additions), falling back to search-only if validation fails to mitigate 1007 errors.

## `server/live-api/session-manager.ts`
- `createLiveApiClient` prefers service-account credentials for Live API calls, temporarily clearing API-key environment variables during SDK initialization to avoid mismatched auth, then falls back to the resolved API key when needed.
- `getLiveApiModel` guards against non-audio model selection by ensuring the configured model name contains "audio"; otherwise it reverts to the default voice model while emitting a warning.

## `server/live-api/tool-processor.ts`
- `processToolCall` handles all Live tool calls server-side using the unified registry: it validates arguments, wraps execution in retry + timeout guards, and records capabilities on successful completions.
- Results are returned via `sendToolResponse`, and every tool call is appended to the multimodal context manager so downstream prompts can reference recent actions and visual data.
- Voice constraints are reflected in shorter retry counts (2 attempts) and a 25-second timeout to keep interactions real-time safe.

## Overall Flow
1. The client connects via WebSocket and requests a voice session; the server selects the Live model and builds the session config with `buildLiveConfig`.
2. The server streams responses; when Gemini triggers tools, `processToolCall` executes them locally and reports back.
3. Contextual signals (personalization, funnel stage, multimodal history, and tool calls) feed back into subsequent turns to keep the voice assistant grounded while respecting audio-first latency constraints.
