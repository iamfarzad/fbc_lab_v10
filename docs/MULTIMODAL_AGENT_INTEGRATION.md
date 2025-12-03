# Multimodal Agent Integration

> **✅ CURRENT DOCUMENT**  
> **Status:** This document remains accurate. Multimodal integration was not modified during the 7-day sprint.  
> **For system updates, see:** [7_DAY_SPRINT_COMPLETE.md](./7_DAY_SPRINT_COMPLETE.md)

**Date:** 2025-12-02  
**Scope:** Complete documentation of how text, voice, webcam, screen share, and file uploads integrate with the multi-agent system

---

## Overview

The FBC system supports **5 input modalities** that seamlessly integrate with the agent orchestration system:

1. **Text** - Standard chat messages
2. **Voice** - Real-time bidirectional voice via Gemini Live API
3. **Webcam** - Live camera feed with frame analysis
4. **Screen Share** - Screen capture with analysis
5. **File Upload** - Images, PDFs, text files, CSV, JSON

**Key Architecture:** All modalities flow through `MultimodalContextManager` which stores, analyzes, and provides context to agents.

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUT MODALITIES                     │
├──────────┬──────────┬──────────┬──────────┬──────────────────┤
│  Text    │  Voice  │ Webcam   │ Screen   │ File Upload      │
└────┬─────┴────┬─────┴────┬─────┴────┬─────┴────────┬────────┘
     │          │          │          │              │
     ▼          ▼          ▼          ▼              ▼
┌─────────────────────────────────────────────────────────────┐
│           MultimodalContextManager                           │
│  - Stores all modalities in unified context                  │
│  - Analyzes images/audio/uploads                             │
│  - Provides context to agents                                │
└───────────────────────┬─────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              Agent Orchestrator                              │
│  - Loads multimodal context                                  │
│  - Routes to appropriate agent                               │
│  - Agents reference multimodal data                          │
└───────────────────────┬─────────────────────────────────────┘
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
    Discovery    Sales Agents    Summary
    Scoring      Closer         Proposal
```

---

## 1. Text Input Integration

### 1.1 Flow

**Entry:** `ChatInputDock` → `handleSendMessage()` → `App.tsx`

**Processing:**
```typescript
// App.tsx - handleSendMessage()
const userItem: TranscriptItem = {
  id: Date.now().toString(),
  role: 'user',
  text: text.trim(),
  timestamp: new Date(),
  isFinal: true,
  ...(file && { attachment: { ...file } })
}
```

**Storage:**
- Added to transcript state (React)
- Persisted via `/api/chat/persist-message`
- Stored in `MultimodalContextManager` as `ConversationTurn`

**Agent Integration:**
- Converted to `ChatMessage[]` format
- Sent to `/api/chat` endpoint
- Agents receive in `messages` parameter

---

## 2. Voice Input/Output Integration

### 2.1 Voice Input Flow

**Entry:** `GeminiLiveService` → WebSocket → `server/handlers/realtime-input-handler.ts`

**Processing:**
1. **Audio Chunks:** Received via WebSocket as PCM audio
2. **Transcription:** Gemini Live API transcribes in real-time
3. **Storage:** Stored in `MultimodalContextManager.addVoiceTranscript()`

**Code:**
```typescript
// server/handlers/realtime-input-handler.ts
// Receives audio chunks via WebSocket
// Sends to Gemini Live API
// Transcription returned in real-time
```

**Storage:**
```typescript
// multimodal-context.ts
await multimodalContextManager.addVoiceTranscript(
  sessionId,
  transcript,
  'user',
  isFinal
)
```

**Agent Integration:**
- Voice transcripts loaded via `getConversationHistory()`
- Converted to `ChatMessage[]` format
- Sent to orchestrator with `trigger: 'voice'`

**Location:** `server/context/orchestrator-sync.ts` (currently disabled to prevent duplicate responses)

---

### 2.2 Voice Output Flow

**Entry:** Gemini Live API → WebSocket → `GeminiLiveService`

**Processing:**
1. Agent generates text response
2. Text sent to Gemini Live API
3. Live API converts to audio (TTS)
4. Audio streamed back via WebSocket
5. Played via `AudioPlayer` component

**Storage:**
- Assistant transcripts stored via `addVoiceTranscript(role: 'assistant')`
- Available for context in future turns

---

### 2.3 Voice Context Injection

**Location:** `server/live-api/config-builder.ts`

**How It Works:**
```typescript
// Load multimodal context for voice session
const contextData = await multimodalContextManager.prepareChatContext(
  sessionId,
  true, // include visual
  true  // include audio
)

