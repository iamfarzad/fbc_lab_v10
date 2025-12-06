# Conversation Flow: Workshop vs Consulting Routing

**Date:** 2025-12-06  
**Status:** ✅ **Fully Implemented**

## Executive Summary

The system automatically routes leads to **Workshop** or **Consulting** pitches based on fit scores calculated during the scoring phase. The decision is made automatically, but can be influenced by explicit user preferences.

---

## Flow Overview

```
START
  ↓
DISCOVERY (Discovery Agent)
  ↓ Collects: goals, pain, data, readiness, budget, success
  ↓
SCORING (Scoring Agent)
  ↓ Calculates: leadScore (0-100), fitScore.workshop (0-1), fitScore.consulting (0-1)
  ↓
determinePitchType()
  ↓
  ├─→ WORKSHOP_PITCH (if workshop fit > 0.7 and > consulting + 0.1)
  │   └─→ Workshop Sales Agent
  │
  ├─→ CONSULTING_PITCH (if consulting fit > 0.7 and > workshop + 0.1)
  │   └─→ Consulting Sales Agent
  │
  └─→ PITCHING (if unclear fit)
      └─→ Unified Pitch Agent (auto-detects based on fit scores)
  ↓
OBJECTION? (if detected)
  ↓ Objection Agent
  ↓
CLOSING (Closer Agent)
  ↓
BOOKED / SUMMARY
```

---

## Stage 1: DISCOVERY

**Agent:** `discoveryAgent`  
**Purpose:** Systematically qualify leads across 6 categories

**Categories Covered:**
1. **GOALS** - What are they trying to achieve with AI?
2. **PAIN** - What's broken or frustrating?
3. **DATA** - Where is their data? How organized?
4. **READINESS** - Team buy-in? Change management concerns?
5. **BUDGET** - Timeline? Investment range?
6. **SUCCESS** - What metrics would make this worthwhile?

**Key Signals Collected:**
- Role seniority (C-level, VP, Director, Manager, IC)
- Company size (startup, small, mid-market, enterprise)
- Budget signals (explicit mentions, urgency, timeline)
- Intent keywords:
  - **Workshop signals:** "training", "teach team", "upskilling", "workshop", "learn"
  - **Consulting signals:** "custom build", "implementation", "integrate", "scale", "automation"

**Exit Conditions:**
- Enough context collected (4+ categories covered)
- Moves to SCORING stage

---

## Stage 2: SCORING

**Agent:** `scoringAgent`  
**Purpose:** Calculate lead score and fit scores for workshop vs consulting

### Lead Score Calculation (0-100)

**Components:**
1. **Role Seniority (30 points max):**
   - C-level/Founder: 30
   - VP/Director: 20
   - Manager: 10
   - Individual contributor: 5

2. **Company Signals (25 points max):**
   - Enterprise (500+ employees): 25
   - Mid-market (50-500): 15
   - Small (10-50): 10
   - Startup (<10): 5

3. **Conversation Quality (25 points max):**
   - All 6 categories covered: 25
   - 4-5 categories: 15
   - 2-3 categories: 10
   - 1 category: 5

4. **Budget Signals (20 points max):**
   - Explicit budget mentioned: 20
   - Timeline urgency (Q1/Q2): 15
   - Just exploring: 5

5. **Multimodal Bonuses:**
   - Voice used: +10 points (commitment signal)
   - Screen shared: +15 points (HIGH INTENT - showing pain points)
   - Webcam shown: +5 points (comfort/trust)
   - Documents uploaded: +10 points (prepared/serious)

### Fit Score Calculation (0.0 - 1.0)

**Workshop Fit Indicators:**
- Manager/Team Lead role (not C-level)
- Mid-size company (50-500 employees)
- Mentions: "training", "teach team", "upskilling", "workshop"
- Budget range: $5K-$15K signals

**Consulting Fit Indicators:**
- C-level/VP role
- Enterprise or well-funded startup
- Mentions: "custom build", "implementation", "integrate", "scale"
- Budget range: $50K+ signals

**Output:**
```json
{
  "leadScore": 75,
  "fitScore": {
    "workshop": 0.3,
    "consulting": 0.8
  },
  "reasoning": "C-level executive at enterprise company seeking custom implementation"
}
```

---

## Stage 3: Pitch Type Determination

**Function:** `determinePitchType()`  
**Location:** `src/core/agents/client-orchestrator.ts`

