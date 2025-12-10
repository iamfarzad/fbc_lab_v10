# Test Documentation

**Last Updated:** 2025-01-27  
**Purpose:** Comprehensive guide to all test files and how to run them

**Note:** This documentation covers both automated tests (Vitest, Playwright) and interactive testing tools.

---

## Quick Start

### Run All Tests
```bash
pnpm test
```

### Run Tests in Watch Mode
```bash
pnpm test --watch
```

### Run Tests with UI
```bash
pnpm test:ui
```

### Run Tests with Coverage
```bash
pnpm test:coverage
```

### Run Specific Test File
```bash
pnpm test -- path/to/test-file.test.ts
```

### Interactive Agent Testing (Manual)
```bash
pnpm test:agent:interactive
```
Interactive CLI tool for manually testing agents in real-time. Type messages and see agent responses. Use `/help` for commands.

---

## Test Structure

Tests are organized into several categories:
- **Unit Tests** - Individual components, functions, utilities
- **Integration Tests** - Service integrations, API routes, database operations
- **E2E Tests** - End-to-end flows, agent orchestration, browser tests
- **Performance Tests** - SSE streaming, context loading, cache performance
- **Feature Tests** - Specific features like text input during voice, vision accuracy

---

## Test Files by Category

### 1. Agent Tests

Tests for individual agents and agent orchestration.

#### `src/core/agents/__tests__/all-agents.smoke.test.ts`
**Purpose:** Smoke tests for all agents to verify basic functionality  
**Tests:** 5 tests - One per agent (Discovery, Scoring, Pitch, Closer, Summary)  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/all-agents.smoke.test.ts
```

#### `src/core/agents/__tests__/discovery-agent.test.ts`
**Purpose:** Comprehensive tests for Discovery Agent  
**Tests:** Question generation, exit intent detection, multimodal context handling  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/discovery-agent.test.ts
```

#### `src/core/agents/__tests__/scoring-agent.test.ts`
**Purpose:** Tests for Scoring Agent  
**Tests:** Lead scoring, fit scores, multimodal bonus calculations  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/scoring-agent.test.ts
```

#### `src/core/agents/__tests__/pitch-agent.test.ts`
**Purpose:** Tests for Pitch Agent  
**Tests:** Auto-detection logic, ROI calculations, pitch generation  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/pitch-agent.test.ts
```

#### `src/core/agents/__tests__/objection-agent.test.ts`
**Purpose:** Tests for Objection Agent  
**Tests:** Objection detection, handling, and responses  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/objection-agent.test.ts
```

#### `src/core/agents/__tests__/unified-agents-sync.test.ts`
**Purpose:** **Most important agent test** - Verifies all agents work together  
**Tests:** 5 tests covering:
- Complete workshop funnel (Discovery → Scoring → Pitch → Closer → Summary)
- Complete consulting funnel (Discovery → Scoring → Proposal → Closer)
- Objection override flow
- Multimodal context propagation
- Context consistency across agent transitions  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/unified-agents-sync.test.ts
```

#### `src/core/agents/__tests__/orchestrator.test.ts`
**Purpose:** Tests for agent orchestrator routing logic  
**Tests:** Agent routing, stage transitions, context passing  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/orchestrator.test.ts
```

#### `src/core/agents/__tests__/agent-flow.test.ts`
**Purpose:** Tests for agent flow management  
**Tests:** Flow transitions, state management  
**Run:**
```bash
pnpm test -- src/core/agents/__tests__/agent-flow.test.ts
```

---

### 2. Integration & E2E Tests

Tests for complete flows and integrations.

#### `src/__tests__/integration-e2e.test.ts`
**Purpose:** End-to-end integration tests  
**Tests:** 12 tests covering:
- Real agent orchestration with complete funnel flows
- Intelligence context persistence
- Database operations (mocked Supabase)
- Multimodal interactions
- WebSocket rate limiting  
**Run:**
```bash
pnpm test -- src/__tests__/integration-e2e.test.ts
```

#### `test/tool-integration-e2e.test.ts`
**Purpose:** E2E tests for unified tool system  
**Tests:** Tool execution flow across voice and chat modalities  
**Prerequisites:** Set `ENABLE_E2E_TOOL_TESTS=1` to run  
**Run:**
```bash
# With mocks (default)
pnpm test:e2e:tools

# With real tools (requires API keys)
pnpm test:e2e:tools:real