// Inject into system instruction
if (contextData.multimodalContext?.recentAnalyses?.length > 0) {
  fullInstruction += `\n\nRECENT MULTIMODAL CONTEXT: ${recentSummary}`
}
```

**What Gets Injected:**
- Recent visual analyses (webcam/screen)
- Recent uploads
- Conversation history summaries
- Research context

---

## 3. Webcam Integration

### 3.1 Capture Flow

**Entry:** `useCamera` hook → `captureFrame()`

**Processing:**
1. **Frame Capture:** Canvas captures video frame as JPEG
2. **Base64 Encoding:** Converted to base64 string
3. **Dual Path:**
   - **Live API:** Streamed via `sendRealtimeInput()` (if voice active)
   - **Analysis API:** Sent to `/api/tools/webcam` for analysis

**Code:**
```typescript
// src/hooks/media/useCamera.ts
const capture: CameraCapture = {
  blob,
  imageData, // base64
  timestamp: Date.now()
}

// Stream to Live API (if voice active)
if (sendRealtimeInputRef.current) {
  sendRealtimeInputRef.current([{
    mimeType: 'image/jpeg',
    data: base64Data
  }])
}

// Analyze via API (if sessionId)
if (sessionId && shouldAnalyze) {
  const result = await uploadToBackend(blob, imageData, sessionId)
  // Analysis stored in multimodal context
}
```

---

### 3.2 Analysis Flow

**API Endpoint:** `/api/tools/webcam`

**Processing:**
```typescript
// api/tools/webcam.ts
const result = await genAI.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: [{
    role: 'user',
    parts: [
      { text: "Analyze this webcam frame..." },
      { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
    ]
  }]
})

return { analysis: result.text }
```

**Storage:**
```typescript
// multimodal-context.ts
await multimodalContextManager.addVisualContext(
  sessionId,
  {
    type: 'webcam',
    analysis: analysisText,
    imageData: base64Data
  }
)
```

**Context Update:**
```typescript
// useCamera.ts - sendContextUpdate()
sendContextUpdate({
  sessionId,
  modality: 'webcam',
  analysis: analysisText,
  imageData,
  capturedAt: timestamp
})
```

---

### 3.3 Agent Integration

**Discovery Agent:**
```typescript
// discovery-agent.ts
if (multimodalContext?.hasRecentImages) {
  systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
  if (multimodalContext.recentAnalyses[0]) {
    systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0]}...`
  }
}
```

**Sales Agents:**
- Reference what user showed via webcam
- Use analysis to tailor pitch
- Example: "I noticed your dashboard shows revenue declining..."

**Summary Agent:**
- Includes webcam usage in summary
- Lists visual analyses in multimodal summary
- Calculates engagement score based on webcam usage

---

### 3.4 Attachment to Messages

**Location:** `App.tsx` → `handleSendMessage()`

**Code:**
```typescript
// If webcam active and no file attached, attach latest webcam frame
if (isWebcamActive && latestWebcamFrameRef.current && lastMsg) {
  lastMsg.attachments = [{
    mimeType: 'image/jpeg',
    data: latestWebcamFrameRef.current
  }]
}
```

**Impact:** Agent receives webcam frame directly in message attachments, can analyze in real-time.

---

## 4. Screen Share Integration

### 4.1 Capture Flow

**Entry:** `useScreenShare` hook → `captureFrame()`

**Processing:**
1. **Screen Capture:** `getDisplayMedia()` captures screen
2. **Canvas Rendering:** Screen rendered to canvas
3. **Base64 Encoding:** Converted to base64
4. **Dual Path:** Same as webcam (Live API + Analysis API)

**Code:**
```typescript
// src/hooks/media/useScreenShare.ts
const capture: ScreenShareCapture = {
  blob,
  imageData,
  timestamp: Date.now()
}

// Stream to Live API
if (sendRealtimeInput) {
  sendRealtimeInput([{
    mimeType: 'image/jpeg',
    data: base64Data
  }])
}

// Analyze via API
if (sessionId && shouldAnalyze) {
  const result = await uploadToBackend(blob, imageData, sessionId)
}
```

---

### 4.2 Analysis Flow

**Same as Webcam:**
- Sent to `/api/tools/webcam` (shared endpoint)
- Analyzed with Gemini Flash
- Stored in `MultimodalContextManager` as `VisualEntry` with `type: 'screen'`

**Storage:**
```typescript
await multimodalContextManager.addVisualContext(
  sessionId,
  {
    type: 'screen',
    analysis: analysisText,
    imageData: base64Data
  }
)
```

---

### 4.3 Agent Integration

**Same as Webcam:**
- Discovery agent references screen content
- Sales agents use screen insights for personalization
- Summary agent includes screen share in engagement metrics

**Example Usage:**
```typescript
// discovery-agent.ts
if (multimodalContext?.hasRecentImages) {
  systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
  // Agent can say: "I see your Excel dashboard shows..."
}
```

---

## 5. File Upload Integration

### 5.1 Upload Flow

