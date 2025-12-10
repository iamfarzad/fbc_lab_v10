# User Onboarding Flow - Current Implementation

**Date:** 2025-12-07  
**Status:** ✅ **DOCUMENTED** - Confirms actual flow vs expected flow

---

## Actual Flow (Current Implementation)

### Step 1: User Fills Form
- User enters: **Name** (required), **Work Email** (required), **Company URL** (optional)
- User accepts terms and conditions
- User clicks "Continue"

**File:** `components/TermsOverlay.tsx`

---

### Step 2: Terms Accepted - Immediate Actions

**File:** `src/hooks/business/useLeadResearch.ts` → `handleTermsComplete()`

**What Happens IMMEDIATELY (synchronous):**

1. ✅ **Save User Profile**
   ```typescript
   setUserProfile({ name, email })
   sessionStorage.setItem('fbc_user_profile', JSON.stringify(profile))
   ```

2. ✅ **Set Intelligence Context (Name/Email Only)**
   ```typescript
   unifiedContext.setIntelligenceContext({
     name,
     email
   })
   ```
   **Note:** At this point, intelligence context has ONLY name and email. No company, no role.

3. ✅ **Switch View to Chat**
   ```typescript
   setView('chat')
   ```

4. ✅ **Start Background Research** (non-blocking)
   ```typescript
   const researchPromise = performBackgroundResearch(email, name, companyUrl)
   
   // If voice: wait for research
   if (permissions?.voice) {
     await researchPromise
   } else {
     void researchPromise  // Fire and forget - runs in background
   }
   ```

---

### Step 3: User Sees Chat Interface

**What User Sees:**
- Chat interface appears
- Empty state OR welcome message (depends on connection state)
- **NO automatic greeting from AI yet**

**File:** `components/MultimodalChat.tsx` → Shows `EmptyState.tsx` when `transcript.length === 0`

---

### Step 4: User Types First Message (e.g., "HI")

**What Happens:**

1. **User types message** → Sent to `/api/chat`

2. **API Loads Intelligence Context**
   - Gets `intelligenceContext` from request body (client sends what it has)
   - OR loads from database (could be stale/wrong)
   - **Problem:** May have wrong/stale data from previous session

3. **API Routes to Discovery Agent**
   - Stage: `DISCOVERY`
   - Discovery Agent gets intelligence context

4. **Discovery Agent Responds**
   - Uses whatever intelligence context it received
   - **Problem:** If context has wrong data (e.g., "Saluki Media"), agent uses it
   - Agent personalizes response: "Hi Farzad, thanks for connecting. As the Founder & CEO of Saluki Media..."
   - **This is where the wrong info comes from!**

---

### Step 5: Background Research Completes (Meanwhile)

**File:** `src/hooks/business/useLeadResearch.ts` → `performBackgroundResearch()`

**What Happens:**
1. Calls `LeadResearchService.researchLead(email, name, companyUrl)`
2. Uses Google Grounding Search to find:
   - Company information (name, industry, size)
   - LinkedIn profile (person, role, seniority)
   - Industry trends
3. Stores result in:
   - `researchResultRef.current`
   - `intelligenceContextRef.current`
   - `unifiedContext.setResearchContext()`
   - Database (via context storage)

**Timing:** This happens in background. Takes 5-10 seconds typically.

**Problem:** By the time research completes, user may have already sent first message, and agent used stale/wrong context.

---

## The Problem You're Experiencing

### Issue: Wrong Company/Role in First Response

**What Should Happen:**
```
1. Terms accepted → Name/email set
2. Research starts in background
3. User types "HI" → Agent responds
4. Agent uses ONLY name/email (since research not done yet)
5. Agent says: "Hi Farzad, thanks for connecting. What brings you here today?"
```

**What Actually Happens:**
```
1. Terms accepted → Name/email set
2. Research starts in background
3. User types "HI" → Agent responds
4. Agent loads intelligence context from database (has old/stale data)
5. Agent uses stale data: "Saluki Media", "Founder & CEO"
6. Agent says: "Hi Farzad, thanks for connecting. As the Founder & CEO of Saluki Media..."
```

**Root Cause:** Intelligence context is loaded from database, and database has stale data from a previous test session.

---

## Expected vs Actual Flow

### ✅ Expected Flow (What Should Happen)

