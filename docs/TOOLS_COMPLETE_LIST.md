# Complete Tool System Documentation

**Last Updated:** 2025-01-27  
**Total Tools:** 21 (14 existing + 3 consulting + 4 sales/teaser)

This document provides a complete overview of all tool functions, their files, and how they work.

---

## Architecture Overview

### Single Source of Truth
**Main File:** `src/core/tools/unified-tool-registry.ts`

All tools are defined and routed through the unified tool registry, which provides:
- **Zod schema validation** for all tool arguments
- **Unified execution routing** via `executeUnifiedTool()`
- **AI SDK-compatible definitions** via `getChatToolDefinitions()`
- **Live API declarations** re-exported from `src/config/live-tools.ts`

### Execution Flow

```
Voice Path:
  Gemini Live API
    → server/live-api/tool-processor.ts
      → validateToolArgs() + executeUnifiedTool()
        → server/utils/tool-implementations.ts
          → Core intelligence functions

Chat Path:
  Chat Agent
    → getChatToolDefinitions() (unified registry)
      → toolExecutor.execute() (retry + cache + log)
        → executeUnifiedTool()
          → server/utils/tool-implementations.ts
            → Core intelligence functions
```

### Key Components

1. **Unified Tool Registry** (`unified-tool-registry.ts`)
   - Schema definitions (Zod)
   - Validation function
   - Execution router
   - Chat tool definitions

2. **Tool Executor** (`tool-executor.ts`)
   - Retry logic (3 attempts for chat, 2 for voice)
   - Redis caching for idempotent operations
   - Audit logging
   - Performance metrics

3. **Tool Implementations** (`server/utils/tool-implementations.ts`)
   - Server-side execution functions
   - Wraps core intelligence functions
   - Returns standardized `ToolResult` format

4. **Core Intelligence** (`src/core/intelligence/`)
   - `search.ts` - Web search implementation
   - `analysis.ts` - LLM-based analysis functions

---

## All Available Tools (17 Total)

### Core Tools (14 existing)

### 1. `search_web`
**Purpose:** Search the web for current information with Google Grounding  
**File:** `server/utils/tool-implementations.ts` → `src/core/intelligence/search.ts`

**Schema:**
```typescript
{
  query: string (required) - Search query
  urls?: string[] - Optional URLs to prioritize
}
```

**Implementation:**
- Uses Gemini 3.0 Pro with Google Search grounding
- Returns results with citations and snippets
- Extracts grounding metadata from tool results

**Usage:**
- Weather queries (via `get_weather` wrapper)
- Company searches (via `search_companies_by_location` wrapper)
- Stock prices (via `get_stock_price` wrapper)
- Real-time information requests

---

### 2. `get_weather`
**Purpose:** Get current weather for a location (always in Celsius)  
**File:** `src/core/tools/unified-tool-registry.ts` (wrapper)

**Schema:**
```typescript
{
  location: string (required) - City/region name
}
```

**Implementation:**
- Wraps `search_web` with formatted query
- Explicitly requests Celsius temperature
- Query: `"current weather in {location} temperature in celsius degrees"`

**Usage:**
- User asks about weather/temperature/forecasts
- Returns temperature in °C only

---

### 3. `search_companies_by_location`
**Purpose:** Search for companies and businesses in a specific location  
**File:** `src/core/tools/unified-tool-registry.ts` (wrapper)

**Schema:**
```typescript
{
  location: string (required) - City/region/country
  industry?: string - Optional industry filter
  companyType?: string - Optional type (e.g., "startups", "enterprises")
}
```

**Implementation:**
- Wraps `search_web` with formatted query
- Builds query: `"companies businesses in {location} {industry} {companyType} business directory"`

**Usage:**
- Find local businesses
- Competitor research
- Industry presence analysis

---

### 4. `get_stock_price`
**Purpose:** Get current stock price for a ticker symbol  
**File:** `src/core/tools/unified-tool-registry.ts` (wrapper)

**Schema:**
```typescript
{
  symbol: string (required) - Stock ticker (e.g., "TSLA", "AAPL")
}
```