**Entry:** `ChatInputDock` → `processFile()` → `handleSendMessage()`

**Supported Types:**
- **Images:** JPEG, PNG, GIF, WebP
- **Documents:** PDF, TXT, CSV, JSON
- **Text Files:** Extracted and analyzed

**Processing:**
```typescript
// ChatInputDock.tsx
const processFile = (file: File) => {
  const reader = new FileReader()
  reader.onload = (ev) => {
    const result = ev.target?.result as string
    const base64 = result.split(',')[1]
    
    // For text files, extract content
    if (isText) {
      const textReader = new FileReader()
      textReader.readAsText(file)
      // Stores textContent in file object
    }
    
    setSelectedFile({
      url: result,
      base64,
      mimeType: file.type,
      name: file.name,
      type: isImage ? 'image' : 'file',
      textContent // For text files
    })
  }
}
```

---

### 5.2 Attachment to Messages

**Location:** `App.tsx` → `handleSendMessage()`

**Code:**
```typescript
const messages = AIBrainService.transcriptToMessages(currentHistory)
const lastMsg = messages[messages.length - 1]

if (file && lastMsg) {
  lastMsg.attachments = [{
    mimeType: file.mimeType,
    data: file.base64
  }]
}
```

**Format:**
```typescript
{
  role: 'user',
  content: text,
  attachments: [{
    mimeType: 'image/jpeg' | 'application/pdf' | 'text/plain',
    data: base64String
  }]
}
```

---

### 5.3 Storage & Analysis

**Persistence:**
```typescript
// api/chat/persist-message.ts
await multimodalContextManager.addConversationTurn(sessionId, {
  role: 'user',
  text: content,
  fileUpload: {
    name: attachment.filename || 'attachment'
  }
})
```

**Upload Context:**
```typescript
// multimodal-context.ts
async addFileUploadTurn(
  sessionId: string,
  fileInfo: { name: string; analysis?: string }
): Promise<void> {
  context.uploadContext.push({
    id: crypto.randomUUID(),
    filename: fileInfo.name,
    analysis: fileInfo.analysis || '',
    timestamp: new Date().toISOString()
  })
}
```

---

### 5.4 Agent Integration

**Discovery Agent:**
```typescript
if (multimodalContext?.hasRecentUploads) {
  systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
}
```

**Sales Agents:**
- Reference uploaded documents in pitch
- Use document content for personalization
- Example: "Based on the spreadsheet you uploaded..."

**Summary Agent:**
- Lists all uploaded documents
- Includes document insights in summary
- Shows engagement score based on uploads

---

## 6. Multimodal Context Manager

### 6.1 Storage Structure

**Location:** `src/core/context/multimodal-context.ts`

**Data Structure:**
```typescript
interface MultimodalContext {
  sessionId: string
  conversationHistory: ConversationEntry[]  // All text/voice messages
  conversationTurns: ConversationTurn[]      // Google-style format
  visualContext: VisualEntry[]               // Webcam/screen analyses
  audioContext: AudioEntry[]                // Voice transcripts
  uploadContext: UploadEntry[]               // File uploads
  leadContext: LeadContext                  // Research data
  metadata: {
    modalitiesUsed: Modality[]
    totalTokens: number
    lastUpdated: string
  }
}
```

---

### 6.2 Context Preparation

**Method:** `prepareChatContext()`

**Purpose:** Prepares multimodal context for agent consumption

**Code:**
```typescript
async prepareChatContext(
  sessionId: string,
  includeVisual: boolean = true,
  includeAudio: boolean = false
): Promise<{
  multimodalContext: {
    hasRecentImages: boolean
    hasRecentAudio: boolean
    hasRecentUploads: boolean
    recentAnalyses: string[]
    recentUploads: string[]
  }
}>
```

**What It Does:**
1. Loads conversation history
2. Gets recent visual analyses (last 3)
3. Gets recent audio entries (if `includeAudio`)
4. Gets recent uploads
5. Extracts analysis text summaries
6. Returns structured context object

---

### 6.3 Agent Context Injection

**Location:** `src/core/agents/orchestrator.ts` → `routeToAgent()`

**Code:**
```typescript
// Get multimodal context
const multimodalData = await multimodalContextManager.prepareChatContext(
  context.sessionId,
  true, // include visual
  trigger === 'voice' // include audio if voice
)

const multimodalContext = multimodalData.multimodalContext

// Build enhanced context for agent
const enhancedContext: AgentContext = {
  ...context,
  multimodalContext, // Injected here
  stage
}
```

**All Agents Receive:**
- `multimodalContext.hasRecentImages` - Boolean flag
- `multimodalContext.hasRecentAudio` - Boolean flag
- `multimodalContext.hasRecentUploads` - Boolean flag
- `multimodalContext.recentAnalyses` - Array of analysis strings
- `multimodalContext.recentUploads` - Array of upload filenames

