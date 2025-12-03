# Lead Intelligence Research Pipeline

> **⚠️ REFERENCE DOCUMENT - ORIGINAL ANALYSIS**  
> **Status:** This document is from the original analysis phase (Dec 2, 2025). Lead research has been updated to use `generateObject` with Google Grounding Search properly enabled.  
> **For current system status, see:** [7_DAY_SPRINT_COMPLETE.md](./7_DAY_SPRINT_COMPLETE.md)  
> **Key Changes:** Google Grounding Search now enabled via `tools: [{ googleSearch: {} }]`, 100% structured output (zero regex), URL context tool added.

**Date:** 2025-12-02  
**Scope:** Complete documentation of how the system uses Google Grounding Search and URL context to research users and create personalized conversation context

---

## Overview

The **Lead Intelligence Agent** is a background worker that automatically researches users when they accept terms, using **Google Grounding Search** to gather public data (LinkedIn, company info, industry trends) and create personalized context for the conversation.

**Key Feature:** Zero manual input required - the system automatically enriches conversations with real-time public data.

---

## Architecture

```
User Accepts Terms
    ↓
Lead Intelligence Agent (Background Worker)
    ↓
LeadResearchService.researchLead()
    ↓
Google Grounding Search API
    ↓
Structured Research Result
    ↓
Intelligence Context Injection
    ↓
Personalized Conversation
```

---

## 1. Trigger Point

### When Research Happens

**Location:** `App.tsx` → `handleTermsComplete()`

**Trigger:** User accepts terms and provides:
- Email (required)
- Name (optional)
- Company URL (optional)

**Code:**
```typescript
const handleTermsComplete = (name: string, email: string, companyUrl?: string) => {
  // ... save profile ...
  
  // Trigger background research (non-blocking)
  performBackgroundResearch(name, email, companyUrl)
}
```

**Execution:** Non-blocking - research happens in background while user starts chatting.

---

## 2. Lead Intelligence Agent

**File:** `src/core/agents/lead-intelligence-agent.ts`

**Purpose:** Orchestrates the research process and calculates initial fit scores.

**Flow:**
1. Extracts company domain from email
2. Calls `LeadResearchService.researchLead()`
3. Analyzes LinkedIn data
4. Calculates initial fit scores (workshop vs consulting)
5. Returns structured intelligence context

**Key Method:**
```typescript
export async function leadIntelligenceAgent({
  email,
  name,
  companyUrl,
  sessionId
}: {
  email: string
  name?: string
  companyUrl?: string
  sessionId: string
})
```

**Output:**
- `ResearchResult` with company, person, strategic data
- Initial fit scores (workshop/consulting)
- Confidence score
- Chain of thought steps

---

## 3. Lead Research Service

**File:** `src/core/intelligence/lead-research.ts`

**Class:** `LeadResearchService`

### 3.1 Caching Strategy

**Two-Level Caching:**
1. **Client-Side:** `localStorage` (browser persistence)
2. **Server-Side:** `createCachedFunction` with 24-hour TTL

**Cache Key:** `lead_research_{email}_{name}`

**Benefits:**
- Avoids redundant API calls
- Fast subsequent loads
- Reduces Google Grounding API costs

### 3.2 Google Grounding Search Integration

**Location:** Lines 190-197

**Implementation:**
```typescript
const result = await this.genAI.models.generateContent({
  model: GEMINI_MODELS.DEFAULT_CHAT, // gemini-3-pro-preview
  contents: [{ role: 'user', parts: [{ text: prompt }] }],
  config: {
    tools: [{ googleSearch: {} }]  // 🔑 Enables Google Grounding Search
  }
})
```

**What Google Grounding Does:**
- Searches Google for public information
- Finds LinkedIn profiles
- Discovers company websites
- Retrieves recent news/articles
- Identifies competitors
- Extracts industry trends

**No API Keys Required:** Google Grounding is built into Gemini API.

---

### 3.3 Research Prompt Structure

**Location:** Lines 143-188

