# Import Order - One File at a Time

## Summary
- **Total files to import:** 180
- **Foundation files (no deps):** 87
- **Files to skip:** 118 (archived/disabled)

## Phase 1: Critical Foundation Files (Start Here)

### Types (MUST import first - everything depends on these)
1. `types.ts` - Root types file
2. `src/types/core.ts`
3. `src/types/conversation-flow.ts`
4. `src/core/database.types.ts`
5. `src/core/live/types.ts`
6. `src/core/tools/tool-types.ts`
7. `src/core/tools/types.ts`
8. `src/core/queue/job-types.ts`
9. `server/message-types.ts`
10. `server/message-payload-types.ts`

### Config (Critical for app to run)
11. `config.ts` - Root config
12. `src/config/constants.ts`
13. `src/config/env.ts`
14. `src/config/live-tools.ts`
15. `src/lib/ai/retry-config.ts`

### Core Utilities (No dependencies)
16. `src/lib/errors.ts`
17. `src/lib/logger.ts`
18. `src/lib/supabase.ts`
19. `src/lib/supabase-parsers.ts`
20. `src/lib/hash-utils.ts`
21. `src/lib/exit-detection.ts`
22. `src/lib/json.ts` → depends on errors.ts
23. `src/lib/vercel-cache.ts` → depends on logger.ts
24. `src/lib/ai-client.ts`
25. `src/lib/text-utils.ts`
26. `src/lib/code-quality.ts` → depends on text-utils.ts

### Schemas
27. `src/schemas/supabase.ts`
28. `src/schemas/agents.ts`
29. `src/schemas/admin.ts`

### Utils
30. `utils/browser-compat.ts`
31. `utils/audioUtils.ts`
32. `utils/visuals/store.ts`
33. `utils/visuals/types.ts` → depends on types.ts
34. `utils/visuals/mathHelpers.ts` → depends on visuals/types.ts
35. `utils/pdfUtils.ts` → depends on types.ts

## Phase 2: Core Infrastructure

### Supabase Client
36. `src/core/supabase/client.ts` → database.types, supabase

### Context System
37. `src/core/context/context-types.ts` (types only)
38. `src/core/context/context-storage.ts` → context-types, json-guards, retry-config, supabase-parsers, supabase
39. `src/core/context/context-summarizer.ts` → constants, ai-client
40. `src/core/context/multimodal-context.ts` → (complex - many deps)

### Queue System
41. `src/core/queue/redis-queue.ts` → job-types, workers, retry-config, vercel-cache
42. `src/core/queue/workers.ts` → context-storage, context-types, email-service, job-types, redis-queue

### Email Service
43. `src/core/email-service.ts`

### Live/WebSocket
44. `src/core/live/client.ts`

### Tools
45. `src/core/tools/shared-tools.ts`
46. `src/core/tools/tool-executor.ts`
47. `src/core/tools/calculate-roi.ts` → context-storage, pdf-roi-charts
48. `src/core/tools/generate-proposal.ts` → context-storage
49. `src/core/tools/draft-follow-up-email.ts` → context-storage, multimodal-context, pdf-generator
50. `src/core/tools/extract-action-items.ts` → multimodal-context, pdf-generator
51. `src/core/tools/generate-summary-preview.ts` → context-storage, multimodal-context, pdf-generator
52. `src/core/tools/shared-tool-registry.ts` → all tool files

## Phase 3: Services Layer

53. `services/unifiedContext.ts`
54. `services/chromeAiService.ts`
55. `services/standardChatService.ts` → unifiedContext, constants, types
56. `services/leadResearchService.ts` → constants, types
57. `services/aiBrainService.ts` → unifiedContext, types
58. `services/geminiLiveService.ts` → config, unifiedContext, live/client, types, audioUtils

## Phase 4: Visual Components

59. `utils/visuals/agentShapes.ts` → mathHelpers, types
60. `utils/visuals/geometricShapes.ts` → mathHelpers, types
61. `utils/visuals/cosmicShapes.ts` → mathHelpers, types
62. `utils/visuals/complexShapes.ts` → geometricShapes, mathHelpers, store, types
63. `utils/visuals/index.ts` → types, all visuals files

## Phase 5: React Components (Simple)

64. `components/ui/Toast.tsx`
65. `components/Logo.tsx`
66. `components/ServiceIcon.tsx`
67. `components/ServiceIconParticles.tsx`
68. `components/TermsOverlay.tsx`
69. `components/Transcript.tsx`
70. `components/chat/UIHelpers.tsx`
71. `components/chat/CalendarWidget.tsx`
72. `components/chat/MarkdownRenderer.tsx`

## Phase 6: React Components (With Dependencies)

