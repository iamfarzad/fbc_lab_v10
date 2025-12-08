# Codebase Analysis - fbc_lab_v10

**Date:** 2025-12-08  
**Status:** Comprehensive Analysis Complete

---

## Executive Summary

**fbc_lab_v10** is a sophisticated AI-powered conversational sales platform built with React, TypeScript, and Vite. It features a multi-agent orchestration system, real-time voice/visual interactions, and comprehensive lead management capabilities.

### Key Metrics
- **Tech Stack:** React 18, TypeScript, Vite, Vercel (Frontend), Fly.io (WebSocket), Supabase (Database)
- **Architecture:** Multi-agent system with 13+ specialized agents
- **Modalities:** Text chat, voice (Gemini Live API), webcam, screen share, file uploads
- **Deployment:** Vercel (frontend/API), Fly.io (WebSocket server), Supabase (database)
- **Code Organization:** ~300+ files, well-structured with clear separation of concerns

---

## Architecture Overview

### Project Structure

```
fbc_lab_v10/
├── api/                    # Vercel serverless functions
│   ├── chat.ts            # Main chat endpoint
│   ├── agent-stage.ts     # Agent metadata endpoint
│   ├── admin/             # Admin API routes
│   └── tools/             # Tool endpoints
│
├── components/            # React components (frontend-only)
│   ├── chat/              # Chat UI components
│   ├── admin/             # Admin dashboard components
│   └── ui/                # shadcn/ui base components
│
├── services/              # Frontend services (API clients)
│   ├── aiBrainService.ts  # Main AI service
│   ├── geminiLiveService.ts  # Real-time voice
│   └── standardChatService.ts # Standard chat
│
├── src/                   # Shared code (frontend + backend)
│   ├── core/
│   │   ├── agents/        # 13+ specialized agents
│   │   ├── context/       # Context management
│   │   ├── intelligence/ # Lead research & analysis
│   │   ├── tools/         # Tool registry & execution
│   │   ├── pdf/           # PDF generation system
│   │   └── security/      # Auth & security
│   ├── hooks/             # React hooks
│   ├── lib/               # Utilities
│   └── types/             # TypeScript types
│
├── server/                # Fly.io WebSocket server
│   ├── live-server.ts     # Main server entry
│   ├── handlers/          # WebSocket handlers
│   └── live-api/          # Gemini Live API integration
│
└── docs/                  # Comprehensive documentation (173+ files)
```

### Architecture Principles

1. **Separation of Concerns:**
   - Root level: Frontend-only code (`components/`, `services/`, `utils/`)
   - `src/`: Shared code used by both frontend and backend
   - `server/`: Backend-only WebSocket server
   - `api/`: Vercel serverless functions

2. **Import Strategy:**
   - Absolute imports from root (no `@/` alias)
   - Pattern: `import { X } from 'components/Y'`
   - Server uses relative imports with `.js` extensions (ESM compatibility)

3. **Multi-Agent System:**
   - 13+ specialized agents for different conversation stages
   - Orchestrator routes conversations based on funnel stage
   - Client-side and server-side orchestration

---

## Core Systems

### 1. Agent Orchestration System

**Location:** `src/core/agents/orchestrator.ts`, `src/core/agents/client-orchestrator.ts`

**Agents (13 total):**
1. **Discovery Agent** - Initial lead qualification
2. **Scoring Agent** - Calculates lead/fit scores
3. **Pitch Agent** - Unified sales pitch
4. **Workshop Sales Agent** - Workshop-specific pitch
5. **Consulting Sales Agent** - Consulting-specific pitch
6. **Proposal Agent** - Generates structured proposals
7. **Objection Agent** - Handles objections
8. **Closer Agent** - Booking/closing
9. **Summary Agent** - Conversation wrap-up
10. **Lead Intelligence Agent** - Background research
11. **Retargeting Agent** - Re-engagement campaigns
12. **Admin Agent** - Admin queries
13. **Exit Detector** - Detects exit intents

**Funnel Stages (15 stages):**
```
DISCOVERY → INTELLIGENCE_GATHERING → SCORING → QUALIFIED → 
PITCHING → WORKSHOP_PITCH → CONSULTING_PITCH → PROPOSAL → 
OBJECTION → CLOSING → BOOKING_REQUESTED → BOOKED → SUMMARY
```

**Routing Logic:**
- Priority 1: Triggers (booking, admin, conversation_end)
- Priority 2: Objection detection (confidence > 0.7)
- Priority 3: Stage-based routing
- Fast-track: Qualified leads skip discovery

### 2. Multimodal System

