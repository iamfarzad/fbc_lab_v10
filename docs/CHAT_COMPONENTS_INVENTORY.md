# Chat Components Complete Inventory

**Date:** 2025-12-06  
**Purpose:** Complete reference of all chat-related components, their locations, and purposes

---

## Issues Identified

### 1. "[System: Context Loaded]" Message
**Location:** `App.tsx` lines 414-425  
**Issue:** System message appears as regular chat message  
**Fix Needed:** Should be hidden or styled as system notification

### 2. Booking Link as Raw Text
**Location:** `src/core/agents/discovery-agent.ts` lines 34-45  
**Issue:** Returns booking URL as plain text instead of calendar widget  
**Fix Needed:** Should call `create_calendar_widget` tool instead

### 3. Context Sources Icons Missing Tooltips
**Location:** `components/chat/ContextSources.tsx` lines 74-92  
**Issue:** Icons have `title` attribute but no visible tooltips  
**Fix Needed:** Add proper tooltip component

---

## Component Inventory

### Core Chat Components

#### 1. **MultimodalChat** (`components/MultimodalChat.tsx`)
- **Purpose:** Main chat container component
- **Features:**
  - Chat header with status badges
  - Messages area with scroll
  - Input dock integration
  - Drag & drop file upload
  - Resizable sidebar (desktop)
  - Mobile swipe gestures
- **Exports:** `MultimodalChat` (default)

#### 2. **ChatMessage** (`components/chat/ChatMessage.tsx`)
- **Purpose:** Renders individual chat messages
- **Features:**
  - User/Model message styling
  - Avatar display
  - Attachment rendering
  - Calendar widget integration
  - Discovery report preview
  - Reasoning/thinking process
  - Grounding sources
  - Error messages
  - Context sources badges
- **Exports:** `ChatMessage` (default)
- **Dependencies:**
  - `MarkdownRenderer`
  - `CalendarWidget`
  - `DiscoveryReportPreview`
  - `ContextSources`
  - `ErrorMessage`

#### 3. **ChatInputDock** (`components/chat/ChatInputDock.tsx`)
- **Purpose:** Input area with controls
- **Features:**
  - Collapsed pill view
  - Expanded full input view
  - Camera toggle
  - Screen share toggle
  - Voice session button
  - Voice dictation
  - File upload
  - Send button
- **Exports:** `ChatInputDock` (default)
- **States:**
  - Collapsed: Pill with camera, expand button, voice
  - Expanded: Full textarea with toolbar

#### 4. **MarkdownRenderer** (`components/chat/MarkdownRenderer.tsx`)
- **Purpose:** Renders markdown content in messages
- **Features:**
  - Headings (H2, H3)
  - Lists (bulleted)
  - Code blocks
  - Inline code
  - Links (orange accent)
  - Bold/italic
  - Blockquotes
  - Tables (via MarkdownTable)
- **Exports:** `MarkdownRenderer` (default)
- **Dependencies:** `CodeBlock`, `MarkdownTable`

---

### Attachment & Media Components

#### 5. **Attachments** (`components/chat/Attachments.tsx`)
- **Purpose:** Handles file attachments and previews
- **Exports:**
  - `WebPreviewCard` - Preview card for web/map sources
  - `Lightbox` - Full-screen attachment preview
  - `StagingArea` - File selection preview
- **Features:**
  - Image zoom/pan
  - Text file preview with syntax highlighting
  - File metadata display
  - Remove file button

#### 6. **CalendarWidget** (`components/chat/CalendarWidget.tsx`)
- **Purpose:** Booking calendar widget
- **Features:**
  - Animated particle background
  - "Book Free 30-Min Call" button
  - Opens Cal.com booking URL
  - F.B/c branding
- **Exports:** `CalendarWidget` (function)
- **Trigger:** `item.attachment.type === 'calendar_widget'`
- **Issue:** Not being created when agent mentions booking link

#### 7. **DiscoveryReportPreview** (`components/chat/DiscoveryReportPreview.tsx`)
- **Purpose:** Preview for AI Discovery Report PDFs
- **Features:**
  - HTML content preview
  - PDF download button
  - Email PDF button
  - Book a call button
- **Exports:** `DiscoveryReportPreview` (default)
- **Trigger:** `item.attachment.type === 'discovery_report'`

#### 8. **FileUpload** (`components/chat/FileUpload.tsx`)
- **Purpose:** Multi-file upload component (NOT CURRENTLY USED)
- **Status:** ❌ Not imported in MultimodalChat
- **Exports:**
  - `FileUpload` (default)
  - `UploadButton` (standalone button)