**Prompt Design:**
```typescript
const prompt = `
Research the following individual and company using Google Search.

Target:
Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company Context: ${companyUrl || 'Use email domain'}

Task:
1. Identify the company details (Industry, Size, Summary, Country).
2. Identify the person's role and seniority.
3. STRATEGIC ANALYSIS:
   - Find recent news/events about the company.
   - Identify key competitors.
   - Infer likely pain points based on the role and industry trends.

Return ONLY valid JSON, no markdown code blocks or extra text.
`
```

**What It Requests:**
- **Company:** Name, domain, industry, size, summary, website, LinkedIn, country
- **Person:** Full name, role, seniority, LinkedIn profile URL
- **Strategic:** Latest news, competitors, pain points, market trends

---

### 3.4 Response Processing

**Location:** Lines 216-323

**Steps:**
1. Extract text from Gemini response
2. Parse JSON (handles markdown code blocks)
3. Validate with Zod schema
4. Extract citations from `groundingMetadata.groundingChunks`
5. Return structured `ResearchResult`

**Citation Extraction:**
```typescript
const allCitations = resultRecord.candidates?.[0]?.groundingMetadata?.groundingChunks
  ?.map(c => ({
    uri: c.web?.uri || '',
    title: c.web?.title,
    description: `Source for ${c.web?.title || 'unknown'}`
  }))
  .filter(c => c.uri !== null) || []
```

**Citations Include:**
- LinkedIn profile URLs
- Company website URLs
- News article URLs
- Industry report URLs

---

## 4. Research Result Structure

**Type:** `ResearchResult`

```typescript
interface ResearchResult {
  company: {
    name: string
    domain: string
    industry?: string
    size?: string
    summary?: string
    website?: string
    linkedin?: string
    country?: string
  }
  person: {
    fullName: string
    role?: string
    seniority?: string
    profileUrl?: string
    company?: string
  }
  strategic?: {
    latest_news: string[]
    competitors: string[]
    pain_points: string[]
    market_trends?: string[]
  }
  role: string
  confidence: number  // 0.0 - 1.0
  citations?: Array<{
    uri: string
    title?: string
    description?: string
  }>
}
```

**Example Output:**
```json
{
  "company": {
    "name": "Acme Corp",
    "domain": "acme.com",
    "industry": "SaaS",
    "size": "50-200 employees",
    "summary": "Enterprise software provider...",
    "website": "https://acme.com",
    "linkedin": "https://linkedin.com/company/acme",
    "country": "USA"
  },
  "person": {
    "fullName": "John Doe",
    "role": "VP of Engineering",
    "seniority": "VP",
    "profileUrl": "https://linkedin.com/in/johndoe",
    "company": "Acme Corp"
  },
  "strategic": {
    "latest_news": ["Raised $10M Series A", "Launched new product"],
    "competitors": ["Competitor A", "Competitor B"],
    "pain_points": ["Scaling engineering team", "Technical debt"],
    "market_trends": ["AI adoption", "Remote work"]
  },
  "role": "VP of Engineering",
  "confidence": 0.85,
  "citations": [
    {
      "uri": "https://linkedin.com/in/johndoe",
      "title": "John Doe - LinkedIn",
      "description": "Source for John Doe"
    }
  ]
}
```

---

## 5. Context Injection Flow

### 5.1 Storage in UnifiedContext

**Location:** `App.tsx` → `performBackgroundResearch()`

**Code:**
```typescript
const result = await researchServiceRef.current.researchLead(email, name, companyUrl)
researchResultRef.current = result

// Sync to all services
unifiedContext.setResearchContext(result)
unifiedContext.setIntelligenceContext({
  ...intelligenceContextRef.current,
  research: result
})
```

**Services Updated:**
- `StandardChatService` - via `setResearchContext()`
- `GeminiLiveService` - via `setResearchContext()`
- `AIBrainService` - via intelligence context

---

### 5.2 Visual Display: Research Card

**Location:** `App.tsx` → Lines 387-401

**UI Component:** `ChatMessage.tsx` handles `research-card` attachment type