**Implementation:**
- Wraps `search_web` with formatted query
- Converts symbol to uppercase
- Query: `"current stock price {symbol} real-time quote"`

**Usage:**
- User asks about stock prices
- Market data requests

---

### 5. `get_location`
**Purpose:** Get user's current location (lat/lng, city, country)  
**File:** `src/core/tools/unified-tool-registry.ts` (inline)

**Schema:**
```typescript
{} // No parameters
```

**Implementation:**
- Accesses `unifiedContext.ensureLocation()`
- Retrieves intelligence context for city/country
- Returns latitude, longitude, city, country

**Usage:**
- When user asks about their location
- When location context is needed for queries

---

### 6. `get_booking_link`
**Purpose:** Get Cal.com booking link to share with user  
**File:** `src/core/tools/unified-tool-registry.ts` (inline)

**Schema:**
```typescript
{
  meetingType?: 'consultation' | 'workshop' | 'strategy-call'
}
```

**Implementation:**
- Returns hardcoded Cal.com URL: `https://cal.com/farzadbayat/discovery-call`
- Note: Agent CANNOT book on user's behalf - only provides link

**Usage:**
- User requests to schedule a meeting
- Returns link for user to click

---

### 7. `extract_action_items`
**Purpose:** Extract action items, outcomes, and next steps from conversation  
**File:** `server/utils/tool-implementations.ts` → `src/core/intelligence/analysis.ts`

**Schema:**
```typescript
{} // No parameters - uses session history
```

**Implementation:**
- Loads last 50 conversation messages from multimodal context
- Extracts conversation text
- Uses Gemini with structured output schema:
  - `items`: Array of action item strings
  - `priority`: 'high' | 'medium' | 'low'
  - `nextMeetingNeed`: boolean

**Usage:**
- End of conversation analysis
- Meeting summaries
- Next steps extraction

---

### 8. `calculate_roi`
**Purpose:** Calculate ROI based on investment and savings  
**File:** `server/utils/tool-implementations.ts` (inline calculation)

**Schema:**
```typescript
{
  // Simplified calculation:
  currentCost?: number - Current annual cost
  timeSavings?: number - Hours saved per year
  employeeCostPerHour?: number - Default 50
  implementationCost?: number - One-time cost
  timeline?: number - Months (default 12)
  
  // Detailed calculation:
  initialInvestment?: number
  annualCost?: number
  staffReductionSavings?: number
  efficiencySavings?: number
  retentionSavings?: number
}
```

**Implementation:**
- Supports two modes:
  1. **Simplified:** `annualSavings = timeSavings * employeeCostPerHour`
  2. **Detailed:** `annualSavings = staffReduction + efficiency + retention`
- Calculates:
  - ROI percentage
  - Annual savings
  - Net savings
  - Payback period (months)

**Usage:**
- During cost/savings discussions
- Proposal generation
- Business case development

---

### 9. `generate_summary_preview`
**Purpose:** Generate preview of conversation summary for PDF  
**File:** `server/utils/tool-implementations.ts` → `src/core/intelligence/analysis.ts`

**Schema:**
```typescript
{
  includeRecommendations?: boolean
  includeNextSteps?: boolean
}
```

**Implementation:**
- Loads last 50 conversation messages
- Uses Gemini to generate summary
- Returns markdown-formatted summary
- Optional sections for recommendations/next steps

**Usage:**
- PDF generation preview
- Meeting summary drafts

---

### 10. `draft_follow_up_email`
**Purpose:** Draft follow-up email summarizing conversation  
**File:** `server/utils/tool-implementations.ts` → `src/core/intelligence/analysis.ts`

**Schema:**
```typescript
{
  recipient: 'client' | 'team' | 'farzad' (required)
  tone: 'professional' | 'casual' | 'technical' (required)
  includeSummary?: boolean
}
```

**Implementation:**
- Loads conversation history
- Uses Gemini with structured output:
  - `subject`: Email subject line
  - `body`: Email body text
  - `tone`: Tone used
- Formats as: `Subject: {subject}\n\n{body}`

**Usage:**
- Post-meeting follow-ups
- Stakeholder communication

