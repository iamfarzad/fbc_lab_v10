# Phase 2: Logic Consolidation - Lead Research

**Date:** 2025-12-01  
**Goal:** Establish a single source of truth for Lead Research at `src/core/intelligence/lead-research.ts` using the original Google Grounded Search implementation pattern.

## Current State Analysis

**Two implementations exist:**

1. `src/core/intelligence/lead-research.ts` (newer structure, but broken)
   - Server-side caching via `createCachedFunction` (currently stub)
   - Google Grounding Provider (currently stub - **NOT WORKING**)
   - No constructor API key needed (uses `createGoogleGenAI()`) ✅
   - Has `sessionId` parameter ✅
   - Better error handling structure ✅

2. `services/leadResearchService.ts` (older, but **WORKING**)
   - Client-side localStorage caching ✅
   - **Direct Google Grounding via `tools: [{ googleSearch: {} }]` in API call** ✅ (WORKING)
   - Extracts citations from `groundingMetadata.groundingChunks` ✅
   - Comprehensive prompt asking for LinkedIn, location, company details ✅
   - Requires API key in constructor ❌
   - No `sessionId` parameter ❌

**Key Finding:** The old version has the **working** Google Grounded Search implementation that we need to restore.

**Consumers:**
- `App.tsx` - uses `services/leadResearchService.ts` (needs update)
- `components/AdminDashboard.tsx` - uses `services/leadResearchService.ts` (needs update)
- `src/core/agents/lead-intelligence-agent.ts` - uses `src/core/intelligence/lead-research.ts` ✅
- `src/core/intelligence/admin-integration.ts` - uses `src/core/intelligence/lead-research.ts` ✅
- `services/__tests__/leadResearchService.test.ts` - tests old service (needs update)
- `services/__tests__/integration.test.ts` - uses old service (needs update)

## Implementation Plan

### Step 0: Research & Comparison

