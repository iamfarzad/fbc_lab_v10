# Code Changes Comparison

**Comparing:** `HEAD` (current main) vs `wip/debug-button-issue-20251210`

**Note:** Documentation files excluded. User reverted to Gemini 2.5, so Gemini 3 migration changes should be ignored.

---

## 1. `src/hooks/media/useGeminiLive.ts` (~188 lines changed) ⚠️ HIGH RISK

### Key Changes:
- **Moved service creation from `handleConnect` callback to `useEffect`**
- **Added `serviceDependencyKey`** to track when service should be recreated
- **Removed async geolocation** (now uses empty string default)
- **Added extensive debug logging**
- **Changed system instruction** (Gemini 3 multimodal best practices)

### The Problem:
```typescript
useEffect(() => {
  // Service creation logic
  return () => {
    void liveServiceRef.current.disconnect();
  };
}, [serviceDependencyKey, connectionState, ...many callbacks]); // ⚠️ connectionState here!
```

**Issue:** `connectionState` in dependency array can cause infinite loop:
1. Service creation → state change
2. State change → useEffect triggers
3. useEffect → recreates service
4. Loop continues

### What's Good:
- Service lifecycle management is cleaner
- Dependency tracking prevents unnecessary recreations
- Removed blocking geolocation

### What's Bad:
- `connectionState` in deps = infinite loop risk
- Many callbacks in deps = frequent recreations
- System instruction changes tied to Gemini 3 (which was reverted)

### Recommendation:
**DO NOT MERGE AS-IS.** Refactor:
- Remove `connectionState` from dependencies
- Use refs for stable callbacks
- Only recreate when model/user/API key actually changes

---

## 2. `src/hooks/business/useLeadResearch.ts` (~83 lines changed) ⚠️ MEDIUM-HIGH RISK

### Key Changes:
1. **Auto-show form for `/chat` navigation** (new useEffect)
2. **Immediate context setting** (moved before research)
3. **Non-blocking research** (voice connects immediately)
4. **Better logging**

### Changes Breakdown:

#### Auto-show form:
```typescript
useEffect(() => {
  const isChatView = window.location.pathname === '/chat';
  if (isChatView && !userProfile && !showTerms) {
    setShowTerms(true);
  }
}, [userProfile, showTerms]);
```
**Risk:** ⚠️ Could cause render loops if `showTerms` state changes trigger this

#### Immediate context setting:
```typescript
// OLD: Context set after research
// NEW: Context set immediately in handleTermsComplete
unifiedContext.setIntelligenceContext(updatedIntelligence);
```
**Risk:** ✅ Probably safe - just timing change

#### Non-blocking research:
- Research now runs in background
- Voice connection doesn't wait for research
**Risk:** ⚠️ Could cause issues if voice needs research context immediately

### Recommendation:
**TEST INDIVIDUALLY:**
- Auto-show form: Probably safe, but test for loops
- Immediate context: Safe
- Non-blocking research: Good change, but verify voice works without research

---

## 3. `src/config/constants.ts` (~21 lines changed) ❌ SKIP

### Changes:
- All defaults changed from `gemini-2.5-flash` to `gemini-3-pro-preview`
- Admin email changed

### Recommendation:
**SKIP** - User reverted to Gemini 2.5, so these changes are not needed.

**Exception:** Admin email change could be cherry-picked separately if desired.

---

## 4. `server/live-api/config-builder.ts` (~73 lines changed) ⚠️ MEDIUM RISK

### Key Changes:
1. **Separated instruction building** (`baseRoleDefinition`, `anchoredInstructions`, `contextBlock`)
2. **Added multimodal coherence instructions** (Gemini 3 best practices)
3. **Added context usage rules** (don't assume user info)
4. **Better URL analysis guidance**

### What's Good:
- Clearer instruction structure
- Context usage rules prevent assumptions
- Multimodal guidance is helpful

### What's Risky:
- Multimodal instructions reference Gemini 3 (but should work with 2.5)
- Instruction changes could affect AI behavior

### Recommendation:
**REVIEW & TEST** - These are server-side only, so less risky than client hooks. Test voice/webcam behavior after merge.

---

## 5. `server/live-api/session-manager.ts` (~20 lines changed) ⚠️ MEDIUM RISK

### Key Changes:
1. **Added `apiVersion: 'v1beta'`** to all `GoogleGenAI` constructors
2. **Changed `getLiveApiModel()`** to use `AUDIO_2025_09` instead of `DEFAULT_VOICE`
3. **Relaxed model validation** (allows flash/pro/exp models)

### What's Good:
- Explicit API version (good practice)
- Uses correct audio model (not Gemini 3)
- More flexible model selection

### What's Risky:
- API version change could affect behavior
- Model selection logic changed

### Recommendation:
**REVIEW & TEST** - Should work, but test Live API connection after merge.

---

## 6. `services/geminiLiveService.ts` (~53 lines changed) ✅ LOW RISK

### Key Changes:
1. **Extensive debug logging** (now suppressed by logger fix)
2. **Better context priority logic** (research context for name, intelligence for email)
3. **Safety checks for audio analysers** (check if function exists)

### What's Good:
- Better context handling
- Safety checks prevent errors
- Logging is now suppressed anyway

### Recommendation:
**MERGE** - Low risk, mostly logging and safety improvements.

---

## Summary Table

| File | Lines | Risk | Action | Notes |
|------|-------|------|--------|-------|
| `useGeminiLive.ts` | ~188 | 🔴 HIGH | **REFACTOR** | Remove `connectionState` from deps |
| `useLeadResearch.ts` | ~83 | ⚠️ MEDIUM-HIGH | **TEST** | Test each change individually |
| `constants.ts` | ~21 | ❌ SKIP | **IGNORE** | Gemini 3 migration (reverted) |
| `config-builder.ts` | ~73 | ⚠️ MEDIUM | **REVIEW** | Server-side, test behavior |
| `session-manager.ts` | ~20 | ⚠️ MEDIUM | **REVIEW** | API version + model selection |
| `geminiLiveService.ts` | ~53 | ✅ LOW | **MERGE** | Mostly logging + safety |

---

## Recommended Merge Order

1. ✅ **`geminiLiveService.ts`** - Merge now (low risk)
2. ⚠️ **`session-manager.ts`** - Review & test Live API connection
3. ⚠️ **`config-builder.ts`** - Review & test voice/webcam behavior
4. ⚠️ **`useLeadResearch.ts`** - Test each change individually
5. 🔴 **`useGeminiLive.ts`** - Refactor first (remove `connectionState` from deps)
6. ❌ **`constants.ts`** - Skip (Gemini 3 migration reverted)

---

## Critical Issue: useGeminiLive.ts

The main freeze risk is the `useEffect` dependency array including `connectionState`. This creates a potential infinite loop:

```
Service created → connectionState changes → useEffect triggers → 
Service recreated → connectionState changes → ...
```

**Fix needed:**
- Remove `connectionState` from dependencies
- Use refs for callbacks that shouldn't trigger recreation
- Only recreate when truly essential (model, user, API key)
