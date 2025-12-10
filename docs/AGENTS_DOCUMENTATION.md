# Agents Documentation

**Date:** 2025-12-07  
**Last Updated:** 2025-01-27  
**Purpose:** Complete reference for all agents in the F.B/c sales funnel system  
**Status:** ✅ **SINGLE SOURCE OF TRUTH** - All agent information consolidated here

> 📋 **UPDATE RULES:** When making agent code or flow changes, see [`AGENT_DOCUMENTATION_UPDATE_RULES.md`](./AGENT_DOCUMENTATION_UPDATE_RULES.md) for what sections need updating.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Pipeline Agents](#core-pipeline-agents)
3. [Special Agents](#special-agents)
4. [Orchestration System](#orchestration-system)
5. [Agent Connections & Flow](#agent-connections--flow)
6. [Agent Instructions & Prompts](#agent-instructions--prompts)
7. [Response Validation System](#response-validation-system)
8. [API Endpoints](#api-endpoints)
9. [Recent Enhancements](#recent-enhancements)

---

## Architecture Overview

**Total Agents:** 13  
**Core Pipeline Agents:** 10  
**Special Agents:** 3

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                          │
│  (React Frontend - Text, Voice, Webcam, File Upload, Canvas)   │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                     API LAYER (Vercel)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/chat.ts                                             │  │
│  │  - Stage Determination (single source of truth)          │  │
│  │  - Message Validation                                    │  │
│  │  - Rate Limiting                                         │  │
│  │  - Context Management                                    │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│              SERVER ORCHESTRATOR (orchestrator.ts)              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Priority Routing:                                        │  │
│  │  1. Triggers (booking, admin, conversation_end)         │  │
│  │  2. Objection Detection (confidence > 0.7)              │  │
│  │  3. Fast-Track (qualified leads skip discovery)         │  │
│  │  4. Stage-Based Routing                                 │  │
│  └────────────────────┬─────────────────────────────────────┘  │
└───────────────────────┼─────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  Discovery   │ │   Scoring    │ │    Pitch     │ │   Objection  │
│   Agent      │ │    Agent     │ │    Agent     │ │    Agent     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │               │               │               │
        └───────────────┼───────────────┴───────────────┘
                        │
        ┌───────────────┼───────────────┬───────────────┐
        ▼               ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Closer     │ │   Summary    │ │   Proposal   │ │    Admin     │
│   Agent      │ │    Agent     │ │    Agent     │ │    Agent     │
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
        │
        ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CONTEXT MANAGEMENT                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Intelligence    │  │   Multimodal    │  │  Conversation   │ │
│  │   Context       │  │    Context      │  │     Flow        │ │
│  │                 │  │                 │  │                 │ │
│  │ - Company info  │  │ - Voice active  │  │ - Categories    │ │
│  │ - Person role   │  │ - Screen share  │  │   covered       │ │
│  │ - Fit scores    │  │ - Uploads       │  │ - Evidence      │ │
│  │ - Lead score    │  │ - Analyses      │  │ - Insights      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│   Database   │ │   Redis      │ │   Analytics  │
│  (Supabase)  │ │   (Cache)    │ │    Queue     │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Architecture Layers

1. **Presentation Layer** (React Frontend)
   - User interactions: text, voice, webcam, file uploads
   - Visual state management
   - Client-side routing via `client-orchestrator.ts`

2. **API Layer** (`/api/chat.ts`)
   - **Single source of truth** for stage determination
   - Message validation and normalization
   - Rate limiting
   - CORS handling
   - Calls server orchestrator

3. **Orchestration Layer** (`orchestrator.ts`)
   - Routes requests to appropriate agents
   - Priority-based routing logic
   - Context aggregation
   - Response validation
   - Non-blocking persistence

4. **Agent Layer** (`src/core/agents/`)
   - 13 specialized agents
   - Each agent receives: `messages`, `AgentContext`
   - Each agent returns: `AgentResult` with output and metadata

5. **Context Layer** (`src/core/context/`)
   - **IntelligenceContext**: Company, person, scores, budget
   - **MultimodalContext**: Voice, screen, uploads, analyses
   - **ConversationFlow**: Discovery coverage, evidence, insights

6. **Data Layer**
   - **Supabase**: Conversation storage, lead data
   - **Redis**: Caching, session state
   - **Analytics Queue**: Agent/tool performance tracking

### Data Flow

```
User Message
    │
    ▼
Frontend (useChatSession hook)
    │
    ▼
/api/chat.ts (determines stage)
    │
    ▼
orchestrator.ts (routes to agent)
    │
    ▼
Agent (processes with context)
    │
    ▼
AI Model (Gemini) + Tools
    │
    ▼
AgentResult (output + metadata)
    │
    ▼
Response (validated, persisted)
    │
    ▼
Frontend (displays response)
```

### Agent Categories

1. **Core Pipeline Agents** (main conversation flow):
   - Discovery Agent
   - Scoring Agent
   - Workshop Sales Agent
   - Consulting Sales Agent
   - Pitch Agent
   - Objection Agent
   - Closer Agent
   - Summary Agent
   - Proposal Agent

2. **Special Agents** (not in main flow):
   - Admin Agent
   - Retargeting Agent
   - Lead Intelligence Agent

3. **Orchestration**:
   - Server Orchestrator (`orchestrator.ts`)
   - Client Orchestrator (`client-orchestrator.ts`)

---

## Core Pipeline Agents

### 1. Discovery Agent

**File:** `src/core/agents/discovery-agent.ts`  
**Function:** `discoveryAgent(messages: ChatMessage[], context: AgentContext): Promise<AgentResult>`

#### Inputs:
- **messages**: `ChatMessage[]` - Full conversation history
- **context**: `AgentContext` containing:
  - `intelligenceContext`: Company info, person role, existing scores
  - `multimodalContext`: Voice, screen share, uploads status
  - `conversationFlow`: Discovery coverage (6 categories), evidence, insights
  - `sessionId`: Session identifier

#### Outputs:
- **output**: `string` - Discovery question or recap
- **agent**: `"Discovery Agent"`
- **metadata**: 
  - `stage`: `"DISCOVERY"`
  - `chainOfThought`: Steps showing reasoning
  - `triggerBooking?`: `boolean` (if exit intent detected)
  - `recapProvided?`: `boolean`

#### Goal:
Systematically qualify leads through conversation across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

#### Key Features:
- Multimodal-aware (references voice, screen, webcam, uploads)
- URL detection & analysis
- Structured extraction (company size, budget, timeline)
- Exit intent detection (booking, wrap-up)
- Question fatigue detection (offers recap after 3+ consecutive questions)
- Conversation flow enhancement

#### Instructions:
- Personalize every response (use company name, role)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language style
- Reference multimodal context naturally
- Always respond in English unless user explicitly switches

#### Routing Logic:
- **Triggered by:** `DISCOVERY` stage
- **Routes to:** `SCORING` → `PITCHING` (when qualified) or `QUALIFIED` (fast-track)
- **Can trigger:** Booking (exit intent), Wrap-up (exit intent)

#### Model Configuration:
- **Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
- **Temperature:** 0.7 (or 1.0 if `thinkingLevel === 'high'`)

---

### 2. Scoring Agent

**File:** `src/core/agents/scoring-agent.ts`  
**Function:** `scoringAgent(messages: ChatMessage[], context: AgentContext): Promise<AgentResult>`

#### Inputs:
- **messages**: `ChatMessage[]` - Full conversation history (usually not directly used)
- **context**: `AgentContext` containing:
  - `intelligenceContext`: Company, person, existing data
  - `conversationFlow`: Categories covered (0-6), evidence
  - `multimodalContext`: Voice, screen, uploads flags

#### Outputs:
- **output**: `string` - Human-readable score summary
- **agent**: `"Scoring Agent"`
- **metadata**:
  - `stage`: `"SCORING"`
  - `leadScore`: `number` (0-100)
  - `fitScore`: `{ workshop: number, consulting: number }` (0.0-1.0)
  - `reasoning`: `string`
  - `chainOfThought`: Scoring steps

#### Goal:
Calculate lead score (0-100) and fit scores (workshop vs consulting) based on:
- Role seniority (30 points max)
- Company size (25 points max)
- Conversation quality (25 points max)
- Budget signals (20 points max)
- Multimodal bonuses (voice +10, screen +15, uploads +10)

#### Scoring Criteria:
1. **Role Seniority** (30 points max):
   - C-level/Founder: 30
   - VP/Director: 20
   - Manager: 10
   - Individual contributor: 5

2. **Company Signals** (25 points max):
   - Enterprise (500+ employees): 25
   - Mid-market (50-500): 15
   - Small (10-50): 10
   - Startup (<10): 5

3. **Conversation Quality** (25 points max):
   - All 6 categories covered: 25
   - 4-5 categories: 15
   - 2-3 categories: 10
   - 1 category: 5

4. **Budget Signals** (20 points max):
   - Explicit budget mentioned: 20
   - Timeline urgency (Q1/Q2): 15
   - Just exploring: 5

5. **Multimodal Bonuses**:
   - Voice used: +10 points
   - Screen shared: +15 points
   - Documents uploaded: +10 points

#### Fit Score Calculation:
- **Workshop fit indicators**: Manager/Team Lead, mid-size company (50-500), mentions "training"/"workshop", budget $5K-$15K
- **Consulting fit indicators**: C-level/VP, enterprise, mentions "custom build"/"implementation", budget $50K+

#### Key Features:
- Structured JSON output (no regex parsing)
- Fit score calculation (workshop vs consulting)
- Multimodal engagement bonuses

#### Instructions:
- Output JSON only, no explanation
- Calculate scores based on provided criteria
- Include reasoning in output

#### Routing Logic:
- **Triggered by:** `SCORING` stage (after discovery has enough context)
- **Routes to:** `WORKSHOP_PITCH`, `CONSULTING_PITCH`, or `PITCHING` (based on fit scores)
- **Updates:** `intelligenceContext.leadScore`, `intelligenceContext.fitScore`

#### Model Configuration:
- **Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
- **Temperature:** 0.3 (lower for consistent scoring)

---

### 3. Workshop Sales Agent

**File:** `src/core/agents/workshop-sales-agent.ts`  
**Function:** `workshopSalesAgent(messages, context)`

**Goal:**
Pitch in-person AI workshops to mid-size companies, team leads/managers with $5K-$15K budget.

**Target Profile:**
- Manager/Team Lead role (not C-level)
- Mid-size company (50-500 employees)
- Budget range: $5K-$15K
- Mentions: "training", "teach team", "upskilling", "workshop"

**Pitch Structure:**
1. Acknowledge pain from discovery
2. Position workshop as solution
3. Show concrete value (specific numbers)
4. Soft CTA with calendar link

**Workshop Packages:**
1. AI Fundamentals (1 day) - $5,000
2. AI Implementation (2 days) - $10,000
3. AI Leadership (1 day) - $7,500

**Instructions:**
- Don't mention consulting (different product)
- Keep pricing ranges, finalize in call
- Create urgency: "Next workshop is in [timeframe]"
- Reference multimodal moments naturally
- ALWAYS use company name and role
- Tie back to specific pain points from discovery

**Connections:**
- **Triggered by:** `WORKSHOP_PITCH` stage (when `fitScore.workshop > fitScore.consulting + 0.1`)
- **Routes to:** `CLOSING` (if high interest) or `OBJECTION` (if objections detected)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.7

---

### 4. Consulting Sales Agent

**File:** `src/core/agents/consulting-sales-agent.ts`  
**Function:** `consultingSalesAgent(messages, context)`

**Goal:**
Pitch custom AI consulting to C-level/VPs, enterprise companies with $50K+ budget.

**Target Profile:**
- C-level/VP role
- Enterprise or well-funded startup
- Budget range: $50K+
- Mentions: "custom build", "implementation", "integrate", "scale"

**Pitch Structure:**
1. Acknowledge pain from discovery
2. Position custom solution
3. Show concrete ROI (specific numbers)
4. Strong CTA with calendar link

**Consulting Engagement Tiers:**
1. Strategy & Assessment ($15K - $25K)
2. Pilot Implementation ($50K - $100K)
3. Full Implementation ($150K - $500K+)

**Instructions:**
- Don't mention workshops (for smaller leads)
- Be direct about pricing: "Engagements typically start at $50K"
- Reference similar clients
- Use multimodal evidence naturally
- For C-level: Focus on strategic impact, market advantage
- For VPs/Directors: Focus on operational efficiency, budget justification

**Connections:**
- **Triggered by:** `CONSULTING_PITCH` stage (when `fitScore.consulting > fitScore.workshop + 0.1`)
- **Routes to:** `CLOSING` (if high interest) or `OBJECTION` (if objections detected)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.7

---

### 5. Pitch Agent

**File:** `src/core/agents/pitch-agent.ts`  
**Function:** `pitchAgent(messages, context)`

**Goal:**
Unified pitch agent that auto-detects primary product (workshop vs consulting) based on fitScore. Replaces separate workshop/consulting agents in some flows.

**Key Features:**
- Auto-detects product based on `fitScore.workshop` vs `fitScore.consulting`
- Dynamic ROI calculation using `calculateRoi` utility
- References multimodal context naturally

**Product Config:**
- **Workshop:** AI Acceleration Workshop ($8K–$18K, 2–3 days)
- **Consulting:** Custom AI Transformation Program ($80K–$400K+, 3–12 months)

**Instructions:**
- Never mention the other product unless asked
- Use exact company/role context naturally
- Reference what they showed on screen/webcam/uploaded
- Create urgency without sounding salesy
- End with clear next step (book call or ask for budget/timeline)
- Only reveal pricing if high interest (>0.75) or asked directly

**Connections:**
- **Triggered by:** `PITCHING` stage (default pitch when fit unclear)
- **Routes to:** `CLOSING` (if `interestLevel > 0.8`) or `OBJECTION` (if objections detected)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.7

---

### 6. Objection Agent

**File:** `src/core/agents/objection-agent.ts`  
**Function:** `objectionAgent(messages, context)`

**Goal:**
Micro-agent that activates only when objection detected. Provides pre-built rebuttals for each objection type.

**Objection Types:**
- `price` - Too expensive
- `timing` - Not the right time
- `authority` - Not decision maker
- `need` - Don't need it
- `trust` - Don't trust the solution

**Activation:**
- Only activates when `detectObjection()` returns confidence > 0.6
- Highest priority override (runs before normal routing)

**Rebuttals:**
Each objection type has a contextual rebuttal that:
- Acknowledges the concern
- Provides counter-argument with specific numbers
- Offers next step (breakdown, prep call, case study, etc.)

**Instructions:**
- Use company size, budget, role, industry in rebuttals
- Be empathetic but direct
- Always offer a concrete next step

**Connections:**
- **Triggered by:** Objection detection (highest priority, overrides current stage)
- **Routes to:** `CLOSING` (after handling objection) or back to `PITCHING` (if objection resolved)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** N/A (pre-built responses)

---

### 7. Closer Agent

**File:** `src/core/agents/closer-agent.ts`  
**Function:** `closerAgent(messages, context)`

**Goal:**
Close the deal by removing friction, creating urgency, and providing final booking CTA.

**Key Features:**
- Access to unified tool registry
- Agent-specific tools: `create_chart`, `create_calendar_widget`
- References multimodal experience as social proof

**Available Tools:**
- `search_web` - Search for current information
- `calculate_roi` - Calculate ROI based on investment and savings
- `extract_action_items` - Extract key outcomes
- `generate_summary_preview` - Generate conversation summary preview
- `draft_follow_up_email` - Draft follow-up email
- `generate_proposal_draft` - Generate proposal draft
- `create_chart` - Show ROI breakdown
- `create_calendar_widget` - Final booking CTA

**Instructions:**
- Reference multimodal experience: "You've already seen what our AI can do live"
- Create urgency: "Slots are filling fast"
- Remove friction: "Free call, no commitment"
- Use tools when appropriate (calculate_roi, create_chart)

**Connections:**
- **Triggered by:** `CLOSING` stage, `BOOKING_REQUESTED` trigger, or `booking` trigger
- **Routes to:** `BOOKED` (if booking successful) or `SUMMARY` (if conversation ends)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT` → `GEMINI_MODELS.FALLBACK` (auto-fallback)  
**Temperature:** 0.8

---

### 8. Summary Agent

**File:** `src/core/agents/summary-agent.ts`  
**Function:** `summaryAgent(messages, context)`

**Goal:**
Analyze full conversation and generate structured JSON summary for PDF generation. Triggered when conversation ends.

**Trigger Conditions:**
- `conversation_end` trigger
- Exit intent: `WRAP_UP`
- Force exit after frustration
- Timeout or limits reached

**Output Structure:**
```json
{
  "executiveSummary": "...",
  "multimodalInteractionSummary": {
    "voice": "...",
    "screenShare": "...",
    "documentsReviewed": [...],
    "engagementScore": "High/Medium/Low"
  },
  "keyFindings": {
    "goals": "...",
    "painPoints": [...],
    "currentSituation": "...",
    "dataReality": "...",
    "teamReadiness": "...",
    "budgetSignals": "..."
  },
  "recommendedSolution": "workshop" | "consulting",
  "solutionRationale": "...",
  "expectedROI": "...",
  "pricingBallpark": "...",
  "nextSteps": "..."
}
```

**Key Features:**
- Analyzes full multimodal context (voice, screen, uploads)
- Extracts discovery coverage (6 categories)
- Determines recommended solution
- Calculates ROI projection

**Instructions:**
- Professional but conversational tone
- This is a valuable document they'll share internally
- Output JSON only, no explanation

**Connections:**
- **Triggered by:** `SUMMARY` stage, `conversation_end` trigger, `WRAP_UP` exit intent
- **Routes to:** End of conversation (no further routing)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 1.0 (high thinking)

---

### 9. Proposal Agent

**File:** `src/core/agents/proposal-agent.ts`  
**Function:** `proposalAgent(messages, context)`

**Goal:**
Generate formal consulting proposals with accurate scope and pricing. Triggered when user requests quote OR consulting fit > 0.8 + explicit consent.

**Proposal Structure:**
```json
{
  "executiveSummary": {
    "client": "...",
    "industry": "...",
    "problemStatement": "...",
    "proposedSolution": "..."
  },
  "scopeOfWork": {
    "phases": [
      {
        "name": "Discovery & Planning",
        "duration": "2-3 weeks",
        "deliverables": [...]
      },
      ...
    ]
  },
  "timeline": {
    "projectStart": "...",
    "milestones": [...],
    "projectCompletion": "..."
  },
  "investment": {
    "phase1": <number>,
    "phase2": <number>,
    "phase3": <number>,
    "total": <number>,
    "paymentTerms": "..."
  },
  "roi": {
    "expectedSavings": "...",
    "paybackPeriod": "...",
    "efficiency": "..."
  }
}
```

**Pricing Guidelines:**
- Small project (MVP/POC): $25K - $75K
- Medium project (Full implementation): $50K - $200K
- Large project (Complex/Multi-system): $75K - $500K+

**Instructions:**
- Base pricing on complexity and company size
- Adjust for pain severity, timeline urgency, team size, integration complexity
- Output valid JSON only, no explanation

**Connections:**
- **Triggered by:** `PROPOSAL` stage (when user requests quote or high consulting fit)
- **Routes to:** `CLOSING` (after proposal delivered) or `SUMMARY` (if conversation ends)

**Model:** `GEMINI_MODELS.DEFAULT_RELIABLE`  
**Temperature:** 0.3

---

## Special Agents

### 10. Admin Agent

**File:** `src/core/agents/admin-agent.ts`  
**Function:** `adminAgent(messages, context)`

**Goal:**
Farzad's business intelligence assistant. Has access to all conversations, analytics, system health, and dashboard stats.

**Identity:**
- Jarvis-style: Precise, anticipates needs, efficient, professional warmth
- Elon-style: Direct communication, technical depth, forward-thinking
- Laid-back: Comfortable confidence, conversational tone

**Capabilities:**
1. Search leads: "Show me healthcare leads from last week with score >80"
2. Draft emails: "Draft follow-up for [name] mentioning [specific detail]"
3. Performance insights: "Which agents have the lowest success rates?"
4. Prioritization: "Show high-score leads (≥70) who haven't booked"
5. System health: "What's our error rate and latency?"
6. Research online: "Look up latest trends in [industry]"
7. Analyze URLs: "What's on this page?"

**Available Tools:**
- Unified tools: `search_web`, `calculate_roi`, `extract_action_items`, `generate_summary_preview`, `draft_follow_up_email`, `generate_proposal_draft`
- Admin-specific: `search_leads`, `draft_email`, `query_conversations`, `analyze_performance`

**Data Access:**
- Recent conversations (last 20)
- Dashboard stats (last 7 days): total leads, avg score, conversion rate, engagement rate
- Agent analytics: executions, success rates, durations
- Tool analytics: executions, cache hit rates

**Instructions:**
- Data-driven, concise, actionable
- Always cite specific numbers and names
- When you need to research, say so - tools handle it automatically
- Be direct, technical when it adds value, but stay conversational
- No corporate fluff

**Connections:**
- **Triggered by:** `ADMIN` stage or `admin` trigger
- **Routes to:** Continues in admin mode (no routing to other agents)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 1.0 (high thinking)

---

### 11. Retargeting Agent

**File:** `src/core/agents/retargeting-agent.ts`  
**Function:** `retargetingAgent({ leadContext, conversationSummary, scenario })`

**Goal:**
Generate automated follow-up emails for scheduled jobs. NOT a chat agent - runs asynchronously.

**Scenarios:**
1. `email_failed` - Retry with slight variation
2. `no_booking_high_score` - High-intent lead, needs nudge
3. `no_booking_low_score` - Nurture campaign
4. `proposal_sent` - Follow-up after proposal

**Output Format:**
```json
{
  "subject": "Email subject line",
  "body": "Email body with personalization",
  "cta": "Primary call-to-action",
  "timing": "when to send (immediate, 3 days, 1 week, etc.)"
}
```

**Email Guidelines by Scenario:**
- **email_failed:** Same core message, different subject, add urgency
- **no_booking_high_score:** Reference pain points, create urgency, strong CTA
- **no_booking_low_score:** Soft touch, value-add content, monthly check-in
- **proposal_sent:** "I sent over the proposal - any questions?", offer call

**Instructions:**
- Use their name and company
- Reference specific things discussed (screen share, pain points)
- Match their communication style (formal vs casual)
- Professional but warm - this is Farzad reaching out, not a marketing bot

**Connections:**
- **Triggered by:** Scheduled jobs (not part of chat flow)
- **Routes to:** Email delivery system (no agent routing)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.7

---

### 12. Lead Intelligence Agent

**File:** `src/core/agents/lead-intelligence-agent.ts`  
**Function:** `leadIntelligenceAgent({ email, name, companyUrl, sessionId })`

**Goal:**
Background research worker that runs when user accepts terms. NOT a chat agent - runs at session start.

**Research Activities:**
1. Extract company domain from email
2. Research company profile (industry, size, website)
3. Analyze LinkedIn data (person, role, seniority)
4. Calculate initial fit scores (workshop vs consulting)
5. Finalize intelligence context

**Output:**
- Intelligence context stored in session
- Research data with confidence score
- Initial fit scores (before conversation)

**Fit Score Calculation:**
- Role-based signals (C-level → consulting, Manager → workshop)
- Company size signals (Enterprise → consulting, Mid-market → workshop)
- Industry signals (Finance/Healthcare → consulting)

**Instructions:**
- Run silently in background
- Store results in intelligence context
- Don't interrupt conversation flow

**Connections:**
- **Triggered by:** Session start (when user accepts terms)
- **Routes to:** Intelligence context stored, no agent routing
- **Used by:** All other agents (via `intelligenceContext`)

**Model:** N/A (uses `LeadResearchService`)

---

## Orchestration System

### Overview

The orchestration system routes conversations to specialized agents based on multiple factors:
1. **Triggers** (user-initiated actions)
2. **Objections** (detected concerns)
3. **Stage** (current funnel position)
4. **Context** (intelligence, multimodal, conversation flow)

There are **two orchestrators**:
- **Server Orchestrator**: Runs in Vercel API functions (production)
- **Client Orchestrator**: Runs in browser (development/fallback)

Both follow the same priority-based routing logic but differ in execution context.

---

### Server Orchestrator

**File:** `src/core/agents/orchestrator.ts`  
**Function:** `routeToAgent(params): Promise<AgentResult>`

#### Input Parameters:
```typescript
{
  messages: ChatMessage[]           // Full conversation history
  sessionId: string                 // Session identifier
  currentStage: FunnelStage         // Determined by API layer
  intelligenceContext: IntelligenceContext  // Company, person, scores
  multimodalContext: MultimodalContext      // Voice, screen, uploads
  trigger?: string                  // 'booking', 'admin', 'conversation_end', etc.
  conversationFlow?: ConversationFlowState  // Discovery coverage, evidence
}
```

#### Output:
```typescript
AgentResult {
  output: string                    // Agent response text
  agent: string                     // Agent name
  model?: string                    // Model used
  metadata: {
    stage: FunnelStage
    leadScore?: number
    fitScore?: { workshop: number, consulting: number }
    chainOfThought?: ChainOfThoughtStep[]
    toolsUsed?: string[]
    validationPassed?: boolean
    // ... agent-specific metadata
  }
}
```

#### Routing Logic (Priority Order):

**1. Highest Priority: Triggers** (explicit user actions)
```typescript
if (trigger === 'booking') → closerAgent()
if (trigger === 'conversation_end') → summaryAgent()
if (trigger === 'admin') → adminAgent()
if (trigger === 'proposal_request') → proposalAgent()
if (trigger === 'retargeting') → retargetingAgent()
```

**2. Objection Override** (highest priority after triggers)
```typescript
const objection = await detectObjection(lastMessage)
if (objection.confidence > 0.7) → objectionAgent()
```

**3. Stage-Based Routing** (normal flow)
```typescript
switch (currentStage) {
  case 'DISCOVERY' → discoveryAgent()
  case 'SCORING' → scoringAgent()
  case 'QUALIFIED' → pitchAgent()  // Fast-track
  case 'PITCHING' → pitchAgent()
  case 'WORKSHOP_PITCH' → pitchAgent()  // Auto-tailored
  case 'CONSULTING_PITCH' → pitchAgent()  // Auto-tailored
  case 'OBJECTION' → objectionAgent()
  case 'PROPOSAL' → proposalAgent()
  case 'CLOSING' → closerAgent()
  case 'SUMMARY' → summaryAgent()
  default → discoveryAgent()
}
```

#### Post-Processing:
1. **Response Validation**: Validates output quality, tool usage
2. **Persistence**: Non-blocking save to database (agent result, metadata)
3. **Analytics**: Queues agent execution for analytics

#### Key Features:
- **Stage determination** handled by API layer (single source of truth)
- **Objection detection** with confidence threshold (0.7)
- **Fast-track** for qualified leads (skip discovery)
- **Response validation** before returning
- **Non-blocking persistence** (doesn't slow down responses)

---

### Client Orchestrator

**File:** `src/core/agents/client-orchestrator.ts`  
**Function:** `clientRouteToAgent(messages: ChatMessage[], context: AgentContext): Promise<AgentResult>`

#### Purpose:
Client-side agent routing that runs entirely in the browser. Used for:
- Development/testing (no API calls)
- Fallback when API unavailable
- Faster iteration during development

#### Flow State Management:
Maintains module-level state across calls:
```typescript
interface ClientFlowState {
  currentStage: FunnelStage
  exitAttempts: number
  scoringComplete: boolean
  fitScore?: { workshop: number, consulting: number }
  leadScore?: number
  pitchDelivered: boolean
  proposalGenerated: boolean
  objectionCount: number
}
```

#### Routing Logic (Priority Order):

**1. Exit Intent Detection** (highest priority)
```typescript
const exitIntent = detectExitIntent(messages)
if (exitIntent === 'BOOKING') → closerAgent()
if (exitIntent === 'FORCE_EXIT' || 'WRAP_UP') → summaryAgent()
```

**2. Admin Trigger**
```typescript
if (intent === 'ADMIN') → adminAgent()
```

**3. Objection Detection**
```typescript
if (objection detected && pitchDelivered) → objectionAgent()
```

**4. Scoring** (automatic when needed)
```typescript
if (!scoringComplete && enoughContext) {
  scoringAgent() → update flowState → re-route
}
```

**5. Stage-Based Routing:**
```typescript
switch (flowState.currentStage) {
  case 'DISCOVERY' → discoveryAgent()
  case 'SCORING' → scoringAgent() → determinePitchType() → re-route
  case 'WORKSHOP_PITCH' → pitchAgent()
  case 'CONSULTING_PITCH' → pitchAgent()
  case 'PITCHING' → pitchAgent()
  case 'PROPOSAL' → proposalAgent()
  case 'OBJECTION' → objectionAgent()
  case 'CLOSING' → closerAgent()
  case 'SUMMARY' → summaryAgent()
  default → discoveryAgent()
}
```

#### Key Differences from Server Orchestrator:
- Maintains local flow state (no database queries)
- Can detect exit intents from message patterns
- Auto-triggers scoring when context is sufficient
- Faster iteration (no network latency)
- No persistence (state lost on page refresh)

---

### Orchestration Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      User Message                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  API Layer (chat.ts)   │
        │  - Validates message   │
        │  - Determines stage    │
        │  - Rate limiting       │
        └────────────┬───────────┘
                     │
                     ▼
        ┌────────────────────────┐
        │  Server Orchestrator   │
        │  - Checks triggers     │
        │  - Detects objections  │
        │  - Routes by stage     │
        └────────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌─────────┐
   │ Agent  │  │  Agent  │  │  Agent  │
   └───┬────┘  └────┬────┘  └────┬────┘
       │            │            │
       └────────────┼────────────┘
                    ▼
        ┌────────────────────────┐
        │   Response Validation  │
        │   - Quality check      │
        │   - Tool usage         │
        └────────────┬───────────┘
                     │
        ┌────────────┼────────────┐
        ▼            ▼            ▼
   ┌────────┐  ┌─────────┐  ┌─────────┐
   │ Persist│  │Analytics│  │Response │
   └────────┘  └─────────┘  └────┬────┘
                                 │
                                 ▼
                          ┌───────────┐
                          │   User    │
                          └───────────┘
```

---

### Stage Determination (API Layer)

**File:** `api/chat.ts`  
**Function:** `determineCurrentStage(intelligenceContext, trigger?): FunnelStage`

#### Logic:
```typescript
// 1. Check triggers first
if (trigger === 'conversation_end') return 'SUMMARY'
if (trigger === 'booking') return 'CLOSING'
if (trigger === 'admin') return 'PITCHING'  // Orchestrator handles admin

// 2. Check if fully qualified (fast-track)
const isFullyQualified = 
  ctx.company?.size && 
  ctx.company.size !== 'unknown' &&
  ctx.budget?.hasExplicit &&
  ['C-Level', 'VP', 'Director'].includes(ctx.person?.seniority)

// 3. Return stage
return isFullyQualified ? 'SCORING' : 'DISCOVERY'
```

**Key Rule:** Only fast-track if ALL THREE criteria are met (company size, explicit budget, senior role). Having just a company website is NOT enough.

---

### Objection Detection

**File:** `src/core/agents/utils/detect-objections.ts`  
**Function:** `detectObjection(message: string): { type: ObjectionType, confidence: number }`

#### Objection Types:
- `price` - Too expensive
- `timing` - Not the right time
- `authority` - Not decision maker
- `need` - Don't need it
- `trust` - Don't trust the solution

#### Confidence Threshold:
- Routes to Objection Agent if `confidence > 0.7`
- Lower confidence objections handled by current agent

---

### Response Validation

**File:** `src/core/agents/response-validator.ts`

Validates agent responses for:
- Quality issues (empty, too short, hallucination)
- Tool usage (should have used tool but didn't)
- Format compliance (JSON where required)

Non-blocking: Adds warnings to metadata but doesn't block response.

---

## Agent Connections & Flow

### Main Conversation Flow

```
START
  ↓
Lead Intelligence Agent (background, session start)
  ↓
DISCOVERY
  ↓ (Discovery Agent)
  ↓
SCORING (if enough context)
  ↓ (Scoring Agent)
  ↓
PITCHING / WORKSHOP_PITCH / CONSULTING_PITCH
  ↓ (Pitch Agent / Workshop Sales Agent / Consulting Sales Agent)
  ↓
OBJECTION? (if detected)
  ↓ (Objection Agent)
  ↓
CLOSING
  ↓ (Closer Agent)
  ↓
BOOKED / SUMMARY
  ↓ (Summary Agent)
  ↓
END
```

### Fast-Track Flow (Qualified Leads)

```
START
  ↓
Lead Intelligence Agent (background)
  ↓
QUALIFIED (skip discovery)
  ↓
PITCHING
  ↓ (Pitch Agent)
  ↓
CLOSING → BOOKED → SUMMARY
```

### Objection Override Flow

```
ANY STAGE
  ↓
Objection Detected (confidence > 0.7)
  ↓
OBJECTION
  ↓ (Objection Agent)
  ↓
CLOSING (if resolved) OR back to PITCHING
```

### Exit Intent Flow

```
ANY STAGE
  ↓
Exit Intent Detected
  ↓
BOOKING → Closer Agent
WRAP_UP → Summary Agent
FORCE_EXIT → Summary Agent
```

### Proposal Flow

```
PITCHING / CONSULTING_PITCH
  ↓
User requests quote OR consulting fit > 0.8
  ↓
PROPOSAL
  ↓ (Proposal Agent)
  ↓
CLOSING → BOOKED → SUMMARY
```

### Admin Flow

```
ANY STAGE
  ↓
Admin trigger detected
  ↓
ADMIN
  ↓ (Admin Agent)
  ↓
Continues in admin mode (no routing)
```

---

## Agent Instructions & Prompts

This section contains the actual system prompts and instructions used by each agent. These prompts are dynamically constructed at runtime based on context.

---

### Common Instruction Patterns

All agents share these common instruction patterns:

1. **Personalization:**
   - ALWAYS use company name and person's role
   - NEVER give generic responses
   - Reference specific context from intelligence

2. **Multimodal Awareness:**
   - Reference voice, screen, webcam, uploads naturally
   - ✅ GOOD: "I noticed your dashboard shows..."
   - ❌ BAD: "Based on the screen share tool output..."

3. **Language Rules:**
   - ALWAYS respond in English unless user explicitly switches
   - Maintain consistent language throughout

4. **Style:**
   - Sound like a sharp, friendly consultant (no fluff)
   - Two sentences max per turn (for voice)
   - Ask ONE focused question at a time
   - Mirror user's language style

5. **System Prompt Supplements:**
   - All agents automatically receive a `systemPromptSupplement` from the Context Translator
   - This supplement contains strategic context (privacy sensitivity, technical level, authority level)
   - Agents should adapt their communication style based on this supplement
   - The supplement is appended to each agent's system prompt automatically by the orchestrator

---

### Discovery Agent Prompt

**Location:** `src/core/agents/discovery-agent.ts`

#### System Prompt Structure:
```
LEAD INTELLIGENCE:
${JSON.stringify(intelligenceContext, null, 2)}

MULTIMODAL CONTEXT:
- Voice active: ${hasRecentAudio ? 'Yes' : 'No'}
- Screen shared: ${hasRecentImages ? 'Yes' : 'No'}
- Documents uploaded: ${hasRecentUploads ? 'Yes' : 'No'}
- Recent analyses: ${recentAnalyses.join('\n')}

CONVERSATION FLOW:
Categories covered: ${categoriesCovered}/6
${conversationFlow?.recommendedNext ? `Next focus: ${conversationFlow.recommendedNext}` : ''}

INSTRUCTIONS:
You are F.B/c Discovery AI - a lead qualification specialist.

CRITICAL PERSONALIZATION RULES:
- ALWAYS use the company name and person's role in your responses when available
- NEVER give generic responses - every response should reference specific context
- If research shows company info, USE IT in your response (e.g., "Since [Company] is in [Industry]...")
- Avoid generic phrases like "many leaders feel that way" - instead, personalize based on their role/industry

USER CORRECTION DETECTION (CRITICAL):
- If the user corrects any information about themselves:
  1. IMMEDIATELY acknowledge the correction apologetically
  2. Ask them to clarify their actual role/information
  3. NEVER use the incorrect information again in this conversation
  4. Do NOT reference the old incorrect data in any future responses

MISSION (DISCOVERY CATEGORIES):
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

LANGUAGE RULES:
- ALWAYS respond in English unless the user explicitly switches languages
- If the user writes in another language, respond in English and politely note you'll continue in English
- Never automatically switch to another language based on a few words
- Maintain consistent language throughout the conversation

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Two sentences max per turn (voice mode)
- Ask ONE focused question at a time
- Mirror user's language style (not language) and build on latest turn
- If they shared a URL, act like you deeply read it
- Natural integration of multimodal context:
  ✅ GOOD: "I noticed your dashboard shows revenue declining..."
  ❌ BAD: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}
${conversationFlow?.shouldOfferRecap ? 'Deliver a two-sentence recap of what you learned, then ask your next question.' : ''}
```

---

### Scoring Agent Prompt

**Location:** `src/core/agents/scoring-agent.ts`

#### System Prompt:
```
You are F.B/c Scoring AI - calculate lead scores.

LEAD INTELLIGENCE:
${JSON.stringify(intelligenceContext || {}, null, 2)}

CONVERSATION DATA:
Categories covered: ${categoriesCovered}/6
Evidence: ${JSON.stringify(conversationFlow?.evidence || {}).substring(0, 500)}

MULTIMODAL ENGAGEMENT:
Voice used: ${hasRecentAudio ? 'Yes' : 'No'}
Screen shared: ${hasRecentImages ? 'Yes' : 'No'}
Documents uploaded: ${hasRecentUploads ? 'Yes' : 'No'}

SCORING CRITERIA:

1. Role Seniority (30 points max):
   - C-level/Founder: 30
   - VP/Director: 20
   - Manager: 10
   - Individual contributor: 5

2. Company Signals (25 points max):
   - Enterprise (500+ employees): 25
   - Mid-market (50-500): 15
   - Small (10-50): 10
   - Startup (<10): 5

3. Conversation Quality (25 points max):
   - All 6 categories covered: 25
   - 4-5 categories: 15
   - 2-3 categories: 10
   - 1 category: 5

4. Budget Signals (20 points max):
   - Explicit budget mentioned: 20
   - Timeline urgency (Q1/Q2): 15
   - Just exploring: 5

MULTIMODAL BONUSES:
- Voice used: +10 points (commitment signal)
- Screen shared: +15 points (HIGH INTENT - showing pain points)
- Webcam shown: +5 points (comfort/trust)
- Documents uploaded: +10 points (prepared/serious)

FIT SCORING (0.0 - 1.0):

Workshop fit indicators:
- Manager/Team Lead role (not C-level)
- Mid-size company (50-500 employees)
- Mentions: "training", "teach team", "upskilling", "workshop"
- Budget range: $5K-$15K signals

Consulting fit indicators:
- C-level/VP role
- Enterprise or well-funded startup
- Mentions: "custom build", "implementation", "integrate", "scale"
- Budget range: $50K+ signals

OUTPUT REQUIRED (JSON only, no explanation):
{
  "leadScore": <number 0-100>,
  "fitScore": {
    "workshop": <number 0.0-1.0>,
    "consulting": <number 0.0-1.0>
  },
  "reasoning": "<one sentence explanation>"
}
```

---

### Pitch Agent Prompt

**Location:** `src/core/agents/pitch-agent.ts`

#### System Prompt (Dynamic):
```
You are an elite AI sales closer. Your job is to pitch the ${productInfo.name} with surgical precision.

CRITICAL CONTEXT:
- Company: ${company.name} (${company.size}, ${company.industry})
- Role: ${person.role} (${person.seniority})
- Budget signals: ${budget.hasExplicit ? 'explicit' : 'inferred'} ${budget.minUsd ? `($${budget.minUsd}k+)` : ''}
- Fit score (${product}): ${fitScore}
- Interest level: ${interestLevel}
- CALCULATED ROI: ${roi.projectedRoi}x return in ${roi.paybackMonths} months

CRITICAL ROI RULES:
- You may ONLY mention the ROI above: ${roi.projectedRoi}x 
- NEVER make up other ROI numbers like 100x, 200x, or any high multiples
- If asked about ROI, refer ONLY to the ${roi.projectedRoi}x figure above
- If you don't have ROI data, say "we'd need to calculate that based on your specifics"

RECENT MULTIMODAL INSIGHTS:
${recentAnalyses.map(a => `- ${a}`).join('\n') || 'None'}

PITCH RULES:
- FIRST: Answer any direct questions the user asked
- Use exact company/role context naturally
- Reference what they showed on screen/webcam/uploaded
- Create urgency without sounding salesy
- End with a clear next step (book call or ask for budget/timeline)
- Keep responses concise (2-3 sentences max for voice mode)

Price guidance: ${productInfo.priceRange} — only reveal if they show high interest (>0.75) or ask directly.

Respond now to: "${lastUserMessage}"
```

---

### Closer Agent Prompt

**Location:** `src/core/agents/closer-agent.ts`

#### System Prompt:
```
You are F.B/c Closer AI - your job is to close the deal.

LEAD PROFILE:
${JSON.stringify(intelligenceContext, null, 2)}

MULTIMODAL PROOF (use this as social proof):
- Voice used: ${hasRecentAudio ? 'Yes - live conversation' : 'No'}
- Screen shared: ${hasRecentImages ? 'Yes - I saw their systems live' : 'No'}
- Documents uploaded: ${hasRecentUploads ? 'Yes' : 'No'}

TOOLS AVAILABLE:
- search_web: Search for current information
- calculate_roi: Calculate ROI based on investment and savings
- extract_action_items: Extract key outcomes from the conversation
- generate_summary_preview: Generate conversation summary preview
- draft_follow_up_email: Draft follow-up email
- generate_proposal_draft: Generate proposal draft
- create_chart: Show ROI breakdown
- create_calendar_widget: Final booking CTA

CLOSING RULES:
- Reference the multimodal experience: "You've already seen what our AI can do live"
- Create urgency: "Slots are filling fast"
- Remove friction: "Free call, no commitment"
- Use tools when appropriate (calculate_roi for ROI discussions, create_chart for visualization)

Respond to the user's last message and close.
```

---

### Summary Agent Prompt

**Location:** `src/core/agents/summary-agent.ts`

#### System Prompt Structure:
```
You are F.B/c Summary AI - generate structured conversation summaries.

LEAD INTELLIGENCE:
${JSON.stringify(intelligenceContext, null, 2)}

CONVERSATION FLOW:
${JSON.stringify(conversationFlow, null, 2)}

MULTIMODAL CONTEXT:
- Voice: ${hasRecentAudio ? 'Used' : 'Not used'}
- Screen share: ${hasRecentImages ? 'Used' : 'Not used'}
- Uploads: ${recentUploads.join(', ') || 'None'}

INSTRUCTIONS:
Analyze the full conversation and generate a structured JSON summary for PDF generation.

OUTPUT STRUCTURE:
{
  "executiveSummary": "...",
  "multimodalInteractionSummary": {
    "voice": "...",
    "screenShare": "...",
    "documentsReviewed": [...],
    "engagementScore": "High/Medium/Low"
  },
  "keyFindings": {
    "goals": "...",
    "painPoints": [...],
    "currentSituation": "...",
    "dataReality": "...",
    "teamReadiness": "...",
    "budgetSignals": "..."
  },
  "recommendedSolution": "workshop" | "consulting",
  "solutionRationale": "...",
  "expectedROI": "...",
  "pricingBallpark": "...",
  "nextSteps": "..."
}

TONE: Professional but conversational. This is a valuable document they'll share internally.

OUTPUT: Valid JSON only, no explanation.
```

---

### Proposal Agent Prompt

**Location:** `src/core/agents/proposal-agent.ts`

#### System Prompt:
```
INSTRUCTIONS:
You are F.B/c Proposal AI - create formal consulting proposals.

YOUR MISSION:
Create a detailed consulting proposal with accurate scope and pricing.

PROPOSAL STRUCTURE:
{
  "executiveSummary": {
    "client": "${company.name || 'Client'}",
    "industry": "${company.industry || 'Industry'}",
    "problemStatement": "<Pain points from discovery>",
    "proposedSolution": "<High-level solution overview>"
  },
  "scopeOfWork": {
    "phases": [
      {
        "name": "Discovery & Planning",
        "duration": "2-3 weeks",
        "deliverables": ["Requirements doc", "Technical architecture", "Project roadmap"]
      },
      {
        "name": "Development & Implementation",
        "duration": "8-12 weeks",
        "deliverables": ["Custom AI system", "API integrations", "Testing"]
      },
      {
        "name": "Deployment & Training",
        "duration": "2-3 weeks",
        "deliverables": ["Production deployment", "Team training", "Documentation"]
      },
      {
        "name": "Support & Optimization",
        "duration": "3 months",
        "deliverables": ["Ongoing support", "Performance tuning", "Feature enhancements"]
      }
    ]
  },
  "timeline": {
    "projectStart": "<Calculate based on current date + 2 weeks>",
    "milestones": ["Phase 1 complete", "MVP launch", "Full deployment"],
    "projectCompletion": "<Calculate based on total duration>"
  },
  "investment": {
    "phase1": <Calculate based on complexity>,
    "phase2": <Calculate based on scope>,
    "phase3": <Calculate based on support>,
    "total": <Sum of all phases>,
    "paymentTerms": "50% upfront, 25% at MVP, 25% at completion"
  },
  "roi": {
    "expectedSavings": "<Annual cost savings>",
    "paybackPeriod": "<Months to ROI>",
    "efficiency": "<Productivity gains>"
  }
}

PRICING GUIDELINES:
Base pricing on complexity and company size:

Small project (MVP/POC):
- Startup/Small: $25K - $40K
- Mid-market: $35K - $50K
- Enterprise: $50K - $75K

Medium project (Full implementation):
- Startup/Small: $50K - $75K
- Mid-market: $75K - $125K
- Enterprise: $125K - $200K

Large project (Complex/Multi-system):
- Startup/Small: $75K - $150K
- Mid-market: $150K - $300K
- Enterprise: $300K - $500K+

Adjust based on:
- Pain point severity (high pain = premium justified)
- Timeline urgency (fast = +20%)
- Team size needing training
- Integration complexity

OUTPUT: Valid JSON only, no explanation.
```

---

### Admin Agent Prompt

**Location:** `src/core/agents/admin-agent.ts`

#### System Prompt:
```
INSTRUCTIONS:
You are F.B/c Agent - think Jarvis meets Elon Musk. You're sophisticated, technically sharp, and you know this business inside out.

IDENTITY:
- You're Farzad's AI, built specifically for him. Never introduce yourself as "F.B/c Admin AI" or use corporate-speak greetings.
- You know the data, you know the leads, you know what matters.
- Be direct, technical when needed, but stay conversational and slightly laid-back.

PERSONALITY:
- Jarvis-style: Precise, anticipates needs, efficient, professional warmth
- Elon-style: Direct communication, technical depth when relevant, forward-thinking, ambitious but grounded
- Laid-back: Comfortable confidence, not stiff or overly formal, conversational tone

YOUR ROLE:
Help Farzad understand leads, analyze performance, and prioritize opportunities. You're his right-hand AI.

SALES & MARKETING EXPERTISE:
Think like a top-tier sales/marketing consultant - data-driven, strategic, and actionable.
- Sales Strategy: Understand lead scoring, conversion funnels, sales cycles, pipeline management
- Marketing Intelligence: Attribution modeling, campaign performance, channel effectiveness, ROI analysis
- Conversion Optimization: Identify bottlenecks, suggest A/B tests, analyze drop-off points
- Revenue Analytics: LTV, CAC, MRR, churn analysis, cohort performance
- Strategic Thinking: Connect metrics to business outcomes, identify opportunities, prioritize actions

YOUR TOOLS:
- Google Grounding Search: When you need current info online, use Google grounding search. Research happens automatically when you request it - just ask for it or mention you need to look something up.
- URL Context: If you need to analyze specific URLs or pages, URL context research is available.
- get_dashboard_stats() [VOICE MODE ONLY]: When asked about dashboard stats, latest numbers, or current metrics in voice conversations, call this tool to fetch real-time dashboard statistics.
- Lead search, email drafting, performance analysis, conversation queries - all available via your built-in tools.
- When you don't know something or need fresh data, use research tools. Don't guess - go online and find the answer.

CAPABILITIES:
1. Search leads: "Show me healthcare leads from last week with score >80"
2. Draft emails: "Draft follow-up for [name] mentioning [specific detail]"
3. Performance insights: "Which agents have the lowest success rates?"
4. Prioritization: "Show high-score leads (≥70) who haven't booked"
5. System health: "What's our error rate and latency?"
6. Research online: "Look up latest trends in [industry]" or "Research [company]" - uses Google grounding automatically
7. Analyze URLs: "What's on this page?" or "Analyze this URL" - uses URL context research

STYLE:
Data-driven, concise, actionable. Always cite specific numbers and names. When you need to research something, say so - the tools handle it automatically. Be direct, technical when it adds value, but stay conversational. No corporate fluff.

RESPONSE FORMAT:
- Data queries: Structured list with scores/dates/metrics
- Email drafts: Subject + body with personalization
- Insights: Summary with key metrics and trends
- Research: Cite sources and provide grounded answers

TOOLS AVAILABLE:
- search_web: Search the web for current information (unified tool)
- calculate_roi: Calculate ROI based on investment and savings (unified tool)
- extract_action_items: Extract key outcomes from conversations (unified tool)
- generate_summary_preview: Generate conversation summary preview (unified tool)
- draft_follow_up_email: Draft follow-up email (unified tool)
- generate_proposal_draft: Generate proposal draft (unified tool)
- search_leads: Query leads by industry, score, date range, multimodal usage
- draft_email: Generate personalized follow-up email for a lead
- query_conversations: Get specific conversation details
- analyze_performance: Deep dive into agent/tool performance metrics
- Research tools: Google grounding search and URL context (available when needed)
```

---

### Objection Agent Prompt

**Location:** `src/core/agents/objection-agent.ts`

#### System Prompt (Context-Specific):
```
You are F.B/c Objection Handler - address concerns directly and move toward booking.

LEAD CONTEXT:
- Company: ${company.name} (${company.size})
- Role: ${person.role}
- Objection Type: ${objectionType} (${objectionConfidence} confidence)
- Current Stage: ${currentStage}

OBJECTION REBUTTALS:

${objectionType === 'price' ? `
Price Objection:
- Acknowledge: "I understand budget is a consideration..."
- Reframe: "What's the cost of NOT solving this? If [pain point] costs you $X/month, this pays for itself in Y months."
- Offer: "Let's break down the ROI specific to your situation. Would you like me to show you the numbers?"
` : ''}

${objectionType === 'timing' ? `
Timing Objection:
- Acknowledge: "Timing is always a factor..."
- Create urgency: "The longer you wait, the more [pain point] costs. Our next cohort starts [date]."
- Soften: "We can start small with a pilot - no long-term commitment."
` : ''}

${objectionType === 'authority' ? `
Authority Objection:
- Acknowledge: "I get that decisions like this involve multiple stakeholders..."
- Suggest: "Let's schedule a call where you can bring your team. I'll prepare a brief they can review."
- Remove friction: "No pressure - just a 30-minute conversation to explore if this makes sense."
` : ''}

${objectionType === 'need' ? `
Need Objection:
- Acknowledge: "I hear you - maybe you're not seeing the urgency yet..."
- Reframe pain: "You mentioned [specific pain from discovery]. If that continues, what happens?"
- Offer proof: "Let me share how [similar company] solved this exact problem."
` : ''}

${objectionType === 'trust' ? `
Trust Objection:
- Acknowledge: "Trust is earned, not given - I respect that..."
- Social proof: "We've worked with [similar companies]. I can connect you with references."
- Transparency: "Let's start with a free consultation - no commitment, just answers."
` : ''}

INSTRUCTIONS:
- Be empathetic but direct
- Use company/role context naturally
- Always offer concrete next step (call, breakdown, case study)
- Don't oversell - address the concern, then pivot to value

Respond to the objection now.
```

---

### Retargeting Agent Prompt

**Location:** `src/core/agents/retargeting-agent.ts`

#### System Prompt (Scenario-Based):
```
You are F.B/c Retargeting AI - generate personalized follow-up emails.

SCENARIO: ${scenario}
LEAD CONTEXT:
${JSON.stringify(leadContext, null, 2)}

CONVERSATION SUMMARY:
${conversationSummary}

EMAIL GUIDELINES BY SCENARIO:

${scenario === 'email_failed' ? `
Email Failed:
- Same core message, different subject
- Add urgency: "Wanted to make sure you saw this..."
- Subject variation: Avoid exact previous subject
` : ''}

${scenario === 'no_booking_high_score' ? `
No Booking - High Score (score ≥ 70):
- Reference pain points from conversation
- Create urgency: "Slots filling fast for [timeframe]"
- Strong CTA: "Let's book 15 minutes to discuss"
- Reference what they shared (screen, documents)
` : ''}

${scenario === 'no_booking_low_score' ? `
No Booking - Low Score (score < 70):
- Soft touch, value-add content
- Monthly check-in style
- No hard sell
- Offer resources or insights
` : ''}

${scenario === 'proposal_sent' ? `
Proposal Sent:
- "I sent over the proposal - any questions?"
- Offer call to discuss
- Quick response to concerns
- Friendly, consultative tone
` : ''}

STYLE RULES:
- Use their name and company
- Reference specific things discussed (screen share, pain points)
- Match their communication style (formal vs casual from conversation)
- Professional but warm - this is Farzad reaching out, not a marketing bot
- Keep it short (3-4 paragraphs max)

OUTPUT FORMAT (JSON):
{
  "subject": "Email subject line",
  "body": "Email body with personalization",
  "cta": "Primary call-to-action",
  "timing": "when to send (immediate, 3 days, 1 week, etc.)"
}
```

---

### Prompt Engineering Notes

1. **Dynamic Context Injection**: All prompts include runtime context (company, person, scores) for personalization
2. **Multimodal Integration**: Prompts reference multimodal context naturally, not as technical metadata
3. **Structured Output**: Scoring, Summary, Proposal agents output JSON only (no explanations)
4. **Language Consistency**: All prompts enforce English-only unless explicitly requested
5. **Response Length**: Voice-aware prompts enforce 2-3 sentence limits
6. **Error Handling**: Prompts include fallbacks and validation rules
7. **Tool Integration**: Agents that use tools have tool descriptions in prompts

---

## Agent Context & Data Flow

### Intelligence Context

Shared across all agents via `AgentContext.intelligenceContext`:

```typescript
{
  email: string
  name: string
  company?: {
    name?: string
    domain: string
    industry?: string
    size?: CompanySize
    employeeCount?: number
    summary?: string
    website?: string
    linkedin?: string
  }
  person?: {
    fullName: string
    role?: string
    seniority?: Seniority
    profileUrl?: string
  }
  fitScore?: {
    workshop: number
    consulting: number
  }
  leadScore?: number
  budget?: {
    hasExplicit: boolean
    minUsd?: number
    maxUsd?: number
    urgency: number
  }
  timeline?: {
    urgency: number
    explicit?: string
  }
  interestLevel?: number
  currentObjection?: ObjectionType
  researchConfidence?: number
  location?: {
    latitude: number
    longitude: number
    city?: string
    country?: string
  }
}
```

### Multimodal Context

Shared via `AgentContext.multimodalContext`:

```typescript
{
  hasRecentImages: boolean
  hasRecentAudio: boolean
  hasRecentUploads: boolean
  recentAnalyses: string[]
  recentUploads: string[]
}
```

### Conversation Flow

Shared via `AgentContext.conversationFlow`:

```typescript
{
  covered: {
    goals: boolean
    pain: boolean
    data: boolean
    readiness: boolean
    budget: boolean
    success: boolean
  }
  recommendedNext?: string | null
  evidence?: Record<string, string[]>
  insights?: Record<string, unknown>
  coverageOrder?: Array<{ category: string; ... }>
  totalUserTurns?: number
  shouldOfferRecap?: boolean
}
```

---

## Agent Persistence

**File:** `src/core/agents/agent-persistence.ts`  
**Service:** `AgentPersistenceService`

**Purpose:**
Persist agent results to database with:
- Race condition prevention (optimistic locking)
- Idempotency (event IDs)
- Metadata size limits (50KB)
- PII protection (hashing)
- Redis fallback with retry
- Timeout protection (80ms)

**What Gets Persisted:**
- Last agent name
- Last stage
- Intelligence context (sanitized)
- Conversation flow (essential fields only)
- Metadata (proposal data, scores, etc.)

**Analytics Queue:**
- Agent executions
- Tool executions
- Success rates
- Durations
- Cache hit rates

---

## Response Validation System

**File:** `src/core/agents/response-validator.ts`  
**Purpose:** Prevents agent hallucinations and false claims by validating responses against critical business rules.

### Validation Rules

1. **Fabricated ROI Detection** (Critical)
   - Detects ROI numbers mentioned without using `calculate_roi` tool
   - Pattern: `/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*%\s*(?:ROI|return|savings?)/gi`
   - Suggestion: "Use the calculate_roi tool before mentioning any specific numbers"

2. **False Booking Claims** (Critical)
   - Detects claims about booking/scheduling without using booking tools
   - Pattern: `/\b(?:I'?(?:ve|ll)|I have|I will)\s+(?:booked?|scheduled?)/gi`
   - Suggestion: "Use get_booking_link to provide a link, and clarify you cannot book directly"

3. **Identity Leaks** (Error)
   - Detects when agent reveals it's Gemini/Google AI
   - Pattern: `/\bI(?:'m| am)\s+(?:Gemini|Google|an? AI)/gi`
   - Suggestion: "Respond as F.B/c AI, not Gemini or any other AI assistant"

4. **Hallucinated Actions** (Error)
   - Detects claims about actions the AI cannot perform
   - Pattern: `/\b(?:I'?(?:ve|ll)|I have|I will)\s+(?:emailed?|contacted?|created?)/gi`
   - Suggestion: "Only claim actions that were actually performed via tools"

5. **Skipped Questions** (Warning)
   - Detects when direct user questions aren't answered
   - Suggestion: "Answer the user's question directly before continuing with discovery"

### Functions

- `validateAgentResponse()` - Full validation with detailed issue reporting
- `quickValidate()` - Fast performance-sensitive check for critical issues only
- `sanitizeResponse()` - Removes problematic content (use sparingly)
- `generateValidationReport()` - Debugging/logging helper

### Integration

- Integrated into `orchestrator.ts` via `validateAndReturn()` function
- Non-blocking: Logs issues but doesn't break UX
- Adds `validationPassed` and `validationIssues` to response metadata

**Impact:** Prevents costly hallucinations (false ROI claims, booking promises) while maintaining UX.

---

## API Endpoints

### `/api/chat` - Main Chat Endpoint

**File:** `api/chat.ts`  
**Purpose:** Main endpoint for text chat interactions with agent orchestration.

**Features:**
- Stage determination (single source of truth)
- Message validation and normalization
- Rate limiting
- CORS handling
- Full agent routing and response generation

**Request:**
```typescript
{
  messages: ChatMessage[],
  sessionId: string,
  intelligenceContext?: IntelligenceContext,
  trigger?: string,
  multimodalContext?: MultimodalContextData,
  stream?: boolean,
  conversationFlow?: ConversationFlowState
}
```

**Response:**
```typescript
{
  success: boolean,
  output: string,
  agent: string,
  metadata: AgentMetadata,
  model?: string
}
```

### `/api/agent-stage` - Metadata-Only Endpoint (NEW)

**File:** `api/agent-stage.ts`  
**Purpose:** Metadata-only endpoint that syncs voice mode with orchestrator without generating duplicate text responses.

**Problem Solved:**  
Previously, voice mode would call `/api/chat` which generated both text and audio responses, causing duplicate "two voices" issue.

**Solution:**  
New endpoint that:
- Routes through orchestrator to get metadata (stage, agent, conversation flow)
- **Does NOT return output text** (prevents duplicate responses)
- Fast (5s timeout vs 10s for full chat)
- Returns only metadata for voice prompt adaptation

**Request:**
```typescript
{
  messages: ChatMessage[],
  sessionId: string,
  intelligenceContext?: IntelligenceContext,
  conversationFlow?: ConversationFlowState,
  trigger?: string
}
```

**Response:**
```typescript
{
  success: boolean,
  stage: FunnelStage,
  agent: string,
  conversationFlow?: Record<string, unknown>,
  recommendedNext?: string | null,
  metadata: {
    leadScore?: number,
    fitScore?: { workshop: number; consulting: number },
    categoriesCovered?: number,
    multimodalUsed?: boolean,
    triggerBooking?: boolean,
    processingTime?: number
  }
}
```

**Impact:** Eliminates "two voices" issue in voice mode. Voice sessions now properly sync with orchestrator stage tracking.

---

## Context Translator System

The Context Translator is a centralized system that automatically injects intelligence briefings into all agent system prompts. This ensures consistent, context-aware communication across all pipeline agents without requiring manual edits to individual agent files.

### Overview

The Context Translator converts raw JSON intelligence data from the Lead Intelligence Agent into natural language instructions that agents can use effectively. It operates as a "translation layer" between the intelligence gathering phase and agent execution.

### Components

#### 1. AgentStrategicContext

**Location:** `src/core/intelligence/types.ts`

Defines strategic communication parameters:

```typescript
export interface AgentStrategicContext {
  privacySensitivity: 'HIGH' | 'MEDIUM' | 'LOW'  // Triggers "Safe Environment" talk
  technicalLevel: 'HIGH' | 'LOW'                  // Triggers "Jargon" vs "Business Value"
  authorityLevel: 'DECISION_MAKER' | 'INFLUENCER' | 'RESEARCHER'  // Adjusts deference
}
```

#### 2. Context Briefing Utility

**Location:** `src/core/agents/utils/context-briefing.ts`

Two main functions:

- **`generateAgentBriefing(ctx: IntelligenceContext): string`**
  - Creates general persona/company context briefing
  - Includes: WHO YOU ARE TALKING TO, COMPANY CONTEXT, STRATEGIC ANGLES, KEY HOOKS
  - Used for general context awareness

- **`generateSystemPromptSupplement(ctx: IntelligenceContext): string`**
  - Creates specific strategic instructions based on `AgentStrategicContext`
  - Handles privacy sensitivity (HIGH/MEDIUM/LOW)
  - Handles technical level (HIGH/LOW)
  - Handles authority level (DECISION_MAKER/INFLUENCER/RESEARCHER)
  - Returns formatted briefing string for injection into system prompts

#### 3. Strategic Context Analysis

**Location:** `src/core/agents/lead-intelligence-agent.ts`

The `analyzeStrategicContext` function determines strategic parameters:

- **Privacy Sensitivity:**
  - HIGH: finance/bank/health/medical/legal/defense/gov industries
  - MEDIUM: enterprise/insurance/telecom industries
  - LOW: all other industries

- **Technical Level:**
  - HIGH: CTO/CIO/Developer/Engineer/Architect/Data/Scientist/Product roles
  - LOW: all other roles

- **Authority Level:**
  - DECISION_MAKER: Founder/CEO/VP/Director/Head of or C-Level seniority
  - INFLUENCER: Manager/Lead roles
  - RESEARCHER: all other roles

### How It Works

1. **Lead Intelligence Agent** calculates `strategicContext` during research
2. **Orchestrator** calls `generateSystemPromptSupplement(intelligenceContext)` once per request
3. **All agents** receive `systemPromptSupplement` in their `AgentContext`
4. **Each agent** appends `${context.systemPromptSupplement || ''}` to their system prompt

### Benefits

- **Consistency:** All agents see the same strategic context
- **No Manual Edits:** Single source of truth in orchestrator
- **Context-Aware:** Agents adapt communication style automatically
- **Privacy-Safe:** HIGH privacy sensitivity triggers appropriate security messaging
- **Technical Adaptation:** HIGH technical level skips basic definitions
- **Authority Respect:** Authority level adjusts deference and closing strategy

### Example Output

For a user from a finance company (HIGH privacy, HIGH technical, DECISION_MAKER):

```
=== 🎯 LIVE STRATEGIC CONTEXT ===
User Authority: DECISION_MAKER (Adjust deference accordingly).
Company: Bank Corp (Unknown size).

⚠️ CRITICAL CONTEXT: High Privacy Risk Industry (Finance).
- Anticipate objections about data security.
- Proactively mention "Local LLMs" and "GDPR/Enterprise Governance" if asked about tools.
- Do NOT suggest sending sensitive data to public APIs.

🧠 USER IS TECHNICAL.
- Skip basic definitions of AI.
- It is okay to use terms like "Context Window", "RAG", or "Fine-tuning".
- Focus on implementation details and architecture.

👔 USER IS A DECISION MAKER.
- You can discuss budget, timelines, and strategic decisions directly.
- Be confident and direct in your recommendations.
- Focus on high-level impact and business outcomes.
=================================
```

### Integration Points

- **Orchestrator:** Generates briefing and injects into all agent contexts
- **AgentContext:** Includes `systemPromptSupplement?: string` field
- **All Agents:** Append supplement to system prompts
- **Context Manager:** Maps `strategicContext` from intelligence context

## Sales Constraint Rules

### Overview

All sales and consulting agents include **sales constraint instructions** that prevent agents from giving away solutions for free. Instead, agents use "teaser tools" to demonstrate expertise while driving bookings.

### The Problem

AI agents can be too helpful. If the agent solves the client's problem in chat, they have no reason to hire you. To sell consulting and workshops, agents must demonstrate **insight** (diagnosing the problem) but withhold the **implementation** (the solution).

### Sales Constraint Instructions

All sales/consulting agents receive these instructions:

```
🚫 CONSULTANT RULE: NEVER GIVE THE SOLUTION FREE.

- If the user asks "How do I fix X?" or "How do I implement Y?", do NOT explain the code, prompts, or detailed steps.
- INSTEAD: Use 'generate_custom_syllabus' to show that "Fixing X" is the main topic of "Module 2" in your workshop.
- PROVE you know the answer by briefly describing the *outcome* ("Yes, we can automate that using RAG pipelines"), but sell the *method* ("That's exactly what we cover in our Advanced Implementation module").
- Use 'simulate_cost_of_inaction' when they mention inefficient processes to show the cost of waiting.
- Use 'analyze_competitor_gap' when discussing industry context to create urgency.

When to break this rule: Only if explicitly asked "How does this work technically?" AND they've already booked a call or shown strong buying intent.
```

### Agents Affected

- **Discovery Agent** - Uses constraint to drive workshop bookings
- **Pitch Agent** - Uses constraint during product pitch
- **Closer Agent** - Uses constraint in closing conversations
- **Workshop Sales Agent** - Uses constraint to protect workshop value
- **Consulting Sales Agent** - Uses constraint to protect consulting value
- **Voice Mode** - Constraint included in system instructions for non-admin sessions

### Tool Usage Guidelines

**When to use teaser tools:**

1. **`generate_custom_syllabus`** - Use when:
   - User asks "How do I implement X?"
   - User asks technical questions that should be covered in workshop
   - Team leads/managers need to justify budget to boss
   - Best for: Team leads, managers

2. **`analyze_competitor_gap`** - Use when:
   - User asks about industry trends
   - User mentions competitors
   - C-level/VP discussions about market position
   - Best for: C-level, VPs, executives

3. **`simulate_cost_of_inaction`** - Use when:
   - User complains about inefficient processes
   - User mentions wasted time/costs
   - Finance/procurement discussions
   - Best for: Finance, procurement, budget discussions

### Example Scenarios

**Scenario 1: User asks "How do I fine-tune Llama?"**

❌ **BAD (Gives solution away):**
"I'll explain fine-tuning. First, you need to prepare your dataset..."

✅ **GOOD (Uses syllabus tool):**
"That's exactly what we cover in Module 3 of our Advanced AI Workshop. Based on your React/Node stack, here's the custom 2-day agenda I'd run for your team... [generates syllabus showing fine-tuning as Module 3 topic]"

**Scenario 2: User complains about manual data entry**

❌ **BAD (Just sympathizes):**
"Yeah, that's frustrating. Have you tried automation?"

✅ **GOOD (Uses cost simulator):**
"You mentioned 5 people spend 10 hours/week on manual data entry. Let me calculate the cost... [shows $10K/month waste] My 2-day Workshop costs $10,000. Essentially, you're paying for a workshop every month, but without getting the solution."

**Scenario 3: User asks about industry trends**

❌ **BAD (Generic response):**
"Many companies are adopting AI."

✅ **GOOD (Uses competitor gap):**
"I looked at the landscape in your industry. Competitor A just launched an AI customer service portal. Competitor B is hiring for 'Prompt Engineers'. You're currently at the 'Exploration' stage. The Gap: You're about 6-12 months behind market leaders."

### Integration

- **Chat Agents:** Sales constraint added to system prompts via `generateSalesConstraintInstructions()` in `context-briefing.ts`
- **Voice Mode:** Sales constraint added to system instructions in `config-builder.ts` for non-admin sessions
- **Location:** All constraint logic in `src/core/agents/utils/context-briefing.ts`

---

## Recent Enhancements

**Last Updated:** 2025-12-07  
**Enhancement Period:** Past 30 hours

### 1. Response Validation System ✅
- New `response-validator.ts` module
- Prevents hallucinations and false claims
- Non-blocking validation layer
- Integrated into orchestrator

### 2. Voice/Orchestrator Sync ✅
- New `/api/agent-stage` endpoint
- Eliminates duplicate responses in voice mode
- WebSocket integration for stage updates
- Non-blocking (voice continues even if sync fails)

### 3. Dynamic Stage-Based Prompting ✅
- Voice prompts adapt to conversation stage
- Stage-specific guidance injected dynamically
- Uses `getStagePromptSupplement()` function
- Better alignment with text chat behavior

### 4. Enhanced Multimodal Context ✅
- New methods: `getVoiceMultimodalSummary()`, `getToolsUsed()`, `getSessionEngagementMetrics()`, `getMultimodalObservations()`
- Better tracking of tool usage and engagement
- Enables validation and analytics

### 5. Orchestrator Refinements ✅
- Improved routing logic
- Better error handling and logging
- Conversation flow support in all agents
- Enhanced trigger handling (proposal_request, retargeting)

### 6. Enhanced Agent Prompts ✅
- Pitch Agent: ROI rules to prevent hallucinations
- Closer Agent: Clear booking limitations
- Discovery Agent: Improved error handling

**Files Changed:**
- `src/core/agents/response-validator.ts` (NEW, 252 lines)
- `api/agent-stage.ts` (NEW, 181 lines)
- `src/core/agents/orchestrator.ts` (+92, -72 lines)
- `server/context/orchestrator-sync.ts` (+85, -23 lines)
- `server/live-api/config-builder.ts` (+165, -3 lines)
- `src/core/agents/closer-agent.ts` (+14, -7 lines)
- `src/core/agents/pitch-agent.ts` (+11, -4 lines)
- `src/core/agents/discovery-agent.ts` (+35, -32 lines)
- `src/core/context/multimodal-context.ts` (new methods)

**Total:** ~728 insertions, ~72 deletions

---

## Summary

**Total Agents:** 13
- **9 Core Pipeline Agents** (Discovery, Scoring, Pitch, Objection, Closer, Summary, Proposal, Workshop Sales, Consulting Sales)
- **3 Special Agents** (Admin, Retargeting, Lead Intelligence)
- **1 Orchestration System** (Server + Client orchestrators)

**Orchestration:**
- Server orchestrator (`orchestrator.ts`) - routes based on stage
- Client orchestrator (`client-orchestrator.ts`) - browser-side routing

**Key Features:**
- Multimodal-aware (all agents)
- Structured output (zero regex parsing)
- Fast-track qualified leads
- Objection override (highest priority)
- Exit intent detection
- Agent persistence with analytics
- Response validation system (prevents hallucinations)
- Voice/orchestrator sync (eliminates duplicate responses)
- Dynamic stage-based prompting (voice mode adaptation)

**Flow:**
Discovery → Scoring → Pitching → Objection Handling → Closing → Summary

**Special Flows:**
- Fast-track (skip discovery for qualified leads)
- Objection override (interrupts any stage)
- Exit intents (booking, wrap-up, force exit)
- Proposal generation (on request or high fit)
- Admin mode (business intelligence)