**Modalities Supported:**
- **Text Chat** - Standard conversational interface
- **Voice** - Real-time voice via Gemini Live API
- **Webcam** - Video frame analysis
- **Screen Share** - Screen capture analysis
- **File Uploads** - PDF, images, documents

**Integration Points:**
- `services/geminiLiveService.ts` - Voice/visual streaming
- `server/live-api/tool-processor.ts` - Tool execution
- `src/core/context/multimodal-context.ts` - Context aggregation
- `components/chat/` - UI components

**Context Sharing:**
- All modalities share unified context
- Voice/text sync via orchestrator
- Visual context (webcam/screen) included in prompts

### 3. Tool System

**Location:** `src/core/tools/unified-tool-registry.ts`

**Tools (9 total):**
1. `search_web` - Web search (Google Grounding)
2. `extract_action_items` - LLM extraction
3. `generate_summary_preview` - LLM summarization
4. `draft_follow_up_email` - Email drafting
5. `generate_proposal_draft` - Proposal generation
6. `get_dashboard_stats` - Admin analytics
7. `calculate_roi` - ROI calculation
8. `search_companies_by_location` - Company search
9. `get_weather` - Weather lookup

**Architecture:**
- Unified registry with Zod schema validation
- Server-side execution only (security)
- Retry logic (2 attempts voice, 3 attempts chat)
- Timeout protection (25s default)
- Capability tracking for analytics

### 4. Context Management

**Location:** `src/core/context/`

**Components:**
- `context-manager.ts` - Main context orchestration
- `multimodal-context.ts` - Multimodal context aggregation
- `context-storage.ts` - Supabase persistence
- `context-schema.ts` - Zod validation schemas
- `write-ahead-log.ts` - Transaction logging

**Context Types:**
- Intelligence context (lead research)
- Multimodal context (voice/visual/uploads)
- Conversation flow (stage tracking)
- Agent context (agent-specific data)

### 5. PDF Generation System

**Location:** `src/core/pdf/`

**Features:**
- Discovery Report (McKinsey/BCG-style)
- Proposal generation
- Summary reports
- Chart generation (ROI, engagement radar, tools timeline)

**Components:**
- `discovery-report-generator.ts` - Main generator
- `templates/` - HTML templates
- `charts/` - SVG chart generators
- `renderers/` - Puppeteer/PDF-lib renderers

### 6. Admin System

**Location:** `src/core/admin/`, `components/admin/`

**Features:**
- Analytics dashboard
- Conversation management
- Email campaigns
- Security audit
- System health monitoring
- Token usage tracking

**API Routes:** 12+ admin endpoints in `api/admin/`

---

## Technology Stack

### Frontend
- **Framework:** React 18.2.0
- **Build Tool:** Vite 5.0.8
- **Language:** TypeScript 5.2.2
- **UI Library:** shadcn/ui (Radix UI + Tailwind CSS)
- **Routing:** React Router 7.9.6
- **State:** React Context + Hooks

### Backend
- **API:** Vercel Serverless Functions
- **WebSocket:** Fly.io (Node.js + Express)
- **Database:** Supabase (PostgreSQL)
- **Queue:** Redis (via Vercel KV)

### AI/ML
- **Primary Model:** Gemini 3.0 Pro Preview
- **Voice Model:** Gemini 2.5 Flash Native Audio Preview
- **SDK:** @ai-sdk/google v2.0.44
- **Features:** Structured output, function calling, streaming

### Development Tools
- **Testing:** Vitest, Playwright
- **Linting:** ESLint
- **Type Checking:** TypeScript (strict mode)
- **Package Manager:** pnpm

---

## Deployment Architecture

### Frontend (Vercel)
- **URL:** https://fbclabv10.vercel.app
- **Build:** `pnpm build` (Vite)
- **Functions:** `api/**/*.ts` (30s max duration)
- **SPA Routing:** Rewrite rule for non-API routes