73. `context/ToastContext.tsx` → Toast
74. `components/BrowserCompatibility.tsx` → browser-compat
75. `components/chat/Attachments.tsx` → UIHelpers
76. `components/chat/WebcamPreview.tsx` → visuals/store
77. `components/ControlPanel.tsx` → types
78. `components/AntigravityCanvas.tsx` → visuals/index
79. `components/chat/ChatInputDock.tsx` → Attachments, UIHelpers, types
80. `components/chat/ChatMessage.tsx` → Attachments, CalendarWidget, MarkdownRenderer, UIHelpers, types
81. `components/LandingPage.tsx` → AntigravityCanvas, ServiceIcon, CalendarWidget, types
82. `components/MultimodalChat.tsx` → Attachments, ChatInputDock, ChatMessage, UIHelpers, types
83. `components/AdminDashboard.tsx` → Attachments, leadResearchService, types

## Phase 7: Entry Points

84. `index.tsx` → App, ToastContext, browser-compat
85. `App.tsx` → all components, services, types, constants, pdfUtils

## Phase 8: Server Files (If Needed)

86. `server/utils/env-setup.ts` → env, logger
87. `server/utils/errors.ts`
88. `server/utils/permissions.ts`
89. `server/utils/admin-check.ts`
90. `server/utils/json.ts` → errors
91. `server/utils/websocket-helpers.ts` → env-setup
92. `server/utils/turn-completion.ts` → message-types, env-setup, websocket-helpers
93. `server/utils/tool-implementations.ts` → multimodal-context, env-setup
94. `server/websocket/server.ts` → message-types, env-setup, constants
95. `server/websocket/connection-manager.ts` → close-handler, message-types, rate-limiter, session-logger, env-setup, websocket-helpers
96. `server/websocket/message-router.ts` → all handlers, message-types, rate-limiter, env-setup, errors, json, turn-completion, websocket-helpers, constants
97. `server/handlers/start-handler.ts` → multimodal-context, conversation-history, orchestrator-sync, config-builder, session-manager, tool-processor, message-types, rate-limiter, env-setup, turn-completion, websocket-helpers, constants, env, session-coordinator
98. `server/handlers/audio-handler.ts` → message-types, rate-limiter, env-setup, turn-completion, websocket-helpers
99. `server/handlers/close-handler.ts` → multimodal-context, orchestrator-sync, env-setup, turn-completion, constants
100. `server/handlers/context-update-handler.ts` → multimodal-context, injection, message-types, rate-limiter, env-setup, websocket-helpers, constants
101. `server/handlers/realtime-input-handler.ts` → message-types, rate-limiter, env-setup, websocket-helpers
102. `server/handlers/tool-result-handler.ts` → message-types, rate-limiter, env-setup, websocket-helpers
103. `server/live-server.ts` → all handlers, env-setup, connection-manager, message-router, server

## Phase 9: API Routes (If Needed)

104. `api/chat.ts` → orchestrator, redis-queue
105. `api/chat/persist-message.ts` → multimodal-context
106. `api/chat/persist-batch.ts` → multimodal-context
107. `api/live.ts`
108. `api/send-pdf-summary/route.ts` → email-service, supabase, logger
109. `api/admin/login/route.ts` → auth, api-middleware, response, logger
110. `api/admin/logout/route.ts` → api-middleware, logger
111. `api/admin/sessions/route.ts` → auth, rate-limiting, admin-chat-service, api-middleware, response, supabase-parsers, admin-api, supabase/client, json, logger
112. `api/admin/ai-performance/route.ts` → auth, rate-limiting, api-middleware, response, supabase/client, logger
113. `api/admin/token-costs/route.ts` → auth, rate-limiting, token-usage-logger, api-middleware, response, supabase/client, logger

## Phase 10: Tests (Optional)

114. `services/__tests__/helpers/test-data.ts`
115. `services/__tests__/helpers/mock-fetch.ts`
116. `services/__tests__/helpers/mock-audio.ts`
117. `services/__tests__/helpers/mock-websocket.ts`
118. `services/__tests__/helpers/mock-chrome-ai.ts`
119. `services/__tests__/helpers/mock-google-genai.ts`
120. `services/__tests__/setup.ts`
121. `services/__tests__/unifiedContext.test.ts`
122. `services/__tests__/standardChatService.test.ts`
123. `services/__tests__/leadResearchService.test.ts`
124. `services/__tests__/aiBrainService.test.ts`
125. `services/__tests__/chromeAiService.test.ts`
126. `services/__tests__/geminiLiveService.test.ts`
127. `services/__tests__/integration.test.ts`
128. `App.test.tsx` → App, ToastContext

## Notes

- Import one file at a time
- Verify each import works before moving to next
- Update import paths to match new structure
- Skip files in `api/_lib/`, `api/_admin-disabled/`, `api/_archive/`
- If a file has dependencies not yet imported, skip it and come back

## Decision Points

Before importing, decide:
1. Do we need the WebSocket server? (Phase 8)
2. Do we need admin API routes? (Phase 9)
3. Do we need tests? (Phase 10)
4. Do we need the agent orchestration system? (Not in this list - would need to migrate from `api/_lib/agents/`)