# Or directly
ENABLE_E2E_TOOL_TESTS=1 pnpm test -- test/tool-integration-e2e.test.ts
```  
**See:** [docs/E2E_TOOL_TESTING.md](./E2E_TOOL_TESTING.md) for detailed guide

#### `services/__tests__/integration.test.ts`
**Purpose:** Service integration tests  
**Tests:** Service interactions, data flow  
**Run:**
```bash
pnpm test -- services/__tests__/integration.test.ts
```

#### `src/core/session/__tests__/session-coordinator-integration.test.ts`
**Purpose:** Session coordinator integration tests  
**Tests:** Session management, coordination between services  
**Run:**
```bash
pnpm test -- src/core/session/__tests__/session-coordinator-integration.test.ts
```

---

### 3. Performance Tests

Tests for performance optimizations and measurements.

#### `src/__tests__/performance.test.ts`
**Purpose:** Performance optimization tests  
**Tests:** 18 tests covering:
- SSE streaming performance (time to first chunk, stream parsing)
- Parallel context loading
- Cache performance
- Non-blocking context loading behavior
- Real API endpoint SSE streaming (optional, requires running server)  
**Run:**
```bash
pnpm test -- src/__tests__/performance.test.ts

# With real API server (requires API_URL env var)
API_URL=http://localhost:3002 pnpm test -- src/__tests__/performance.test.ts
```

---

### 4. Feature Tests

Tests for specific features and functionality.

#### `src/__tests__/text-input-during-voice.test.ts`
**Purpose:** Hybrid input mode (text + voice simultaneously)  
**Tests:** 14 tests covering:
- App.tsx routing logic for text during voice mode
- ChatInputDock component behavior
- StandardChatService integration
- Error handling  
**Run:**
```bash
pnpm test -- src/__tests__/text-input-during-voice.test.ts
```

#### `src/__tests__/vision-accuracy.test.ts`
**Purpose:** Vision accuracy and webcam frame quality  
**Tests:** Frame quality validation, buffer management, capture frequency  
**Run:**
```bash
pnpm test -- src/__tests__/vision-accuracy.test.ts
```

#### `src/__tests__/screen-share-analysis.test.ts`
**Purpose:** Screen share analysis functionality  
**Tests:** Screen capture, analysis, context injection  
**Run:**
```bash
pnpm test -- src/__tests__/screen-share-analysis.test.ts
```

#### `src/__tests__/tool-calling.test.ts`
**Purpose:** Tool calling functionality  
**Tests:** Tool execution, schema validation, error handling  
**Run:**
```bash
pnpm test -- src/__tests__/tool-calling.test.ts
```

#### `src/__tests__/url-analysis.test.ts`
**Purpose:** URL detection and analysis  
**Tests:** URL detection, analysis triggers, context injection  
**Run:**
```bash
pnpm test -- src/__tests__/url-analysis.test.ts
```

---

### 5. Service Tests

Tests for individual services.

#### `services/__tests__/aiBrainService.test.ts`
**Purpose:** AI Brain Service tests  
**Tests:** 17 tests - Service functionality, context handling  
**Run:**
```bash
pnpm test -- services/__tests__/aiBrainService.test.ts
```

#### `services/__tests__/chromeAiService.test.ts`
**Purpose:** Chrome AI Service tests  
**Tests:** 19 tests - Chrome AI integration  
**Run:**
```bash
pnpm test -- services/__tests__/chromeAiService.test.ts
```

#### `services/__tests__/geminiLiveService.test.ts`
**Purpose:** Gemini Live Service tests  
**Tests:** WebSocket connection, real-time communication  
**Run:**
```bash
pnpm test -- services/__tests__/geminiLiveService.test.ts
```

#### `services/__tests__/standardChatService.test.ts`
**Purpose:** Standard Chat Service tests  
**Tests:** Chat message handling, responses  
**Run:**
```bash
pnpm test -- services/__tests__/standardChatService.test.ts
```

#### `services/__tests__/leadResearchService.test.ts`
**Purpose:** Lead Research Service tests  
**Tests:** Research functionality, data fetching  
**Run:**
```bash
pnpm test -- services/__tests__/leadResearchService.test.ts
```

#### `services/__tests__/unifiedContext.test.ts`
**Purpose:** Unified Context Service tests  
**Tests:** Context management, merging  
**Run:**
```bash
pnpm test -- services/__tests__/unifiedContext.test.ts
```

---

### 6. Component Tests

Tests for React components.

#### `App.test.tsx`
**Purpose:** Main App component tests  
**Tests:** Component rendering, routing, basic functionality  
**Run:**
```bash
pnpm test -- App.test.tsx
```

#### `components/chat/__tests__/chat-components.test.tsx`
**Purpose:** Chat component tests  
**Tests:** Chat UI components, interactions  
**Run:**
```bash
pnpm test -- components/chat/__tests__/chat-components.test.tsx
```

---

### 7. Server Tests

Tests for server-side functionality.

#### `server/__tests__/server.test.ts`
**Purpose:** Server tests  
**Tests:** Server startup, basic functionality  
**Run:**
```bash
pnpm test -- server/__tests__/server.test.ts
```

#### `server/__tests__/intelligence-context.test.ts`
**Purpose:** Intelligence context loading and caching  
**Tests:** Context loading, validation, caching  
**Run:**
```bash
pnpm test -- server/__tests__/intelligence-context.test.ts
```

#### `server/__tests__/rate-limiting.test.ts`
**Purpose:** Rate limiting functionality  
**Tests:** Rate limit enforcement, WebSocket media rate limits  
**Run:**
```bash
pnpm test -- server/__tests__/rate-limiting.test.ts
```

#### `server/live-api/__tests__/tool-processor.test.ts`
**Purpose:** Tool processor for WebSocket server  
**Tests:** Tool execution, validation, error handling  
**Run:**
```bash
pnpm test -- server/live-api/__tests__/tool-processor.test.ts
```

---

### 8. Core Module Tests

Tests for core modules.

#### `src/core/live/__tests__/client.test.ts`
**Purpose:** Live client tests  
**Tests:** WebSocket client functionality  
**Run:**
```bash
pnpm test -- src/core/live/__tests__/client.test.ts
```

#### `src/core/context/__tests__/multimodal-context.test.ts`
**Purpose:** Multimodal context tests  
**Tests:** Context management, multimodal data handling  
**Run:**
```bash
pnpm test -- src/core/context/__tests__/multimodal-context.test.ts
```

#### `src/core/session/__tests__/session-coordinator.test.ts`
**Purpose:** Session coordinator unit tests  
**Tests:** Session coordination logic  
**Run:**
```bash
pnpm test -- src/core/session/__tests__/session-coordinator.test.ts
```

---

### 9. Utility Tests

Tests for utility functions.

#### `utils/__tests__/utils.test.ts`
**Purpose:** General utility tests  
**Tests:** Utility functions  
**Run:**
```bash
pnpm test -- utils/__tests__/utils.test.ts
```

#### `src/lib/json.test.ts`
**Purpose:** JSON utility tests  
**Tests:** JSON parsing, validation  
**Run:**
```bash
pnpm test -- src/lib/json.test.ts
```

#### `src/lib/errors.test.ts`
**Purpose:** Error handling utilities  
**Tests:** Error types, handling  
**Run:**
```bash
pnpm test -- src/lib/errors.test.ts
```

#### `src/config/constants.test.ts`
**Purpose:** Configuration constants tests  
**Tests:** Constant values, validation  
**Run:**
```bash
pnpm test -- src/config/constants.test.ts
```

#### `utils/browser-compat.test.ts`
**Purpose:** Browser compatibility tests  
**Tests:** Browser feature detection, compatibility  
**Run:**
```bash
pnpm test -- utils/browser-compat.test.ts
```

---

### 10. Browser E2E Tests (Playwright)

Browser-based end-to-end tests using Playwright.

#### `e2e/app-smoke.spec.ts`
**Purpose:** Smoke test for app startup and core UI  
**Tests:** App loads, core UI elements present  
**Prerequisites:** `pnpm playwright:install` (first time)  
**Run:**
```bash
# Headless
pnpm test:e2e:browser

