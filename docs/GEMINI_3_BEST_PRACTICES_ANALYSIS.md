# Gemini 3 Pro Best Practices Analysis & Implementation Plan

**Date:** 2025-01-XX  
**Source:** Patrick Loeber's recommendations (Google DeepMind Developer Experience Engineer)  
**Reference:** [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)

---

## Executive Summary

This document analyzes our current Gemini 3 Pro implementation against best practices recommended by Patrick Loeber and identifies specific changes needed to optimize performance, reduce token costs, and improve output quality.

**Key Findings:**
- ✅ We're using `temperature: 1.0` for high-thinking tasks (correct)
- ⚠️ Instructions are placed at the **beginning** of prompts (should be at end)
- ⚠️ Temperature defaults to `0.7` in most places (should default to `1.0`)
- ⚠️ `thinking_level` parameter not explicitly set (should use "high" for complex tasks)
- ⚠️ `media_resolution` not configured for multimodal inputs
- ⚠️ No `thought_signatures` implementation for preserving reasoning across turns
- ⚠️ Multimodal inputs may be processed separately instead of unified stream

---

## 1. Temperature Configuration

### Current Implementation

**Files Analyzed:**
- `src/lib/gemini-safe.ts` - Defaults to `0.7`
- `services/standardChatService.ts` - Uses `0.7`
- `src/core/agents/discovery-agent.ts` - Uses `1.0` only when `thinkingLevel === 'high'`
- `src/core/agents/summary-agent.ts` - Uses `1.0` ✅
- `src/core/agents/admin-agent.ts` - Uses `1.0` ✅

**Current Pattern:**
```typescript
// Most places default to 0.7
temperature: 0.7

// Only discovery agent conditionally uses 1.0
temperature: context.thinkingLevel === 'high' ? 1.0 : 0.7
```

### Best Practice (Loeber)