---

### 11. `generate_proposal_draft`
**Purpose:** Generate proposal draft based on conversation  
**File:** `server/utils/tool-implementations.ts` → `src/core/intelligence/analysis.ts`

**Schema:**
```typescript
{} // No parameters - uses session history
```

**Implementation:**
- Loads conversation history
- Uses Gemini to generate markdown proposal
- Structured proposal format based on requirements discussed

**Usage:**
- Proposal creation
- Scope documentation

---

### 12. `capture_screen_snapshot` (Upgraded with Active Investigation)
**Purpose:** Retrieve latest analyzed screen-share context with optional active investigation  
**File:** `server/utils/tool-implementations.ts` + `src/core/intelligence/vision-analysis.ts`

**Schema:**
```typescript
{
  focus_prompt?: string - Specific question about what to look for (e.g., "What is the error message?" or "Read the numbers in the Q3 column")
  summaryOnly?: boolean - Omit raw image data
}
```

**Behavior:**
- **Without `focus_prompt`:** Returns cached analysis (existing behavior)
- **With `focus_prompt`:** Performs fresh targeted analysis using vision model with the specific prompt

**Implementation:**
- **Voice:** Accesses `activeSessions.get(connectionId).latestContext.screen`
- **Chat:** Falls back to `multimodalContextManager.getContext(sessionId).visualContext`
- Returns:
  - `analysis`: LLM analysis of screen content
  - `capturedAt`: Timestamp
  - `hasImage`: Whether image data available

**Usage:**
- Accessing screen share context
- Understanding what user is showing

---

### 13. `capture_webcam_snapshot` (Upgraded with Active Investigation)
**Purpose:** Retrieve latest analyzed webcam context with optional active investigation  
**File:** `server/utils/tool-implementations.ts` + `src/core/intelligence/vision-analysis.ts`

**Schema:**
```typescript
{
  focus_prompt?: string - Specific question about user's environment or emotion (e.g., "What object are they holding?" or "Are they smiling?")
  summaryOnly?: boolean - Omit raw image data
}
```

**Behavior:**
- **Without `focus_prompt`:** Returns cached analysis (existing behavior)
- **With `focus_prompt`:** Performs fresh targeted analysis using vision model with the specific prompt

**Active Investigation Patterns:**
- **Debugger Pattern:** User mentions "error" → `capture_screen_snapshot({ focus_prompt: "Read the specific error message text" })`
- **Empath Pattern:** Long silence/frustration → `capture_webcam_snapshot({ focus_prompt: "Describe user's facial expression and body language" })`
- **Digitizer Pattern:** "I sketched it out" → `capture_webcam_snapshot({ focus_prompt: "Convert the hand-drawn flowchart into text list of steps" })`

---

### New Teaser Tools (3 tools - Sales Conversion Focus)

These tools demonstrate insight but withhold implementation to drive bookings. They're designed to trigger "I need to hire Farzad to fix this" reactions.

### 18. `generate_custom_syllabus` (Curriculum Architect)
**Purpose:** Generate custom workshop syllabus tailored to team's pain points and tech stack  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  team_roles: string (required) - Who is in the workshop (e.g., "3 devs, 1 PM")
  pain_points: string[] (required) - What problems they want to solve
  tech_stack: string (required) - Their current tools (e.g., "React/Node.js")
}
```

**Implementation:**
- Uses Gemini to generate structured 2-day workshop syllabus
- References specific pain points as module topics
- Shows that their questions are answered in specific modules
- Returns markdown-formatted syllabus

**Sales Strategy:**
- Use INSTEAD of giving away solutions for free
- When user asks "How do I fix X?", show that "Fixing X" is Module 2 in the workshop
- Demonstrates expertise while driving bookings

**Example Response:**
"I've drafted a custom workshop agenda for your team. Module 2: Running Local LLMs on your React/Node stack - this covers exactly the fine-tuning question you asked. Shall we book a call?"

---

### 19. `analyze_competitor_gap` (FOMO Radar)
**Purpose:** Analyze competitor AI adoption to show competitive gap and create urgency  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  industry: string (required) - Industry to analyze
  client_current_state: string (required) - What user told us they're doing
}
```