### WebSocket Server (Fly.io)
- **URL:** https://fb-consulting-websocket.fly.dev
- **Port:** 3001 (dev), 443 (prod)
- **Protocol:** WebSocket (wss://)
- **Health Check:** `/health` endpoint

### Database (Supabase)
- **Type:** PostgreSQL
- **Features:** RLS, real-time subscriptions, storage
- **Migrations:** `supabase/migrations/`

### Environment Variables
- **Required:** Supabase URL/keys, Gemini API key
- **Optional:** Voice verbose logs, tool retry config
- **See:** `docs/VERCEL_ENV_VALIDATION.md`

---

## Key Features

### 1. Multi-Agent Sales Funnel
- 15-stage funnel with specialized agents
- Dynamic stage routing
- Exit intent detection
- Fast-track for qualified leads

### 2. Real-Time Voice
- Gemini Live API integration
- AudioWorklet (no deprecated APIs)
- Real-time tool calling
- Context synchronization

### 3. Visual Analysis
- Webcam frame analysis
- Screen share capture
- Image/document processing
- Context extraction

### 4. Lead Intelligence
- Background research
- Company enrichment
- Role detection
- Intent classification

### 5. PDF Reports
- Discovery reports (lead magnet)
- Proposal generation
- Engagement analytics
- ROI calculations

### 6. Admin Dashboard
- Analytics & metrics
- Conversation management
- Email campaigns
- Security audit

---

## Code Quality

### Strengths
- ✅ **Type Safety:** Strict TypeScript with `exactOptionalPropertyTypes`
- ✅ **Code Organization:** Clear separation of concerns
- ✅ **Documentation:** 173+ documentation files
- ✅ **Testing:** Unit tests, integration tests, E2E tests
- ✅ **Error Handling:** Comprehensive error boundaries
- ✅ **Security:** Server-side tool execution, RLS policies

### Areas for Improvement
- ⚠️ **Test Coverage:** Some agents lack comprehensive tests
- ⚠️ **Error Recovery:** Limited retry logic in some areas
- ⚠️ **Performance:** No response caching for agents
- ⚠️ **Monitoring:** Limited production observability

---

## Known Issues & Gaps

### Critical (Fixed)
- ✅ Supabase singleton bypass (security-audit.ts)
- ✅ ECONNREFUSED detection (aiBrainService.ts)
- ✅ LiveService recreation loop (App.tsx)
- ✅ Session timeout (geminiLiveService.ts)
- ✅ Live API 1007 error (config-builder.ts)

### High Priority (Pending)
- ⏳ Voice not auto-used after permission grant
- ⏳ Location not synced to LiveService
- ⏳ userProfile not synced to unifiedContext
- ⏳ SSE streaming (v2-v8 had progressive responses)

### Medium Priority
- ⏳ Intent detection not wired up in orchestrator
- ⏳ Exit detection needs porting from v8
- ⏳ Response caching for agents
- ⏳ Performance optimization

### Documentation Gaps
- ⚠️ API endpoint documentation (OpenAPI spec)
- ⚠️ Component usage examples
- ⚠️ Deployment troubleshooting guide

---

## Development Workflow

### Scripts
```bash
pnpm dev              # Development server (port 3000)
pnpm dev:server       # WebSocket server (port 3001)
pnpm dev:api          # Vercel dev server (port 3002)
pnpm dev:all          # All services concurrently

pnpm build            # Production build
pnpm type-check       # TypeScript validation
pnpm lint             # ESLint
pnpm test             # Vitest unit tests
pnpm test:e2e:browser # Playwright E2E tests
```

### Pre-commit Hooks
- Type checking (automatic)
- Linting (automatic)
- Tests (pre-push)

### Import Rules
- ✅ Absolute imports from root
- ❌ No `@/` aliases
- ❌ No `src/` imports in `api/` or `server/`
- ✅ Relative imports with `.js` in server code

---

## Project Status

**Current Phase:** Critical Error Fixes Complete  
**Last Updated:** 2025-12-08

### Recent Achievements
- ✅ All 6 critical system errors fixed
- ✅ Multimodal testing guide created
- ✅ Webcam crash resolved
- ✅ Audio subsystem modernized
- ✅ Vercel 500 error resolved
- ✅ Voice connection loop fixed

### Next Steps
1. Manual testing of critical fixes
2. Address onboarding flow gaps
3. Implement SSE streaming
4. Port exit detection from v8
5. Add response caching

---

## Documentation Index

**Key Documents:**
- `PROJECT_STATUS.md` - Current status and recent changes
- `docs/AGENTS_DOCUMENTATION.md` - Complete agent reference
- `docs/CHAT_TEXT_PIPELINE_ANALYSIS.md` - Chat flow documentation
- `docs/MULTIMODAL_TESTING_GUIDE.md` - Testing procedures
- `docs/DEPLOYMENT.md` - Deployment guide
- `docs/VERCEL_ENV_VALIDATION.md` - Environment variables

**See:** `docs/README.md` for complete documentation index (173+ files)

---

## Conclusion

**fbc_lab_v10** is a mature, well-architected conversational AI platform with:
- ✅ Sophisticated multi-agent system
- ✅ Comprehensive multimodal support
- ✅ Strong type safety and code organization
- ✅ Extensive documentation
- ✅ Production-ready deployment setup

**Recommendations:**
1. Continue systematic testing of critical fixes
2. Address high-priority gaps (voice auto-connect, context sync)
3. Improve test coverage for agents
4. Add production monitoring/observability
5. Consider API documentation (OpenAPI)

---

**Analysis Complete** ✅