> **Keep temperature at 1.0 (the model's optimized default)** to avoid over-tuning that could cause loops or degrade performance on nuanced queries.

### Recommended Changes

1. **Update default temperature to 1.0** in:
   - `src/lib/gemini-safe.ts` (line 12)
   - `services/standardChatService.ts` (line 193)
   - `src/config/constants.ts` - `GEMINI_CONFIG.DEFAULT_TEMPERATURE` (line 404)

2. **Remove conditional temperature logic** - Always use `1.0` unless testing determinism:
   - `src/core/agents/discovery-agent.ts` (lines 285, 342)

3. **Update documentation** to reflect `1.0` as the standard default

**Impact:** Better output quality, fewer loops, more reliable nuanced responses

---

## 2. Thinking Level Configuration

### Current Implementation

**Files Analyzed:**
- `src/config/constants.ts` - Defines `THINKING_LEVELS` constant (lines 221-224)
- `src/core/agents/types.ts` - Defines `thinkingLevel` in `AgentContext` (line 12)
- `services/standardChatService.ts` - Uses `thinkingConfig` with `thinkingBudget` (lines 196-198)
- **No explicit `thinking_level` parameter in API calls**

**Current Pattern:**
```typescript
// Only in standardChatService.ts for non-flash models
thinkingConfig: activeModel.includes('flash') ? undefined : {
  thinkingBudget: 16384
}
```

**Issue:** We're using `thinkingConfig.thinkingBudget` but not the `thinking_level` parameter that Gemini 3 Pro supports.

### Best Practice (Loeber)

> Use `thinking_level: "high"` for complex reasoning tasks. This leverages Gemini 3's default dynamic reasoning capabilities.

### Recommended Changes

1. **Add `thinking_level` parameter** to API calls:
   - Update `src/lib/ai-client.ts` to support `thinking_level` in model settings
   - Add `thinking_level: "high"` for complex tasks (discovery, admin, summary agents)
   - Use `thinking_level: "low"` for simple tasks (quick actions, proofreading)

2. **Update agent calls** to explicitly set thinking level:
   ```typescript
   // For complex reasoning tasks
   await streamText({
     model: google(GEMINI_MODELS.DEFAULT_CHAT),
     system: systemPrompt,
     messages: formatMessagesForAI(messages),
     temperature: 1.0,
     experimental_attachments: [], // if using Vercel AI SDK
     // Add thinking_level via model settings
   })
   ```

3. **Check Vercel AI SDK support** - May need to pass via `experimental_*` or model-specific settings

**Impact:** Better reasoning quality, more autonomous problem-solving, less manual prompt engineering

---

## 3. End-Anchored Instructions

### Current Implementation

**Files Analyzed:**
- `src/core/agents/discovery-agent.ts` - Instructions at beginning (lines 145-234)
- `src/core/agents/admin-agent.ts` - Instructions at beginning (lines 123-223)
- `server/live-api/config-builder.ts` - Instructions at beginning (lines 121-154)
- `services/standardChatService.ts` - System instruction at beginning (lines 159-265)

**Current Pattern:**
```typescript
// All prompts follow this structure:
const systemPrompt = `
You are F.B/c AI...
[All instructions here]
[Context data]
[More instructions]
`

// Then messages appended
messages: formatMessagesForAI(messages)
```

### Best Practice (Loeber)

> **Place instructions at the end of prompts** to "anchor" the model's reasoning, leveraging Gemini 3's 1M-token window more efficiently. This reduces hallucinations and token waste.

### Recommended Changes

1. **Restructure prompt format** to end-anchor instructions:
   ```typescript
   const systemPrompt = `
   [Long context: user query + conversation history + multimodal data]
   
   [End-anchored instructions]: 
   You are F.B/c AI. Summarize key insights concisely. 
   Use bullet points. If verbose details needed, expand only on action items.
   `
   ```

2. **Update all agents** to use end-anchored format:
   - `src/core/agents/discovery-agent.ts`
   - `src/core/agents/admin-agent.ts`
   - `src/core/agents/summary-agent.ts`
   - `src/core/agents/proposal-agent.ts`
   - `services/standardChatService.ts`
   - `server/live-api/config-builder.ts`

3. **Template structure:**
   ```
   [CONTEXT SECTION]
   - Conversation history
   - Intelligence context
   - Multimodal data
   - Research results
   
   [INSTRUCTION SECTION - AT END]
   - Role definition
   - Style guidelines
   - Output format
   - Critical rules
   ```

**Impact:** Better long-context handling, reduced hallucinations, 20-30% token savings on extended conversations

---

## 4. Unified Multimodal Input Handling

### Current Implementation

**Files Analyzed:**
- `services/standardChatService.ts` - Handles attachments separately (lines 277-290)
- `api/chat.ts` - Processes attachments in message normalization (lines 114-117)
- `src/core/context/multimodal-context.ts` - Manages multimodal context separately

**Current Pattern:**
```typescript
// Attachments added as separate parts
if (attachment) {
  currentParts.push({
    inlineData: {
      mimeType: attachment.mimeType,
      data: attachment.data
    }
  });
}

// Text added separately
if (message) {
  currentParts.push({ text: message });
}
```

**Issue:** While we combine parts, we may not be treating them as a unified stream in the prompt structure.

### Best Practice (Loeber)

> **Treat inputs (text + images/audio/video) as a single stream** rather than siloed analyses. This unlocks Gemini 3's SOTA multimodal synthesis.

### Recommended Changes

1. **Ensure unified content structure** in all API calls:
   ```typescript
   // Combine all inputs into single content array
   const content = [
     { text: userMessage },
     { inlineData: { mimeType: 'image/jpeg', data: imageData } },
     { text: additionalContext }
   ]
   ```

2. **Update prompt structure** to reference multimodal inputs naturally:
   ```typescript
   systemPrompt += `
   [MULTIMODAL CONTEXT]
   When you receive images, video, or audio, analyze them in context with the conversation.
   Reference specific elements naturally: "I noticed in the image..." not "Based on the image analysis tool..."
   `
   ```

3. **Verify Vercel AI SDK** handles multimodal inputs as unified stream (should be automatic)

**Impact:** Richer multimodal features, better synthesis, up to 50% token savings on videos

---

## 5. Media Resolution Configuration

### Current Implementation

**Files Analyzed:**
- `src/config/constants.ts` - Defines `MEDIA_RESOLUTIONS` constant (lines 226-230)
- `src/core/agents/types.ts` - Defines `mediaResolution` in `AgentContext` (line 13)
- **No actual usage of `media_resolution` parameter in API calls**

**Current Pattern:**
```typescript
// Constants defined but not used
export const MEDIA_RESOLUTIONS = {
  LOW: 'media_resolution_low',
  MEDIUM: 'media_resolution_medium',
  HIGH: 'media_resolution_high',
} as const
```

### Best Practice (Loeber)

> Use `media_resolution` parameter (e.g., "low" for speed vs "high" for detail). This optimizes token usage and processing speed for multimodal inputs.

### Recommended Changes

1. **Add `media_resolution` to API calls** with multimodal inputs:
   ```typescript
   // For real-time video analysis (speed priority)
   await generateContent({
     model: 'gemini-3-pro-preview',
     contents: [...],
     generationConfig: {
       temperature: 1.0,
     },
     // Add media resolution
     mediaResolution: 'low' // or 'high' for detailed analysis
   })
   ```

2. **Implement resolution strategy:**
   - `low` - Real-time webcam/screen streaming, quick analysis
   - `medium` - Document analysis, general image processing
   - `high` - Detailed image analysis, OCR, complex visual tasks

3. **Update multimodal context manager** to set resolution based on use case

**Impact:** Faster processing for real-time streams, better quality for detailed analysis, optimized token usage

---

## 6. Thought Signatures (Reasoning Preservation)

### Current Implementation

**Files Analyzed:**
- **No implementation found** - This is a new Gemini 3 feature

### Best Practice (Loeber)

> Use `thought_signatures` to preserve reasoning across conversation turns. This maintains context of the model's thinking process.

### Recommended Changes

1. **Research Gemini 3 API** for `thought_signatures` implementation:
   - Check if Vercel AI SDK supports this
   - May need direct API calls or SDK update

2. **Implement for multi-turn conversations:**
   ```typescript
   // Preserve reasoning across turns
   const response = await model.generateContent({
     contents: [...],
     thoughtSignature: previousThoughtSignature // from previous turn
   })
   
   // Store for next turn
   const newThoughtSignature = response.thoughtSignature
   ```

3. **Add to conversation context** in Supabase/Redis for session persistence

**Impact:** Better continuity in long conversations, preserved reasoning context, improved multi-turn quality

---

## 7. Verbosity Control

### Current Implementation

**Files Analyzed:**
- All agents request concise responses (2 sentences max for voice)
- No explicit verbosity parameter

**Current Pattern:**
```typescript
systemPrompt += `
- Two sentences max per turn
- Keep responses concise
`
```

### Best Practice (Loeber)

> **Explicitly request verbosity only when needed** (since the model defaults to concise outputs). This prevents unnecessary verbose responses.

### Recommended Changes

1. **Remove redundant verbosity instructions** - Model already defaults to concise
2. **Add explicit verbosity requests** only when detailed output needed:
   ```typescript
   // For summary/proposal generation (needs detail)
   systemPrompt += `
   Provide a detailed analysis with specific examples and actionable recommendations.
   `
   
   // For discovery/chat (default concise is fine)
   // No verbosity instruction needed
   ```

**Impact:** Cleaner prompts, better default behavior, explicit control when needed

---

## 8. Model Selection

### Current Implementation

**Files Analyzed:**
- `src/config/constants.ts` - `DEFAULT_CHAT: 'gemini-2.5-flash'` (line 193)
- Comment says: "Note: gemini-3-pro-preview has quota limits, using gemini-2.5-flash as primary"

**Current Pattern:**
```typescript
// Using Flash as default due to quota limits
DEFAULT_CHAT: 'gemini-2.5-flash',
GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview', // Available but not default
```

### Best Practice (Loeber)

> Use `gemini-3.0-pro` (or `gemini-3-pro-preview`) for complex reasoning tasks. Flash is fine for simple tasks.

### Recommended Changes

1. **Use Gemini 3 Pro for complex agents:**
   - Discovery Agent → `gemini-3-pro-preview`
   - Admin Agent → `gemini-3-pro-preview`
   - Summary Agent → `gemini-3-pro-preview`
   - Proposal Agent → `gemini-3-pro-preview`

2. **Keep Flash for simple tasks:**
   - Quick actions (rewrite, proofread)
   - Fast responses
   - Low-cost operations

3. **Monitor quota limits** and implement fallback:
   ```typescript
   try {
     // Try Gemini 3 Pro
     model = GEMINI_MODELS.GEMINI_3_PRO_PREVIEW
   } catch (quotaError) {
     // Fallback to Flash
     model = GEMINI_MODELS.DEFAULT_CHAT
   }
   ```

**Impact:** Better reasoning quality for complex tasks, optimized cost for simple tasks

---

## 9. Prompt Engineering Simplification

### Current Implementation

**Files Analyzed:**
- All agents have extensive prompt engineering
- Manual chain-of-thought instructions
- Complex conditional logic in prompts

**Current Pattern:**
```typescript
systemPrompt = `
You are F.B/c AI...
[Extensive instructions]
[Conditional logic]
[Manual reasoning steps]
`
```

### Best Practice (Loeber)

> **Simplify prompting** - Gemini 3 Pro is designed to "think" more autonomously by default. Less need for manual chain-of-thought engineering.

### Recommended Changes

1. **Reduce manual reasoning instructions** - Let model handle reasoning
2. **Simplify conditional logic** in prompts
3. **Focus on role, context, and output format** rather than step-by-step reasoning
4. **Let `thinking_level: "high"` handle complex reasoning**

**Impact:** Cleaner, more maintainable code, faster iteration, fewer edge-case failures

---

## Implementation Priority

### High Priority (Immediate Impact)

1. ✅ **Temperature → 1.0 default** (Quick win, better quality)
2. ✅ **End-anchor instructions** (20-30% token savings, better long-context)
3. ✅ **Add thinking_level parameter** (Better reasoning, less prompt engineering)

### Medium Priority (Significant Improvement)

4. ⚠️ **Unified multimodal handling** (Better synthesis, 50% video token savings)
5. ⚠️ **Media resolution configuration** (Optimized processing)
6. ⚠️ **Model selection strategy** (Gemini 3 Pro for complex tasks)

### Low Priority (Future Enhancement)

7. 🔮 **Thought signatures** (Requires API research)
8. 🔮 **Verbosity optimization** (Minor improvement)

---

## Code Changes Summary

### Files to Modify

1. **`src/lib/gemini-safe.ts`**
   - Change default temperature from `0.7` → `1.0`

2. **`services/standardChatService.ts`**
   - Change temperature from `0.7` → `1.0`
   - Add `thinking_level: "high"` for complex tasks
   - Restructure prompt to end-anchor instructions

3. **`src/core/agents/discovery-agent.ts`**
   - Remove conditional temperature, always use `1.0`
   - Add `thinking_level: "high"`
   - Restructure prompt to end-anchor format

4. **`src/core/agents/admin-agent.ts`**
   - Restructure prompt to end-anchor format
   - Add `thinking_level: "high"`

5. **`src/core/agents/summary-agent.ts`**
   - Restructure prompt to end-anchor format
   - Add `thinking_level: "high"`

6. **`src/core/agents/proposal-agent.ts`**
   - Restructure prompt to end-anchor format
   - Add `thinking_level: "high"`

7. **`server/live-api/config-builder.ts`**
   - Restructure system instruction to end-anchor format

8. **`src/config/constants.ts`**
   - Update `GEMINI_CONFIG.DEFAULT_TEMPERATURE` from `0.7` → `1.0`
   - Update default model strategy documentation

9. **`src/lib/ai-client.ts`**
   - Add support for `thinking_level` parameter
   - Add support for `media_resolution` parameter

---

## Testing Plan

1. **Temperature Testing:**
   - Compare outputs with `0.7` vs `1.0`
   - Verify no degradation in quality
   - Check for loop prevention

2. **End-Anchored Instructions:**
   - Test with long conversations (50+ messages)
   - Compare token usage before/after
   - Verify instruction adherence

3. **Thinking Level:**
   - Test complex reasoning tasks
   - Compare reasoning quality with/without `thinking_level: "high"`

4. **Multimodal:**
   - Test unified input handling
   - Verify media resolution settings
   - Measure token usage improvements

---

## Expected Benefits

- **20-30% token savings** on extended conversations (end-anchored instructions)
- **50% token savings** on video processing (unified multimodal + media resolution)
- **Better output quality** (temperature 1.0, thinking_level high)
- **Reduced prompt engineering** (simplified prompts, autonomous reasoning)
- **Faster iteration** (less brittle prompts, fewer edge cases)
- **Better long-context handling** (1M token window optimization)

---

## References

- [Gemini 3 Developer Guide](https://ai.google.dev/gemini-api/docs/gemini-3)
- Patrick Loeber's X post (December 8, 2025)
- [Vercel AI SDK Documentation](https://sdk.vercel.ai/docs)
- [Google Generative AI SDK](https://ai.google.dev/gemini-api/docs)

---

## Next Steps

1. Review and approve this analysis
2. Create implementation tickets for high-priority items
3. Test changes in development environment
4. Monitor token usage and quality metrics
5. Iterate based on results

