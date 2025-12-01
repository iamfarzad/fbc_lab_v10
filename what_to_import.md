# File Import & Rendering Map

**Generated:** 2025-12-01T08:31:12.524Z

This document maps all file imports and component rendering relationships in the codebase.

## Entry Points

### `App.tsx`

**Imports:**
- `components/AntigravityCanvas.tsx`
- `components/ControlPanel.tsx`
- `components/MultimodalChat.tsx`
- `components/BrowserCompatibility.tsx`
- `components/chat/WebcamPreview.tsx`
- `components/LandingPage.tsx`
- `components/TermsOverlay.tsx`
- `components/AdminDashboard.tsx`
- `services/geminiLiveService.ts`
- `services/standardChatService.ts`
- `services/leadResearchService.ts`
- `services/aiBrainService.ts`
- `services/chromeAiService.ts`
- `services/unifiedContext.ts`
- `types.ts`
- `src/config/constants.ts`
- `utils/pdfUtils.ts`
- `scripts/verify-services.ts`

**Renders:**
- `UserProfile`
- `GeminiLiveService`
- `StandardChatService`
- `LeadResearchService`
- `AIBrainService`
- `ResearchResult`
- `AbortController`
- `BrowserCompatibility`
- `AntigravityCanvas`
- `TermsOverlay`
- `AdminDashboard`
- `LandingPage`
- `WebcamPreview`
- `MultimodalChat`
- `ControlPanel`

---

### `index.tsx`

**Imports:**
- `App.tsx`
- `context/ToastContext.tsx`
- `utils/browser-compat.ts`

**Renders:**
- `App`

---

## Components (26 files)

### `App.test.tsx`

**Imports:**

- `App.tsx`
- `context/ToastContext.tsx`

**Renders Components:**

- `App`

---

### `App.tsx`

**Imports:**

- `components/AdminDashboard.tsx`
- `components/AntigravityCanvas.tsx`
- `components/BrowserCompatibility.tsx`
- `components/ControlPanel.tsx`
- `components/LandingPage.tsx`
- `components/MultimodalChat.tsx`
- `components/TermsOverlay.tsx`
- `components/chat/WebcamPreview.tsx`
- `scripts/verify-services.ts`
- `services/aiBrainService.ts`
- `services/chromeAiService.ts`
- `services/geminiLiveService.ts`
- `services/leadResearchService.ts`
- `services/standardChatService.ts`
- `services/unifiedContext.ts`
- `src/config/constants.ts`
- `types.ts`
- `utils/pdfUtils.ts`

**Renders Components:**

- `AIBrainService`
- `AbortController`
- `AdminDashboard`
- `AntigravityCanvas`
- `BrowserCompatibility`
- `ControlPanel`
- `GeminiLiveService`
- `LandingPage`
- `LeadResearchService`
- `MultimodalChat`
- `ResearchResult`
- `StandardChatService`
- `TermsOverlay`
- `UserProfile`
- `WebcamPreview`

---

### `app/test-canvas/page.tsx`

**Renders Components:**

- `AntigravityCanvas`

---

### `components/admin/MeetingCalendarSection.tsx`

**Renders Components:**

- `Meeting`

---

### `components/AdminDashboard.tsx`

**Imports:**

- `components/chat/Attachments.tsx`
- `services/leadResearchService.ts`
- `types.ts`

**Renders Components:**

- `ResearchResult`
- `WebPreviewCard`

---

### `components/AntigravityCanvas.tsx`

**Imports:**

- `utils/visuals/index.ts`

---

### `components/BrowserCompatibility.tsx`

**Imports:**

- `utils/browser-compat.ts`

---

### `components/chat/Attachments.tsx`

**Imports:**

- `components/chat/UIHelpers.tsx`

---

### `components/chat/CalendarWidget.tsx`

*No imports or renders*

---

### `components/chat/ChatInputDock.tsx`

**Imports:**

- `components/chat/Attachments.tsx`
- `components/chat/UIHelpers.tsx`
- `types.ts`

**Renders Components:**

- `StagingArea`
- `Tooltip`

---

### `components/chat/ChatMessage.tsx`

**Imports:**

- `components/chat/Attachments.tsx`
- `components/chat/CalendarWidget.tsx`
- `components/chat/MarkdownRenderer.tsx`
- `components/chat/UIHelpers.tsx`
- `types.ts`

**Renders Components:**

- `CalendarWidget`
- `MarkdownRenderer`
- `Shimmer`
- `WebPreviewCard`

---

### `components/chat/MarkdownRenderer.tsx`

**Renders Components:**

- `CodeBlock`

---

### `components/chat/UIHelpers.tsx`

*No imports or renders*

---

### `components/chat/WebcamPreview.tsx`

**Imports:**

- `utils/visuals/store.ts`

---

### `components/ControlPanel.tsx`

**Imports:**

- `types.ts`

---

### `components/LandingPage.tsx`

**Imports:**

- `components/AntigravityCanvas.tsx`
- `components/ServiceIcon.tsx`
- `components/chat/CalendarWidget.tsx`
- `types.ts`

**Renders Components:**

- `AntigravityCanvas`
- `HTMLInputElement`
- `ServiceIcon`
- `VisualShape`

---

### `components/Logo.tsx`

*No imports or renders*

---

### `components/MultimodalChat.tsx`

**Imports:**

- `components/chat/Attachments.tsx`
- `components/chat/ChatInputDock.tsx`
- `components/chat/ChatMessage.tsx`
- `components/chat/UIHelpers.tsx`
- `types.ts`

**Renders Components:**

- `ChatInputDock`
- `ChatMessage`
- `Lightbox`

---

### `components/ServiceIcon.tsx`

*No imports or renders*

---

### `components/ServiceIconParticles.tsx`

*No imports or renders*

---

### `components/TermsOverlay.tsx`

*No imports or renders*

---

### `components/Transcript.tsx`

*No imports or renders*

---

### `components/ui/Toast.tsx`

*No imports or renders*

---

### `context/ToastContext.tsx`

**Imports:**

- `components/ui/Toast.tsx`

**Renders Components:**

- `Toast`
- `ToastContextType`

---

### `index.tsx`

**Imports:**

- `App.tsx`
- `context/ToastContext.tsx`
- `utils/browser-compat.ts`

**Renders Components:**

- `App`

---

### `src/components/chat/hooks/useConversationFlow.ts`

**Renders Components:**

- `CategoryInsight`

---

## Services (20 files)

### `services/__tests__/aiBrainService.test.ts`

**Imports:**

- `services/__tests__/helpers/mock-fetch.ts`
- `services/__tests__/helpers/test-data.ts`
- `services/aiBrainService.ts`

---

### `services/__tests__/chromeAiService.test.ts`

**Imports:**

- `services/__tests__/helpers/mock-chrome-ai.ts`
- `services/__tests__/helpers/test-data.ts`
- `services/chromeAiService.ts`

---

### `services/__tests__/geminiLiveService.test.ts`

**Imports:**

- `services/__tests__/helpers/mock-audio.ts`
- `services/__tests__/helpers/mock-websocket.ts`
- `services/__tests__/helpers/test-data.ts`
- `services/geminiLiveService.ts`
- `src/core/live/client.ts`

---

### `services/__tests__/helpers/mock-audio.ts`

*No imports or renders*

---

### `services/__tests__/helpers/mock-chrome-ai.ts`

*No imports or renders*

---

### `services/__tests__/helpers/mock-fetch.ts`

*No imports or renders*

---

### `services/__tests__/helpers/mock-google-genai.ts`

*No imports or renders*

---

### `services/__tests__/helpers/mock-websocket.ts`

*No imports or renders*

---

### `services/__tests__/helpers/test-data.ts`

*No imports or renders*

---

### `services/__tests__/integration.test.ts`

**Imports:**

- `services/__tests__/helpers/mock-audio.ts`
- `services/__tests__/helpers/mock-fetch.ts`
- `services/__tests__/helpers/mock-websocket.ts`
- `services/__tests__/helpers/test-data.ts`
- `services/aiBrainService.ts`
- `services/geminiLiveService.ts`
- `services/leadResearchService.ts`
- `services/standardChatService.ts`
- `services/unifiedContext.ts`
- `src/core/live/client.ts`

---

### `services/__tests__/leadResearchService.test.ts`

**Imports:**

- `services/__tests__/helpers/test-data.ts`
- `services/leadResearchService.ts`

---

### `services/__tests__/setup.ts`

*No imports or renders*

---

### `services/__tests__/standardChatService.test.ts`

**Imports:**

- `services/__tests__/helpers/test-data.ts`
- `services/standardChatService.ts`

---

### `services/__tests__/unifiedContext.test.ts`

**Imports:**

- `services/__tests__/helpers/test-data.ts`
- `services/unifiedContext.ts`

---

### `services/aiBrainService.ts`

**Imports:**

- `services/unifiedContext.ts`
- `types.ts`

---

### `services/chromeAiService.ts`

*No imports or renders*

---

### `services/geminiLiveService.ts`

**Imports:**

- `config.ts`
- `services/unifiedContext.ts`
- `src/core/live/client.ts`
- `types.ts`
- `utils/audioUtils.ts`

---

### `services/leadResearchService.ts`

**Imports:**

- `src/config/constants.ts`
- `types.ts`

---

### `services/standardChatService.ts`

**Imports:**

- `services/unifiedContext.ts`
- `src/config/constants.ts`
- `types.ts`

---

### `services/unifiedContext.ts`

**Renders Components:**

- `Location`

---

## Utils & Libraries (121 files)

### `api/_lib/agents/__tests__/agent-flow.test.ts`

**Imports:**

- `api/_lib/agents/orchestrator.ts`

---

### `api/_lib/agents/__tests__/all-agents.smoke.test.ts`

**Imports:**

- `api/_lib/agents/orchestrator.ts`

---

### `api/_lib/agents/__tests__/orchestrator.test.ts`

