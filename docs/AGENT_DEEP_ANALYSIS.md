# In-Depth Agent Analysis & Gap Identification

> **⚠️ REFERENCE DOCUMENT - ORIGINAL ANALYSIS**  
> **Status:** This document is from the original analysis phase (Dec 2, 2025). All agents have been rewritten/updated during the 7-day sprint (Days 1-5).  
> **For current system status, see:** [7_DAY_SPRINT_COMPLETE.md](./7_DAY_SPRINT_COMPLETE.md)  
> **Key Changes:** Discovery agent rewritten with structured extraction + URL analysis, unified pitch agent created, objection agent added, legacy agents deleted.

**Date:** 2025-12-02  
**Scope:** Complete analysis of all 7 core agents + admin agent for gaps, issues, and improvements

---

## Model Configuration

**Primary Model:** `gemini-3-pro-preview` (Gemini 3.0 Pro Preview)  
**AI SDK:** `@ai-sdk/google` v2.0.44  
**Structured Output:** ✅ Available via `generateObject` from `src/lib/ai-client.ts`  
**Native Function Calling:** ✅ Supported

**Impact:** All JSON parsing issues can be fixed using `generateObject()` with Zod schemas instead of regex extraction.

---

## Executive Summary

**Total Agents Analyzed:** 8 (7 core + 1 admin)  
**Critical Gaps Found:** 23  
**High Priority Issues:** 12  
**Medium Priority Issues:** 8  
**Low Priority/Enhancements:** 3

---

## 1. Discovery Agent

**File:** `src/core/agents/discovery-agent.ts`  
**Lines:** 535  
**Status:** ✅ Generally solid, but has several gaps

### ✅ Strengths
- Comprehensive 6-category discovery system
- Multimodal awareness (voice, screen, uploads)
- Exit intent detection
- Question fatigue handling
- Enhanced conversation flow tracking
- Fallback mechanisms

### ❌ Critical Gaps

#### 1.1 Missing Company Size Detection
**Issue:** Company size is hardcoded as 'Unknown' in scoring agent, but discovery doesn't extract it.

**Location:** Line 30 in `scoring-agent.ts` references this gap

**Impact:** Scoring agent can't properly assess company signals (25 points max)

**Fix:**
```typescript
// In enhanceConversationFlow(), add:
if (userContent.includes("employees") || userContent.includes("team size") || 
    userContent.includes("company size") || response.includes("how many")) {
  // Extract company size from conversation
  // Store in intelligenceContext.company.size
}
```

#### 1.2 No Budget Range Extraction
**Issue:** Discovery mentions budget but doesn't extract specific ranges ($5K-$15K vs $50K+)

**Impact:** Sales agents can't tailor pricing discussions

**Fix:** Add budget extraction logic in `enhanceConversationFlow()`:
```typescript
// Detect budget signals
const budgetPatterns = [
  /\$(\d+)k/i, /\$(\d+),\d{3}/i, 
  /(\d+)k budget/i, /budget.*(\d+)/i
]
// Extract and store in conversationFlow.evidence.budget
```

#### 1.3 Weak Evidence Storage
**Issue:** Evidence is stored as strings in arrays, but no structured extraction

**Location:** Lines 390-504

**Impact:** Can't query "what did they say about pain points?" programmatically

**Fix:** Add structured evidence extraction:
```typescript
interface StructuredEvidence {
  category: ConversationCategory
  quote: string
  extractedEntities?: {
    metrics?: string[]
    timelines?: string[]
    budgets?: string[]
  }
  confidence: number
}
```

#### 1.4 No Conversation Quality Scoring
**Issue:** Discovery doesn't score conversation quality (engagement, detail level)

**Impact:** Can't identify low-quality leads early

**Fix:** Add quality metrics:
```typescript
const qualityMetrics = {
  avgResponseLength: calculateAvgLength(messages),
  questionAnswerRatio: userQuestions / agentQuestions,
  detailLevel: extractDetailLevel(messages),
  engagementScore: calculateEngagement(messages)
}
```