**0.1 Compare with original GitHub implementation**
- Review original implementation pattern from [FB-c_labV2 lead-research route](https://github.com/iamfarzad/FB-c_labV2/blob/main/app/api/mock/lead-research/route.ts)
- Understand expected data structure: companyInfo, keyPeople, recentNews, socialMedia, financials, insights, recommendations
- Note: Original uses mock API, but shows expected comprehensive research structure with LinkedIn, location, and public data

**0.2 Search branches for missed implementations**
- Check git branches for any lead research variations
- Search codebase for any other lead research implementations or patterns
- Look for any API routes or handlers related to lead research
- Check for any documentation about lead research architecture (`fbc_lead_setup.md` mentioned in old code)

**0.3 Document findings**
- Create comparison matrix: original vs old (`services/leadResearchService.ts`) vs new (`src/core/intelligence/lead-research.ts`) implementation
- Identify all features that need to be preserved
- List any missing functionality
- Note: Old version has working Google Grounded Search via `tools: [{ googleSearch: {} }]` that fetches real public data from Google Search, LinkedIn, and location

### Step 1: Restore Original Google Grounded Search Implementation

**1.1 Replace stub with direct API call (restore working pattern)**
- Remove dependency on `GoogleGroundingProvider` stub (currently non-functional)
- Implement direct API call using `this.genAI.models.generateContent()` with `tools: [{ googleSearch: {} }]` (restore from `services/leadResearchService.ts`)
- This enables real Google Grounded Search to fetch public data from Google Search, LinkedIn, and location

**1.2 Restore comprehensive research prompt**
- Use original prompt from `services/leadResearchService.ts` that requests:
  - Company: Industry, Size, Summary, Country, LinkedIn, Website
  - Person: Role, seniority, LinkedIn profile URL
  - Strategic: Recent news, competitors, pain points
  - Location data (if available)
- Ensure prompt explicitly asks for LinkedIn profiles and location information

**1.3 Restore citation extraction**
- Extract from `response.candidates?.[0]?.groundingMetadata?.groundingChunks`
- Map to: `{ uri, title, description }` format
- Filter empty URIs

**1.4 Enhance JSON parsing**
- Keep robust parsing from old version (handles markdown code blocks: ````json`, ````)
- Handle edge cases gracefully

**1.5 Ensure type compatibility**
- Verify `ResearchResult` matches `types.ts` (including optional `strategic` field)
- Ensure `CompanyContext` includes `country` field (from old version)
- Export or re-export types appropriately

**1.6 Implement hybrid caching**
- Keep server-side caching via `createCachedFunction` (even if stub)
- Add client-side localStorage fallback for browser: `lead_research_${email}_${name || ''}`
- Match old version cache key format

**1.7 Improve fallback handling**
- Handle all edge cases from old version
- Maintain known profile fallback for `farzad@talktoeve.com`
- Return proper structure on errors

**1.8 Make `sessionId` optional**
- Signature: `researchLead(email: string, name?: string, companyUrl?: string, sessionId?: string)`
- Ensure backward compatibility

### Step 2: Update Consumers

**2.1 Update `App.tsx`**
- Change import: `import { LeadResearchService } from 'src/core/intelligence/lead-research'`
- Remove API key from constructor: `new LeadResearchService()` (no args)
- Update line 186 where service is instantiated

**2.2 Update `components/AdminDashboard.tsx`**
- Change import: `import { LeadResearchService } from 'src/core/intelligence/lead-research'`
- Update type reference if needed
- Remove API key from constructor calls

**2.3 Update `services/__tests__/leadResearchService.test.ts`**
- Change import: `import { LeadResearchService } from 'src/core/intelligence/lead-research'`
- Update constructor calls: `new LeadResearchService()` (no API key)
- Update mocks to match new implementation (no API key in constructor)
- Update cache tests to match new caching mechanism (or remove if using stub)

**2.4 Update `services/__tests__/integration.test.ts`**
- Change import: `import { LeadResearchService } from 'src/core/intelligence/lead-research'`
- Update constructor calls: `new LeadResearchService()` (no API key)
- Update lines 273, 292

### Step 3: Delete Duplicate

**3.1 Delete `services/leadResearchService.ts`**
- Remove file after all consumers are updated
- Verify no other files reference it

### Step 4: Verification

**4.1 Run type check**
- `pnpm type-check` - ensure no type errors

**4.2 Run tests**
- `pnpm test` - ensure all tests pass, especially lead research tests

**4.3 Verify imports**
- `grep -r "leadResearchService"` - ensure no remaining references to old file
- `grep -r "services/leadResearchService"` - ensure no old import paths

**4.4 Check build**
- `pnpm build` - ensure build succeeds

## Files to Modify

1. `src/core/intelligence/lead-research.ts` - Restore working Google Grounded Search implementation
2. `App.tsx` - Update import and usage
3. `components/AdminDashboard.tsx` - Update import and usage
4. `services/__tests__/leadResearchService.test.ts` - Update tests
5. `services/__tests__/integration.test.ts` - Update tests
6. `services/leadResearchService.ts` - DELETE

## Key Considerations

- **Google Grounding**: The old version uses direct API call with `tools: [{ googleSearch: {} }]` which actually works. The new version uses `GoogleGroundingProvider` which is a stub. We must restore the direct API call approach to maintain functionality.

- **Caching**: Old version uses localStorage (client-side). New version uses server-side cache (stub). We'll implement hybrid caching: server-side cache (even if stub) + localStorage fallback for browser contexts.

- **Constructor**: New version doesn't require API key (uses `createGoogleGenAI()`), which is better. All consumers need to be updated to remove API key parameter.

- **Type Compatibility**: Ensure `ResearchResult` interface in `src/core/intelligence/lead-research.ts` matches `types.ts` or re-exports from `types.ts`.

- **Original Pattern**: The original GitHub implementation shows expected comprehensive research structure. We should ensure our implementation can produce similar rich data (companyInfo, keyPeople, recentNews, socialMedia, financials, insights, recommendations).