**Display:**
- **Verified Handshake Card** shown in transcript
- Shows person name, role, company
- Displays strategic context (competitors, pain points)
- Lists citations with links
- Shows confidence score

**Code:**
```typescript
setTranscript(prev => [...prev, {
  id: Date.now().toString(),
  role: 'model',
  text: `[System: Context Loaded]`,
  attachment: {
    type: 'research-card',
    data: JSON.stringify(result),
    name: 'Intelligence Summary'
  }
}])
```

---

### 5.3 Agent Context Integration

**Location:** `src/core/agents/orchestrator.ts` → `routeToAgent()`

**How Agents Use Research:**

1. **Discovery Agent:**
   - References company name/industry
   - Uses role to tailor questions
   - References strategic pain points

2. **Scoring Agent:**
   - Uses company size for scoring
   - Uses role seniority for scoring
   - Uses industry for fit calculation

3. **Sales Agents:**
   - References specific pain points from research
   - Mentions company/industry context
   - Uses role to adjust pitch tone

**Code Example:**
```typescript
const systemPrompt = `
INTELLIGENCE CONTEXT:
Company: ${intelligenceContext?.company?.name}
Role: ${intelligenceContext?.person?.role}
Lead Score: ${intelligenceContext?.leadScore}

STRATEGIC INSIGHTS:
${intelligenceContext?.research?.strategic?.pain_points?.join(', ')}
`
```

---

## 6. URL Context Research

**Status:** ⚠️ **Mentioned but not fully implemented**

**References:**
- Admin agent mentions URL context (line 147, 189, 199)
- No actual implementation found in codebase

**Intended Use:**
- Analyze specific URLs/pages
- Extract content from company websites
- Research competitor pages
- Analyze LinkedIn profiles in detail

**Gap:** URL context research tool needs to be implemented.

---

## 7. Personalization Examples

### Example 1: Discovery Agent Personalization

**Without Research:**
```
"What's the main goal you're trying to achieve with AI?"
```

**With Research:**
```
"Hi John! I see you're VP of Engineering at Acme Corp, a SaaS company. 
I noticed you've been scaling your engineering team recently. 
What's the main goal you're trying to achieve with AI?"
```

---

### Example 2: Sales Agent Personalization

**Without Research:**
```
"We offer AI workshops for teams..."
```

**With Research:**
```
"Based on your role as VP of Engineering at Acme Corp, and the technical 
debt challenges I see in your industry, our AI workshops focus specifically 
on helping engineering teams like yours..."
```

---

## 8. Error Handling & Fallbacks

### 8.1 Research Failure

**Location:** `lead-research.ts` → Lines 347-367

**Fallback Strategy:**
```typescript
catch (error) {
  // Return minimal fallback result
  return {
    company: {
      name: domain.split('.')[0],
      domain,
      summary: 'Company information unavailable'
    },
    person: {
      fullName: name || 'Unknown Person'
    },
    role: 'Unknown',
    confidence: 0,
    citations: []
  }
}
```

**Impact:** Conversation continues with minimal context (no personalization).

---

### 8.2 JSON Parsing Failure

**Location:** `lead-research.ts` → Lines 321-345

**Fallback:** Returns basic structure with low confidence (0.2).

---

## 9. Performance Considerations

### 9.1 Caching Impact

**First Request:** ~3-5 seconds (Google Grounding API call)
**Cached Request:** <50ms (localStorage/server cache)

**Cache Duration:** 24 hours

**Cache Invalidation:** Manual (clear localStorage) or TTL expiry

---

### 9.2 API Costs

**Google Grounding Search:**
- Included in Gemini API pricing
- No additional cost for Google Search integration
- Rate limits apply (same as Gemini API)

**Optimization:**
- Caching reduces redundant calls
- Research only runs once per email/name combination

---

## 10. Privacy & Data Sources

### 10.1 Data Sources

**Public Data Only:**
- LinkedIn profiles (public information)
- Company websites (public pages)
- Google Search results (public web)
- News articles (publicly available)

