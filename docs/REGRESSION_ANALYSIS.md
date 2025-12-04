# Comprehensive Regression Analysis: v10 vs Previous Versions

## Summary

This document tracks features from v5-v9 that need to be restored or verified in v10, based on user feedback and codebase analysis.

---

## FIXED ISSUES (This Session)

### 1. Location Sharing ✅ FIXED

**Issue:** Location was captured but never shared between text chat and voice sessions.

**Fix Applied:**
- Added `metadata` field to `ContextUpdatePayload` with location support
- Server extracts location from context updates in `handleContextUpdate()`
- Location injected into Live API system instruction via `buildLiveConfig()`
- Location passed from client to server in START payload

**Files Changed:**
- `server/message-payload-types.ts`
- `server/handlers/context-update-handler.ts`
- `server/live-api/config-builder.ts`
- `server/handlers/start-handler.ts`
- `services/geminiLiveService.ts`
- `src/core/live/client.ts`

### 2. Research Context Flattening ✅ FIXED

**Issue:** Research data was nested under `research` key, but agents expected `intelligenceContext.company.name` directly.

**Fix Applied:**
- Flattened research data in `App.tsx` so agents can access:
  - `intelligenceContext.company.name`
  - `intelligenceContext.person.role`
  - `intelligenceContext.strategic`

**Files Changed:**
- `App.tsx` (4 locations updated)

### 3. PDF Download & Email ✅ FIXED

**Issue:** PDF could only be downloaded, no email option.

**Fix Applied:**
- Added dropdown menu with "Download PDF" and "Email PDF" options
- Updated API endpoint to accept PDF data from client
- Added quotation/offer section to PDF generation

**Files Changed:**
- `components/MultimodalChat.tsx`
- `api/send-pdf-summary/route.ts`
- `utils/pdfUtils.ts`

### 4. Calendar Link Placeholder ✅ FIXED

**Issue:** Discovery agent returned placeholder text instead of real calendar link.

**Fix Applied:**
- Added `CALENDAR_CONFIG` to constants
- Updated discovery agent to include real Calendly link

**Files Changed:**
- `src/config/constants.ts`
- `src/core/agents/discovery-agent.ts`

### 5. Temperature Unit ✅ FIXED

**Issue:** Weather reported in Fahrenheit instead of Celsius.

**Fix Applied:**
- Updated `get_weather` tool to request Celsius explicitly
- Added Celsius instruction to tool descriptions

**Files Changed:**
- `src/core/tools/unified-tool-registry.ts`
- `src/config/live-tools.ts`

### 6. Language Switching Bug ✅ FIXED

**Issue:** AI would switch languages based on a few words in another language.

**Fix Applied:**
- Added language rules to discovery agent system prompt
- Added language guidance to voice config-builder

**Files Changed:**
- `src/core/agents/discovery-agent.ts`
- `server/live-api/config-builder.ts`

### 7. Generic Responses ✅ FIXED

**Issue:** Agent gave generic responses instead of using research context.

**Fix Applied:**
- Added "CRITICAL PERSONALIZATION RULES" to discovery agent
- Made system prompt emphasize using company name and person role

**Files Changed:**
- `src/core/agents/discovery-agent.ts`

### 8. New Tools Added ✅ ADDED

**New Features:**
- `search_companies_by_location` tool for location-based company search
- Location data in personalization builder

**Files Changed:**
- `src/core/tools/unified-tool-registry.ts`
- `src/config/live-tools.ts`
- `server/live-api/tool-processor.ts`
- `src/core/prompts/personalization-builder.ts`

---

## KNOWN ISSUES (From V10_REGRESSION_ANALYSIS.md)

### 1. Funnel Routing Collapsed ⚠️ NEEDS WORK

**Issue:** v10 only routes 7 stages, but UI expects more.

**Current Status:** Not fixed - requires careful analysis of which stages are needed.

**Missing Stages (UI expects but never appear):**
- `SCORING`
- `WORKSHOP_PITCH`
- `CONSULTING_PITCH`
- `PROPOSAL`
- `RETARGETING`
- `BOOKING_REQUESTED`

### 2. Intent Detection Unwired ⚠️ PARTIALLY FIXED

**Issue:** `preProcessIntent()` exists but wasn't called.

**Current Status:** BOOKING and WRAP_UP intents now handled via `detectExitIntent()` in discovery agent.

### 3. Multimodal Context Handling ⚠️ NEEDS WORK

**Issue:** Context not merged when provided, no archiving on conversation_end.

**Current Status:** Not fully fixed - requires orchestrator changes.

### 4. Usage Limits Removed ⚠️ NEEDS WORK

**Issue:** No quota enforcement, no agent result persistence.

**Current Status:** Not fixed - infrastructure exists but not called.

### 5. Streaming Dropped ⚠️ NEEDS WORK

**Issue:** No SSE streaming in `/api/chat` endpoint.

**Current Status:** Not fixed - requires API refactoring.

---

## FEATURE COMPARISON: v5-v9 vs v10

### From FBC_masterV5 (v5)
| Feature | Status in v10 |
|---------|---------------|
| Basic chat functionality | ✅ Present |
| Lead research | ✅ Present |
| PDF generation | ✅ Present + Enhanced |

### From fbc-lab-v7 (v7)
| Feature | Status in v10 |
|---------|---------------|
| Agent orchestration | ✅ Present |
| Funnel stages | ⚠️ Simplified |
| Tool calling | ✅ Present + Enhanced |

### From fbc-lab-v8 (v8)
| Feature | Status in v10 |
|---------|---------------|
| Voice integration | ✅ Present |
| WebSocket server | ✅ Present |
| Context persistence | ⚠️ Needs verification |

### From FBC_Lab_9 (v9)
| Feature | Status in v10 |
|---------|---------------|
| Full funnel routing | ❌ Collapsed |
| Intent pre-processing | ⚠️ Partially restored |
| Context merging | ❌ Not implemented |
| Usage limits | ❌ Not called |
| Streaming | ❌ Removed |
| Agent persistence | ❌ Not called |

---

## RECOMMENDATIONS

### Priority 1 (Critical)
1. Verify location sharing works end-to-end (test needed)
2. Verify PDF email functionality (test needed)
3. Monitor for quota errors with `gemini-2.5-flash`

### Priority 2 (High)
1. Restore multimodal context merging
2. Add streaming to `/api/chat` endpoint
3. Call `persistAgentResult()` after agent execution

### Priority 3 (Medium)
1. Evaluate need for SCORING, WORKSHOP_PITCH, etc. stages
2. Restore usage limits if needed
3. Ensure workers are properly initialized

### Priority 4 (Low)
1. Update UI stage mappings to match v10 stages
2. Add more comprehensive error handling
3. Improve logging for debugging

---

## TESTING CHECKLIST

- [ ] Location shared from text chat to voice session
- [ ] Location appears in voice system prompt
- [ ] Research context flattened and accessible to agents
- [ ] Location-based company search works
- [ ] PDF download works
- [ ] PDF email works
- [ ] PDF includes quotation section
- [ ] Weather displays in Celsius
- [ ] Calendar link is real (not placeholder)
- [ ] Language stays consistent
- [ ] Responses are personalized (not generic)

---

**Last Updated:** 2025-12-04
**Status:** In Progress