### ⚠️ High Priority Issues

#### 1.5 Error Handling Incomplete
**Issue:** Error handling exists but doesn't preserve conversation state

**Location:** Lines 185-215

**Fix:** Save partial conversation flow on error:
```typescript
catch (error) {
  // Save current state before fallback
  await savePartialConversationFlow(context.sessionId, enhancedFlow)
  // Then fallback
}
```

#### 1.6 No Multimodal Context Validation
**Issue:** Assumes multimodal context is valid without checking

**Location:** Lines 86-99

**Fix:** Validate multimodal context:
```typescript
if (multimodalContext?.hasRecentImages && !multimodalContext.recentAnalyses.length) {
  console.warn('Images detected but no analyses available')
  // Handle gracefully
}
```

### 📝 Medium Priority

#### 1.7 No Conversation Timeout Detection
**Issue:** Doesn't detect if conversation is stale (no response for X minutes)

**Fix:** Add timeout detection in orchestrator, pass to discovery

#### 1.8 Limited Category Prioritization
**Issue:** Always follows same order (goals → pain → data...)

**Fix:** Prioritize based on user's initial message:
```typescript
const priorityOrder = detectPriorityFromFirstMessage(firstMessage)
// e.g., if they mention "budget", prioritize budget category
```

---

## 2. Scoring Agent

**File:** `src/core/agents/scoring-agent.ts`  
**Lines:** 232  
**Status:** ⚠️ Has critical data gaps

### ✅ Strengths
- Clear scoring criteria (role, company, conversation, budget)
- Multimodal bonuses well-defined
- Fit score calculation (workshop vs consulting)
- JSON output validation

### ❌ Critical Gaps

#### 2.1 Company Size Not Available
**Issue:** Line 30: `const companySize = 'Unknown'` - hardcoded

**Impact:** Loses 25 points max in scoring (25% of total score)

**Root Cause:** IntelligenceContext schema doesn't include company size

**Fix Required:**
1. Update `IntelligenceContext` schema to include `company.size`
2. Extract from discovery agent or research
3. Use in scoring calculation

**Code:**
```typescript
// In scoring-agent.ts, line 30:
const companySize = intelligenceContext?.company?.size || 
  extractCompanySizeFromResearch(intelligenceContext) || 
  'Unknown'

// Add extraction helper:
function extractCompanySizeFromResearch(context?: IntelligenceContext): string | null {
  // Check research_json for employee count
  // Map to: 'startup' | 'small' | 'mid-market' | 'enterprise'
}
```

#### 2.2 No Budget Signal Extraction
**Issue:** Budget signals mentioned but not extracted from conversation

**Location:** Lines 47-53

**Impact:** Loses up to 20 points (20% of total score)

**Fix:** Extract budget signals from conversationFlow.evidence:
```typescript
const budgetSignals = extractBudgetSignals(conversationFlow, messages)
// Returns: { explicit: boolean, timeline: string, urgency: number }
```

#### 2.3 Fit Score Calculation Too Simple
**Issue:** Fit scores based on simple keyword matching, not nuanced analysis

**Location:** Lines 116-128

**Impact:** May misroute leads (workshop vs consulting)

**Fix:** Use LLM to calculate fit scores with context:
```typescript
const fitScorePrompt = `Based on:
- Role: ${role}
- Company: ${companySize}
- Discovery evidence: ${JSON.stringify(conversationFlow.evidence)}
- Budget signals: ${budgetSignals}

Calculate workshop fit (0.0-1.0) and consulting fit (0.0-1.0).
Consider: team size, decision-making authority, technical sophistication, budget range.`
```

#### 2.4 No Score Confidence/Reasoning Storage
**Issue:** Reasoning is generated but not stored in metadata

**Location:** Line 228

**Impact:** Can't audit why a lead got a certain score