**No Private Data:**
- No email content access
- No private LinkedIn data
- No internal company data

---

### 10.2 GDPR Compliance

**Data Storage:**
- Research results stored in Supabase
- Cached in localStorage (client-side)
- Citations include source URLs

**User Rights:**
- Research can be cleared from cache
- Citations provide transparency
- Confidence scores indicate data quality

---

## 11. Integration Points

### 11.1 Frontend Integration

**File:** `App.tsx`

**Key Functions:**
- `handleTermsComplete()` - Triggers research
- `performBackgroundResearch()` - Executes research
- Research result stored in `researchResultRef.current`
- Displayed via research card in transcript

---

### 11.2 Backend Integration

**File:** `src/core/agents/lead-intelligence-agent.ts`

**Usage:**
- Called when user accepts terms
- Runs as background worker
- Results stored in session context
- Available to all agents via `intelligenceContext`

---

### 11.3 Admin Integration

**File:** `src/core/intelligence/admin-integration.ts`

**Usage:**
- Admin can trigger research for any lead
- Research results shown in admin dashboard
- Used for lead prioritization

---

## 12. Future Enhancements

### 12.1 URL Context Implementation

**Gap:** URL context research mentioned but not implemented

**Proposed Implementation:**
```typescript
async researchUrl(url: string): Promise<UrlContextResult> {
  const result = await this.genAI.models.generateContent({
    model: GEMINI_MODELS.DEFAULT_CHAT,
    contents: [{ 
      role: 'user', 
      parts: [{ 
        text: `Analyze this URL and extract key information: ${url}`,
        url: url  // Gemini can fetch and analyze URLs
      }] 
    }],
    config: {
      tools: [{ googleSearch: {} }]  // Can also search for related content
    }
  })
  
  // Extract structured data from URL content
  return parseUrlContext(result)
}
```

---

### 12.2 Enhanced Research Depth

**Current:** Basic company/person/strategic data

**Future:**
- Financial data (if public)
- Team structure (from LinkedIn)
- Technology stack (from job postings)
- Recent funding/news (deeper analysis)
- Industry benchmarks

---

### 12.3 Real-Time Updates

**Current:** Research cached for 24 hours

**Future:**
- Refresh research on demand
- Monitor for company news updates
- Track role changes (LinkedIn updates)
- Industry trend monitoring

---

## 13. Code Locations Reference

### Core Files:
- `src/core/agents/lead-intelligence-agent.ts` - Agent orchestrator
- `src/core/intelligence/lead-research.ts` - Research service
- `App.tsx` - Frontend integration
- `components/chat/ChatMessage.tsx` - Research card display

### Supporting Files:
- `src/core/context/unifiedContext.ts` - Context storage
- `src/core/prompts/personalization-builder.ts` - Context formatting
- `server/live-api/config-builder.ts` - Voice context injection

---

## 14. Testing

### Test Files:
- `services/__tests__/leadResearchService.test.ts` - Unit tests
- `services/__tests__/integration.test.ts` - Integration tests

### Test Coverage:
- ✅ Google Grounding Search integration
- ✅ JSON parsing and validation
- ✅ Citation extraction
- ✅ Caching behavior
- ⚠️ URL context (not implemented yet)

---

## Summary

**The Lead Intelligence Research Pipeline:**

1. **Triggers** when user accepts terms (email + name)
2. **Uses Google Grounding Search** to find public data (LinkedIn, company, news)
3. **Extracts structured data** (company, person, strategic insights)
4. **Caches results** (24-hour TTL, localStorage + server)
5. **Injects into context** (UnifiedContext, all services)
6. **Displays visually** (Research card in transcript)
7. **Personalizes conversation** (agents reference research data)

**Key Benefits:**
- Zero manual input required
- Real-time public data
- Personalized conversations from first message
- Transparent citations
- GDPR-compliant (public data only)

**Gaps:**
- URL context research not implemented (mentioned but missing)
- Could use `generateObject()` instead of regex JSON parsing (Gemini 3.0 supports structured output)

---

**End of Documentation**