---

## 7. Agent Usage Patterns

### 7.1 Discovery Agent

**Location:** `src/core/agents/discovery-agent.ts`

**Multimodal Awareness:**
```typescript
if (multimodalContext?.hasRecentImages) {
  systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
  if (multimodalContext.recentAnalyses[0]) {
    systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
  }
}

if (multimodalContext?.hasRecentUploads) {
  systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
}

if (voiceActive) {
  systemPrompt += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
}
```

**Example Output:**
- "I noticed your dashboard shows revenue declining. What's driving that trend?"
- "Based on the spreadsheet you uploaded, I see you're tracking..."

---

### 7.2 Scoring Agent

**Location:** `src/core/agents/scoring-agent.ts`

**Multimodal Bonuses:**
```typescript
// Step 5: Adding multimodal bonuses
const multimodalBonuses = []
if (multimodalContext?.hasRecentAudio) multimodalBonuses.push('Voice +10')
if (multimodalContext?.hasRecentImages) multimodalBonuses.push('Screen +15')
if (multimodalContext?.hasRecentUploads) multimodalBonuses.push('Uploads +10')
```

**Scoring Impact:**
- **Voice used:** +10 points (commitment signal)
- **Screen shared:** +15 points (HIGH INTENT - showing pain points)
- **Webcam shown:** +5 points (comfort/trust)
- **Documents uploaded:** +10 points (prepared/serious)

**Total Possible:** 100 base + 40 multimodal = 140 max (capped at 100)

---

### 7.3 Sales Agents (Workshop & Consulting)

**Location:** `src/core/agents/workshop-sales-agent.ts`, `consulting-sales-agent.ts`

**Multimodal Usage:**
```typescript
MULTIMODAL CONTEXT:
${multimodalContext?.hasRecentImages ? '- Saw their screen/dashboard' : ''}
${multimodalContext?.hasRecentUploads ? '- Reviewed their documents' : ''}

CONSTRAINTS:
- Reference multimodal moments naturally:
  ✅ "When you showed me your Excel dashboard, I noticed..."
  ❌ "Based on screen share analysis..."
```

**Example Output:**
- "I see your current dashboard shows manual data entry. Our workshop teaches teams to automate this..."
- "The spreadsheet you uploaded reveals you're tracking 50+ metrics manually..."

---

### 7.4 Closer Agent

**Location:** `src/core/agents/closer-agent.ts`

**Multimodal Proof:**
```typescript
MULTIMODAL EXPERIENCE:
Voice used: ${multimodalContext?.hasRecentAudio ? 'Yes' : 'No'}
Screen shared: ${multimodalContext?.hasRecentImages ? 'Yes - They showed us their systems' : 'No'}
Documents uploaded: ${multimodalContext?.hasRecentUploads ? `Yes - ${multimodalContext.recentUploads.join(', ')}` : 'No'}

CLOSING TACTICS:
- Use the multimodal experience as proof:
  "You've seen what AI can do - we had a voice conversation, I analyzed your screen,
   this is what we build for clients."
```

**Example Output:**
- "You've experienced our AI capabilities firsthand - we had a voice conversation, I analyzed your dashboard, this is exactly what we build for clients."

---

### 7.5 Summary Agent

**Location:** `src/core/agents/summary-agent.ts`

**Full Multimodal Analysis:**
```typescript
// Get full multimodal context
const multimodalData = await multimodalContextManager.getConversationContext(
  sessionId,
  true, // include visual
  true  // include audio
)

// Include in system prompt
MULTIMODAL INTERACTION DATA:
Total messages: ${multimodalData.summary.totalMessages}
Modalities used: ${multimodalData.summary.modalitiesUsed.join(', ')}
Voice transcripts: ${multimodalData.audioContext.length} items
Screen/webcam captures: ${multimodalData.visualContext.length} items
Documents uploaded: ${multimodalData.uploadContext.length} items

Recent visual analyses:
${multimodalData.visualContext.map((v, i) => `${i + 1}. ${v.analysis.substring(0, 200)}...`).join('\n')}

Recent uploads:
${multimodalData.uploadContext.map((u, i) => `${i + 1}. ${u.filename}: ${u.analysis.substring(0, 150)}...`).join('\n')}
```

**Output Structure:**
```json
{
  "multimodalInteractionSummary": {
    "voice": "15 minutes, discussed AI strategy and current challenges",
    "screenShare": "Showed Excel dashboard with revenue metrics",
    "documentsReviewed": ["budget.xlsx: Q1-Q4 projections", "team-structure.pdf: 50 employees"],
    "engagementScore": "High"
  }
}
```

---

## 8. Complete Integration Flow

### 8.1 Text Message with Webcam