**Logic:**
```typescript
function determinePitchType(): 'WORKSHOP_PITCH' | 'CONSULTING_PITCH' | 'PITCHING' {
  if (!flowState.fitScore) return 'PITCHING'
  
  const { workshop, consulting } = flowState.fitScore
  
  // Clear workshop fit
  if (workshop > 0.7 && workshop > consulting + 0.1) {
    return 'WORKSHOP_PITCH'
  }
  
  // Clear consulting fit
  if (consulting > 0.7 && consulting > workshop + 0.1) {
    return 'CONSULTING_PITCH'
  }
  
  // Use generic pitch for unclear fit
  return 'PITCHING'
}
```

**Decision Matrix:**

| Workshop Score | Consulting Score | Result |
|----------------|------------------|--------|
| > 0.7 | < workshop + 0.1 | `WORKSHOP_PITCH` |
| < consulting + 0.1 | > 0.7 | `CONSULTING_PITCH` |
| Otherwise | Otherwise | `PITCHING` (unified) |

---

## Stage 4: Pitching

### Option A: WORKSHOP_PITCH

**Agent:** `workshopSalesAgent`  
**Target:** Mid-size companies, team leads/managers, $5K-$15K budget

**Pitch Structure:**
1. Acknowledge pain from discovery
2. Position workshop as solution (hands-on training)
3. Show concrete value (e.g., "Training 10 people = $50K in productivity gains")
4. Soft CTA with calendar link

**Workshop Packages:**
1. **AI Fundamentals (1 day)** - $5,000
   - For teams new to AI
   - Covers: prompting, tools overview, use case identification

2. **AI Implementation (2 days)** - $10,000
   - For teams ready to build
   - Covers: workflow automation, custom GPTs, integration planning

3. **AI Leadership (1 day)** - $7,500
   - For executives and managers
   - Covers: strategy, ROI measurement, governance, team enablement

**Calendar Link:** `CALENDAR_CONFIG.WORKSHOP`

**Key Constraints:**
- Don't mention consulting (different product)
- Keep pricing ranges, finalize in call
- Create urgency: "Next workshop is in [timeframe], spots are limited"
- Reference multimodal moments naturally

---

### Option B: CONSULTING_PITCH

**Agent:** `consultingSalesAgent`  
**Target:** C-level/VPs, enterprise companies, $50K+ budget

**Pitch Structure:**
1. Acknowledge pain from discovery
2. Position custom solution (implementation/integration)
3. Show concrete ROI (e.g., "Automating this process = $200K/year savings")
4. Strong CTA with calendar link

**Consulting Engagement Tiers:**

1. **Strategy & Assessment** ($15K - $25K)
   - 2-4 week engagement
   - AI readiness assessment
   - Implementation roadmap
   - Technology recommendations

2. **Pilot Implementation** ($50K - $100K)
   - 8-12 week engagement
   - Single workflow automation
   - Proof of concept
   - Team training included

3. **Full Implementation** ($150K - $500K+)
   - 3-6 month engagement
   - Enterprise-wide AI transformation
   - Multiple system integrations
   - Ongoing support & optimization

**Calendar Link:** `CALENDAR_CONFIG.CONSULTING`

**Key Constraints:**
- Don't mention workshops (for smaller leads)
- Be direct about pricing: "Engagements typically start at $50K"
- Reference similar clients: "We did something similar for [industry] company"
- Executive-level, ROI-focused, direct

---

### Option C: PITCHING (Unified)

**Agent:** `pitchAgent`  
**Purpose:** Auto-detects primary product when fit is unclear

**Logic:**
```typescript
const workshopScore = intelligenceContext.fitScore?.workshop || 0
const consultingScore = intelligenceContext.fitScore?.consulting || 0
const isWorkshop = workshopScore > consultingScore
const product = isWorkshop ? 'workshop' : 'consulting'
```

**Features:**
- Dynamic ROI calculation using `calculateRoi()` tool
- References multimodal context naturally
- Uses exact company/role context
- Price guidance: only reveal if high interest (>0.75) or asked directly

**Product Config:**
- **Workshop:** $8K–$18K, 2–3 days, intensive hands-on
- **Consulting:** $80K–$400K+, 3–12 months, strategic partnership

---

## Stage 5: Objection Handling (if detected)

**Agent:** `objectionAgent`  
**Trigger:** Objection detected with confidence > 0.7

**Objection Types:**
- `price` - Budget concerns
- `timing` - Not the right time
- `authority` - Need to check with team/boss
- `need` - Not sure if we need this
- `trust` - Credibility questions

**Flow:**
- Handles objection with contextual rebuttal
- After 2+ objections → moves to CLOSING
- Otherwise → returns to PITCHING

---

## Stage 6: CLOSING

**Agent:** `closerAgent`  
**Purpose:** Close the deal, provide booking link

**Tools Available:**
- `calculate_roi` - Calculate ROI based on investment
- `create_calendar_widget` - Generate booking link
- `extract_action_items` - Extract key outcomes
- `generate_summary_preview` - Generate conversation summary