**Imports:**

- `api/_lib/agents/orchestrator.ts`

---

### `api/_lib/agents/__tests__/preprocess-intent.spec.ts`

*No imports or renders*

---

### `api/_lib/agents/admin-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/core/analytics/agent-analytics.ts`
- `api/_lib/core/analytics/tool-analytics.ts`
- `api/_lib/core/tools/tool-executor.ts`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/schemas/admin.ts`
- `api/_lib/supabase/client.ts`
- `api/_lib/utils/ai-client.ts`
- `api/_lib/utils/format-messages.ts`

---

### `api/_lib/agents/agent-persistence.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`
- `api/_lib/core/queue/job-types.ts`
- `api/_lib/core/queue/redis-queue.ts`
- `api/_lib/lib/vercel-cache.ts`
- `api/_lib/schemas/agents.ts`
- `api/_lib/utils/hash-utils.ts`
- `api/_lib/utils/logger.ts`

---

### `api/_lib/agents/closer-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/core/tools/tool-executor.ts`
- `api/_lib/utils/ai-client.ts`
- `api/_lib/utils/format-messages.ts`

---

### `api/_lib/agents/consulting-sales-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/core/tools/tool-executor.ts`
- `api/_lib/utils/ai-client.ts`
- `api/_lib/utils/format-messages.ts`

---

### `api/_lib/agents/discovery-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/core/chat/conversation-phrases.ts`
- `api/_lib/schemas/agents.ts`
- `api/_lib/utils/ai-client.ts`
- `api/_lib/utils/exit-detection.ts`
- `api/_lib/utils/format-messages.ts`

---

### `api/_lib/agents/index.ts`

*No imports or renders*

---

### `api/_lib/agents/intent.ts`

*No imports or renders*

---

### `api/_lib/agents/lead-intelligence-agent.ts`

**Imports:**

- `api/_lib/core/intelligence/lead-research.ts`

---

### `api/_lib/agents/orchestrator.ts`

**Imports:**

- `api/_lib/agents/admin-agent.ts`
- `api/_lib/agents/agent-persistence.ts`
- `api/_lib/agents/closer-agent.ts`
- `api/_lib/agents/consulting-sales-agent.ts`
- `api/_lib/agents/discovery-agent.ts`
- `api/_lib/agents/intent.ts`
- `api/_lib/agents/proposal-agent.ts`
- `api/_lib/agents/retargeting-agent.ts`
- `api/_lib/agents/scoring-agent.ts`
- `api/_lib/agents/summary-agent.ts`
- `api/_lib/agents/workshop-sales-agent.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/core/analytics/agent-analytics.ts`
- `api/_lib/core/security/audit-logger.ts`
- `api/_lib/utils/usage-limits.ts`

---

### `api/_lib/agents/proposal-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/utils/ai-client.ts`

**Renders Components:**

- `Annual`
- `Calculate`
- `Months`
- `Pain`
- `Productivity`
- `Sum`

---

### `api/_lib/agents/retargeting-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/utils/ai-client.ts`

---

### `api/_lib/agents/scoring-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/schemas/agents.ts`
- `api/_lib/utils/ai-client.ts`

---

### `api/_lib/agents/summary-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/utils/ai-client.ts`

---

### `api/_lib/agents/types.ts`

*No imports or renders*

---

### `api/_lib/agents/workshop-sales-agent.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/core/tools/tool-executor.ts`
- `api/_lib/utils/ai-client.ts`
- `api/_lib/utils/format-messages.ts`

---

### `api/_lib/app/api-utils/auth.ts`

**Imports:**

- `api/_lib/core/auth.ts`

**Renders Components:**

- `Response`

---

### `api/_lib/app/api-utils/rate-limiting.ts`

*No imports or renders*

---

### `api/_lib/config/constants.ts`

*No imports or renders*

---

### `api/_lib/config/env.ts`

*No imports or renders*

---

### `api/_lib/config/live-tools.ts`

*No imports or renders*

---

### `api/_lib/context/context-intelligence.ts`

*No imports or renders*

---

### `api/_lib/context/context-manager.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`
- `api/_lib/context/flow-sync.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/utils/logger.ts`

---

### `api/_lib/context/context-storage.ts`

**Imports:**

- `api/_lib/context/context-types.ts`
- `api/_lib/lib/ai/retry-config.ts`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/lib/supabase.ts`
- `api/_lib/types/json-guards.ts`

**Renders Components:**

- `DatabaseConversationContext`

---

### `api/_lib/context/context-summarizer.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/utils/ai-client.ts`

---

### `api/_lib/context/context-types.ts`

*No imports or renders*

---

### `api/_lib/context/conversation-history.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `api/_lib/utils/env-setup.ts`
- `api/_lib/utils/permissions.ts`

---

### `api/_lib/context/flow-sync.ts`

**Imports:**

- `api/_lib/types/conversation-flow-types.ts`

**Renders Components:**

- `CategoryInsight`

---

### `api/_lib/context/multimodal-context.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/context/context-intelligence.ts`
- `api/_lib/context/context-storage.ts`
- `api/_lib/context/context-summarizer.ts`
- `api/_lib/context/context-types.ts`
- `api/_lib/context/write-ahead-log.ts`
- `api/_lib/core/embeddings/gemini.ts`
- `api/_lib/core/embeddings/query.ts`
- `api/_lib/core/security/audit-logger.ts`
- `api/_lib/core/security/pii-detector.ts`
- `api/_lib/lib/vercel-cache.ts`

**Renders Components:**

- `ConversationEntry`
- `MultimodalContext`

---

### `api/_lib/context/write-ahead-log.ts`

**Imports:**

- `api/_lib/context/context-types.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/core/queue/job-types.ts`
- `api/_lib/core/queue/redis-queue.ts`
- `api/_lib/lib/supabase.ts`
- `api/_lib/lib/vercel-cache.ts`

**Renders Components:**

- `MultimodalContext`

---

### `api/_lib/core/admin/admin-chat-service.ts`

**Imports:**

- `api/_lib/supabase/client.ts`

---

### `api/_lib/core/analytics/agent-analytics.ts`

**Imports:**

- `api/_lib/lib/supabase.ts`
- `api/_lib/types/json-guards.ts`

---

### `api/_lib/core/analytics/tool-analytics.ts`

**Imports:**

- `api/_lib/types/json-guards.ts`
- `api/_lib/utils/supabase.ts`

---

### `api/_lib/core/auth.ts`

**Renders Components:**

- `JWTPayload`

---

### `api/_lib/core/chat/conversation-phrases.ts`

*No imports or renders*

---

### `api/_lib/core/email-service.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/utils/json.ts`
- `api/_lib/utils/logger.ts`

---

### `api/_lib/core/embeddings/gemini.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/config/env.ts`

---

### `api/_lib/core/embeddings/query.ts`

**Imports:**

- `api/_lib/utils/supabase.ts`

---

### `api/_lib/core/intelligence/lead-research.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/config/env.ts`
- `api/_lib/core/intelligence/providers/search/google-grounding.ts`
- `api/_lib/lib/ai-cache.ts`

---

### `api/_lib/core/intelligence/providers/search/google-grounding.ts`

*No imports or renders*

---

### `api/_lib/core/live/client.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/lib/ai/retry-config.ts`
- `api/_lib/utils/json.ts`

**Renders Components:**

- `K`

---

### `api/_lib/core/live/types.ts`

*No imports or renders*

---

### `api/_lib/core/pdf-generator-puppeteer.ts`

*No imports or renders*

---

### `api/_lib/core/pdf-roi-charts.ts`

*No imports or renders*

---

### `api/_lib/core/queue/job-types.ts`

**Renders Components:**

- `T`

---

### `api/_lib/core/queue/redis-queue.ts`

**Imports:**

- `api/_lib/core/queue/job-types.ts`
- `api/_lib/core/queue/workers.ts`
- `api/_lib/lib/ai/retry-config.ts`
- `api/_lib/lib/vercel-cache.ts`

**Renders Components:**

- `T`

---

### `api/_lib/core/queue/workers.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`
- `api/_lib/core/queue/job-types.ts`
- `api/_lib/core/queue/redis-queue.ts`
- `api/_lib/lib/supabase.ts`

---

### `api/_lib/core/security/audit-logger.ts`

**Imports:**

- `api/_lib/types/json-guards.ts`
- `api/_lib/utils/supabase.ts`

---

### `api/_lib/core/security/pii-detector.ts`

*No imports or renders*

---

### `api/_lib/core/token-usage-logger.ts`

*No imports or renders*

---

### `api/_lib/core/tools/calculate-roi.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`
- `api/_lib/core/pdf-roi-charts.ts`

---

### `api/_lib/core/tools/draft-follow-up-email.ts`

**Imports:**

- `api/_lib/config/constants.ts`
- `api/_lib/context/context-storage.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/core/pdf-generator-puppeteer.ts`
- `api/_lib/utils/ai-client.ts`

---

### `api/_lib/core/tools/extract-action-items.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `api/_lib/core/pdf-generator-puppeteer.ts`

---

### `api/_lib/core/tools/generate-proposal.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`

---

### `api/_lib/core/tools/generate-summary-preview.ts`

**Imports:**

- `api/_lib/context/context-storage.ts`
- `api/_lib/context/multimodal-context.ts`
- `api/_lib/core/pdf-generator-puppeteer.ts`

---

### `api/_lib/core/tools/shared-tool-registry.ts`

**Imports:**

- `api/_lib/core/tools/calculate-roi.ts`
- `api/_lib/core/tools/draft-follow-up-email.ts`
- `api/_lib/core/tools/extract-action-items.ts`
- `api/_lib/core/tools/generate-proposal.ts`
- `api/_lib/core/tools/generate-summary-preview.ts`
- `api/_lib/core/tools/shared-tools.ts`

---

### `api/_lib/core/tools/shared-tools.ts`

*No imports or renders*

---