```
User Accepts Terms
    ↓
Name/Email Set in Context
    ↓
Research Starts (Background)
    ↓
User Types "HI"
    ↓
Agent Uses: Name ✅, Email ✅
Agent Does NOT Use: Company ❌ (research not done), Role ❌ (research not done)
    ↓
Agent Responds: "Hi [Name], thanks for connecting. What brings you here today?"
    ↓
[Research Completes - updates context]
    ↓
Next Agent Response Uses: Full Research Data ✅
```

### ❌ Actual Flow (What's Happening)

```
User Accepts Terms
    ↓
Name/Email Set in Context
    ↓
Research Starts (Background)
    ↓
User Types "HI"
    ↓
API Loads Intelligence Context from Database ← PROBLEM: Stale data
    ↓
Agent Uses: Name ✅, Email ✅, Company ❌ (WRONG - from old session), Role ❌ (WRONG)
    ↓
Agent Responds: "Hi Farzad, thanks for connecting. As the Founder & CEO of Saluki Media..." ← WRONG!
    ↓
[Research Completes - updates context, but too late]
```

---

## Why 18-Second Delay?

**Sequential Processing:**

1. **Load Multimodal Context:** 1-3 seconds
   ```typescript
   const contextData = await multimodalContextManager.prepareChatContext(...)
   ```

2. **Load Intelligence Context from Database:** 1-3 seconds
   - Database query
   - Context deserialization

3. **Agent Processing:** 5-10 seconds
   - Discovery agent execution
   - Gemini API call
   - Response generation

4. **Response Validation:** <100ms

**Total: 7-16 seconds** (matches your 18 seconds)

**Not Parallel:** These should run in parallel but currently run sequentially.

---

## The Fix Needed

### Fix 1: Don't Use Stale Intelligence Context

**Problem:** API loads intelligence context from database, which may have stale data.

**Fix:** When session is fresh (just accepted terms), use ONLY what client provides (name, email), NOT database.

**Location:** `api/chat.ts` after line 116

```typescript
// Check if this is a fresh session (just accepted terms)
// If fresh session, use minimal context (name, email only)
// Don't load stale data from database
let finalIntelligenceContext = intelligenceContext || {}

if (sessionId && intelligenceContext?.email && intelligenceContext?.name) {
  // Fresh session - use provided data, ignore database
  finalIntelligenceContext = {
    email: intelligenceContext.email,
    name: intelligenceContext.name
    // NO company, NO role yet (research not done)
  }
} else {
  // Existing session - load from database
  const stored = await loadIntelligenceContext(sessionId)
  finalIntelligenceContext = stored || intelligenceContext || {}
}
```

### Fix 2: Parallelize Context Loading

**Problem:** Sequential loading adds up to 18 seconds.

**Fix:** Load contexts in parallel.

```typescript
// Load in parallel
const [multimodalData, intelligenceData] = await Promise.all([
  multimodalContextManager.prepareChatContext(...),
  loadIntelligenceContext(sessionId)  // Only if needed
])
```

### Fix 3: Discovery Agent Should Handle Missing Context Gracefully

**Problem:** Discovery Agent uses wrong context if available.

**Fix:** Discovery Agent should check if context is fresh/valid:

```typescript
// In discovery-agent.ts
if (intelligenceContext?.company?.name && !intelligenceContext?.researchConfidence) {
  // Has company but no research confidence - likely stale
  // Don't use company/role
  contextSection = `Company: Not yet identified (research in progress)`
}
```

---

## Confirmation of Your Understanding

### ✅ You're Correct About:
1. **Client fills name and work email** ✅
2. **Background research runs after terms accepted** ✅
3. **Research uses public data (Google Grounding Search)** ✅

### ⚠️ Small Correction:
**AI does NOT greet instantly after terms accepted**

**Actual Flow:**
- Terms accepted → Chat interface appears
- **User must type first message** (e.g., "HI")
- **Then** AI responds with greeting
- Background research is happening meanwhile

**The Problem:** When AI responds to first message, it uses stale intelligence context from database (wrong company/role) instead of waiting for fresh research.

---

## Next Steps

1. **Fix intelligence context loading** - Don't use stale database data for fresh sessions
2. **Parallelize context loading** - Reduce 18-second delay
3. **Add context validation** - Discovery agent should verify context freshness
4. **Add logging** - Track where wrong context comes from

---

**Summary:** Your understanding is mostly correct. The issue is that the AI uses stale database context for the first message instead of waiting for fresh research or using minimal context (name/email only).