**Implementation:**
- Uses `searchWeb()` to find competitors in industry
- Searches for AI adoption signals (job postings, press releases, product launches)
- Compares client's state vs. market leaders
- Calculates gap timeline (months behind)

**Sales Strategy:**
- Perfect for C-level/VP discussions
- Creates FOMO by showing they're falling behind
- Uses competitor activity as urgency driver

**Example Response:**
"I looked at the landscape in e-commerce. Competitor A just launched an AI customer service portal. Competitor B is hiring for 'Prompt Engineers'. You are currently at the 'Exploration' stage. The Gap: You are about 6-12 months behind the market leaders."

---

### 20. `simulate_cost_of_inaction` (ROI Simulator)
**Purpose:** Calculate how much money client is losing monthly by not solving inefficiency  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  inefficient_process: string (required) - Manual task they complained about
  hours_wasted_per_week: number (required) - Hours wasted per week
  team_size: number (required) - Number of people affected
}
```

**Implementation:**
- Calculates: `hours_wasted_per_week * 4 * team_size * hourly_rate` = monthly cost
- Default hourly rate: $50/hour
- Compares to workshop ($10K) and consulting ($80K) costs
- Shows break-even timeline

**Sales Strategy:**
- Perfect for finance/procurement discussions
- Turns your fee from "cost" into "savings"
- Shows they're already paying that amount in wasted time

**Example Response:**
"Let's look at the math. You mentioned 5 people spend 10 hours/week on manual data entry. Hours wasted: 200/month. Estimated burn: ~$10,000/month. My 2-day Workshop costs $10,000. Essentially, you are paying for my workshop every single month, but you aren't getting the solution."

---

## Sales Constraint Rules

All sales/consulting agents (discovery, pitch, closer, workshop-sales, consulting-sales) include sales constraint instructions:

**Never Give The Solution Free:**
- If user asks "How do I fix X?" or "How do I implement Y?", do NOT explain code, prompts, or detailed steps
- INSTEAD: Use `generate_custom_syllabus` to show "Fixing X" is Module 2 in the workshop
- PROVE you know the answer by describing the *outcome*, but sell the *method*
- Use `simulate_cost_of_inaction` for inefficiency discussions
- Use `analyze_competitor_gap` for industry/urgency discussions
- Use `generate_executive_memo` when budget/timing/security objections are raised (helps champion sell internally)

**Exception:** Only break this rule if explicitly asked "How does this work technically?" AND they've already booked a call or shown strong buying intent.

**Implementation:**
- **Voice:** Accesses `activeSessions.get(connectionId).latestContext.webcam`
- **Chat:** Falls back to `multimodalContextManager.getContext(sessionId).visualContext`
- Returns:
  - `analysis`: LLM analysis of webcam content
  - `capturedAt`: Timestamp
  - `hasImage`: Whether image data available

**Usage:**
- Accessing webcam context
- Visual understanding of user

---

### 14. `get_dashboard_stats` (Admin Only)
**Purpose:** Get dashboard statistics (leads, conversion, scores)  
**File:** `server/utils/tool-implementations.ts` (inline)

---

### New High-Value Consulting Tools (3 new)

### 15. `analyze_website_tech_stack`
**Purpose:** Analyze a website's technology stack to identify technologies and AI integration opportunities  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  url: string (required) - Website URL to analyze
  focus?: 'ai_opportunities' | 'marketing_stack' - Optional focus area
}
```

**Implementation:**
- Fetches website HTML
- Detects technologies via regex patterns (WordPress, React, HubSpot, etc.)
- Identifies AI integration opportunities
- Returns tech stack list with insights

**Usage:**
- User shares website URL
- Agent establishes technical authority
- Identifies where AI can fit

**Example Response:**
"I scanned your website. I see you're using WordPress but I don't detect any automated lead capture or AI chat widgets. We could easily plug a custom agent there."

---

