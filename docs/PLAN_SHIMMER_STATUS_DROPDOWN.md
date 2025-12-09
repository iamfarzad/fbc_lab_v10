# Plan: Shimmer Status with Metadata Dropdown

## Goal
Replace the Shimmer card component with a lightweight inline status indicator next to "F.B/c" that:
- Shows streaming status with shimmer effect
- Has a clickable dropdown showing metadata (tool calls, reasoning, tool results)
- Only appears during streaming

## Step-by-Step Implementation

### Step 1: Update TranscriptItem Type
**File:** `types.ts` (line ~33)

Add `streamingMetadata` field to `TranscriptItem` interface:
```typescript
export interface TranscriptItem {
  // ... existing fields ...
  groundingMetadata?: GroundingMetadata;
  streamingMetadata?: {
    toolCalls: Array<{ toolName?: string; tool?: string; [key: string]: any }>;
    reasoning: string[];
    toolResults: Array<{ toolName?: string; [key: string]: any }>;
  };
}
```

### Step 2: Add onMetadata to AIBrainService
**File:** `services/aiBrainService.ts` (line ~344)

**2a. Update method signature:**
```typescript
async chatStream(
  messages: Array<{ role: string; content: string; attachments?: Array<{ mimeType: string; data: string }> }>,
  options?: {
    conversationFlow?: any;
    intelligenceContext?: any;
    onChunk?: (text: string) => void;
    onMetadata?: (metadata: any) => void; // ADD THIS
  }
): Promise<AgentResponse>
```

**2b. Call onMetadata in SSE parsing (around line 470):**
```typescript
// Handle metadata events (tool calls, reasoning, thinking)
if (parsed.type === 'meta') {
  metadataCount++;
  console.log('[AIBrainService] Received metadata event', { 
    metadataCount,
    metaType: parsed.type,
    hasToolCall: !!parsed.toolCall,
    hasReasoning: !!parsed.reasoning
  });
  
  // ADD THIS: Forward metadata to callback
  if (options?.onMetadata) {
    options.onMetadata(parsed);
  }
  
  // ... existing accumulation logic ...
}
```

### Step 3: Wire Metadata in App.tsx
**File:** `App.tsx` (line ~392)

**3a. Add onMetadata callback to chatStream call:**
```typescript
agentResponse = await aiBrainRef.current.chatStream(messages, {
  conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
  intelligenceContext: intelligencePayload,
  onChunk: (accumulatedText: string) => {
    // ... existing onChunk logic ...
  },
  onMetadata: (metadata: any) => {
    // ADD THIS: Accumulate metadata in transcript
    if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
    
    setTranscript(prev => {
      const updated = [...prev];
      const loadingIndex = updated.findIndex(item => item.id === loadingId.toString());
      if (loadingIndex >= 0) {
        const existingItem = updated[loadingIndex];
        const currentMetadata = (existingItem as any).streamingMetadata || {
          toolCalls: [],
          reasoning: [],
          toolResults: []
        };
        
        // Accumulate based on metadata type
        if (metadata.type === 'tool_call') {
          currentMetadata.toolCalls.push(metadata.toolCall || metadata);
        } else if (metadata.type === 'reasoning' || metadata.type === 'reasoning_start') {
          const reasoningText = metadata.reasoning || metadata.message || '';
          if (reasoningText) {
            currentMetadata.reasoning.push(reasoningText);
          }
        } else if (metadata.type === 'tool_result') {
          currentMetadata.toolResults.push(metadata.toolResult || metadata);
        }
        
        updated[loadingIndex] = {
          ...existingItem,
          streamingMetadata: currentMetadata
        };
      }
      return updated;
    });
  }
});
```

### Step 4: Replace Shimmer Card with Inline Status
**File:** `components/chat/ChatMessage.tsx`

**4a. Remove Shimmer import (line 15):**
```typescript
// REMOVE: import { Shimmer } from './UIHelpers';
```

**4b. Add dropdown state (after line 39):**
```typescript
const [isThinkingOpen, setIsThinkingOpen] = useState(false);
const [isMetadataOpen, setIsMetadataOpen] = useState(false); // ADD THIS
```