```
1. User types message + webcam active
   ↓
2. handleSendMessage() creates userItem
   ↓
3. Latest webcam frame attached to message
   ↓
4. Message sent to /api/chat with attachment
   ↓
5. Orchestrator loads multimodal context
   ↓
6. Discovery agent receives:
   - Message text
   - Webcam image attachment
   - Recent webcam analyses from context
   ↓
7. Agent references webcam naturally:
   "I see you're showing me your dashboard..."
```

---

### 8.2 Voice Conversation with Screen Share

```
1. User speaks + screen share active
   ↓
2. Voice transcribed by Gemini Live API
   ↓
3. Screen frames captured every 2 seconds
   ↓
4. Screen frames analyzed via /api/tools/webcam
   ↓
5. Analysis stored in multimodal context
   ↓
6. Context injected into Live API system instruction
   ↓
7. Agent responds with voice, referencing screen:
   "I can see your dashboard shows..."
```

---

### 8.3 File Upload with Text

```
1. User uploads PDF + types message
   ↓
2. File processed: base64 encoded
   ↓
3. Message created with attachment
   ↓
4. Sent to /api/chat with attachment
   ↓
5. Agent receives PDF in message attachments
   ↓
6. Agent analyzes PDF content
   ↓
7. Upload stored in multimodal context
   ↓
8. Future agents can reference upload:
   "Based on the document you uploaded earlier..."
```

---

## 9. Context Storage & Retrieval

### 9.1 Storage Layers

**1. Memory (Fastest):**
```typescript
// multimodal-context.ts
private activeContexts = new Map<string, MultimodalContext>()
```

**2. Redis (Active Sessions):**
```typescript
const cached = await vercelCache.get<MultimodalContext>('multimodal', sessionId)
```

**3. Supabase (Archived):**
```typescript
const stored = await this.contextStorage.get(sessionId)
```

**Retrieval Order:** Memory → Redis → Supabase

---

### 9.2 Context Archival

**Trigger:** Conversation ends

**Location:** `orchestrator.ts` → `trigger === 'conversation_end'`

**Code:**
```typescript
// 1. Archive multimodal context to Supabase (critical for PDF)
await multimodalContextManager.archiveConversation(context.sessionId)

// 2. Generate summary with full context (will load from Supabase)
const multimodalData = await multimodalContextManager.prepareChatContext(
  context.sessionId,
  true, // include visual
  true  // include audio
)
```

**What Gets Archived:**
- Full conversation history
- All visual analyses
- All audio transcripts
- All uploads
- Metadata (modalities used, tokens, timestamps)

---

## 10. Voice-Specific Integration

### 10.1 Voice Mode Routing

**Location:** `App.tsx` → `handleSendMessage()`

**Decision:**
```typescript
const shouldUseVoice = 
  connectionState === LiveConnectionState.CONNECTED &&
  liveServiceRef.current

if (shouldUseVoice) {
  // Send via Live API (WebSocket)
  if (file) {
    liveServiceRef.current?.sendRealtimeMedia(file)
  }
  if (text.trim()) {
    liveServiceRef.current?.sendText(text)
  }
}
```

**Difference:**
- **Voice Mode:** Direct WebSocket to Gemini Live API (real-time)
- **Agent Mode:** HTTP POST to `/api/chat` (orchestrated)

---

### 10.2 Voice Context Sync

**Location:** `server/context/orchestrator-sync.ts`

**Purpose:** Sync voice conversation to orchestrator for stage tracking

**Status:** ⚠️ **Currently disabled** to prevent duplicate responses

**Intended Flow:**
1. Voice conversation happens via Live API
2. Transcripts stored in multimodal context
3. Periodically sync to orchestrator
4. Update conversation flow / stage
5. Send stage updates to client

**Issue:** Causes "two voices" (Live API + orchestrator both respond)

**Future Fix:** Create metadata-only endpoint for stage updates

---

### 10.3 Voice Context Injection

**Location:** `server/live-api/config-builder.ts`

**How It Works:**
```typescript
// Load multimodal context
const contextData = await multimodalContextManager.prepareChatContext(
  sessionId,
  true, // include visual
  true  // include audio
)

// Inject into system instruction
if (contextData.multimodalContext?.recentAnalyses?.length > 0) {
  const recentSummary = contextData.multimodalContext.recentAnalyses
    .slice(-3)
    .join('; ')
  fullInstruction += `\n\nRECENT MULTIMODAL CONTEXT: ${recentSummary}`
}
```

**What Gets Injected:**
- Recent visual analyses (last 3)
- Recent uploads
- Conversation summaries
- Research context

**Impact:** Agent in voice mode has full context awareness

---

## 11. Format Conversion

### 11.1 Transcript to Messages

**Location:** `services/aiBrainService.ts` → `transcriptToMessages()`

**Purpose:** Convert `TranscriptItem[]` to `ChatMessage[]` format