# With UI
pnpm test:e2e:browser:ui
```

#### `e2e/voice-browser-tests.spec.ts`
**Purpose:** Production voice mode tests  
**Tests:** Voice functionality in browser  
**Run:**
```bash
pnpm test:e2e:prod
```

---

### 11. Additional Test Files

#### `test/voice-production-integration.test.ts`
**Purpose:** Voice production integration tests  
**Run:**
```bash
pnpm test -- test/voice-production-integration.test.ts
```

#### `test/voice-mode-e2e.test.ts`
**Purpose:** Voice mode E2E tests  
**Run:**
```bash
pnpm test -- test/voice-mode-e2e.test.ts
```

#### `test/tool-integration.test.ts`
**Purpose:** Tool integration unit tests  
**Run:**
```bash
pnpm test -- test/tool-integration.test.ts
```

---

### 12. Interactive Testing Tools

Interactive CLI tools for manually testing agents and features in real-time.

#### `scripts/test-agent-interactive.ts`
**Purpose:** Interactive agent testing tool for manual testing and fine-tuning  
**Type:** Interactive CLI (not an automated test)  
**Run:**
```bash
pnpm test:agent:interactive
```

**Description:**
Interactive terminal-based tool that allows you to test agents in real-time by typing messages and seeing agent responses. Perfect for debugging agent behavior, testing stage transitions, and fine-tuning agent prompts.

**Features:**
- Type messages and get agent responses in real-time
- Test all 10 agents (7 core pipeline + 3 special)
- Navigate through all 16 funnel stages
- View conversation history
- See agent metadata (lead scores, fit scores, tools used)

**Available Commands:**

**Navigation & Info:**
- `/agents` - List all 10 agents with their stages/triggers
- `/stages` - List all 16 available stages
- `/history` - Show conversation history
- `/reset` - Reset conversation and start fresh
- `/stage <STAGE>` - Manually set stage (e.g., `/stage SCORING`)

**Special Agent Triggers:**
- `/admin` - Test Admin Agent (analytics, system info)
- `/booking` - Test Closer Agent (booking requests)
- `/proposal` - Test Proposal Agent (proposal generation)
- `/retargeting` - Test Retargeting Agent (follow-up emails)
- `/end` - Test Summary Agent (conversation end)

**General:**
- `/help` - Show all available commands
- `/exit` - Exit the interactive tester

**Agent Coverage:**

**Core Pipeline Agents (7):**
1. **Discovery Agent** - `/stage DISCOVERY` or start conversation
2. **Scoring Agent** - `/stage SCORING` or auto-triggers after discovery
3. **Pitch Agent** - `/stage PITCHING`, `/stage WORKSHOP_PITCH`, or `/stage CONSULTING_PITCH`
4. **Objection Agent** - `/stage OBJECTION` or type objection (auto-detected)
5. **Proposal Agent** - `/stage PROPOSAL` or `/proposal` trigger
6. **Closer Agent** - `/stage CLOSING`, `/stage BOOKING_REQUESTED`, `/stage BOOKED`, or `/booking` trigger
7. **Summary Agent** - `/stage SUMMARY` or `/end` trigger

**Special Agents (3):**
8. **Admin Agent** - `/admin` command
9. **Retargeting Agent** - `/retargeting` command
10. **Lead Intelligence Agent** - Background worker (not interactive)

**Example Usage:**
```bash
$ pnpm test:agent:interactive