**Key Rules:**
- Reference multimodal experience: "You've already seen what our AI can do live"
- Create urgency: "Slots are filling fast"
- Remove friction: "Free call, no commitment"
- **CRITICAL:** Calendar widget returns `actuallyBooked: false` - only provides LINK

---

## Stage 7: BOOKED / SUMMARY

**Agent:** `summaryAgent`  
**Purpose:** Wrap up conversation, generate summary

**Output:**
- Structured conversation summary
- Multimodal interaction details
- Recommended solutions (workshop or consulting)
- Next steps

---

## User Preference Override

**Current Status:** ⚠️ **Not explicitly implemented**

**How it works now:**
- System determines pitch type automatically based on fit scores
- User can express preference during discovery, which influences fit scores
- Explicit mentions like "I want a workshop" or "We need consulting" are captured in discovery

**Potential Enhancement:**
- Add explicit preference detection in discovery agent
- Override fit scores if user explicitly states preference
- Example: "I want a workshop" → force `WORKSHOP_PITCH` even if consulting fit is higher

---

## Example Flows

### Example 1: Workshop Lead

```
User: "I'm a team lead at a 50-person company. We want to train our team on AI."

DISCOVERY:
- Role: Manager
- Company: 50 employees (mid-market)
- Goal: Team training
- Budget: $10K mentioned

SCORING:
- leadScore: 65
- fitScore: { workshop: 0.85, consulting: 0.25 }

determinePitchType():
- workshop (0.85) > 0.7 ✅
- workshop (0.85) > consulting (0.25) + 0.1 ✅
- Result: WORKSHOP_PITCH

WORKSHOP_PITCH:
- Pitches AI Implementation Workshop (2 days, $10K)
- Focuses on hands-on training, team upskilling
- Calendar link: CALENDAR_CONFIG.WORKSHOP
```

### Example 2: Consulting Lead

```
User: "I'm the CTO at a 500-person company. We need to automate our customer service workflows."

DISCOVERY:
- Role: C-Level
- Company: 500 employees (enterprise)
- Goal: Custom automation
- Budget: $100K+ mentioned

SCORING:
- leadScore: 90
- fitScore: { workshop: 0.2, consulting: 0.9 }

determinePitchType():
- consulting (0.9) > 0.7 ✅
- consulting (0.9) > workshop (0.2) + 0.1 ✅
- Result: CONSULTING_PITCH

CONSULTING_PITCH:
- Pitches Pilot Implementation ($50K-$100K)
- Focuses on custom automation, ROI ($200K/year savings)
- Calendar link: CALENDAR_CONFIG.CONSULTING
```

### Example 3: Unclear Fit

```
User: "We're exploring AI for our business. Not sure what we need."

DISCOVERY:
- Role: Director
- Company: 100 employees
- Goal: General exploration
- Budget: Not mentioned

SCORING:
- leadScore: 55
- fitScore: { workshop: 0.5, consulting: 0.5 }

determinePitchType():
- Neither score > 0.7
- Result: PITCHING (unified)

PITCHING:
- Auto-detects: workshop (0.5) vs consulting (0.5) → defaults to consulting
- Presents both options or asks clarifying questions
- Uses dynamic ROI calculation
```

---

## Key Files

| File | Purpose |
|------|---------|
| `src/core/agents/scoring-agent.ts` | Calculates lead and fit scores |
| `src/core/agents/client-orchestrator.ts` | Routes to appropriate pitch type |
| `src/core/agents/workshop-sales-agent.ts` | Pitches workshops |
| `src/core/agents/consulting-sales-agent.ts` | Pitches consulting |
| `src/core/agents/pitch-agent.ts` | Unified pitch (unclear fit) |
| `src/core/types/funnel-stage.ts` | Stage definitions |

---

## Configuration

**Calendar Links:**
- Workshop: `CALENDAR_CONFIG.WORKSHOP`
- Consulting: `CALENDAR_CONFIG.CONSULTING`
- Default: `CALENDAR_CONFIG.DEFAULT`

**Fit Score Thresholds:**
- Clear fit: > 0.7
- Margin: > 0.1 difference between scores
- Default: Use unified pitch agent

---

## Summary

✅ **System automatically routes based on fit scores**  
✅ **Workshop vs Consulting decision made during SCORING stage**  
✅ **Three pitch paths: WORKSHOP_PITCH, CONSULTING_PITCH, PITCHING (unified)**  
✅ **User preferences captured during discovery influence fit scores**  
⚠️ **Explicit preference override not yet implemented (but can be added)**

**Status:** Production-ready ✅