**4c. Replace Speaker Name section (lines 92-105):**
```typescript
{/* Speaker Name with Shimmer Status + Dropdown */}
<div className="flex items-center gap-2 ml-1">
    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
        {isUser ? 'You' : 'F.B/c'}
    </span>
    {/* Status with shimmer - clickable dropdown */}
    {!isUser && !item.isFinal && item.status === 'streaming' && (
        <div className="relative">
            <button
                onClick={() => setIsMetadataOpen(!isMetadataOpen)}
                className="flex items-center gap-1.5 group"
            >
                {/* Shimmer effect on text */}
                <span className="text-[10px] font-medium text-zinc-400 dark:text-zinc-500 italic relative overflow-hidden">
                    <span className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-300/50 dark:via-zinc-600/50 to-transparent animate-[shimmer_2s_infinite]"></span>
                    <span className="relative">
                        {hasActiveTools
                            ? 'Analyzing...'
                            : shimmerMode === 'speaking'
                                ? 'Talking...'
                                : shimmerMode === 'listening'
                                    ? 'Listening...'
                                    : 'Typing...'}
                    </span>
                </span>
                <ChevronDown className={`w-3 h-3 text-zinc-400 transition-transform duration-200 ${isMetadataOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown with metadata */}
            {isMetadataOpen && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-lg p-3 z-50 text-left">
                    <div className="text-[10px] font-semibold text-zinc-500 dark:text-zinc-400 mb-2 uppercase tracking-wider">
                        Activity
                    </div>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                        {/* Tool Calls */}
                        {(item as any).streamingMetadata?.toolCalls?.length > 0 && (
                            <div>
                                <div className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                    Tools Used:
                                </div>
                                {(item as any).streamingMetadata.toolCalls.map((tc: any, i: number) => (
                                    <div key={i} className="text-[10px] text-zinc-500 dark:text-zinc-500 pl-2">
                                        • {tc.toolName || tc.tool || 'Unknown tool'}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Reasoning Events */}
                        {(item as any).streamingMetadata?.reasoning?.length > 0 && (
                            <div>
                                <div className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                    Thinking:
                                </div>
                                <div className="text-[10px] text-zinc-500 dark:text-zinc-500 pl-2 italic">
                                    {(item as any).streamingMetadata.reasoning[(item as any).streamingMetadata.reasoning.length - 1]?.substring(0, 100)}...
                                </div>
                            </div>
                        )}
                        
                        {/* Tool Results */}
                        {(item as any).streamingMetadata?.toolResults?.length > 0 && (
                            <div>
                                <div className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                                    Results:
                                </div>
                                {(item as any).streamingMetadata.toolResults.map((tr: any, i: number) => (
                                    <div key={i} className="text-[10px] text-zinc-500 dark:text-zinc-500 pl-2">
                                        ✓ {tr.toolName || 'Tool'} completed
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {(!(item as any).streamingMetadata?.toolCalls?.length && 
                          !(item as any).streamingMetadata?.reasoning?.length && 
                          !(item as any).streamingMetadata?.toolResults?.length) && (
                            <div className="text-[10px] text-zinc-400 dark:text-zinc-600 italic">
                                No additional activity
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )}
</div>
```

**4d. Remove Shimmer card (lines 99-105):**
```typescript
// REMOVE THIS ENTIRE BLOCK:
{/* Shimmer loader for streaming state - shows status inside the card */}
{!isUser && item.status === 'streaming' && (
    <Shimmer 
        mode={shimmerMode as any}
        hasActiveTools={hasActiveTools}
    />
)}
```

### Step 5: Add Shimmer CSS Animation
**File:** `index.css` or `tailwind.config.js`

**Option A: Add to index.css:**
```css
@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
```

**Option B: Add to tailwind.config.js (if using Tailwind):**
```javascript
module.exports = {
  theme: {
    extend: {
      keyframes: {
        shimmer: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 2s infinite',
      },
    },
  },
}
```

Then use: `animate-shimmer` class instead of `animate-[shimmer_2s_infinite]`

### Step 6: Add Click Outside Handler (Optional)
**File:** `components/chat/ChatMessage.tsx`

Add useEffect to close dropdown on outside click:
```typescript
import { useEffect, useRef } from 'react';

// In component:
const dropdownRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  const handleClickOutside = (event: MouseEvent) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
      setIsMetadataOpen(false);
    }
  };
  
  if (isMetadataOpen) {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }
}, [isMetadataOpen]);

// Add ref to dropdown div:
<div ref={dropdownRef} className="relative">
```

## Testing Checklist
- [ ] Shimmer effect appears on status text during streaming
- [ ] Status text shows correct label (Typing/Analyzing/Talking/Listening)
- [ ] Dropdown opens/closes on click
- [ ] Dropdown shows tool calls when present
- [ ] Dropdown shows reasoning snippets when present
- [ ] Dropdown shows tool results when present
- [ ] Dropdown shows "No additional activity" when empty
- [ ] Metadata accumulates correctly during streaming
- [ ] Dropdown closes when streaming completes
- [ ] Works in both light and dark mode

## Files to Modify
1. `types.ts` - Add streamingMetadata field
2. `services/aiBrainService.ts` - Add onMetadata callback
3. `App.tsx` - Wire onMetadata to accumulate metadata
4. `components/chat/ChatMessage.tsx` - Replace Shimmer card with inline status + dropdown
5. `index.css` or `tailwind.config.js` - Add shimmer animation