**Fix:** Store full reasoning in metadata:
```typescript
metadata: {
  leadScore: scores.leadScore,
  fitScore: scores.fitScore,
  reasoning: scores.reasoning,
  scoreBreakdown: {
    role: roleScore,
    company: companyScore,
    conversation: conversationScore,
    budget: budgetScore,
    multimodal: multimodalBonus
  },
  confidence: calculateConfidence(scores)
}
```

### ⚠️ High Priority Issues

#### 2.5 JSON Parsing Fragile ⚠️ **EASY FIX AVAILABLE**
**Issue:** Uses regex to extract JSON, could fail on malformed responses

**Location:** Lines 169-202

**Fix:** Use `generateObject()` with Zod schema (available in `src/lib/ai-client.ts`):
```typescript
import { generateObject } from 'src/lib/ai-client'
import { z } from 'zod'

const ScoringResultSchema = z.object({
  leadScore: z.number().min(0).max(100),
  fitScore: z.object({
    workshop: z.number().min(0).max(1),
    consulting: z.number().min(0).max(1)
  }),
  reasoning: z.string()
})

const result = await generateObject({
  model: google(GEMINI_MODELS.DEFAULT_CHAT),
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Calculate the lead score and fit scores based on the provided context.' }
  ],
  schema: ScoringResultSchema,
  temperature: 0.3
})

const scores = result.object // Type-safe, no parsing needed!
```

#### 2.6 No Score Validation
**Issue:** Doesn't validate scores are in valid ranges (0-100, 0.0-1.0)

**Fix:** Add validation:
```typescript
if (scores.leadScore < 0 || scores.leadScore > 100) {
  scores.leadScore = Math.max(0, Math.min(100, scores.leadScore))
}
```

---

## 3. Workshop Sales Agent

**File:** `src/core/agents/workshop-sales-agent.ts`  
**Lines:** 165  
**Status:** ✅ Good structure, but missing features