### `api/_lib/core/tools/tool-executor.ts`

**Imports:**

- `api/_lib/core/security/audit-logger.ts`
- `api/_lib/lib/vercel-cache.ts`
- `api/_lib/utils/code-quality.ts`

**Renders Components:**

- `T`

---

### `api/_lib/core/tools/tool-types.ts`

*No imports or renders*

---

### `api/_lib/core/tools/types.ts`

**Renders Components:**

- `T`

---

### `api/_lib/lib/ai-cache.ts`

**Renders Components:**

- `T`

---

### `api/_lib/lib/ai/retry-config.ts`

**Imports:**

- `api/_lib/config/constants.ts`

---

### `api/_lib/lib/ai/retry-model.ts`

**Imports:**

- `api/_lib/lib/ai/retry-config.ts`

---

### `api/_lib/lib/api-middleware.ts`

*No imports or renders*

---

### `api/_lib/lib/api/response.ts`

*No imports or renders*

---

### `api/_lib/lib/errors.ts`

*No imports or renders*

---

### `api/_lib/lib/supabase-parsers.ts`

**Imports:**

- `api/_lib/schemas/supabase.ts`
- `api/_lib/utils/guards.ts`

---

### `api/_lib/lib/supabase.ts`

*No imports or renders*

---

### `api/_lib/lib/vercel-cache.ts`

**Imports:**

- `api/_lib/utils/logger.ts`

**Renders Components:**

- `T`

---

### `api/_lib/live-api/tool-processor.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `api/_lib/message-types`
- `api/_lib/rate-limiting/websocket-rate-limiter`
- `api/_lib/supabase/client.ts`
- `api/_lib/utils/env-setup.ts`
- `api/_lib/utils/websocket-helpers`
- `api/context/multimodal-context`

---

### `api/_lib/schemas/admin-api.ts`

*No imports or renders*

---

### `api/_lib/schemas/admin.ts`

*No imports or renders*

---

### `api/_lib/schemas/agents.ts`

*No imports or renders*

---

### `api/_lib/schemas/supabase.ts`

*No imports or renders*

---

### `api/_lib/supabase/client.ts`

**Imports:**

- `api/_lib/lib/supabase.ts`
- `api/_lib/supabase/database.types.ts`

---

### `api/_lib/supabase/database.types.ts`

*No imports or renders*

---

### `api/_lib/supabase/supabase.ts`

*No imports or renders*

---

### `api/_lib/types/conversation-flow-types.ts`

**Renders Components:**

- `CategoryInsight`

---

### `api/_lib/types/conversation-flow.ts`

*No imports or renders*

---

### `api/_lib/types/core.ts`

*No imports or renders*

---

### `api/_lib/types/json-guards.ts`

*No imports or renders*

---

### `api/_lib/utils/ai-client.ts`

**Imports:**

- `api/_lib/config/env.ts`
- `api/_lib/lib/ai/retry-model.ts`

---

### `api/_lib/utils/ai/retry-config.ts`

*No imports or renders*

---

### `api/_lib/utils/code-quality.ts`

**Imports:**

- `api/_lib/lib/errors.ts`
- `api/_lib/utils/json.ts`
- `api/_lib/utils/text-utils.ts`

**Renders Components:**

- `T`

---

### `api/_lib/utils/env-setup.ts`

*No imports or renders*

---

### `api/_lib/utils/exit-detection.ts`

*No imports or renders*

---

### `api/_lib/utils/format-messages.ts`

*No imports or renders*

---

### `api/_lib/utils/guards.ts`

*No imports or renders*

---

### `api/_lib/utils/hash-utils.ts`

*No imports or renders*

---

### `api/_lib/utils/json.ts`

**Imports:**

- `api/_lib/lib/errors.ts`

**Renders Components:**

- `T`

---

### `api/_lib/utils/logger.ts`

*No imports or renders*

---

### `api/_lib/utils/permissions.ts`

*No imports or renders*

---

### `api/_lib/utils/supabase-parsers.ts`

**Imports:**

- `api/_lib/schemas/supabase.ts`
- `api/_lib/utils/guards.ts`

---

### `api/_lib/utils/supabase.ts`

*No imports or renders*

---

### `api/_lib/utils/text-utils.ts`

*No imports or renders*

---

### `api/_lib/utils/turn-completion.ts`

*No imports or renders*

---

### `api/_lib/utils/usage-limits.ts`

**Renders Components:**

- `SessionUsage`

---

### `api/_lib/utils/vercel-cache.ts`

**Imports:**

- `api/_lib/utils/logger.ts`

**Renders Components:**

- `T`

---

### `server/utils/admin-check.ts`

*No imports or renders*

---

### `server/utils/env-setup.ts`

**Imports:**

- `src/config/env.ts`
- `src/lib/logger.ts`

---

### `server/utils/errors.ts`

*No imports or renders*

---

### `server/utils/json.ts`

**Imports:**

- `server/utils/errors.ts`

**Renders Components:**

- `T`

---

### `server/utils/permissions.ts`

*No imports or renders*

---

### `server/utils/tool-implementations.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/utils/env-setup.ts`

---

### `server/utils/turn-completion.ts`

**Imports:**

- `server/message-types.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`

---

### `server/utils/websocket-helpers.ts`

**Imports:**

- `server/utils/env-setup.ts`

---

### `utils/audioUtils.ts`

*No imports or renders*

---

### `utils/browser-compat.ts`

*No imports or renders*

---

### `utils/pdfUtils.ts`

**Imports:**

- `types.ts`

---

### `utils/utils.test.ts`

**Imports:**

- `config.ts`

---

### `utils/visuals/agentShapes.ts`

**Imports:**

- `utils/visuals/mathHelpers.ts`
- `utils/visuals/types.ts`

---

### `utils/visuals/complexShapes.ts`

**Imports:**

- `utils/visuals/geometricShapes.ts`
- `utils/visuals/mathHelpers.ts`
- `utils/visuals/store.ts`
- `utils/visuals/types.ts`

---

### `utils/visuals/cosmicShapes.ts`

**Imports:**

- `utils/visuals/mathHelpers.ts`
- `utils/visuals/types.ts`

---

### `utils/visuals/geometricShapes.ts`

**Imports:**

- `utils/visuals/mathHelpers.ts`
- `utils/visuals/types.ts`

---

### `utils/visuals/index.ts`

**Imports:**

- `types.ts`
- `utils/visuals/agentShapes.ts`
- `utils/visuals/complexShapes.ts`
- `utils/visuals/cosmicShapes.ts`
- `utils/visuals/geometricShapes.ts`
- `utils/visuals/types.ts`

---

### `utils/visuals/mathHelpers.ts`

**Imports:**

- `utils/visuals/types.ts`

---

### `utils/visuals/store.ts`

*No imports or renders*

---

### `utils/visuals/types.ts`

**Imports:**

- `types.ts`

---

## Configuration (10 files)

### `api/_archive/live-config.ts`

**Imports:**

- `api/_archive/_lib/context/conversation-history`
- `api/_archive/_lib/live-api/config-builder`

---

### `config.ts`

*No imports or renders*

---

### `server/src/config/constants.ts`

*No imports or renders*

---

### `server/src/config/live-tools.ts`

*No imports or renders*

---

### `src/config/constants.ts`

*No imports or renders*

---

### `src/config/env.ts`

*No imports or renders*

---

### `src/config/live-tools.ts`

*No imports or renders*

---

### `src/lib/ai/retry-config.ts`

*No imports or renders*

---

### `vite.config.ts`

*No imports or renders*

---

### `vitest.config.ts`

*No imports or renders*

---

## Types (10 files)

### `server/message-payload-types.ts`

*No imports or renders*

---

### `server/message-types.ts`

*No imports or renders*

---

### `src/core/database.types.ts`

*No imports or renders*

---

### `src/core/live/types.ts`

*No imports or renders*

---

### `src/core/queue/job-types.ts`

**Renders Components:**

- `T`

---

### `src/core/tools/tool-types.ts`

*No imports or renders*

---

### `src/core/tools/types.ts`

**Renders Components:**

- `T`

---

### `src/types/conversation-flow.ts`

*No imports or renders*

---

### `src/types/core.ts`

*No imports or renders*

---

### `types.ts`

*No imports or renders*

---

## Other Files (111 files)

### `api-local-server.ts`

**Imports:**

- `api/chat.ts`
- `api/chat/persist-batch.ts`
- `api/chat/persist-message.ts`

---

### `api/_admin-disabled/analytics/route.ts`

**Imports:**

- `api/_lib/core/analytics/agent-analytics.ts`
- `api/_lib/core/analytics/tool-analytics.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/date-utils`
- `api/_lib/lib/logger`

---

### `api/_admin-disabled/conversations/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/src/core/supabase/client`

---

### `api/_admin-disabled/email-campaigns/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/json`
- `api/_lib/lib/logger`
- `api/_lib/schemas/admin-api.ts`
- `api/_lib/src/core/supabase/client`

---

### `api/_admin-disabled/failed-conversations/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/src/core/db/conversations`

---

### `api/_admin-disabled/flyio/settings/route.ts`

*No imports or renders*

---

### `api/_admin-disabled/flyio/usage/route.ts`

*No imports or renders*

---

### `api/_admin-disabled/interaction-analytics/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/src/core/supabase/client`

---

### `api/_admin-disabled/meetings/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/src/core/supabase/client`

---

### `api/_admin-disabled/real-time-activity/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/logger`

---

### `api/_admin-disabled/security-audit/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/src/core/supabase/client`
- `api/_lib/utils/guards.ts`

---

### `api/_admin-disabled/stats/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/logger`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/schemas/stats-api`
- `api/_lib/src/core/supabase/client`

---

### `api/_admin-disabled/system-health/route.ts`

**Imports:**

- `api/_lib/config/constants.ts`

---

### `api/_archive/chat/persist.ts`

**Imports:**

- `api/_archive/_lib/context/multimodal-context`