**Code:**
```typescript
static transcriptToMessages(transcript: TranscriptItem[]): ChatMessage[] {
  return transcript
    .filter(item => item.text?.trim() || item.attachment)
    .map(item => {
      const msg: ChatMessage = {
        role: item.role === 'user' ? 'user' : 'model',
        content: item.text || '',
      }

      // Extract attachments
      if (item.attachment?.data && item.attachment?.mimeType) {
        msg.attachments = [{
          mimeType: item.attachment.mimeType,
          data: item.attachment.data
        }]
      }

      return msg
    })
}
```

**Handles:**
- Text messages
- Voice transcripts
- File attachments
- Webcam frames (as attachments)

---

### 11.2 Messages to AI Format

**Location:** `src/lib/format-messages.ts`

**Purpose:** Convert `ChatMessage[]` to Gemini API format

**Code:**
```typescript
export function formatMessagesForAI(messages: ChatMessage[]): any[] {
  return messages.map(msg => {
    const parts: any[] = []
    
    // Add text content
    if (msg.content) {
      parts.push({ text: msg.content })
    }
    
    // Add attachments (images/files)
    if (msg.attachments) {
      msg.attachments.forEach(att => {
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: att.data
          }
        })
      })
    }
    
    return {
      role: msg.role,
      parts
    }
  })
}
```

**Output Format:**
```typescript
{
  role: 'user' | 'assistant',
  parts: [
    { text: 'message text' },
    { inlineData: { mimeType: 'image/jpeg', data: 'base64...' } }
  ]
}
```

---

## 12. Summary Agent Multimodal Integration

### 12.1 Full Context Loading

**Location:** `src/core/agents/summary-agent.ts`

**Code:**
```typescript
// Get full multimodal context
const multimodalData = await multimodalContextManager.getConversationContext(
  sessionId,
  true, // include visual
  true  // include audio
)
```

**What It Loads:**
- All conversation history (text + voice)
- All visual analyses (webcam + screen)
- All audio transcripts
- All uploads with analyses

---

### 12.2 Summary Generation

**System Prompt Includes:**
```typescript
MULTIMODAL INTERACTION DATA:
Total messages: ${multimodalData.summary.totalMessages}
Modalities used: ${multimodalData.summary.modalitiesUsed.join(', ')}
Voice transcripts: ${multimodalData.audioContext.length} items
Screen/webcam captures: ${multimodalData.visualContext.length} items
Documents uploaded: ${multimodalData.uploadContext.length} items

Recent visual analyses:
${multimodalData.visualContext.map((v, i) => `${i + 1}. ${v.analysis.substring(0, 200)}...`).join('\n')}

Recent uploads:
${multimodalData.uploadContext.map((u, i) => `${i + 1}. ${u.filename}: ${u.analysis.substring(0, 150)}...`).join('\n')}
```

**Output Structure:**
```json
{
  "recommendedSolution": "workshop" | "consulting",
  "multimodalInteractionSummary": {
    "voice": "15 minutes, discussed AI strategy",
    "screenShare": "Showed dashboard with metrics",
    "documentsReviewed": ["budget.xlsx: Q1-Q4 projections"],
    "engagementScore": "High"
  }
}
```

---

### 12.3 PDF Delivery: Download vs Email

**Decision Logic:** Based on `recommendedSolution` from Summary Agent

**Location:** `src/core/intelligence/tool-suggestion-engine.ts`

**Tool Suggestions:**
```typescript
const CAPABILITY_BY_INTENT: Record<IntentResult['type'], Array<{ id: string; label: string; capability: string }>> = {
  consulting: [
    { id: 'finish', label: 'Finish & Email Summary', capability: 'exportPdf' },
    // ... other tools
  ],
  workshop: [
    { id: 'book', label: 'Schedule a workshop', capability: 'meeting' },
    // ... other tools
  ],
  other: [
    { id: 'pdf', label: 'Generate a PDF summary', capability: 'exportPdf' },
    // ... other tools
  ],
}
```

**Delivery Methods:**

1. **Consulting → Email PDF:**
   - **Trigger:** `recommendedSolution === 'consulting'`
   - **Action:** "Finish & Email Summary" tool suggestion
   - **Endpoint:** `/api/send-pdf-summary`
   - **Process:**
     - PDF generated via `generatePdfWithPuppeteer()` or `generatePdfWithPdfLib()`
     - PDF attached to email via `EmailService.sendEmail()`
     - Email sent to lead's email address
   - **Location:** `api/send-pdf-summary/route.ts`

2. **Workshop → Download PDF:**
   - **Trigger:** `recommendedSolution === 'workshop'` OR no explicit solution
   - **Action:** "Generate a PDF summary" tool suggestion (in "other" category)
   - **Process:**
     - PDF generated client-side via `generatePDF()` in `utils/pdfUtils.ts`
     - Uses jsPDF library (browser-based)
     - PDF downloaded directly via `doc.save(filename)`
   - **Location:** `utils/pdfUtils.ts`, `App.tsx` → `onGeneratePDF()`

