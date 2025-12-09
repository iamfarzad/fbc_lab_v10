# Real-Time Data Connections Analysis

## Overview
This document analyzes which visual elements require real-time data and how they connect to the agent system and data sources.

---

## Real-Time Data Requirements

### 1. Weather Condition Label
**Status**: ✅ **CONNECTED** (via tool calls)

**Data Source**: 
- Set via `update_dashboard` tool call
- Extracted from `detectVisualIntent()` text analysis
- Stored in `weatherDataRef` and `visualState.weatherData`

**Connection Flow**:
```
Tool Call (update_dashboard) 
  → weatherDataRef.current = data
  → setVisualState({ weatherData })
  → AntigravityCanvas renders label
```

**Trigger**: `shape === 'weather' && weatherData?.condition`

**Real-Time**: ✅ Yes - Updates when tool calls provide weather data

---

### 2. Chart Label
**Status**: ✅ **CONNECTED** (via tool calls)

**Data Source**:
- Set via `update_dashboard` tool call
- Extracted from `detectVisualIntent()` text analysis
- Stored in `chartDataRef` and `visualState.chartData`

**Connection Flow**:
```
Tool Call (update_dashboard) 
  → chartDataRef.current = data
  → setVisualState({ chartData })
  → AntigravityCanvas renders label
```

**Trigger**: `shape === 'chart' && chartData?.value`

**Real-Time**: ✅ Yes - Updates when tool calls provide chart data

---

### 3. Map Title
**Status**: ✅ **CONNECTED** (via grounding metadata)

**Data Source**:
- Set via `groundingMetadata.groundingChunks` (maps data)
- Also via `update_dashboard` tool call
- Stored in `mapDataRef` and `visualState.mapData`

**Connection Flow**:
```
GroundingMetadata (maps chunk) 
  → mapDataRef.current = { title, lat, lng }
  → setVisualState({ mapData })
  → AntigravityCanvas renders title
```

**Trigger**: `shape === 'map' && mapData?.title`

**Real-Time**: ✅ Yes - Updates when Gemini returns map grounding data

---

### 4. Source Badge (Citation Count)
**Status**: ⚠️ **PARTIALLY CONNECTED** (defined but not actively set)

**Data Source**:
- Defined in `VisualState.sourceCount`
- **NOT currently set from any data source**
- Would need to be extracted from `groundingMetadata.groundingChunks` length

**Connection Flow** (Missing):
```
GroundingMetadata.groundingChunks.length
  → sourceCount = chunks.length
  → setVisualState({ sourceCount })
  → AntigravityCanvas renders badge
```

**Trigger**: `sourceCount !== undefined && sourceCount > 0`

**Real-Time**: ❌ **NO** - Field exists but is never populated

**Fix Needed**: Extract from `groundingMetadata.groundingChunks?.length` in `handleTranscriptUpdate`

---

### 5. Research Badge
**Status**: ⚠️ **PARTIALLY CONNECTED** (defined but not actively set)

**Data Source**:
- Defined in `VisualState.researchActive`
- **NOT currently set from any data source**
- Should be set when `performResearch()` is active

**Connection Flow** (Missing):
```
performResearch() active
  → researchActive = true
  → setVisualState({ researchActive })
  → AntigravityCanvas renders badge
```

**Trigger**: `researchActive === true`

**Real-Time**: ❌ **NO** - Field exists but is never populated

**Fix Needed**: Set `researchActive` in `useLeadResearch` hook when research is active

---

### 6. Reasoning Complexity Indicator
**Status**: ⚠️ **PARTIALLY CONNECTED** (defined but not actively set)

**Data Source**:
- Defined in `VisualState.reasoningComplexity`
- **NOT currently set from any data source**
- Should be calculated from `reasoning` string length/complexity

**Connection Flow** (Missing):
```
AgentMetadata.reasoning
  → reasoningComplexity = calculateComplexity(reasoning)
  → setVisualState({ reasoningComplexity })
  → AntigravityCanvas renders indicator
```

**Trigger**: `reasoningComplexity > 0.3`

**Real-Time**: ❌ **NO** - Field exists but is never populated

**Fix Needed**: Calculate from `agentMetadata.reasoning` length in `handleTranscriptUpdate`

---

## Agent Shapes Connection Analysis

### 9 Agent-Specific Shapes

1. **discovery** - Discovery Agent
2. **scoring** - Scoring Agent  
3. **workshop** - Workshop Sales Agent
4. **consulting** - Consulting Sales Agent
5. **closer** - Closer Agent
6. **summary** - Summary Agent
7. **proposal** - Proposal Agent
8. **admin** - Admin Agent
9. **retargeting** - Retargeting Agent

### Connection Status: ✅ **FULLY CONNECTED**

**Connection Flow**:
```
Agent Response
  → agentMetadata.agent or agentMetadata.stage
  → resolveAgentShape(agent, stage)
  → semanticShapeRef.current = agentShape
  → setVisualState({ shape: agentShape })
  → AntigravityCanvas renders agent shape
```

**Implementation**:
- `src/logic/visualIntent.ts`: `agentToShape` and `stageToShape` mappings
- `App.tsx`: `handleTranscriptUpdate` calls `resolveAgentShape()`
- `src/core/types/funnel-stage.ts`: Stage metadata includes shape mapping

