# V8 vs V10 Comparison Report

**Date:** 2025-12-01  
**Purpose:** Identify missing files from v8 that should be in v10

## Summary Statistics

- **V8 total files:** 548 TypeScript/JavaScript files
- **V10 total files:** 224 TypeScript/JavaScript files
- **Missing from V10:** 52 files in `src/core/` directory

---

## Missing Context Files (4 files)

### 1. `src/core/context/capabilities.ts` ⚠️ **USED**
- **Purpose:** Records capability usage for analytics
- **Functions:**
  - `recordCapabilityUsed()` - Tracks when capabilities are first used
  - `getCapabilitiesUsed()` - Retrieves capabilities for a session
- **Status:** Not directly imported, but may be used for analytics
- **Priority:** Medium (analytics feature)

### 2. `src/core/context/context-schema.ts` ⚠️ **USED IN V8**
- **Purpose:** Zod schemas for context validation
- **Exports:**
  - `ConsentInput`, `SessionInitInput` schemas
  - `CompanySchema`, `PersonSchema` schemas
  - `ContextSnapshotSchema` - Full context snapshot validation
- **Used by:** `context-manager.ts` in v8 (imports `CompanySchema`, `PersonSchema`, `ContextSnapshotSchema`)
- **Status:** v10's `context-manager.ts` doesn't use it (may need validation)
- **Priority:** High (validation schemas)

### 3. `src/core/context/__tests__/flow-sync-integration.test.ts`
- **Purpose:** Integration tests for flow-sync
- **Priority:** Low (test file)

### 4. `src/core/context/__tests__/flow-sync.test.ts`
- **Purpose:** Unit tests for flow-sync
- **Priority:** Low (test file)

---

## Missing Core Files (48 files)

### Intelligence System (11 files)
1. `src/core/intelligence/admin-integration.ts` - Admin intelligence features
2. `src/core/intelligence/advanced-intent-classifier.ts` - Advanced intent detection
3. `src/core/intelligence/capability-map.ts` - Capability mapping
4. `src/core/intelligence/capability-registry.ts` - Capability registry
5. `src/core/intelligence/index.ts` - Intelligence module exports
6. `src/core/intelligence/intent-detector.ts` - Intent detection
7. `src/core/intelligence/providers/enrich/company-normalizer.ts` - Company data normalization
8. `src/core/intelligence/providers/enrich/person-normalizer.ts` - Person data normalization
9. `src/core/intelligence/providers/perplexity.ts` - Perplexity AI provider
10. `src/core/intelligence/role-detector.ts` - Role detection
11. `src/core/intelligence/scoring.ts` - Lead scoring
12. `src/core/intelligence/tool-suggestion-engine.ts` - Tool suggestions

**Status:** v10 has basic intelligence (`lead-research.ts`, `google-grounding.ts`), but missing advanced features

### PDF System (13 files)
1. `src/core/pdf/generator.ts` - PDF generator
2. `src/core/pdf/renderers/chart-renderer.ts` - Chart rendering
3. `src/core/pdf/renderers/pdf-lib-renderer.ts` - PDF-lib renderer
4. `src/core/pdf/renderers/puppeteer-renderer.ts` - Puppeteer renderer
5. `src/core/pdf/templates/base-template.ts` - Base PDF template
6. `src/core/pdf/templates/proposal-template.ts` - Proposal template
7. `src/core/pdf/templates/summary-template.ts` - Summary template
8. `src/core/pdf/utils/constants.ts` - PDF constants
9. `src/core/pdf/utils/conversation.ts` - Conversation utilities
10. `src/core/pdf/utils/formatting.ts` - Formatting utilities
11. `src/core/pdf/utils/insights.ts` - Insights utilities
12. `src/core/pdf/utils/paths.ts` - Path utilities
13. `src/core/pdf/utils/types.ts` - PDF types
14. `src/core/pdf/utils/validation.ts` - PDF validation
15. `src/core/pdf-design-tokens.ts` - Design tokens

**Status:** v10 has `pdf-generator-puppeteer.ts` and `pdf-roi-charts.ts`, but missing full PDF system

### Chat System (2 files)
1. `src/core/chat/state/unified-chat-store.ts` - Unified chat state store
2. `src/core/chat/unified-types.ts` - Unified chat types

**Status:** v10 has `conversation-phrases.ts`, but missing unified chat store

### Other Core Files (22 files)
1. `src/core/agents/__tests__/preprocess-intent.spec.ts` - Test file
2. `src/core/api/error-handler.ts` - API error handling
3. `src/core/auth.ts` - Authentication (v10 has `src/core/security/auth.ts`)
4. `src/core/db/conversations.ts` - Database conversations
5. `src/core/demo-budget-manager.ts` - Demo budget manager
6. `src/core/gemini-config-enhanced.ts` - Enhanced Gemini config
7. `src/core/live/__tests__/client.spec.ts` - Test file
8. `src/core/mock-control.ts` - Mock control
9. `src/core/model-selector.ts` - Model selection
10. `src/core/models.ts` - Model definitions
11. `src/core/services/tool-service.ts` - Tool service
12. `src/core/supabase/server.ts` - Supabase server client
13. `src/core/types/conversations.ts` - Conversation types
14. `src/core/types/index.ts` - Type exports
15. `src/core/types/intelligence.ts` - Intelligence types
16. `src/core/types/json-guards.ts` - JSON guards (v10 has `src/types/json-guards.ts`)
17. `src/core/validation/admin.ts` - Admin validation
18. `src/core/validation/index.ts` - Validation exports
19. `src/core/workflows/finalizeLeadSession.ts` - Lead session finalization

---

## Critical Missing Files (High Priority)

### 1. `context-schema.ts` ⚠️ **HIGH PRIORITY**
- **Why:** Used by `context-manager.ts` in v8 for validation
- **Impact:** Context validation may be missing
- **Action:** Import and update `context-manager.ts` to use schemas

### 2. Intelligence System Files
- **Why:** Advanced intelligence features (intent detection, role detection, scoring)
- **Impact:** Missing advanced lead intelligence capabilities
- **Action:** Review and import if needed for production

### 3. PDF System Files
- **Why:** Full PDF generation system with templates
- **Impact:** Limited PDF generation capabilities
- **Action:** Review if full PDF system is needed

### 4. Unified Chat Store
- **Why:** State management for chat
- **Impact:** May affect chat state management
- **Action:** Check if v10 uses different state management

---

## Recommendations

### Immediate Actions
1. **Import `context-schema.ts`** - Needed for context validation
2. **Review intelligence files** - Determine if advanced features are needed
3. **Review PDF system** - Check if full PDF system is required

### Optional Actions
4. Import test files if test coverage is important
5. Review other missing files case-by-case

---

## Next Steps

1. Import `context-schema.ts` and update `context-manager.ts`
2. Review intelligence system files for production needs
3. Review PDF system files for production needs
4. Document decisions on what to import vs. skip