**Code Flow:**

**Email (Consulting):**
```typescript
// api/send-pdf-summary/route.ts
export async function POST(request: Request) {
  const { sessionId, toEmail, leadName } = await request.json()
  
  // Fetch lead summary and conversation history
  const leadData = await supabase.from('lead_summaries').select('*').eq('session_id', sessionId).single()
  const activities = await supabase.from('activities').select('*').eq('session_id', sessionId)
  
  // Build HTML email body with conversation summary
  const emailBody = `...`
  
  // Send email with PDF attachment (if generated)
  const result = await EmailService.sendEmail({
    to: toEmail,
    subject: 'Your F.B/c AI Consultation Summary',
    html: emailBody,
    attachments: [/* PDF bytes */]
  })
}
```

**Download (Workshop):**
```typescript
// utils/pdfUtils.ts
export const generatePDF = ({ transcript, userProfile, researchContext }: PDFOptions) => {
  const { jsPDF } = window.jspdf
  const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' })
  
  // Generate PDF content (transcript, intelligence, etc.)
  // ...
  
  // Save/download PDF
  const filename = `FBC-Consultation-${userProfile?.name}-${Date.now()}.pdf`
  doc.save(filename)
}
```

**Why Different Methods:**
- **Consulting:** Higher-value engagement, professional email delivery expected
- **Workshop:** Lower-friction, immediate download for quick reference

**Summary Agent Output:**
```typescript
// summary-agent.ts determines recommendedSolution
const consultingScore = intelligenceContext?.fitScore?.consulting || 0
const workshopScore = intelligenceContext?.fitScore?.workshop || 0

summary.recommendedSolution = consultingScore > workshopScore ? 'consulting' : 'workshop'
```

**PDF Generation Workers:**
- **Server-side:** `src/core/queue/workers.ts` → `GENERATE_PDF` job
- **Client-side:** `utils/pdfUtils.ts` → Direct jsPDF generation

---

## 13. Performance Optimizations

### 13.1 Analysis Throttling

**Webcam/Screen:**
- Analysis interval: 2 seconds minimum
- Prevents API overload
- Reduces costs

**Code:**
```typescript
const ANALYSIS_INTERVAL_MS = 2000
const shouldAnalyze = (now - lastAnalysisAtRef.current >= ANALYSIS_INTERVAL_MS)
```

---

### 13.2 Quality Adjustment

**Webcam Streaming:**
- High buffer → Lower quality (0.75 JPEG)
- Normal buffer → Full quality
- Prevents WebSocket buffer overflow

**Code:**
```typescript
if (bufferedAmount > WEBSOCKET_CONFIG.HIGH_BUFFER_THRESHOLD) {
  currentQualityRef.current = WEBSOCKET_CONFIG.LOW_QUALITY_JPEG
}
```

---

### 13.3 Context Caching

**Memory Cache:**
- Active contexts stored in Map
- Fast retrieval (<1ms)

**Redis Cache:**
- Active sessions cached
- 1-hour TTL

**Supabase:**
- Archived sessions
- Permanent storage

---

## 14. Error Handling

### 14.1 Analysis Failures

**Webcam/Screen:**
- Analysis failure → Continue without analysis
- Frame still streamed to Live API
- Context update skipped if analysis fails

**Code:**
```typescript
try {
  const result = await uploadToBackend(blob, imageData, sessionId)
  if (result?.analysis) {
    // Store analysis
  }
} catch (err) {
  console.warn('Analysis failed, continuing without analysis')
  // Continue - analysis is enhancement, not critical
}
```

---

### 14.2 Context Loading Failures

**Orchestrator:**
```typescript
try {
  const multimodalData = await multimodalContextManager.prepareChatContext(...)
  multimodalContext = multimodalData.multimodalContext
} catch (error) {
  console.warn('Failed to load multimodal context:', error)
  // Fallback to empty context
  multimodalContext = {
    hasRecentImages: false,
    hasRecentAudio: false,
    hasRecentUploads: false,
    recentAnalyses: [],
    recentUploads: []
  }
}
```

**Impact:** Agent continues without multimodal context (graceful degradation)

---

## 15. Integration Examples

### Example 1: Text + Webcam

**User Action:**
- Types: "What do you think about this?"
- Webcam active, showing dashboard

**Flow:**
1. Text message created
2. Latest webcam frame attached
3. Sent to discovery agent
4. Agent sees dashboard in attachment
5. Agent responds: "I see your dashboard shows revenue declining 15% month-over-month. What's driving that trend?"

---

### Example 2: Voice + Screen Share

**User Action:**
- Speaks: "Can you help me understand this?"
- Screen share active, showing Excel spreadsheet