- **Note:** ChatInputDock uses native file input instead

#### 9. **WebcamPreview** (`components/chat/WebcamPreview.tsx`)
- **Purpose:** Webcam video preview overlay
- **Location:** Rendered in `App.tsx` (outside MultimodalChat)
- **Features:**
  - Floating overlay
  - Frame capture
  - Quality indicators
- **Exports:** `WebcamPreview` (default)

#### 10. **ScreenSharePreview** (`components/chat/ScreenSharePreview.tsx`)
- **Purpose:** Screen share preview overlay
- **Location:** Rendered in `App.tsx` (outside MultimodalChat)
- **Features:**
  - Floating overlay
  - Screen capture display
- **Exports:** `ScreenSharePreview` (default)

---

### UI Enhancement Components

#### 11. **ContextSources** (`components/chat/ContextSources.tsx`)
- **Purpose:** Shows what context AI is using
- **Features:**
  - Compact mode (icon badges) - **THESE ARE THE ICONS YOU SEE**
  - Expanded mode (full list)
  - Context types:
    - Company (Building icon)
    - Person (User icon)
    - Location (MapPin icon)
    - Conversation (MessageSquare icon)
    - File (FileText icon)
    - Webcam (Camera icon)
    - Screen (Monitor icon)
    - Web (Globe icon)
- **Exports:**
  - `ContextSources` (default)
  - `ContextBadge` (inline badge)
  - `buildContextSources` (helper function)
- **Issue:** Icons missing tooltips (only have `title` attribute)
- **Location in ChatMessage:** Lines 189-196 (compact badges)

#### 12. **ErrorMessage** (`components/chat/ErrorMessage.tsx`)
- **Purpose:** Contextual error display
- **Features:**
  - Error type icons
  - Retry button
  - Dismiss button
  - Expandable details
  - Compact/full modes
- **Exports:**
  - `ErrorMessage` (default)
  - `InlineError` (inline indicator)
  - `parseError` (error parser)
- **Error Types:**
  - network, rate_limit, auth, quota, timeout, server, unknown

#### 13. **MessageMetadata** (`components/chat/MessageMetadata.tsx`)
- **Purpose:** Expandable message metadata
- **Features:**
  - Timestamp
  - Response time
  - Model used
  - Token count
  - Tools used
- **Exports:**
  - `MessageMetadata` (default)
  - `InlineTimestamp` (inline timestamp)
  - `ResponseTimeBadge` (response time indicator)

#### 14. **ToolCallIndicator** (`components/chat/ToolCallIndicator.tsx`)
- **Purpose:** Shows active tool calls
- **Features:**
  - Floating indicator (bottom center)
  - Tool names display
  - Spinner animation
  - "+N" badge for multiple tools
- **Exports:**
  - `ToolCallIndicator` (default)
  - `FloatingToolIndicator` (floating version)
- **Location:** Rendered in MultimodalChat as floating component

#### 15. **EmptyState** (`components/chat/EmptyState.tsx`)
- **Purpose:** Empty chat state with suggestions
- **Features:**
  - F.B/c logo
  - Welcome text
  - Suggestion chips (4 buttons)
- **Exports:** `EmptyState` (default)
- **Suggestion Categories:**
  - Consulting (Audit AI strategy)
  - Sales (Draft sales script)
  - Research (Research competitor pricing)
  - Analysis (Summarize PDF)

---

### Content Rendering Components

#### 16. **CodeBlock** (`components/chat/CodeBlock.tsx`)
- **Purpose:** Syntax-highlighted code blocks
- **Features:**
  - Language detection
  - Copy button
  - Syntax highlighting
  - Line numbers (optional)
- **Exports:**
  - `CodeBlock` (default)
  - `InlineCode` (inline code)
- **Used by:** MarkdownRenderer

#### 17. **MarkdownTable** (`components/chat/MarkdownTable.tsx`)
- **Purpose:** Renders markdown tables
- **Features:**
  - Table parsing
  - Alignment support
  - Responsive design
  - Compact badge mode (optional)
- **Exports:**
  - `MarkdownTable` (default)
  - `isMarkdownTable` (validator)
  - `extractTables` (parser)
  - `TableBadge` (compact representation)
- **Used by:** MarkdownRenderer

---

### Utility Components

#### 18. **UIHelpers** (`components/chat/UIHelpers.tsx`)
- **Purpose:** Shared utility components and functions
- **Exports:**
  - `Tooltip` - Tooltip wrapper component
  - `Shimmer` - Loading shimmer effect (NOT USED)
  - `isTextMime` - MIME type checker
  - `decodeBase64` - Base64 decoder
  - `getDomain` - URL domain extractor
  - `formatBytes` - File size formatter