**Real-Time**: ✅ Yes - Automatically switches when agent/stage changes

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Agent System                              │
│  (discovery, scoring, workshop, consulting, closer, etc.)  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ agentMetadata
                       │ groundingMetadata
                       │ reasoning
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              handleTranscriptUpdate()                        │
│  - resolveAgentShape() → agent shape                        │
│  - Extract weatherData from tool calls                      │
│  - Extract chartData from tool calls                         │
│  - Extract mapData from groundingMetadata                    │
│  - [MISSING] Extract sourceCount                             │
│  - [MISSING] Set researchActive                              │
│  - [MISSING] Calculate reasoningComplexity                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ setVisualState()
                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    VisualState                               │
│  - shape: VisualShape                                        │
│  - weatherData?: {...}                                       │
│  - chartData?: {...}                                         │
│  - mapData?: {...}                                          │
│  - sourceCount?: number      [NOT SET]                      │
│  - researchActive?: boolean  [NOT SET]                      │
│  - reasoningComplexity?: number [NOT SET]                    │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       │ Props
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              AntigravityCanvas                                │
│  ✅ Renders agent shapes (9 shapes)                         │
│  ✅ Renders weather label (when data exists)                │
│  ✅ Renders chart label (when data exists)                   │
│  ✅ Renders map title (when data exists)                      │
│  ❌ Source badge (never shows - sourceCount never set)       │
│  ❌ Research badge (never shows - researchActive never set)   │
│  ❌ Reasoning indicator (never shows - complexity never set) │
└─────────────────────────────────────────────────────────────┘
```

---

## Connection Summary

### ✅ Fully Connected (6 items)
1. **Weather Condition Label** - Tool calls → visualState → Canvas
2. **Chart Label** - Tool calls → visualState → Canvas
3. **Map Title** - Grounding metadata → visualState → Canvas
4. **discovery shape** - Agent metadata → visualState → Canvas
5. **scoring shape** - Agent metadata → visualState → Canvas
6. **workshop shape** - Agent metadata → visualState → Canvas
7. **consulting shape** - Agent metadata → visualState → Canvas
8. **closer shape** - Agent metadata → visualState → Canvas
9. **summary shape** - Agent metadata → visualState → Canvas
10. **proposal shape** - Agent metadata → visualState → Canvas
11. **admin shape** - Agent metadata → visualState → Canvas
12. **retargeting shape** - Agent metadata → visualState → Canvas

### ⚠️ Partially Connected (3 items - defined but not populated)
1. **Source Badge** - UI exists, but `sourceCount` is never set
2. **Research Badge** - UI exists, but `researchActive` is never set
3. **Reasoning Complexity Indicator** - UI exists, but `reasoningComplexity` is never calculated

---

## Missing Connections - Implementation Needed

### 1. Source Count Connection
**Location**: `App.tsx` → `handleTranscriptUpdate`

**Code to Add**:
```typescript
// Extract source count from grounding metadata
const sourceCount = groundingMetadata?.groundingChunks?.length || 0;
if (sourceCount > 0) {
    setVisualState(prev => ({ ...prev, sourceCount }));
}
```

### 2. Research Active Connection
**Location**: `src/hooks/business/useLeadResearch.ts` or `App.tsx`

**Code to Add**:
```typescript
// In useLeadResearch hook
useEffect(() => {
    setVisualState(prev => ({ 
        ...prev, 
        researchActive: isResearching 
    }));
}, [isResearching]);
```

### 3. Reasoning Complexity Connection
**Location**: `App.tsx` → `handleTranscriptUpdate`

**Code to Add**:
```typescript
// Calculate reasoning complexity from reasoning string
const calculateComplexity = (reasoning?: string): number => {
    if (!reasoning) return 0;
    const length = reasoning.length;
    const hasSteps = reasoning.includes('Step') || reasoning.includes('step');
    const hasAnalysis = reasoning.includes('analyze') || reasoning.includes('consider');
    
    // Normalize to 0-1 range
    let complexity = Math.min(length / 2000, 1); // 2000 chars = max
    if (hasSteps) complexity += 0.2;
    if (hasAnalysis) complexity += 0.1;
    return Math.min(complexity, 1);
};

const reasoningComplexity = calculateComplexity(agentMetadata?.reasoning);
if (reasoningComplexity > 0) {
    setVisualState(prev => ({ ...prev, reasoningComplexity }));
}
```

---

## Agent Shape → Data Overlay Relationships

### Direct Connections
- **discovery** shape → Can trigger **Research Badge** (when research active)
- **scoring** shape → Can trigger **Chart Label** (if scoring data provided)
- **proposal** shape → Can trigger **Source Badge** (if citations provided)
- **Any agent** → Can trigger **Reasoning Complexity** (if reasoning provided)

### Indirect Connections
- Agent responses can include `groundingMetadata` → Maps → Map Title
- Agent responses can include tool calls → Weather/Chart data
- Agent responses can include `reasoning` → Reasoning Complexity

---

## Conclusion

**Agent Shapes**: ✅ **100% Connected** - All 9 agent shapes automatically render based on agent/stage metadata.

**Data Overlays**: ⚠️ **50% Connected** - 3 of 6 overlays work, 3 need implementation:
- Weather, Chart, Map: ✅ Working
- Source Count, Research Active, Reasoning Complexity: ❌ Need implementation

**Recommendation**: Implement the 3 missing connections to complete the real-time data visualization system.