### 16. `generate_architecture_diagram`
**Purpose:** Generate visual architecture diagrams (flowchart, sequence, Gantt, mindmap) using Mermaid.js  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  diagram_type: 'flowchart' | 'sequence' | 'gantt' | 'mindmap' (required)
  content_description: string (required) - What to draw (e.g., "Workflow for video automation pipeline")
}
```

**Implementation:**
- Uses Gemini to generate Mermaid.js code
- Returns diagram code for frontend rendering
- Supports multiple diagram types

**Usage:**
- User describes complex workflow
- Agent generates visual diagram
- Frontend renders Mermaid diagram

**Example Response:**
"It sounds like a complex workflow. Let me map that out for you visually..." (flowchart appears)

---

### 17. `search_internal_case_studies`
**Purpose:** Search internal case studies and past project wins for social proof  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  query: string (required) - Use case or industry search
  industry?: string - Optional industry filter
}
```

**Implementation:**
- Searches internal case study database (mock implementation)
- Filters by use case and industry
- Returns matching case studies with results

**Usage:**
- User is skeptical or needs examples
- Agent finds relevant case study
- Provides specific social proof

**Example Response:**
"You mentioned you are in Media. We actually solved this for a production house last year. We automated their subtitling workflow and saved them 40 hours a week."

---

### 18. `generate_executive_memo`
**Purpose:** Generate a 1-page executive memo for CFO/CEO/CTO to overcome budget/timing/security objections  
**File:** `server/utils/tool-implementations.ts` (inline)

**Schema:**
```typescript
{
  target_audience: 'CFO' | 'CEO' | 'CTO' (required) - Who to convince
  key_blocker: 'budget' | 'timing' | 'security' (required) - Main objection
  proposed_solution: string (required) - e.g. "2-Day In-House Workshop"
}
```

**Implementation:**
- Uses conversation context and previous tool results (ROI data, cost of inaction)
- Generates tailored memo addressing specific C-level concerns
- CFO focus: Financial ROI, cost savings, payback period
- CEO focus: Competitive advantage, market positioning
- CTO focus: Technical architecture, security, scalability

**Usage:**
- When champion (person chatting) needs to sell to decision maker (their boss)
- Budget objections → CFO memo
- Timing concerns → CEO/CTO memo
- Security questions → CTO memo

**Example Response:**
"Your CFO is concerned about budget? Let me draft a 1-page memo they can review that shows the ROI. This will help you get approval."

**Sales Strategy:**
- Used by summary agent when preparing final proposals
- Helps champion overcome internal objections
- Demonstrates business acumen beyond technical skills

---

### Vision Tools - Active Investigation Upgrade

The vision tools (`capture_screen_snapshot` and `capture_webcam_snapshot`) now support **Active Investigation Mode** via the `focus_prompt` parameter:

**Schema:**
```typescript
{
  period?: '1d' | '7d' | '30d' | '90d' - Default '7d'
}
```

**Implementation:**
- Checks admin status via `isAdmin(sessionId)`
- Queries `lead_summaries` table from Supabase
- Calculates:
  - Total leads
  - Qualified leads (score >= 70)
  - Conversion rate
  - Average lead score
  - Engagement rate (leads with AI capabilities)
  - Top 5 AI capabilities shown

**Usage:**
- Admin dashboard queries
- Analytics requests

---

## File Structure

### Core Tool Files

```
src/core/tools/
├── unified-tool-registry.ts      # Main registry (schemas, validation, execution)
├── tool-executor.ts              # Retry, cache, logging wrapper
├── types.ts                      # Tool execution result types
└── tool-types.ts                 # Additional type definitions

src/core/intelligence/
├── search.ts                     # Web search implementation
├── analysis.ts                   # LLM analysis functions
└── vision-analysis.ts            # Active vision analysis with focus prompts

src/config/
└── live-tools.ts                 # Live API function declarations

server/
├── live-api/
│   └── tool-processor.ts         # Voice tool call processor
└── utils/
    └── tool-implementations.ts   # Server-side execution functions
```

---

## Tool Execution Details

### Validation Flow

1. **Schema Validation** (`validateToolArgs()`)
   - Uses Zod schemas from `ToolSchemas`
   - Preprocesses optional numeric/boolean fields
   - Returns `{ valid: boolean, error?: string }`

