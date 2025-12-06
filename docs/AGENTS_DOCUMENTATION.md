# Agents Documentation

**Date:** 2025-12-01  
**Purpose:** Complete reference for all agents in the F.B/c sales funnel system

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Core Pipeline Agents](#core-pipeline-agents)
3. [Special Agents](#special-agents)
4. [Orchestration System](#orchestration-system)
5. [Agent Connections & Flow](#agent-connections--flow)
6. [Agent Instructions & Prompts](#agent-instructions--prompts)

---

## Architecture Overview

**Total Agents:** 13  
**Core Pipeline Agents:** 10  
**Special Agents:** 3

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
**Function:** `discoveryAgent(messages, context)`

**Goal:**
Systematically qualify leads through conversation across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

**Key Features:**
- Multimodal-aware (references voice, screen, webcam, uploads)
- URL detection & analysis
- Structured extraction (company size, budget, timeline)
- Exit intent detection (booking, wrap-up)
- Question fatigue detection (offers recap after 3+ consecutive questions)
- Conversation flow enhancement

**Instructions:**
- Personalize every response (use company name, role)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language style
- Reference multimodal context naturally
- Always respond in English unless user explicitly switches

**Connections:**
- **Triggered by:** `DISCOVERY` stage
- **Routes to:** `SCORING` → `PITCHING` (when qualified) or `QUALIFIED` (fast-track)
- **Can trigger:** Booking (exit intent), Wrap-up (exit intent)

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.7 (or 1.0 if `thinkingLevel === 'high'`)

---

### 2. Scoring Agent

**File:** `src/core/agents/scoring-agent.ts`  
**Function:** `scoringAgent(messages, context)`

**Goal:**
Calculate lead score (0-100) and fit scores (workshop vs consulting) based on:
- Role seniority (30 points max)
- Company size (25 points max)
- Conversation quality (25 points max)
- Budget signals (20 points max)
- Multimodal bonuses (voice +10, screen +15, uploads +10)

**Key Features:**
- Structured JSON output (no regex parsing)
- Fit score calculation (workshop vs consulting)
- Multimodal engagement bonuses

**Instructions:**
- Output JSON only, no explanation
- Calculate scores based on provided criteria
- Include reasoning in output

**Connections:**
- **Triggered by:** `SCORING` stage (after discovery has enough context)
- **Routes to:** `WORKSHOP_PITCH`, `CONSULTING_PITCH`, or `PITCHING` (based on fit scores)
- **Updates:** `intelligenceContext.leadScore`, `intelligenceContext.fitScore`

**Model:** `GEMINI_MODELS.DEFAULT_CHAT`  
**Temperature:** 0.3

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

### Server Orchestrator

**File:** `src/core/agents/orchestrator.ts`  
**Function:** `routeToAgent(params)`

**Purpose:**
Routes conversations to specialized agents based on current funnel stage, triggers, and objection detection.

**Routing Logic (Priority Order):**

1. **Highest Priority: Triggers**
   - `booking` → Closer Agent
   - `conversation_end` → Summary Agent
   - `admin` → Admin Agent

2. **Objection Override** (highest priority after triggers)
   - Detects objection with confidence > 0.7
   - Routes to Objection Agent

3. **Fast-Track: Qualified Leads**
   - Skip discovery if: company size known, budget explicit, seniority is C-Level/VP/Director
   - Route directly to Pitch Agent

4. **Normal Flow** (by stage):
   - `DISCOVERY` → Discovery Agent
   - `SCORING` / `PITCHING` → Pitch Agent
   - `CLOSING` → Closer Agent
   - `SUMMARY` → Summary Agent
   - Default → Pitch Agent

**Key Features:**
- Stage determination moved to API layer (single source of truth)
- Objection detection with confidence threshold
- Fast-track for qualified leads

---

### Client Orchestrator

**File:** `src/core/agents/client-orchestrator.ts`  
**Function:** `clientRouteToAgent(messages, context)`

**Purpose:**
Client-side agent routing that runs entirely in the browser. Routes messages to specialized agents based on funnel stage, exit intents, scoring results, and user triggers.

**Routing Logic (Priority Order):**

1. **Exit Intent Detection** (highest priority)
   - `BOOKING` → Closer Agent
   - `FORCE_EXIT` / `WRAP_UP` → Summary Agent

2. **Admin Trigger**
   - `ADMIN` intent → Admin Agent

3. **Objection Detection**
   - If objection detected AND pitch delivered → Objection Agent

4. **Scoring** (if needed)
   - Runs scoring agent if enough context
   - Updates flow state with scores

5. **Stage-Based Routing:**
   - `DISCOVERY` → Discovery Agent
   - `SCORING` → Determines pitch type → Re-routes
   - `WORKSHOP_PITCH` → Workshop Sales Agent
   - `CONSULTING_PITCH` → Consulting Sales Agent
   - `PITCHING` → Pitch Agent
   - `PROPOSAL` → Proposal Agent
   - `OBJECTION` → Objection Agent
   - `CLOSING` / `BOOKING_REQUESTED` → Closer Agent
   - `SUMMARY` / `BOOKED` / `FORCE_EXIT` → Summary Agent
   - `ADMIN` → Admin Agent
   - Default → Discovery Agent

**Flow State Management:**
- Tracks: current stage, exit attempts, scoring complete, fit scores, lead score, pitch delivered, proposal generated, objection count
- Persists across calls in same browser session

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

### Agent-Specific Instructions

#### Discovery Agent
- Systematically discover across 6 categories
- Use conversation flow to steer questions
- Offer recap after 3+ consecutive questions
- Detect exit intents (booking, wrap-up)
- Extract structured data (company size, budget, timeline)

#### Scoring Agent
- Calculate lead score (0-100) based on criteria
- Calculate fit scores (workshop vs consulting)
- Add multimodal bonuses
- Output JSON only

#### Workshop Sales Agent
- Target: Mid-size companies, team leads, $5K-$15K
- Don't mention consulting
- Create urgency with workshop timing
- Reference multimodal moments

#### Consulting Sales Agent
- Target: C-level/VPs, enterprise, $50K+
- Don't mention workshops
- Be direct about pricing
- Focus on strategic impact for C-level, operational efficiency for VPs

#### Pitch Agent
- Auto-detect product based on fit scores
- Use dynamic ROI calculations
- Only reveal pricing if high interest or asked
- Never mention the other product unless asked

#### Objection Agent
- Use contextual rebuttals based on objection type
- Be empathetic but direct
- Always offer concrete next step

#### Closer Agent
- Reference multimodal experience as social proof
- Create urgency without sounding salesy
- Remove friction
- Use tools when appropriate

#### Summary Agent
- Analyze full conversation and multimodal context
- Generate structured JSON for PDF
- Professional but conversational tone
- This is a valuable document they'll share internally

#### Proposal Agent
- Base pricing on complexity and company size
- Adjust for pain severity, timeline urgency
- Output valid JSON only

#### Admin Agent
- Data-driven, concise, actionable
- Always cite specific numbers
- Be direct, technical when it adds value
- No corporate fluff

#### Retargeting Agent
- Match communication style (formal vs casual)
- Reference specific things discussed
- Professional but warm (Farzad reaching out, not marketing bot)

#### Lead Intelligence Agent
- Run silently in background
- Don't interrupt conversation flow
- Store results in intelligence context

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

## Summary

**Total Agents:** 13
- **10 Core Pipeline Agents** (main conversation flow)
- **3 Special Agents** (admin, retargeting, lead intelligence)

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

**Flow:**
Discovery → Scoring → Pitching → Objection Handling → Closing → Summary

**Special Flows:**
- Fast-track (skip discovery for qualified leads)
- Objection override (interrupts any stage)
- Exit intents (booking, wrap-up, force exit)
- Proposal generation (on request or high fit)
- Admin mode (business intelligence)