### ✅ Strengths
- Clear pitch structure
- Tool integration (charts, calendar)
- Multimodal awareness
- Good constraints (don't mention consulting)

### ❌ Critical Gaps

#### 3.1 No ROI Calculation Logic
**Issue:** Mentions ROI but doesn't calculate it from discovery data

**Location:** Lines 40-41

**Impact:** Generic ROI examples, not personalized

**Fix:** Calculate ROI from discovery:
```typescript
const roiData = calculateWorkshopROI({
  teamSize: extractTeamSize(conversationFlow),
  currentProductivity: extractProductivityMetrics(conversationFlow),
  painPoints: conversationFlow.evidence.pain
})
```

#### 3.2 No Pricing Guidance
**Issue:** System prompt says "keep pricing vague" but no guidance on when to reveal

**Location:** Line 52

**Impact:** May miss opportunities or overshare too early

**Fix:** Add pricing reveal logic:
```typescript
const shouldRevealPricing = 
  userAskedExplicitly || 
  (fitScore.workshop > 0.8 && interestLevel > 0.7)

if (shouldRevealPricing) {
  systemPrompt += `\nPricing: $5K-$15K for standard workshop, customize based on team size`
}
```

#### 3.3 No Case Study Integration
**Issue:** No way to reference similar clients/industries

**Impact:** Less credibility, weaker pitch

**Fix:** Add case study lookup:
```typescript
const caseStudy = await findRelevantCaseStudy({
  industry: intelligenceContext?.company?.industry,
  painPoints: conversationFlow.evidence.pain
})
```

#### 3.4 Stream-to-Text Conversion Loses Tool Calls
**Issue:** Converts stream to text, but tool calls might be lost

**Location:** Lines 149-152

**Impact:** Charts/calendar widgets might not render

**Fix:** Check for tool calls in stream:
```typescript
const toolCalls = result.toolCalls || []
// Ensure tool results are included in output
```

### ⚠️ High Priority Issues

#### 3.5 No Interest Level Tracking
**Issue:** Doesn't track if lead is showing interest

**Impact:** Can't adjust pitch intensity

**Fix:** Add interest detection:
```typescript
const interestSignals = detectInterest(messages)
// "sounds interesting", "tell me more", "how much", etc.
```

---

## 4. Consulting Sales Agent

**File:** `src/core/agents/consulting-sales-agent.ts`  
**Lines:** 168  
**Status:** ✅ Similar to workshop, same gaps

### ❌ Critical Gaps

#### 4.1 Same Issues as Workshop Agent
- No ROI calculation (lines 40-41)
- No pricing guidance (line 53)
- No case study integration
- Stream-to-text conversion issue (lines 152-155)

#### 4.2 Additional: No Complexity Assessment
**Issue:** Doesn't assess project complexity before pricing

**Impact:** May quote too low/high

**Fix:** Add complexity scoring:
```typescript
const complexity = assessProjectComplexity({
  integrations: extractIntegrationNeeds(conversationFlow),
  dataVolume: extractDataVolume(conversationFlow),
  timeline: extractTimeline(conversationFlow)
})
// Use to adjust pricing tier
```

---

## 5. Closer Agent

**File:** `src/core/agents/closer-agent.ts`  
**Lines:** 168  
**Status:** ⚠️ Good structure, needs objection handling

### ❌ Critical Gaps

#### 5.1 No Objection Classification
**Issue:** Lists common objections but doesn't classify which one user has

**Location:** Lines 30-47

**Impact:** Generic responses, not targeted

**Fix:** Add objection detection:
```typescript
const objection = classifyObjection(lastUserMessage)
// Returns: 'price' | 'timing' | 'team' | 'uncertainty' | null

if (objection) {
  systemPrompt += `\nCURRENT OBJECTION: ${objection}\nUse specific response for this objection.`
}
```

#### 5.2 No Urgency Creation Logic
**Issue:** Mentions "limited slots" but doesn't check actual availability

**Location:** Line 56

**Impact:** False urgency, loses credibility

**Fix:** Check calendar availability:
```typescript
const nextAvailableSlot = await getNextAvailableSlot()
if (nextAvailableSlot) {
  systemPrompt += `\nNext available slot: ${nextAvailableSlot}`
}
```

#### 5.3 No Multimodal Proof Extraction
**Issue:** Mentions multimodal experience but doesn't extract specific moments

**Location:** Lines 53-55

**Impact:** Generic references, not specific

**Fix:** Extract specific multimodal moments:
```typescript
const multimodalMoments = extractMultimodalMoments(multimodalContext)
// "When you showed your Excel dashboard at 2:34, I noticed..."
```

---

## 6. Summary Agent

**File:** `src/core/agents/summary-agent.ts`  
**Lines:** 210  
**Status:** ✅ Good, but has parsing issues

### ❌ Critical Gaps

#### 6.1 JSON Parsing Fragile ⚠️ **EASY FIX AVAILABLE**
**Issue:** Uses regex to extract JSON, same as scoring agent

**Location:** Lines 146-163

**Impact:** May fail on malformed LLM responses

**Fix:** Use `generateObject()` with Zod schema:
```typescript
import { generateObject } from 'src/lib/ai-client'

const result = await generateObject({
  model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, { thinking: 'high' }),
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: 'Generate the conversation summary based on all provided context.' }
  ],
  schema: SummarySchema, // Already defined in file
  temperature: 1.0
})

const summary = result.object // Type-safe, validated by Zod
```

#### 6.2 No Summary Validation
**Issue:** Doesn't validate summary completeness

**Impact:** May return incomplete summaries

**Fix:** Add validation:
```typescript
const requiredFields = ['executiveSummary', 'keyFindings', 'recommendedSolution']
const missingFields = requiredFields.filter(f => !summary[f])
if (missingFields.length > 0) {
  // Regenerate or use fallback
}
```

#### 6.3 No Multimodal Summary Details
**Issue:** Multimodal summary is generic, doesn't extract specific insights

**Location:** Lines 84-88

**Impact:** Loses valuable context from screen shares/uploads

**Fix:** Extract specific insights:
```typescript
const multimodalInsights = extractMultimodalInsights(multimodalData)
// "Screen share revealed: [specific finding]"
// "Uploaded document showed: [key insight]"
```

#### 6.4 No ROI Projection Validation
**Issue:** ROI is generated but not validated against discovery data

**Location:** Line 173

**Impact:** Unrealistic ROI projections

**Fix:** Validate ROI against discovery:
```typescript
const validatedROI = validateROIProjection({
  expectedROI: summary.expectedROI,
  discoveryEvidence: conversationFlow.evidence,
  industry: intelligenceContext?.company?.industry
})
```

---

## 7. Proposal Agent

**File:** `src/core/agents/proposal-agent.ts`  
**Lines:** 256  
**Status:** ⚠️ Good structure, but pricing logic incomplete

### ❌ Critical Gaps

#### 7.1 Pricing Calculation Too Generic
**Issue:** Pricing guidelines exist but calculation is left to LLM

**Location:** Lines 144-168

**Impact:** Inconsistent pricing, may quote incorrectly

**Fix:** Add structured pricing calculation:
```typescript
const pricing = calculatePricing({
  companySize: intelligenceContext?.company?.size,
  complexity: assessComplexity(conversationFlow),
  timeline: extractTimeline(conversationFlow),
  integrations: extractIntegrationCount(conversationFlow)
})
// Returns structured pricing with phases
```

#### 7.2 No Timeline Validation
**Issue:** Timeline is calculated but not validated against reality

**Location:** Lines 170-176

**Impact:** Unrealistic timelines

**Fix:** Validate against historical data:
```typescript
const validatedTimeline = validateTimeline({
  proposedTimeline: proposal.timeline,
  similarProjects: await getSimilarProjects(industry),
  complexity: assessedComplexity
})
```

#### 7.3 No Payment Terms Logic
**Issue:** Payment terms are hardcoded in prompt

**Location:** Line 135

**Impact:** Can't adjust based on deal size/risk

**Fix:** Calculate payment terms:
```typescript
const paymentTerms = calculatePaymentTerms({
  totalValue: proposal.investment.total,
  companySize: intelligenceContext?.company?.size,
  riskLevel: assessRisk(conversationFlow)
})
// Returns: "50% upfront" for small, "30% upfront" for enterprise, etc.
```

#### 7.4 No ROI Validation
**Issue:** ROI is generated but not validated

**Location:** Lines 232-238

**Impact:** Unrealistic ROI claims

**Fix:** Same as summary agent - validate against discovery

---

## 8. Admin Agent

**File:** `src/core/agents/admin-agent.ts`  
**Lines:** 587  
**Status:** ✅ Comprehensive, but has integration gaps

### ❌ Critical Gaps

#### 8.1 No Error Recovery for Data Fetching
**Issue:** Data fetching has try-catch but doesn't retry

**Location:** Lines 30-99

**Impact:** May return incomplete data on transient failures

**Fix:** Add retry logic:
```typescript
const fetchWithRetry = async (fn: () => Promise<T>, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === retries - 1) throw error
      await sleep(1000 * (i + 1))
    }
  }
}
```

#### 8.2 No Caching for Dashboard Stats
**Issue:** Fetches dashboard stats on every request

**Location:** Lines 67-99

**Impact:** Slow responses, unnecessary DB load

**Fix:** Cache dashboard stats:
```typescript
const cachedStats = await getCachedStats('dashboard', 60) // 60s cache
if (cachedStats) return cachedStats
// Otherwise fetch and cache
```

#### 8.3 No Rate Limiting on Tools
**Issue:** Tools can be called unlimited times

**Impact:** Could overwhelm system

**Fix:** Add rate limiting:
```typescript
const rateLimiter = new RateLimiter({
  search_leads: { max: 10, window: 60000 },
  draft_email: { max: 5, window: 60000 }
})
```

#### 8.4 Email Drafting Too Simple
**Issue:** Email drafting doesn't use conversation context well

**Location:** Lines 540-586

**Impact:** Generic emails, not personalized

**Fix:** Include more context:
```typescript
const emailContext = {
  conversationSummary,
  painPoints: extractPainPoints(conversationFlow),
  fitScore: intelligenceContext?.fitScore,
  leadScore: intelligenceContext?.leadScore,
  multimodalUsage: extractMultimodalUsage(multimodalContext)
}
```

---

## Cross-Agent Issues

### 🔴 Critical: Missing Shared Utilities

#### 1. No Budget Extraction Utility
**Impact:** All agents that need budget info can't get it

**Fix:** Create `src/core/agents/utils/budget-extraction.ts`:
```typescript
export function extractBudgetSignals(
  conversationFlow: ConversationFlowState,
  messages: ChatMessage[]
): BudgetSignals {
  // Extract from evidence, messages, etc.
}
```

#### 2. No Company Size Extraction
**Impact:** Scoring agent can't score properly

**Fix:** Create `src/core/agents/utils/company-size-extraction.ts`

#### 3. No ROI Calculation Utility
**Impact:** Sales agents use generic ROI

**Fix:** Create `src/core/agents/utils/roi-calculator.ts`

#### 4. No Objection Classification
**Impact:** Closer agent can't target objections

**Fix:** Create `src/core/agents/utils/objection-detector.ts`

#### 5. No Interest Level Detection
**Impact:** Sales agents can't adjust pitch

**Fix:** Create `src/core/agents/utils/interest-detector.ts`

### ⚠️ High Priority: Error Handling

#### 1. No Agent-Level Error Recovery
**Issue:** Agents fail completely on errors

**Fix:** Add retry logic with exponential backoff

#### 2. No Partial Result Preservation
**Issue:** If agent fails mid-execution, all work is lost

**Fix:** Save partial results to context

### 📝 Medium Priority: Performance

#### 1. No Response Caching
**Issue:** Same queries generate same responses repeatedly

**Fix:** Cache agent responses based on input hash

#### 2. No Streaming Support
**Issue:** All agents wait for full response

**Fix:** Stream responses where possible (sales agents already do this)

---

## Recommendations Priority

### 🔴 Immediate (This Week)
1. **Fix JSON parsing in scoring/summary agents** ⚡ **QUICK WIN** - Use `generateObject()` instead of regex (15 min fix per agent)
2. Fix company size extraction (blocks scoring)
3. Add budget signal extraction (blocks scoring)
4. Add objection classification to closer agent

### ⚠️ High Priority (This Month)
1. Add ROI calculation utilities
2. Add interest level detection
3. Add error recovery/retry logic
4. Add response validation

### 📝 Medium Priority (Next Sprint)
1. Add caching for admin agent
2. Add case study integration
3. Add conversation quality scoring
4. Add multimodal proof extraction

---

## Testing Gaps

### Missing Tests
1. **Budget extraction** - No tests for budget signal detection
2. **Company size extraction** - No tests
3. **Objection classification** - No tests
4. **Interest detection** - No tests
5. **ROI calculation** - No tests
6. **Error recovery** - No tests for retry logic

### Test Coverage
- Discovery: ~60% (missing edge cases)
- Scoring: ~40% (missing company size, budget)
- Sales agents: ~50% (missing ROI, pricing)
- Closer: ~30% (missing objection handling)
- Summary: ~50% (missing validation)
- Proposal: ~40% (missing pricing logic)
- Admin: ~70% (good coverage)

---

## Summary Statistics

| Agent | Lines | Critical Gaps | High Priority | Test Coverage |
|-------|-------|---------------|---------------|---------------|
| Discovery | 535 | 4 | 2 | 60% |
| Scoring | 232 | 4 | 2 | 40% |
| Workshop Sales | 165 | 4 | 1 | 50% |
| Consulting Sales | 168 | 5 | 1 | 50% |
| Closer | 168 | 3 | 0 | 30% |
| Summary | 210 | 4 | 0 | 50% |
| Proposal | 256 | 4 | 0 | 40% |
| Admin | 587 | 4 | 0 | 70% |

**Total Critical Gaps:** 32  
**Total High Priority Issues:** 6  
**Overall Test Coverage:** ~49%

---

**End of Analysis**