---

### `api/_archive/chat/tools.ts`

**Imports:**

- `api/_archive/_lib/supabase/client`
- `api/_archive/_lib/utils/env-setup`
- `api/_archive/_lib/utils/permissions`

---

### `api/admin/ai-performance/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/supabase/client.ts`
- `api/_lib/utils/logger.ts`

---

### `api/admin/login/route.ts`

**Imports:**

- `api/_lib/core/auth.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/utils/logger.ts`

---

### `api/admin/logout/route.ts`

**Imports:**

- `api/_lib/lib/api-middleware.ts`
- `api/_lib/utils/logger.ts`

---

### `api/admin/sessions/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/core/admin/admin-chat-service.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/lib/supabase-parsers.ts`
- `api/_lib/schemas/admin-api.ts`
- `api/_lib/supabase/client.ts`
- `api/_lib/utils/json.ts`
- `api/_lib/utils/logger.ts`

---

### `api/admin/token-costs/route.ts`

**Imports:**

- `api/_lib/app/api-utils/auth.ts`
- `api/_lib/app/api-utils/rate-limiting.ts`
- `api/_lib/core/token-usage-logger.ts`
- `api/_lib/lib/api-middleware.ts`
- `api/_lib/lib/api/response.ts`
- `api/_lib/supabase/client.ts`
- `api/_lib/utils/logger.ts`

---

### `api/chat.ts`

**Imports:**

- `api/_lib/agents/orchestrator.ts`
- `api/_lib/core/queue/redis-queue.ts`

---

### `api/chat/persist-batch.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`

---

### `api/chat/persist-message.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`

---

### `api/live.ts`

*No imports or renders*

---

### `api/send-pdf-summary/route.ts`

**Imports:**

- `api/_lib/core/email-service.ts`
- `api/_lib/lib/supabase.ts`
- `api/_lib/utils/logger.ts`

---

### `api/test-chat.js`

**Imports:**

- `api/chat.ts`

---

### `e2e/voice-browser-tests.spec.ts`

*No imports or renders*

---

### `scripts/analyze-connections.ts`

*No imports or renders*

---

### `scripts/check-models.ts`

*No imports or renders*

---

### `scripts/diagnose-features.ts`

*No imports or renders*

---

### `scripts/generate-import-map.ts`

**Renders Components:**

- `ComponentName`

---

### `scripts/validate-server-imports.ts`

**Imports:**

- `../src/core`
- `../src/core/context/$1`
- `../src/core/prompts`

---

### `scripts/verify-services.ts`

**Imports:**

- `services/aiBrainService.ts`
- `services/chromeAiService.ts`
- `services/leadResearchService.ts`
- `services/standardChatService.ts`
- `services/unifiedContext.ts`
- `src/config/env.ts`

---

### `server/__tests__/server.test.ts`

*No imports or renders*

---

### `server/context/conversation-history.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`

---

### `server/context/injection.ts`

**Imports:**

- `server/utils/env-setup.ts`
- `src/config/constants.ts`

---

### `server/context/orchestrator-sync.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/message-types.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`
- `src/core/context/context-storage.ts`

---

### `server/handlers/audio-handler.ts`

**Imports:**

- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/turn-completion.ts`
- `server/utils/websocket-helpers.ts`

---

### `server/handlers/close-handler.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/context/orchestrator-sync.ts`
- `server/utils/env-setup.ts`
- `server/utils/turn-completion.ts`
- `src/config/constants.ts`

---

### `server/handlers/context-update-handler.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/context/injection.ts`
- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`
- `src/config/constants.ts`

---

### `server/handlers/realtime-input-handler.ts`

**Imports:**

- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`

---

### `server/handlers/start-handler.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/context/conversation-history.ts`
- `server/context/orchestrator-sync.ts`
- `server/live-api/config-builder.ts`
- `server/live-api/session-manager.ts`
- `server/live-api/tool-processor.ts`
- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/turn-completion.ts`
- `server/utils/websocket-helpers.ts`
- `src/config/constants.ts`
- `src/config/env.ts`
- `src/core/context/multimodal-context`
- `src/core/session/session-coordinator.ts`

---

### `server/handlers/tool-result-handler.ts`

**Imports:**

- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`

---

### `server/jest.config.js`

*No imports or renders*

---

### `server/jest.setup.js`

*No imports or renders*

---

### `server/live-api/session-manager.ts`

**Imports:**

- `server/utils/env-setup.ts`
- `src/config/constants.ts`
- `src/config/env.ts`

---

### `server/live-api/tool-processor.ts`

**Imports:**

- `api/_lib/context/multimodal-context.ts`
- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/tool-implementations.ts`
- `server/utils/websocket-helpers.ts`
- `src/core/supabase/client.ts`

---

### `server/live-server.ts`

**Imports:**

- `server/handlers/audio-handler.ts`
- `server/handlers/close-handler.ts`
- `server/handlers/context-update-handler.ts`
- `server/handlers/realtime-input-handler.ts`
- `server/handlers/start-handler.ts`
- `server/handlers/tool-result-handler.ts`
- `server/utils/env-setup.ts`
- `server/websocket/connection-manager.ts`
- `server/websocket/message-router.ts`
- `server/websocket/server.ts`

---

### `server/rate-limiting/websocket-rate-limiter.ts`

**Imports:**

- `server/message-types.ts`
- `server/utils/admin-check.ts`

---

### `server/session-logger.ts`

*No imports or renders*

---

### `server/verify-live-connection.ts`

*No imports or renders*

---

### `server/websocket/connection-manager.ts`

**Imports:**