🤖 Agent Flow Tester
Session: test-1234567890 | Stage: DISCOVERY

Commands:
  /reset        - Reset conversation
  /stage <stage> - Set stage (DISCOVERY, SCORING, etc.)
  /history      - Show conversation history
  /agents       - List all agents
  /stages       - List all stages
  ...

> Tell me about your workshops

[Agent responds with Discovery Agent output...]

> /stage SCORING

[Stage changed to SCORING]

> What's my lead score?

[Agent responds with Scoring Agent output, shows lead score...]

> /agents

[Lists all 10 agents with details...]

> /booking

[Tests Closer Agent with booking trigger...]
```

**Output Format:**
- Colored terminal output for easy reading
- Shows agent name, stage, lead scores, fit scores
- Displays tools used (if any)
- Full agent response text
- Updates current stage automatically

**Use Cases:**
- Debugging agent responses
- Testing stage transitions
- Fine-tuning agent prompts
- Validating agent logic
- Manual QA testing
- Demonstrating agent behavior

---

## Test Helpers and Utilities

### Helper Files

Located in `test/helpers/`:

- **`api-test-helpers.ts`** - Utilities for testing API endpoints, SSE streaming
  - `parseSSEStream()` - Parse SSE event streams
  - `measureTimeToFirstChunk()` - Measure SSE performance
  - `testStreamingEndpoint()` - Test SSE endpoints
  - `verifySSEHeaders()` - Verify SSE response headers

- **`component-test-helpers.ts`** - Utilities for React component testing
  - `renderWithProviders()` - Render components with providers (Router, etc.)
  - `setupBrowserMocks()` - Setup browser API mocks (matchMedia, IntersectionObserver, etc.)
  - `createMockServiceRefs()` - Create mock service refs
  - `createMockTranscriptItem()` - Create mock transcript items

- **`agent-test-helpers.ts`** - Utilities for agent testing (in `src/core/agents/__tests__/test-helpers/`)
  - `createMockAgentContext()` - Create mock agent context
  - `createMockMessages()` - Create mock message arrays
  - `createMockIntelligenceContext()` - Create mock intelligence context
  - `createMockWebSocketConnection()` - Create mock WebSocket connections
  - `createMockMultimodalContextWithMedia()` - Create mock multimodal context
  - `createMockPerformanceMetrics()` - Create mock performance metrics

- **`tool-integration-helpers.ts`** - Utilities for tool integration tests
- **`test-env.ts`** - Test environment configuration
- **`test-data.ts`** - Shared test data
- **`mock-*.ts`** - Various mocks (audio, fetch, WebSocket, Chrome AI, Google GenAI)

---

## Test Configuration

### Vitest Config

Located in `vitest.config.ts`:

- **Test Timeout:** 30 seconds (for API tests)
- **Environment:** jsdom (for React component tests)
- **Setup File:** `test/setup.ts` (global test setup)
- **Include Patterns:**
  - `**/*.test.{ts,tsx}`
  - `**/*.spec.{ts,tsx}`
  - `**/__tests__/**/*.{ts,tsx}`
  - `test/**/*.test.{ts,tsx}`

- **Exclude Patterns:**
  - `node_modules`, `dist`, `e2e/**`, `*.spec.ts` (Playwright)

### Environment Variables

Test environment variables are defined in `vitest.config.ts`:
- `process.env.NODE_ENV=test`
- `process.env.GEMINI_API_KEY` (test key)
- `process.env.NEXT_PUBLIC_SUPABASE_URL` (test URL)
- Various feature flags disabled for tests

For E2E tool tests:
- `ENABLE_E2E_TOOL_TESTS=1` - Enable E2E tool tests
- `USE_REAL_TOOLS=1` - Use real tool implementations (requires API keys)
- `USE_REAL_WEBSOCKET=1` - Test against real WebSocket server
- `USE_REAL_API=1` - Test against real API server

---

## Running Tests by Category

### Run All Agent Tests
```bash
pnpm test -- src/core/agents/__tests__/
```

### Run All Integration Tests
```bash
pnpm test -- src/__tests__/integration-e2e.test.ts test/tool-integration-e2e.test.ts services/__tests__/integration.test.ts
```

### Run All Service Tests
```bash
pnpm test -- services/__tests__/
```

### Run All Performance Tests
```bash
pnpm test -- src/__tests__/performance.test.ts
```

### Run All Feature Tests
```bash
pnpm test -- src/__tests__/text-input-during-voice.test.ts src/__tests__/vision-accuracy.test.ts src/__tests__/screen-share-analysis.test.ts
```

---

## Test Coverage

Generate coverage report:
```bash
pnpm test:coverage
```

Coverage includes:
- `src/**/*.ts`
- `services/**/*.ts`
- `server/**/*.ts`

Excludes:
- Test files (`**/__tests__/**`, `**/*.test.ts`)
- `node_modules`

---

## Troubleshooting

### Tests Failing with Import Errors
- Check that all dependencies are installed: `pnpm install`
- Verify import paths match the project structure
- Check `vitest.config.ts` alias configuration

### Tests Timing Out
- Default timeout is 30 seconds
- Increase per-test with `test.setTimeout(60000)` for long-running tests
- Check for blocking operations (database calls, API calls without mocks)

### E2E Tests Not Running
- For tool E2E tests, set `ENABLE_E2E_TOOL_TESTS=1`
- For browser E2E tests, install Playwright: `pnpm playwright:install`
- Ensure required services are running (WebSocket server, API server) if testing against real servers

### Mock Issues
- Check that mocks are properly reset in `beforeEach` hooks
- Verify mock implementations match actual function signatures
- For service mocks, ensure they're set up before imports

---

## Best Practices

1. **Isolation:** Each test should be independent and not rely on other tests
2. **Mocking:** Mock external dependencies (APIs, databases, WebSockets)
3. **Setup/Teardown:** Use `beforeEach` and `afterEach` to reset state
4. **Descriptive Names:** Test names should clearly describe what they test
5. **Arrange-Act-Assert:** Structure tests with clear sections
6. **Error Cases:** Test both success and error paths
7. **Edge Cases:** Test boundary conditions and edge cases

---

## Related Documentation

- [E2E Tool Testing Guide](./E2E_TOOL_TESTING.md) - Detailed guide for tool E2E tests
- [Local Testing Guide](./LOCAL_TESTING_GUIDE.md) - Guide for local testing
- [Testing Strategy](./TESTING_AND_CLEANUP_STRATEGY.md) - Overall testing strategy
- [Test Gap Analysis](./TEST_GAP_ANALYSIS.md) - Current test coverage gaps
- [Pre-Deployment Checklist](./PRE_DEPLOYMENT_CHECKLIST.md) - Test requirements before deployment