**Flow:**
1. Voice transcribed
2. Screen frames captured every 2s
3. Screen analyzed: "Excel spreadsheet with Q1-Q4 revenue data"
4. Analysis injected into Live API context
5. Agent responds via voice: "I can see your spreadsheet shows Q4 revenue is down. Let's discuss what's causing that."

---

### Example 3: File Upload + Text

**User Action:**
- Uploads: `budget.xlsx`
- Types: "Review this and give me feedback"

**Flow:**
1. File base64 encoded
2. Message created with attachment
3. Sent to agent
4. Agent analyzes PDF content
5. Agent responds: "I see your budget allocates $50K for AI tools. Based on your team size, here's what I'd recommend..."

---

### Example 4: Summary with All Modalities

**User Action:**
- Conversation ends (goodbye)

**Flow:**
1. Summary agent triggered
2. Loads full multimodal context:
   - 25 text messages
   - 15 voice transcripts
   - 8 screen analyses
   - 3 file uploads
3. Generates comprehensive summary
4. Includes multimodal engagement score
5. Determines `recommendedSolution` (workshop vs consulting)
6. **PDF Delivery:**
   - **If consulting:** PDF generated server-side, sent via email
   - **If workshop:** PDF generated client-side, downloaded directly

---

## 16. Key Integration Points

### 16.1 Frontend → Backend

**Text:**
- `App.tsx` → `AIBrainService.chat()` → `/api/chat`

**Voice:**
- `GeminiLiveService` → WebSocket → `server/handlers/realtime-input-handler.ts`

**Webcam/Screen:**
- `useCamera`/`useScreenShare` → `/api/tools/webcam` → Analysis stored

**File Upload:**
- `ChatInputDock` → `App.tsx` → Attached to message → `/api/chat`

---

### 16.2 Backend → Agents

**Orchestrator:**
- Loads multimodal context via `multimodalContextManager.prepareChatContext()`
- Injects into `AgentContext`
- All agents receive `multimodalContext` parameter

**Agents:**
- Reference `multimodalContext.hasRecentImages`
- Use `multimodalContext.recentAnalyses`
- Check `multimodalContext.hasRecentUploads`

---

### 16.3 Storage → Summary

**Archive:**
- `multimodalContextManager.archiveConversation()`
- Stores in Supabase

**Summary:**
- `multimodalContextManager.getConversationContext()`
- Loads from Supabase
- Includes all modalities

---

## 17. Code Locations Reference

### Frontend:
- `components/chat/ChatInputDock.tsx` - Text/file input
- `src/hooks/media/useCamera.ts` - Webcam capture
- `src/hooks/media/useScreenShare.ts` - Screen capture
- `src/hooks/voice/useVoice.ts` - Voice integration
- `services/geminiLiveService.ts` - Live API client
- `App.tsx` - Main orchestration

### Backend:
- `api/chat.ts` - Agent endpoint
- `api/tools/webcam.ts` - Webcam/screen analysis
- `api/chat/persist-message.ts` - Message persistence
- `server/handlers/realtime-input-handler.ts` - Voice input
- `server/context/orchestrator-sync.ts` - Voice sync (disabled)
- `server/live-api/config-builder.ts` - Voice context injection

### Context Management:
- `src/core/context/multimodal-context.ts` - Core storage
- `src/core/agents/orchestrator.ts` - Context loading
- `src/core/agents/*-agent.ts` - Agent usage

---

## 18. Future Enhancements

### 18.1 Real-Time Analysis Streaming

**Current:** Analysis happens every 2 seconds

**Future:** Stream analysis results in real-time as frames arrive

---

### 18.2 Semantic Context Retrieval

**Current:** Recent context only (last 3 items)

**Future:** Semantic search for relevant past multimodal moments

**Code:**
```typescript
// Already implemented but not fully used
const semanticContext = await multimodalContextManager.getSemanticContext(
  sessionId,
  currentMessage,
  5
)
```

---

### 18.3 Cross-Modal References

**Current:** Agents reference modalities separately

**Future:** Agents can say "When you showed me X on screen while discussing Y..."

---

## Summary

**The Multimodal Integration System:**

1. **5 Input Modalities:** Text, Voice, Webcam, Screen, Files
2. **Unified Storage:** `MultimodalContextManager` stores all modalities
3. **Agent Integration:** All agents receive multimodal context
4. **Context Injection:** Visual/audio/upload data injected into agent prompts
5. **Summary Integration:** Summary agent uses full multimodal history
6. **Performance:** Throttling, caching, quality adjustment
7. **Error Handling:** Graceful degradation if analysis fails

**Key Benefits:**
- Agents have full context awareness
- Natural references to what user showed
- Higher engagement scores for multimodal usage
- Comprehensive summaries include all interaction types
- Seamless integration across all modalities

---

**End of Documentation**