- `server/handlers/close-handler.ts`
- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/session-logger.ts`
- `server/utils/env-setup.ts`
- `server/utils/websocket-helpers.ts`

---

### `server/websocket/message-router.ts`

**Imports:**

- `server/handlers/audio-handler.ts`
- `server/handlers/close-handler.ts`
- `server/handlers/context-update-handler.ts`
- `server/handlers/realtime-input-handler.ts`
- `server/handlers/start-handler.ts`
- `server/handlers/tool-result-handler.ts`
- `server/message-types.ts`
- `server/rate-limiting/websocket-rate-limiter.ts`
- `server/utils/env-setup.ts`
- `server/utils/errors.ts`
- `server/utils/json.ts`
- `server/utils/turn-completion.ts`
- `server/utils/websocket-helpers.ts`
- `src/config/constants.ts`

**Renders Components:**

- `ParsedMessage`

---

### `server/websocket/server.ts`

**Imports:**

- `server/message-types.ts`
- `server/utils/env-setup.ts`
- `src/config/constants.ts`

---

### `src/core/admin/admin-chat-service.ts`

**Imports:**

- `src/core/embeddings/gemini`
- `src/core/supabase/client.ts`

---

### `src/core/analytics/agent-analytics.ts`

**Imports:**

- `src/core/types/json-guards`

---

### `src/core/analytics/tool-analytics.ts`

**Imports:**

- `src/core/types/json-guards`

---

### `src/core/auth.ts`

**Renders Components:**

- `JWTPayload`

---

### `src/core/chat/conversation-phrases.ts`

*No imports or renders*

---

### `src/core/context/context-manager.ts`

**Imports:**

- `src/api/_lib/context/multimodal-context`

---

### `src/core/context/context-storage.ts`

**Imports:**

- `src/core/context/context-types`
- `src/core/types/json-guards`
- `src/lib/ai/retry-config.ts`
- `src/lib/supabase-parsers.ts`
- `src/lib/supabase.ts`

**Renders Components:**

- `DatabaseConversationContext`

---

### `src/core/context/context-summarizer.ts`

**Imports:**

- `src/config/constants.ts`
- `src/lib/ai-client.ts`

---

### `src/core/context/flow-sync.ts`

**Renders Components:**

- `CategoryInsight`

---

### `src/core/context/write-ahead-log.ts`

*No imports or renders*

---

### `src/core/email-service.ts`

*No imports or renders*

---

### `src/core/handlers/request-parser.ts`

*No imports or renders*

---

### `src/core/intelligence/lead-research.ts`

**Imports:**

- `src/core/intelligence/providers/search/google-grounding`

---

### `src/core/live/__tests__/client.test.ts`

**Imports:**

- `src/core/live/client.ts`

---

### `src/core/live/client.ts`

**Renders Components:**

- `K`

---

### `src/core/queue/redis-queue.ts`

**Imports:**

- `src/core/queue/job-types.ts`
- `src/core/queue/workers.ts`

**Renders Components:**

- `T`

---

### `src/core/queue/workers.ts`

**Imports:**

- `src/core/context/context-storage.ts`
- `src/core/context/context-types`
- `src/core/email-service.ts`
- `src/core/queue/job-types.ts`
- `src/core/queue/redis-queue.ts`

---

### `src/core/security/audit-logger.ts`

**Imports:**

- `src/core/types/json-guards`
- `src/lib/supabase.ts`

---

### `src/core/session/__tests__/session-coordinator-integration.test.ts`

**Imports:**

- `src/core/session/session-coordinator.ts`

---

### `src/core/session/__tests__/session-coordinator.test.ts`

**Imports:**

- `src/core/session/session-coordinator.ts`

---

### `src/core/session/__tests__/stubs/next-server.ts`

*No imports or renders*

---

### `src/core/session/session-coordinator.ts`

*No imports or renders*

---

### `src/core/supabase/client.ts`

**Imports:**

- `src/core/database.types.ts`
- `src/lib/supabase.ts`

---

### `src/core/tools/calculate-roi.ts`

**Imports:**

- `src/core/context/context-storage.ts`
- `src/core/pdf-roi-charts`

---

### `src/core/tools/draft-follow-up-email.ts`

**Imports:**

- `src/core/context/context-storage.ts`
- `src/core/context/multimodal-context`
- `src/core/pdf-generator-puppeteer`

---

### `src/core/tools/extract-action-items.ts`

**Imports:**

- `src/core/context/multimodal-context`
- `src/core/pdf-generator-puppeteer`

---

### `src/core/tools/generate-proposal.ts`

**Imports:**

- `src/core/context/context-storage.ts`

---

### `src/core/tools/generate-summary-preview.ts`

**Imports:**

- `src/core/context/context-storage.ts`
- `src/core/context/multimodal-context`
- `src/core/pdf-generator-puppeteer`

---

### `src/core/tools/shared-tool-registry.ts`

**Imports:**

- `src/core/tools/calculate-roi.ts`
- `src/core/tools/draft-follow-up-email.ts`
- `src/core/tools/extract-action-items.ts`
- `src/core/tools/generate-proposal.ts`
- `src/core/tools/generate-summary-preview.ts`
- `src/core/tools/shared-tools.ts`

---

### `src/core/tools/shared-tools.ts`

*No imports or renders*

---

### `src/core/tools/tool-executor.ts`

**Renders Components:**

- `T`

---

### `src/hooks/useWebSocketManager.ts`

**Renders Components:**

- `LiveClientWS`

---

### `src/hooks/voice/connection/connection-state.ts`

*No imports or renders*

---

### `src/hooks/voice/connection/websocket-manager.ts`

**Renders Components:**

- `LiveClientWS`

---

### `src/lib/ai-cache.ts`

**Renders Components:**

- `T`

---

### `src/lib/ai-client.ts`

*No imports or renders*

---

### `src/lib/audio/index.ts`

*No imports or renders*

---

### `src/lib/audio/player.ts`

*No imports or renders*

---

### `src/lib/code-quality.ts`

**Imports:**

- `src/lib/text-utils`

**Renders Components:**

- `T`

---

### `src/lib/errors.ts`

*No imports or renders*

---

### `src/lib/exit-detection.ts`

*No imports or renders*

---

### `src/lib/hash-utils.ts`

*No imports or renders*

---

### `src/lib/json.ts`

**Renders Components:**

- `T`

---

### `src/lib/logger.ts`

*No imports or renders*

---

### `src/lib/supabase-logger.ts`

*No imports or renders*

---

### `src/lib/supabase-parsers.ts`

*No imports or renders*

---

### `src/lib/supabase.ts`

*No imports or renders*

---

### `src/lib/usage-limits.ts`

**Renders Components:**

- `SessionUsage`

---

### `src/lib/vercel-cache.ts`

**Imports:**

- `src/lib/logger.ts`

**Renders Components:**

- `T`

---

### `src/schemas/admin.ts`

*No imports or renders*

---

### `src/schemas/agents.ts`

*No imports or renders*

---

### `src/schemas/supabase.ts`

*No imports or renders*

---

### `test-email-service.ts`

**Imports:**

- `src/core/email-service.ts`

---

### `test-zod.ts`

*No imports or renders*

---

### `test/voice-mode-e2e.test.ts`

**Imports:**

- `services/geminiLiveService.ts`
- `test/voice-test-utils.ts`

---

### `test/voice-production-integration.test.ts`

**Imports:**

- `api/_lib/core/live/client.ts`

---

### `test/voice-test-utils.ts`

*No imports or renders*

---

## Dependency Graph

### Import Relationships

```
App.test.tsx -> App.tsx
App.test.tsx -> context/ToastContext.tsx
App.tsx -> components/AdminDashboard.tsx
App.tsx -> components/AntigravityCanvas.tsx
App.tsx -> components/BrowserCompatibility.tsx
App.tsx -> components/ControlPanel.tsx
App.tsx -> components/LandingPage.tsx
App.tsx -> components/MultimodalChat.tsx
App.tsx -> components/TermsOverlay.tsx
App.tsx -> components/chat/WebcamPreview.tsx
App.tsx -> scripts/verify-services.ts
App.tsx -> services/aiBrainService.ts
App.tsx -> services/chromeAiService.ts
App.tsx -> services/geminiLiveService.ts
App.tsx -> services/leadResearchService.ts
App.tsx -> services/standardChatService.ts
App.tsx -> services/unifiedContext.ts
App.tsx -> src/config/constants.ts
App.tsx -> types.ts
App.tsx -> utils/pdfUtils.ts
api-local-server.ts -> api/chat.ts
api-local-server.ts -> api/chat/persist-batch.ts
api-local-server.ts -> api/chat/persist-message.ts
api/_admin-disabled/analytics/route.ts -> api/_lib/core/analytics/agent-analytics.ts
api/_admin-disabled/analytics/route.ts -> api/_lib/core/analytics/tool-analytics.ts
api/_admin-disabled/analytics/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/analytics/route.ts -> api/_lib/lib/date-utils
api/_admin-disabled/analytics/route.ts -> api/_lib/lib/logger
api/_admin-disabled/conversations/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/conversations/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/conversations/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/conversations/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/conversations/route.ts -> api/_lib/lib/logger
api/_admin-disabled/conversations/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/lib/json
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/lib/logger
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/schemas/admin-api.ts
api/_admin-disabled/email-campaigns/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/lib/logger
api/_admin-disabled/failed-conversations/route.ts -> api/_lib/src/core/db/conversations
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/lib/logger
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/lib/supabase-parsers.ts
api/_admin-disabled/interaction-analytics/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/meetings/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/meetings/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/meetings/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/meetings/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/meetings/route.ts -> api/_lib/lib/logger
api/_admin-disabled/meetings/route.ts -> api/_lib/lib/supabase-parsers.ts
api/_admin-disabled/meetings/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/real-time-activity/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/real-time-activity/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/real-time-activity/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/real-time-activity/route.ts -> api/_lib/lib/logger
api/_admin-disabled/security-audit/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/security-audit/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/security-audit/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/security-audit/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/security-audit/route.ts -> api/_lib/lib/logger
api/_admin-disabled/security-audit/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/security-audit/route.ts -> api/_lib/utils/guards.ts
api/_admin-disabled/stats/route.ts -> api/_lib/app/api-utils/auth.ts
api/_admin-disabled/stats/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/_admin-disabled/stats/route.ts -> api/_lib/lib/api-middleware.ts
api/_admin-disabled/stats/route.ts -> api/_lib/lib/api/response.ts
api/_admin-disabled/stats/route.ts -> api/_lib/lib/logger
api/_admin-disabled/stats/route.ts -> api/_lib/lib/supabase-parsers.ts
api/_admin-disabled/stats/route.ts -> api/_lib/schemas/stats-api
api/_admin-disabled/stats/route.ts -> api/_lib/src/core/supabase/client
api/_admin-disabled/system-health/route.ts -> api/_lib/config/constants.ts
api/_archive/chat/persist.ts -> api/_archive/_lib/context/multimodal-context
api/_archive/chat/tools.ts -> api/_archive/_lib/supabase/client
api/_archive/chat/tools.ts -> api/_archive/_lib/utils/env-setup
api/_archive/chat/tools.ts -> api/_archive/_lib/utils/permissions
api/_archive/live-config.ts -> api/_archive/_lib/context/conversation-history
api/_archive/live-config.ts -> api/_archive/_lib/live-api/config-builder
api/_lib/agents/__tests__/agent-flow.test.ts -> api/_lib/agents/orchestrator.ts
api/_lib/agents/__tests__/all-agents.smoke.test.ts -> api/_lib/agents/orchestrator.ts
api/_lib/agents/__tests__/orchestrator.test.ts -> api/_lib/agents/orchestrator.ts
api/_lib/agents/admin-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/admin-agent.ts -> api/_lib/core/analytics/agent-analytics.ts
api/_lib/agents/admin-agent.ts -> api/_lib/core/analytics/tool-analytics.ts
api/_lib/agents/admin-agent.ts -> api/_lib/core/tools/tool-executor.ts
api/_lib/agents/admin-agent.ts -> api/_lib/lib/supabase-parsers.ts
api/_lib/agents/admin-agent.ts -> api/_lib/schemas/admin.ts
api/_lib/agents/admin-agent.ts -> api/_lib/supabase/client.ts
api/_lib/agents/admin-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/admin-agent.ts -> api/_lib/utils/format-messages.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/context/context-storage.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/core/queue/job-types.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/core/queue/redis-queue.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/lib/vercel-cache.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/schemas/agents.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/utils/hash-utils.ts
api/_lib/agents/agent-persistence.ts -> api/_lib/utils/logger.ts
api/_lib/agents/closer-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/closer-agent.ts -> api/_lib/core/tools/tool-executor.ts
api/_lib/agents/closer-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/closer-agent.ts -> api/_lib/utils/format-messages.ts
api/_lib/agents/consulting-sales-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/consulting-sales-agent.ts -> api/_lib/core/tools/tool-executor.ts
api/_lib/agents/consulting-sales-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/consulting-sales-agent.ts -> api/_lib/utils/format-messages.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/core/chat/conversation-phrases.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/schemas/agents.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/utils/exit-detection.ts
api/_lib/agents/discovery-agent.ts -> api/_lib/utils/format-messages.ts
api/_lib/agents/lead-intelligence-agent.ts -> api/_lib/core/intelligence/lead-research.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/admin-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/agent-persistence.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/closer-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/consulting-sales-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/discovery-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/intent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/proposal-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/retargeting-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/scoring-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/summary-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/agents/workshop-sales-agent.ts
api/_lib/agents/orchestrator.ts -> api/_lib/context/multimodal-context.ts
api/_lib/agents/orchestrator.ts -> api/_lib/core/analytics/agent-analytics.ts
api/_lib/agents/orchestrator.ts -> api/_lib/core/security/audit-logger.ts
api/_lib/agents/orchestrator.ts -> api/_lib/utils/usage-limits.ts
api/_lib/agents/proposal-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/proposal-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/retargeting-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/retargeting-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/scoring-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/scoring-agent.ts -> api/_lib/schemas/agents.ts
api/_lib/agents/scoring-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/summary-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/summary-agent.ts -> api/_lib/context/multimodal-context.ts
api/_lib/agents/summary-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/workshop-sales-agent.ts -> api/_lib/config/constants.ts
api/_lib/agents/workshop-sales-agent.ts -> api/_lib/core/tools/tool-executor.ts
api/_lib/agents/workshop-sales-agent.ts -> api/_lib/utils/ai-client.ts
api/_lib/agents/workshop-sales-agent.ts -> api/_lib/utils/format-messages.ts
api/_lib/app/api-utils/auth.ts -> api/_lib/core/auth.ts
api/_lib/context/context-manager.ts -> api/_lib/context/context-storage.ts
api/_lib/context/context-manager.ts -> api/_lib/context/flow-sync.ts
api/_lib/context/context-manager.ts -> api/_lib/context/multimodal-context.ts
api/_lib/context/context-manager.ts -> api/_lib/utils/logger.ts
api/_lib/context/context-storage.ts -> api/_lib/context/context-types.ts
api/_lib/context/context-storage.ts -> api/_lib/lib/ai/retry-config.ts
api/_lib/context/context-storage.ts -> api/_lib/lib/supabase-parsers.ts
api/_lib/context/context-storage.ts -> api/_lib/lib/supabase.ts
api/_lib/context/context-storage.ts -> api/_lib/types/json-guards.ts
api/_lib/context/context-summarizer.ts -> api/_lib/config/constants.ts
api/_lib/context/context-summarizer.ts -> api/_lib/utils/ai-client.ts
api/_lib/context/conversation-history.ts -> api/_lib/context/multimodal-context.ts
api/_lib/context/conversation-history.ts -> api/_lib/utils/env-setup.ts
api/_lib/context/conversation-history.ts -> api/_lib/utils/permissions.ts
api/_lib/context/flow-sync.ts -> api/_lib/types/conversation-flow-types.ts
api/_lib/context/multimodal-context.ts -> api/_lib/config/constants.ts
api/_lib/context/multimodal-context.ts -> api/_lib/context/context-intelligence.ts
api/_lib/context/multimodal-context.ts -> api/_lib/context/context-storage.ts
api/_lib/context/multimodal-context.ts -> api/_lib/context/context-summarizer.ts
api/_lib/context/multimodal-context.ts -> api/_lib/context/context-types.ts
api/_lib/context/multimodal-context.ts -> api/_lib/context/write-ahead-log.ts
api/_lib/context/multimodal-context.ts -> api/_lib/core/embeddings/gemini.ts
api/_lib/context/multimodal-context.ts -> api/_lib/core/embeddings/query.ts
api/_lib/context/multimodal-context.ts -> api/_lib/core/security/audit-logger.ts
api/_lib/context/multimodal-context.ts -> api/_lib/core/security/pii-detector.ts
api/_lib/context/multimodal-context.ts -> api/_lib/lib/vercel-cache.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/context/context-types.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/context/multimodal-context.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/core/queue/job-types.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/core/queue/redis-queue.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/lib/supabase.ts
api/_lib/context/write-ahead-log.ts -> api/_lib/lib/vercel-cache.ts
api/_lib/core/admin/admin-chat-service.ts -> api/_lib/supabase/client.ts
api/_lib/core/analytics/agent-analytics.ts -> api/_lib/lib/supabase.ts
api/_lib/core/analytics/agent-analytics.ts -> api/_lib/types/json-guards.ts
api/_lib/core/analytics/tool-analytics.ts -> api/_lib/types/json-guards.ts
api/_lib/core/analytics/tool-analytics.ts -> api/_lib/utils/supabase.ts
api/_lib/core/email-service.ts -> api/_lib/config/constants.ts
api/_lib/core/email-service.ts -> api/_lib/utils/json.ts
api/_lib/core/email-service.ts -> api/_lib/utils/logger.ts
api/_lib/core/embeddings/gemini.ts -> api/_lib/config/constants.ts
api/_lib/core/embeddings/gemini.ts -> api/_lib/config/env.ts
api/_lib/core/embeddings/query.ts -> api/_lib/utils/supabase.ts
api/_lib/core/intelligence/lead-research.ts -> api/_lib/config/constants.ts
api/_lib/core/intelligence/lead-research.ts -> api/_lib/config/env.ts
api/_lib/core/intelligence/lead-research.ts -> api/_lib/core/intelligence/providers/search/google-grounding.ts
api/_lib/core/intelligence/lead-research.ts -> api/_lib/lib/ai-cache.ts
api/_lib/core/live/client.ts -> api/_lib/config/constants.ts
api/_lib/core/live/client.ts -> api/_lib/lib/ai/retry-config.ts
api/_lib/core/live/client.ts -> api/_lib/utils/json.ts
api/_lib/core/queue/redis-queue.ts -> api/_lib/core/queue/job-types.ts
api/_lib/core/queue/redis-queue.ts -> api/_lib/core/queue/workers.ts
api/_lib/core/queue/redis-queue.ts -> api/_lib/lib/ai/retry-config.ts
api/_lib/core/queue/redis-queue.ts -> api/_lib/lib/vercel-cache.ts
api/_lib/core/queue/workers.ts -> api/_lib/context/context-storage.ts
api/_lib/core/queue/workers.ts -> api/_lib/core/queue/job-types.ts
api/_lib/core/queue/workers.ts -> api/_lib/core/queue/redis-queue.ts
api/_lib/core/queue/workers.ts -> api/_lib/lib/supabase.ts
api/_lib/core/security/audit-logger.ts -> api/_lib/types/json-guards.ts
api/_lib/core/security/audit-logger.ts -> api/_lib/utils/supabase.ts
api/_lib/core/tools/calculate-roi.ts -> api/_lib/context/context-storage.ts
api/_lib/core/tools/calculate-roi.ts -> api/_lib/core/pdf-roi-charts.ts
api/_lib/core/tools/draft-follow-up-email.ts -> api/_lib/config/constants.ts
api/_lib/core/tools/draft-follow-up-email.ts -> api/_lib/context/context-storage.ts
api/_lib/core/tools/draft-follow-up-email.ts -> api/_lib/context/multimodal-context.ts
api/_lib/core/tools/draft-follow-up-email.ts -> api/_lib/core/pdf-generator-puppeteer.ts
api/_lib/core/tools/draft-follow-up-email.ts -> api/_lib/utils/ai-client.ts
api/_lib/core/tools/extract-action-items.ts -> api/_lib/context/multimodal-context.ts
api/_lib/core/tools/extract-action-items.ts -> api/_lib/core/pdf-generator-puppeteer.ts
api/_lib/core/tools/generate-proposal.ts -> api/_lib/context/context-storage.ts
api/_lib/core/tools/generate-summary-preview.ts -> api/_lib/context/context-storage.ts
api/_lib/core/tools/generate-summary-preview.ts -> api/_lib/context/multimodal-context.ts
api/_lib/core/tools/generate-summary-preview.ts -> api/_lib/core/pdf-generator-puppeteer.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/calculate-roi.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/draft-follow-up-email.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/extract-action-items.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/generate-proposal.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/generate-summary-preview.ts
api/_lib/core/tools/shared-tool-registry.ts -> api/_lib/core/tools/shared-tools.ts
api/_lib/core/tools/tool-executor.ts -> api/_lib/core/security/audit-logger.ts
api/_lib/core/tools/tool-executor.ts -> api/_lib/lib/vercel-cache.ts
api/_lib/core/tools/tool-executor.ts -> api/_lib/utils/code-quality.ts
api/_lib/lib/ai/retry-config.ts -> api/_lib/config/constants.ts
api/_lib/lib/ai/retry-model.ts -> api/_lib/lib/ai/retry-config.ts
api/_lib/lib/supabase-parsers.ts -> api/_lib/schemas/supabase.ts
api/_lib/lib/supabase-parsers.ts -> api/_lib/utils/guards.ts
api/_lib/lib/vercel-cache.ts -> api/_lib/utils/logger.ts
api/_lib/live-api/tool-processor.ts -> api/_lib/context/multimodal-context.ts
api/_lib/live-api/tool-processor.ts -> api/_lib/message-types
api/_lib/live-api/tool-processor.ts -> api/_lib/rate-limiting/websocket-rate-limiter
api/_lib/live-api/tool-processor.ts -> api/_lib/supabase/client.ts
api/_lib/live-api/tool-processor.ts -> api/_lib/utils/env-setup.ts
api/_lib/live-api/tool-processor.ts -> api/_lib/utils/websocket-helpers
api/_lib/live-api/tool-processor.ts -> api/context/multimodal-context
api/_lib/supabase/client.ts -> api/_lib/lib/supabase.ts
api/_lib/supabase/client.ts -> api/_lib/supabase/database.types.ts
api/_lib/utils/ai-client.ts -> api/_lib/config/env.ts
api/_lib/utils/ai-client.ts -> api/_lib/lib/ai/retry-model.ts
api/_lib/utils/code-quality.ts -> api/_lib/lib/errors.ts
api/_lib/utils/code-quality.ts -> api/_lib/utils/json.ts
api/_lib/utils/code-quality.ts -> api/_lib/utils/text-utils.ts
api/_lib/utils/json.ts -> api/_lib/lib/errors.ts
api/_lib/utils/supabase-parsers.ts -> api/_lib/schemas/supabase.ts
api/_lib/utils/supabase-parsers.ts -> api/_lib/utils/guards.ts
api/_lib/utils/vercel-cache.ts -> api/_lib/utils/logger.ts
api/admin/ai-performance/route.ts -> api/_lib/app/api-utils/auth.ts
api/admin/ai-performance/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/admin/ai-performance/route.ts -> api/_lib/lib/api-middleware.ts
api/admin/ai-performance/route.ts -> api/_lib/lib/api/response.ts
api/admin/ai-performance/route.ts -> api/_lib/supabase/client.ts
api/admin/ai-performance/route.ts -> api/_lib/utils/logger.ts
api/admin/login/route.ts -> api/_lib/core/auth.ts
api/admin/login/route.ts -> api/_lib/lib/api-middleware.ts
api/admin/login/route.ts -> api/_lib/lib/api/response.ts
api/admin/login/route.ts -> api/_lib/utils/logger.ts
api/admin/logout/route.ts -> api/_lib/lib/api-middleware.ts
api/admin/logout/route.ts -> api/_lib/utils/logger.ts
api/admin/sessions/route.ts -> api/_lib/app/api-utils/auth.ts
api/admin/sessions/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/admin/sessions/route.ts -> api/_lib/core/admin/admin-chat-service.ts
api/admin/sessions/route.ts -> api/_lib/lib/api-middleware.ts
api/admin/sessions/route.ts -> api/_lib/lib/api/response.ts
api/admin/sessions/route.ts -> api/_lib/lib/supabase-parsers.ts
api/admin/sessions/route.ts -> api/_lib/schemas/admin-api.ts
api/admin/sessions/route.ts -> api/_lib/supabase/client.ts
api/admin/sessions/route.ts -> api/_lib/utils/json.ts
api/admin/sessions/route.ts -> api/_lib/utils/logger.ts
api/admin/token-costs/route.ts -> api/_lib/app/api-utils/auth.ts
api/admin/token-costs/route.ts -> api/_lib/app/api-utils/rate-limiting.ts
api/admin/token-costs/route.ts -> api/_lib/core/token-usage-logger.ts
api/admin/token-costs/route.ts -> api/_lib/lib/api-middleware.ts
api/admin/token-costs/route.ts -> api/_lib/lib/api/response.ts
api/admin/token-costs/route.ts -> api/_lib/supabase/client.ts
api/admin/token-costs/route.ts -> api/_lib/utils/logger.ts
api/chat.ts -> api/_lib/agents/orchestrator.ts
api/chat.ts -> api/_lib/core/queue/redis-queue.ts
api/chat/persist-batch.ts -> api/_lib/context/multimodal-context.ts
api/chat/persist-message.ts -> api/_lib/context/multimodal-context.ts
api/send-pdf-summary/route.ts -> api/_lib/core/email-service.ts
api/send-pdf-summary/route.ts -> api/_lib/lib/supabase.ts
api/send-pdf-summary/route.ts -> api/_lib/utils/logger.ts
api/test-chat.js -> api/chat.ts
components/AdminDashboard.tsx -> components/chat/Attachments.tsx
components/AdminDashboard.tsx -> services/leadResearchService.ts
components/AdminDashboard.tsx -> types.ts
components/AntigravityCanvas.tsx -> utils/visuals/index.ts
components/BrowserCompatibility.tsx -> utils/browser-compat.ts
components/ControlPanel.tsx -> types.ts
components/LandingPage.tsx -> components/AntigravityCanvas.tsx
components/LandingPage.tsx -> components/ServiceIcon.tsx
components/LandingPage.tsx -> components/chat/CalendarWidget.tsx
components/LandingPage.tsx -> types.ts
components/MultimodalChat.tsx -> components/chat/Attachments.tsx
components/MultimodalChat.tsx -> components/chat/ChatInputDock.tsx
components/MultimodalChat.tsx -> components/chat/ChatMessage.tsx
components/MultimodalChat.tsx -> components/chat/UIHelpers.tsx
components/MultimodalChat.tsx -> types.ts
components/chat/Attachments.tsx -> components/chat/UIHelpers.tsx
components/chat/ChatInputDock.tsx -> components/chat/Attachments.tsx
components/chat/ChatInputDock.tsx -> components/chat/UIHelpers.tsx
components/chat/ChatInputDock.tsx -> types.ts
components/chat/ChatMessage.tsx -> components/chat/Attachments.tsx
components/chat/ChatMessage.tsx -> components/chat/CalendarWidget.tsx
components/chat/ChatMessage.tsx -> components/chat/MarkdownRenderer.tsx
components/chat/ChatMessage.tsx -> components/chat/UIHelpers.tsx
components/chat/ChatMessage.tsx -> types.ts
components/chat/WebcamPreview.tsx -> utils/visuals/store.ts
context/ToastContext.tsx -> components/ui/Toast.tsx
index.tsx -> App.tsx
index.tsx -> context/ToastContext.tsx
index.tsx -> utils/browser-compat.ts
scripts/validate-server-imports.ts -> ../src/core
scripts/validate-server-imports.ts -> ../src/core/context/$1
scripts/validate-server-imports.ts -> ../src/core/prompts
scripts/verify-services.ts -> services/aiBrainService.ts
scripts/verify-services.ts -> services/chromeAiService.ts
scripts/verify-services.ts -> services/leadResearchService.ts
scripts/verify-services.ts -> services/standardChatService.ts
scripts/verify-services.ts -> services/unifiedContext.ts
scripts/verify-services.ts -> src/config/env.ts
server/context/conversation-history.ts -> api/_lib/context/multimodal-context.ts
server/context/conversation-history.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/context/conversation-history.ts -> server/utils/env-setup.ts
server/context/injection.ts -> server/utils/env-setup.ts
server/context/injection.ts -> src/config/constants.ts
server/context/orchestrator-sync.ts -> api/_lib/context/multimodal-context.ts
server/context/orchestrator-sync.ts -> server/message-types.ts
server/context/orchestrator-sync.ts -> server/utils/env-setup.ts
server/context/orchestrator-sync.ts -> server/utils/websocket-helpers.ts
server/context/orchestrator-sync.ts -> src/core/context/context-storage.ts
server/handlers/audio-handler.ts -> server/message-types.ts
server/handlers/audio-handler.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/handlers/audio-handler.ts -> server/utils/env-setup.ts
server/handlers/audio-handler.ts -> server/utils/turn-completion.ts
server/handlers/audio-handler.ts -> server/utils/websocket-helpers.ts
server/handlers/close-handler.ts -> api/_lib/context/multimodal-context.ts
server/handlers/close-handler.ts -> server/context/orchestrator-sync.ts
server/handlers/close-handler.ts -> server/utils/env-setup.ts
server/handlers/close-handler.ts -> server/utils/turn-completion.ts
server/handlers/close-handler.ts -> src/config/constants.ts
server/handlers/context-update-handler.ts -> api/_lib/context/multimodal-context.ts
server/handlers/context-update-handler.ts -> server/context/injection.ts
server/handlers/context-update-handler.ts -> server/message-types.ts
server/handlers/context-update-handler.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/handlers/context-update-handler.ts -> server/utils/env-setup.ts
server/handlers/context-update-handler.ts -> server/utils/websocket-helpers.ts
server/handlers/context-update-handler.ts -> src/config/constants.ts
server/handlers/realtime-input-handler.ts -> server/message-types.ts
server/handlers/realtime-input-handler.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/handlers/realtime-input-handler.ts -> server/utils/env-setup.ts
server/handlers/realtime-input-handler.ts -> server/utils/websocket-helpers.ts
server/handlers/start-handler.ts -> api/_lib/context/multimodal-context.ts
server/handlers/start-handler.ts -> server/context/conversation-history.ts
server/handlers/start-handler.ts -> server/context/orchestrator-sync.ts
server/handlers/start-handler.ts -> server/live-api/config-builder.ts
server/handlers/start-handler.ts -> server/live-api/session-manager.ts
server/handlers/start-handler.ts -> server/live-api/tool-processor.ts
server/handlers/start-handler.ts -> server/message-types.ts
server/handlers/start-handler.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/handlers/start-handler.ts -> server/utils/env-setup.ts
server/handlers/start-handler.ts -> server/utils/turn-completion.ts
server/handlers/start-handler.ts -> server/utils/websocket-helpers.ts
server/handlers/start-handler.ts -> src/config/constants.ts
server/handlers/start-handler.ts -> src/config/env.ts
server/handlers/start-handler.ts -> src/core/context/multimodal-context
server/handlers/start-handler.ts -> src/core/session/session-coordinator.ts
server/handlers/tool-result-handler.ts -> server/message-types.ts
server/handlers/tool-result-handler.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/handlers/tool-result-handler.ts -> server/utils/env-setup.ts
server/handlers/tool-result-handler.ts -> server/utils/websocket-helpers.ts
server/live-api/session-manager.ts -> server/utils/env-setup.ts
server/live-api/session-manager.ts -> src/config/constants.ts
server/live-api/session-manager.ts -> src/config/env.ts
server/live-api/tool-processor.ts -> api/_lib/context/multimodal-context.ts
server/live-api/tool-processor.ts -> server/message-types.ts
server/live-api/tool-processor.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/live-api/tool-processor.ts -> server/utils/env-setup.ts
server/live-api/tool-processor.ts -> server/utils/tool-implementations.ts
server/live-api/tool-processor.ts -> server/utils/websocket-helpers.ts
server/live-api/tool-processor.ts -> src/core/supabase/client.ts
server/live-server.ts -> server/handlers/audio-handler.ts
server/live-server.ts -> server/handlers/close-handler.ts
server/live-server.ts -> server/handlers/context-update-handler.ts
server/live-server.ts -> server/handlers/realtime-input-handler.ts
server/live-server.ts -> server/handlers/start-handler.ts
server/live-server.ts -> server/handlers/tool-result-handler.ts
server/live-server.ts -> server/utils/env-setup.ts
server/live-server.ts -> server/websocket/connection-manager.ts
server/live-server.ts -> server/websocket/message-router.ts
server/live-server.ts -> server/websocket/server.ts
server/rate-limiting/websocket-rate-limiter.ts -> server/message-types.ts
server/rate-limiting/websocket-rate-limiter.ts -> server/utils/admin-check.ts
server/utils/env-setup.ts -> src/config/env.ts
server/utils/env-setup.ts -> src/lib/logger.ts
server/utils/json.ts -> server/utils/errors.ts
server/utils/tool-implementations.ts -> api/_lib/context/multimodal-context.ts
server/utils/tool-implementations.ts -> server/utils/env-setup.ts
server/utils/turn-completion.ts -> server/message-types.ts
server/utils/turn-completion.ts -> server/utils/env-setup.ts
server/utils/turn-completion.ts -> server/utils/websocket-helpers.ts
server/utils/websocket-helpers.ts -> server/utils/env-setup.ts
server/websocket/connection-manager.ts -> server/handlers/close-handler.ts
server/websocket/connection-manager.ts -> server/message-types.ts
server/websocket/connection-manager.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/websocket/connection-manager.ts -> server/session-logger.ts
server/websocket/connection-manager.ts -> server/utils/env-setup.ts
server/websocket/connection-manager.ts -> server/utils/websocket-helpers.ts
server/websocket/message-router.ts -> server/handlers/audio-handler.ts
server/websocket/message-router.ts -> server/handlers/close-handler.ts
server/websocket/message-router.ts -> server/handlers/context-update-handler.ts
server/websocket/message-router.ts -> server/handlers/realtime-input-handler.ts
server/websocket/message-router.ts -> server/handlers/start-handler.ts
server/websocket/message-router.ts -> server/handlers/tool-result-handler.ts
server/websocket/message-router.ts -> server/message-types.ts
server/websocket/message-router.ts -> server/rate-limiting/websocket-rate-limiter.ts
server/websocket/message-router.ts -> server/utils/env-setup.ts
server/websocket/message-router.ts -> server/utils/errors.ts
server/websocket/message-router.ts -> server/utils/json.ts
server/websocket/message-router.ts -> server/utils/turn-completion.ts
server/websocket/message-router.ts -> server/utils/websocket-helpers.ts
server/websocket/message-router.ts -> src/config/constants.ts
server/websocket/server.ts -> server/message-types.ts
server/websocket/server.ts -> server/utils/env-setup.ts
server/websocket/server.ts -> src/config/constants.ts
services/__tests__/aiBrainService.test.ts -> services/__tests__/helpers/mock-fetch.ts
services/__tests__/aiBrainService.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/aiBrainService.test.ts -> services/aiBrainService.ts
services/__tests__/chromeAiService.test.ts -> services/__tests__/helpers/mock-chrome-ai.ts
services/__tests__/chromeAiService.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/chromeAiService.test.ts -> services/chromeAiService.ts
services/__tests__/geminiLiveService.test.ts -> services/__tests__/helpers/mock-audio.ts
services/__tests__/geminiLiveService.test.ts -> services/__tests__/helpers/mock-websocket.ts
services/__tests__/geminiLiveService.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/geminiLiveService.test.ts -> services/geminiLiveService.ts
services/__tests__/geminiLiveService.test.ts -> src/core/live/client.ts
services/__tests__/integration.test.ts -> services/__tests__/helpers/mock-audio.ts
services/__tests__/integration.test.ts -> services/__tests__/helpers/mock-fetch.ts
services/__tests__/integration.test.ts -> services/__tests__/helpers/mock-websocket.ts
services/__tests__/integration.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/integration.test.ts -> services/aiBrainService.ts
services/__tests__/integration.test.ts -> services/geminiLiveService.ts
services/__tests__/integration.test.ts -> services/leadResearchService.ts
services/__tests__/integration.test.ts -> services/standardChatService.ts
services/__tests__/integration.test.ts -> services/unifiedContext.ts
services/__tests__/integration.test.ts -> src/core/live/client.ts
services/__tests__/leadResearchService.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/leadResearchService.test.ts -> services/leadResearchService.ts
services/__tests__/standardChatService.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/standardChatService.test.ts -> services/standardChatService.ts
services/__tests__/unifiedContext.test.ts -> services/__tests__/helpers/test-data.ts
services/__tests__/unifiedContext.test.ts -> services/unifiedContext.ts
services/aiBrainService.ts -> services/unifiedContext.ts
services/aiBrainService.ts -> types.ts
services/geminiLiveService.ts -> config.ts
services/geminiLiveService.ts -> services/unifiedContext.ts
services/geminiLiveService.ts -> src/core/live/client.ts
services/geminiLiveService.ts -> types.ts
services/geminiLiveService.ts -> utils/audioUtils.ts
services/leadResearchService.ts -> src/config/constants.ts
services/leadResearchService.ts -> types.ts
services/standardChatService.ts -> services/unifiedContext.ts
services/standardChatService.ts -> src/config/constants.ts
services/standardChatService.ts -> types.ts
src/core/admin/admin-chat-service.ts -> src/core/embeddings/gemini
src/core/admin/admin-chat-service.ts -> src/core/supabase/client.ts
src/core/analytics/agent-analytics.ts -> src/core/types/json-guards
src/core/analytics/tool-analytics.ts -> src/core/types/json-guards
src/core/context/context-manager.ts -> src/api/_lib/context/multimodal-context
src/core/context/context-storage.ts -> src/core/context/context-types
src/core/context/context-storage.ts -> src/core/types/json-guards
src/core/context/context-storage.ts -> src/lib/ai/retry-config.ts
src/core/context/context-storage.ts -> src/lib/supabase-parsers.ts
src/core/context/context-storage.ts -> src/lib/supabase.ts
src/core/context/context-summarizer.ts -> src/config/constants.ts
src/core/context/context-summarizer.ts -> src/lib/ai-client.ts
src/core/intelligence/lead-research.ts -> src/core/intelligence/providers/search/google-grounding
src/core/live/__tests__/client.test.ts -> src/core/live/client.ts
src/core/queue/redis-queue.ts -> src/core/queue/job-types.ts
src/core/queue/redis-queue.ts -> src/core/queue/workers.ts
src/core/queue/workers.ts -> src/core/context/context-storage.ts
src/core/queue/workers.ts -> src/core/context/context-types
src/core/queue/workers.ts -> src/core/email-service.ts
src/core/queue/workers.ts -> src/core/queue/job-types.ts
src/core/queue/workers.ts -> src/core/queue/redis-queue.ts
src/core/security/audit-logger.ts -> src/core/types/json-guards
src/core/security/audit-logger.ts -> src/lib/supabase.ts
src/core/session/__tests__/session-coordinator-integration.test.ts -> src/core/session/session-coordinator.ts
src/core/session/__tests__/session-coordinator.test.ts -> src/core/session/session-coordinator.ts
src/core/supabase/client.ts -> src/core/database.types.ts
src/core/supabase/client.ts -> src/lib/supabase.ts
src/core/tools/calculate-roi.ts -> src/core/context/context-storage.ts
src/core/tools/calculate-roi.ts -> src/core/pdf-roi-charts
src/core/tools/draft-follow-up-email.ts -> src/core/context/context-storage.ts
src/core/tools/draft-follow-up-email.ts -> src/core/context/multimodal-context
src/core/tools/draft-follow-up-email.ts -> src/core/pdf-generator-puppeteer
src/core/tools/extract-action-items.ts -> src/core/context/multimodal-context
src/core/tools/extract-action-items.ts -> src/core/pdf-generator-puppeteer
src/core/tools/generate-proposal.ts -> src/core/context/context-storage.ts
src/core/tools/generate-summary-preview.ts -> src/core/context/context-storage.ts
src/core/tools/generate-summary-preview.ts -> src/core/context/multimodal-context
src/core/tools/generate-summary-preview.ts -> src/core/pdf-generator-puppeteer
src/core/tools/shared-tool-registry.ts -> src/core/tools/calculate-roi.ts
src/core/tools/shared-tool-registry.ts -> src/core/tools/draft-follow-up-email.ts
src/core/tools/shared-tool-registry.ts -> src/core/tools/extract-action-items.ts
src/core/tools/shared-tool-registry.ts -> src/core/tools/generate-proposal.ts
src/core/tools/shared-tool-registry.ts -> src/core/tools/generate-summary-preview.ts
src/core/tools/shared-tool-registry.ts -> src/core/tools/shared-tools.ts
src/lib/code-quality.ts -> src/lib/text-utils
src/lib/vercel-cache.ts -> src/lib/logger.ts
test-email-service.ts -> src/core/email-service.ts
test/voice-mode-e2e.test.ts -> services/geminiLiveService.ts
test/voice-mode-e2e.test.ts -> test/voice-test-utils.ts
test/voice-production-integration.test.ts -> api/_lib/core/live/client.ts
utils/pdfUtils.ts -> types.ts
utils/utils.test.ts -> config.ts
utils/visuals/agentShapes.ts -> utils/visuals/mathHelpers.ts
utils/visuals/agentShapes.ts -> utils/visuals/types.ts
utils/visuals/complexShapes.ts -> utils/visuals/geometricShapes.ts
utils/visuals/complexShapes.ts -> utils/visuals/mathHelpers.ts
utils/visuals/complexShapes.ts -> utils/visuals/store.ts
utils/visuals/complexShapes.ts -> utils/visuals/types.ts
utils/visuals/cosmicShapes.ts -> utils/visuals/mathHelpers.ts
utils/visuals/cosmicShapes.ts -> utils/visuals/types.ts
utils/visuals/geometricShapes.ts -> utils/visuals/mathHelpers.ts
utils/visuals/geometricShapes.ts -> utils/visuals/types.ts
utils/visuals/index.ts -> types.ts
utils/visuals/index.ts -> utils/visuals/agentShapes.ts
utils/visuals/index.ts -> utils/visuals/complexShapes.ts
utils/visuals/index.ts -> utils/visuals/cosmicShapes.ts
utils/visuals/index.ts -> utils/visuals/geometricShapes.ts
utils/visuals/index.ts -> utils/visuals/types.ts
utils/visuals/mathHelpers.ts -> utils/visuals/types.ts
utils/visuals/types.ts -> types.ts
```

## Summary Statistics

- **Total Files Analyzed:** 298
- **Components:** 26
- **Services:** 20
- **Utils:** 121
- **Configs:** 10
- **Types:** 10
- **Other:** 111
- **Total Import Relationships:** 545