2. **Argument Preprocessing**
   - Numeric fields: Handles strings, numbers, null/undefined
   - Boolean fields: Normalizes 'true'/'false' strings
   - Empty strings treated as undefined

### Execution Flow

1. **Voice (Gemini Live API):**
   ```
   processToolCall()
     → validateToolArgs()
     → retry(executeUnifiedTool(), 2 attempts)
     → withTimeout(25s)
     → tool-implementations.ts
     → Core intelligence functions
   ```

2. **Chat (AI SDK):**
   ```
   getChatToolDefinitions()
     → toolExecutor.execute()
       → validateToolArgs()
       → retry(executeUnifiedTool(), 3 attempts)
       → withTimeout(25s)
       → Cache check (if cacheable)
       → tool-implementations.ts
       → Core intelligence functions
   ```

### Retry & Caching

- **Voice:** 2 retry attempts (real-time constraint)
- **Chat:** 3 retry attempts
- **Cacheable Tools:** `search_web`, `calculate_roi`
- **Cache TTL:** 5 minutes (default)
- **Retry Logic:** Only retries transient errors (network, timeout, rate limit)

### Error Handling

**Transient Errors** (retried):
- Network errors
- Timeouts
- Connection resets
- Rate limits (429)
- Server errors (502, 503)

**Non-Transient Errors** (not retried):
- Validation failures
- Authorization failures
- Invalid arguments
- Logic errors

### Response Format

All tools return `ToolResult`:
```typescript
{
  success: boolean
  data?: unknown      // Tool-specific data
  error?: string      // Error message if success=false
}
```

---

## Capability Tracking

Tools are mapped to capabilities for analytics:

```typescript
const CAPABILITY_MAP = {
  'search_web': 'search',
  'get_weather': 'search',
  'get_stock_price': 'search',
  'search_companies_by_location': 'search',
  'calculate_roi': 'roi',
  'extract_action_items': 'doc',
  'generate_summary_preview': 'exportPdf',
  'draft_follow_up_email': 'doc',
  'generate_proposal_draft': 'exportPdf',
  'capture_screen_snapshot': 'screenShare',
  'capture_webcam_snapshot': 'webcam',
  'analyze_website_tech_stack': 'search',
  'generate_architecture_diagram': 'doc',
  'search_internal_case_studies': 'search',
  'generate_custom_syllabus': 'doc',
  'analyze_competitor_gap': 'search',
  'simulate_cost_of_inaction': 'roi',
  'get_dashboard_stats': 'doc'
}
```

Capabilities are recorded via `recordCapabilityUsed()` only on successful execution.

---

## Chat vs Voice Differences

### Available Tools

**Chat Agents:** All tools except `get_dashboard_stats` (admin-only via admin agent)

**Voice:** All tools including `get_dashboard_stats` (if admin)

### Retry Attempts

- **Voice:** 2 attempts (real-time constraint)
- **Chat:** 3 attempts

### Caching

- **Chat:** Enabled for `search_web` and `calculate_roi`
- **Voice:** No caching (real-time requirement)

### Context Access

- **Voice:** Direct access via `activeSessions` map
- **Chat:** Uses `multimodalContextManager` for visual context

---

## Adding New Tools

To add a new tool:

1. **Add Zod schema** to `ToolSchemas` in `unified-tool-registry.ts`
2. **Add execution case** to `executeUnifiedTool()` switch statement
3. **Implement function** in `server/utils/tool-implementations.ts`
4. **Add to chat tools** in `getChatToolDefinitions()` (if needed for chat)
5. **Add Live API declaration** in `src/config/live-tools.ts`
6. **Update capability map** in `tool-processor.ts` (if tracking needed)

---

## Notes

- All tools execute **server-side only** (security)
- Timeout limit: **25 seconds** (stays under Vercel 30s limit)
- Chat tools use `toolExecutor` for retry/cache/logging
- Voice tools use inline retry/timeout in `tool-processor.ts`
- Tools return standardized `ToolResult` format
- All tools are registered in `unified-tool-registry.ts` (single source of truth)