- **Note:** Shimmer component exists but not used (shows "Thinking..." text instead)

---

## Component Hierarchy

```
MultimodalChat
├── Chat Header
│   ├── StatusBadges (Location, Thinking)
│   ├── Theme Toggle
│   ├── Export PDF Button
│   ├── Book a Call Button
│   └── Close Button
├── Messages Area
│   ├── EmptyState (when no messages)
│   └── ChatMessage[] (for each item)
│       ├── Avatar
│       ├── Attachment Preview / CalendarWidget / DiscoveryReportPreview
│       ├── Reasoning Toggle
│       ├── Message Bubble (MarkdownRenderer)
│       ├── Grounding Sources
│       ├── Streaming Indicator
│       ├── ErrorMessage (if error)
│       └── ContextSources (compact badges) ← THESE ARE YOUR ICONS
├── FloatingToolIndicator (active tools)
├── ChatInputDock
│   ├── Collapsed State
│   └── Expanded State
└── Lightbox (attachment preview)
```

---

## Icon Meanings (ContextSources - Compact Mode)

The icons you see under AI messages are **ContextSources** in compact mode:

1. **Info Icon (i)** - Indicates context sources are available
2. **Building Icon** - Company context (company name/domain)
3. **User Icon** - Person context (contact name/role)
4. **MapPin Icon** - Location context (city/country)
5. **MessageSquare Icon** - Conversation history
6. **FileText Icon** - Uploaded files
7. **Camera Icon** - Webcam active
8. **Monitor Icon** - Screen share active
9. **Globe Icon** - Web sources

**Current Issue:** Icons have `title` attribute but no visible tooltips on hover.

---

## Fixes Needed

### Fix 1: Hide/Improve "[System: Context Loaded]" Message
**File:** `App.tsx` lines 414-425  
**Solution:** Either:
- Hide system messages (filter in ChatMessage)
- Style as system notification (different styling)
- Remove text, show only research card

### Fix 2: Convert Booking Links to Calendar Widgets
**File:** `src/core/agents/discovery-agent.ts` lines 34-45  
**Solution:** Instead of returning text with URL, agent should:
- Call `create_calendar_widget` tool
- Return text without URL
- Let tool handler create calendar widget attachment

### Fix 3: Add Tooltips to ContextSources Icons
**File:** `components/chat/ContextSources.tsx` lines 74-92  
**Solution:** Wrap icons in `Tooltip` component from `UIHelpers.tsx`

---

## Component Status Summary

| Component | Location | Status | Used In |
|-----------|----------|--------|---------|
| MultimodalChat | `components/MultimodalChat.tsx` | ✅ Active | App.tsx |
| ChatMessage | `components/chat/ChatMessage.tsx` | ✅ Active | MultimodalChat |
| ChatInputDock | `components/chat/ChatInputDock.tsx` | ✅ Active | MultimodalChat |
| MarkdownRenderer | `components/chat/MarkdownRenderer.tsx` | ✅ Active | ChatMessage |
| ContextSources | `components/chat/ContextSources.tsx` | ✅ Active | ChatMessage |
| ErrorMessage | `components/chat/ErrorMessage.tsx` | ✅ Active | ChatMessage |
| CalendarWidget | `components/chat/CalendarWidget.tsx` | ✅ Active | ChatMessage |
| CodeBlock | `components/chat/CodeBlock.tsx` | ✅ Active | MarkdownRenderer |
| MarkdownTable | `components/chat/MarkdownTable.tsx` | ✅ Active | MarkdownRenderer |
| MessageMetadata | `components/chat/MessageMetadata.tsx` | ✅ Active | ChatMessage |
| ToolCallIndicator | `components/chat/ToolCallIndicator.tsx` | ✅ Active | MultimodalChat |
| EmptyState | `components/chat/EmptyState.tsx` | ✅ Active | MultimodalChat |
| FileUpload | `components/chat/FileUpload.tsx` | ❌ Unused | - |
| WebcamPreview | `components/chat/WebcamPreview.tsx` | ✅ Active | App.tsx |
| ScreenSharePreview | `components/chat/ScreenSharePreview.tsx` | ✅ Active | App.tsx |
| DiscoveryReportPreview | `components/chat/DiscoveryReportPreview.tsx` | ✅ Active | ChatMessage |
| Attachments | `components/chat/Attachments.tsx` | ✅ Active | MultimodalChat, ChatMessage |
| UIHelpers | `components/chat/UIHelpers.tsx` | ✅ Active | Multiple |

---

**Last Updated:** 2025-12-06

