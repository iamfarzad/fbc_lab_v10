# Chat Page Components & Buttons Inventory

**Date:** 2025-01-27  
**Scope:** Complete inventory of all buttons, components, and interactive elements on the chat page

---

## Overview

The chat page (`MultimodalChat.tsx`) is a comprehensive interface with multiple states, interactive elements, and nested components. This document catalogs every button, component, and interactive element for reference.

---

## 1. Chat Header (Top Bar)

**Location:** `components/MultimodalChat.tsx` (lines 312-400)

### Buttons

1. **Theme Toggle Button** (`components/MultimodalChat.tsx` lines 333-345)
   - **Icon:** Sun (light mode) / Moon (dark mode)
   - **Action:** Toggles dark/light theme
   - **Location:** Header right side
   - **Props:** `onToggleTheme`

2. **Export PDF Button** (`components/MultimodalChat.tsx` lines 347-388)
   - **Icon:** Document/File icon
   - **Action:** Opens dropdown menu
   - **Location:** Header right side
   - **Disabled:** When `items.length === 0`
   - **Props:** `onGeneratePDF`, `onEmailPDF`
   - **Dropdown Options:**
     - **Download PDF Button** (`components/MultimodalChat.tsx` lines 362-371) - Downloads transcript as PDF
     - **Email PDF Button** (`components/MultimodalChat.tsx` lines 373-384) - Emails PDF to user (shows email prefix if available)

3. **Book a Call Button** (`components/MultimodalChat.tsx` - Option 1: Header placement)
   - **Icon:** Phone/telephone icon
   - **Action:** Opens Cal.com booking URL in new tab
   - **Location:** Header right side (between PDF export and close button)
   - **URL:** `CONTACT_CONFIG.SCHEDULING.BOOKING_URL`
   - **Status:** Recommended placement - always visible, matches header pattern

4. **Close Chat Button** (`components/MultimodalChat.tsx` lines 390-398)
   - **Icon:** X (close icon)
   - **Action:** Hides/closes chat panel
   - **Location:** Header right side
   - **Props:** `onToggleVisibility(false)`

### Components

- **Connection Status Dot** (`components/MultimodalChat.tsx` line 317)
  - Orange pulsing dot when `connectionState === CONNECTED`
  - Gray when disconnected
  - Location: Header left side

- **F.B/c Title** (`components/MultimodalChat.tsx` lines 318-320)
  - Brand name display: "F.B/c"
  - Font: Mono, semibold
  - Location: Header left side

- **StatusBadges Component** (`components/StatusBadges.tsx`)
  - **Location Active Badge** - Shows when `isLocationShared` is true
    - Icon: MapPin
    - Pulsing orange dot
  - **Thinking Badge** - Shows when `isProcessing` is true
    - Icon: Brain
    - Pulsing orange dot
  - Only visible when at least one badge is active

---

## 2. Chat Input Dock (Bottom)

**Location:** `components/chat/ChatInputDock.tsx`

### Collapsed State (Pill View)

**Buttons:**

1. **Camera Toggle Button** (`components/chat/ChatInputDock.tsx` lines 333-342)
   - **Icon:** Camera (active) / CameraOff (inactive)
   - **Action:** Toggles webcam on/off
   - **Location:** Left side of pill
   - **Props:** `onWebcamChange(!isWebcamActive)`
   - **State:** Blue background when active

2. **Expand Input Button** (`components/chat/ChatInputDock.tsx` lines 344-349)
   - **Text:** "Ask F.B/c..."
   - **Action:** Expands to full input view
   - **Location:** Center of pill (clickable area)
   - **Props:** `setIsExpanded(true)`

3. **Voice Session Button** (`components/chat/ChatInputDock.tsx` lines 353-380)
   - **Icon:** Mic icon / Animated bars when connected
   - **Action:** Starts/stops voice connection
   - **Location:** Right side of pill
   - **Props:** `onConnect()` / `onDisconnect()`
   - **States:**
     - **Connected:** Orange background with pulsing animation
     - **Connecting:** Orange background with spinner
     - **Disconnected:** Transparent with hover state

### Expanded State (Full Input View)

**Buttons:**

1. **Close Expanded View Button** (`components/chat/ChatInputDock.tsx` lines 233-239)
   - **Icon:** X
   - **Action:** Collapses input back to pill
   - **Location:** Top right of textarea area
   - **Tooltip:** "Close Expanded View"

2. **Voice Dictation Button** (`components/chat/ChatInputDock.tsx` lines 241-252)
   - **Icon:** Mic
   - **Action:** Toggles speech-to-text dictation
   - **Location:** Top right of textarea area
   - **Tooltip:** "Voice Dictation" / "Stop Dictation"
   - **State:** Red pulsing background when listening
   - **Uses:** Web Speech API 

   this button cant the same buttons as the mic button one of them needs to change, and the voice button need to be acesable to the user when the chat is expaned, so here we need to think how to solve this issue. 

3. **Upload File Button** (`components/chat/ChatInputDock.tsx` lines 258-265)
   - **Icon:** Paperclip
   - **Action:** Opens file picker dialog
   - **Location:** Bottom toolbar, left side
   - **Tooltip:** "Upload File"
   - **Accepts:** `image/*, application/pdf, text/plain, text/csv, application/json`

4. **Camera Toggle Button** (`components/chat/ChatInputDock.tsx` lines 267-274)
   - **Icon:** Camera (active) / CameraOff (inactive)
   - **Action:** Toggles webcam on/off
   - **Location:** Bottom toolbar
   - **Tooltip:** "Open Camera" / "Close Camera"
   - **State:** Blue background when active

5. **Screen Share Toggle Button** (`components/chat/ChatInputDock.tsx` lines 276-290)
   - **Icon:** Monitor (active) / MonitorOff (inactive)
   - **Action:** Toggles screen sharing
   - **Location:** Bottom toolbar
   - **Tooltip:** "Share Screen" / "Stop Sharing"
   - **State:** Purple background when active
   - **Disabled:** When `isScreenShareInitializing` is true
   - **Props:** `onScreenShareToggle`

6. **Stop Generation Button** (`components/chat/ChatInputDock.tsx` lines 294-302)
   - **Icon:** Square/Stop icon
   - **Action:** Stops AI response generation
   - **Location:** Bottom toolbar, right side
   - **Tooltip:** "Stop Generating"
   - **Visible:** Only when `isGenerating && onStopGeneration` is true
   - **Props:** `onStopGeneration`

7. **Send Message Button** (`components/chat/ChatInputDock.tsx` lines 304-317)
   - **Icon:** ArrowUp
   - **Action:** Sends message with text and/or file
   - **Location:** Bottom toolbar, right side
   - **Tooltip:** "Send Message"
   - **Disabled:** When `!inputValue.trim() && !selectedFile`
   - **State:** 
     - Active: Black/white background
     - Disabled: Gray background

**Components:**

- **Textarea Input** (`components/chat/ChatInputDock.tsx` lines 218-229)
  - **Placeholder:** "Message F.B/c..."
  - **Features:**
    - Auto-height adjustment (max 160px)
    - Enter to send (Shift+Enter for newline)
    - Paste image support
    - Drag & drop support

- **StagingArea Component** (`components/chat/Attachments.tsx` lines 146-182)
  - Shows selected file preview
  - **Remove File Button** (`components/chat/Attachments.tsx` lines 172-178):
    - **Icon:** X (close icon)
    - **Location:** Right side of file preview
    - **Action:** Removes selected file
    - **Tooltip:** "Remove file"
    - **Style:** Red hover state
  - Displays file name, type, size, and preview

---

## 3. Chat Messages Area

**Location:** `components/MultimodalChat.tsx` (lines 402-425)  
**Component:** `components/chat/ChatMessage.tsx`

### Per Message Components

1. **Avatar Component** (`components/chat/ChatMessage.tsx` lines 40-48)
   - **User Avatar:** User icon in gray circle
   - **F.B/c Avatar:** "FB" text in black/white circle
   - **Location:** Left side (user) or right side (model)

2. **ChatMessage Component** (`components/chat/ChatMessage.tsx`)
   - **User Messages:** Gray bubble with rounded corners
   - **Model Messages:** White/transparent background with border
   - **Content:** Rendered via `MarkdownRenderer` (`components/chat/MarkdownRenderer.tsx`)
   - **Speaker Label:** "You" or "F.B/c" above message

3. **Attachment Preview Button** (`components/chat/ChatMessage.tsx` lines 69-77)
   - **Action:** Opens attachment in Lightbox
   - **Location:** Above message text
   - **Visible:** When `item.attachment.type === 'image' || 'file'`
   - **Props:** `onPreview(item.attachment)`
   - Shows file icon and name

4. **CalendarWidget Component** (`components/chat/CalendarWidget.tsx`)
   - **Visible:** When `item.attachment.type === 'calendar_widget'`
   - **Button** (`components/chat/CalendarWidget.tsx` lines 145-183): "Book Free 30-Min Call"
     - **Action:** Opens booking URL in new tab
     - **Style:** Gradient orange-blue button with calendar icon
   - **Features:** Animated particle background, F.B/c branding

5. **Reasoning Toggle (Details Element)** (`components/chat/ChatMessage.tsx` lines 91-102)
   - **Label:** "Thinking Process"
   - **Action:** Expandable/collapsible details
   - **Visible:** When `item.reasoning` exists
   - **Content:** Monospace text showing reasoning steps

6. **Grounding Sources** (`components/chat/ChatMessage.tsx` lines 125-149)
   - **Web Search Queries:** Shows search terms used
   - **Source Links:** Clickable links to verified sources
   - **Visible:** When `item.groundingMetadata.webSearchQueries` exists
   - **Format:** Numbered list with URLs and hostnames

7. **ResponseTimeBadge Component** (`components/chat/MessageMetadata.tsx` lines 221-238)
   - **Visible:** On last model message when `item.processingTime` exists
   - **Content:** Lightning icon + response time (ms/s)
   - **Style:** Small badge with gray background

8. **Streaming Indicator** (`components/chat/ChatMessage.tsx` lines 152-156)
   - **Text:** "Thinking..."
   - **Visible:** When `item.status === 'streaming' && !item.text`

9. **System Message Display** (`components/chat/ChatMessage.tsx` lines 29-37)
   - **Format:** Centered, uppercase, monospace text
   - **Visible:** When message starts with `[System:`
   - **Style:** Small gray text

10. **CodeBlock Component** (`components/chat/CodeBlock.tsx`)
    - **Copy Button** (`components/chat/CodeBlock.tsx` lines 167-183) - Copies code to clipboard
      - **Icon:** Copy icon / Check icon (when copied)
      - **Location:** Top right of code block header
      - **Action:** Copies entire code block to clipboard
      - **Feedback:** Shows "Copied" with checkmark for 2 seconds
      - **Visible:** When `showCopy === true` (default)

11. **MessageMetadata Component** (`components/chat/MessageMetadata.tsx`)
    - **Expand/Collapse Button** (`components/chat/MessageMetadata.tsx` lines 83-100, 114-119) - Toggles metadata details
      - **Location:** Clickable on compact view, button in expanded view
      - **Action:** Expands to show timestamp, response time, model, tokens, tools
      - **Collapse Button:** ChevronUp icon in expanded header
      - **Visible:** When `expandable === true` and metadata exists

12. **ContextSources Component** (`components/chat/ContextSources.tsx`)
    - **Expand/Collapse Button** (`components/chat/ContextSources.tsx` lines 98-113) - Toggles context sources list
      - **Icon:** ChevronDown/ChevronUp
      - **Location:** Header of context sources panel
      - **Action:** Shows/hides list of active context sources
      - **Visible:** When `sources.length > 0` and not in compact mode

13. **MarkdownTable Component** (`components/chat/MarkdownTable.tsx`)
    - **TableBadge Button** (`components/chat/MarkdownTable.tsx` lines 179-197) (optional)
      - **Action:** Custom onClick handler (if provided)
      - **Content:** Shows "X × Y table" with table icon
      - **Visible:** When used as compact table representation

14. **ErrorMessage Component** (`components/chat/ErrorMessage.tsx`)
    - **Retry Button** (`components/chat/ErrorMessage.tsx` lines 139-145, 190-202) - Retries failed operation
      - **Icon:** RefreshCw (spinning when retrying)
      - **Location:** Error message actions area
      - **States:** 
        - Compact: Small icon button
        - Full: "Try Again" button with text
      - **Disabled:** When `retrying === true` or `countdown > 0`
    - **Dismiss Button** (`components/chat/ErrorMessage.tsx` lines 166-171) - Closes error message
      - **Icon:** X
      - **Location:** Top right of error message
      - **Visible:** When `onDismiss` prop provided
    - **Show/Hide Details Button** (`components/chat/ErrorMessage.tsx` lines 206-212) - Toggles error details
      - **Icon:** ChevronDown/ChevronUp
      - **Location:** Error message actions area
      - **Visible:** When `error.details` exists
    - **Inline Retry Button** (`components/chat/ErrorMessage.tsx` lines 279-284) - Inline retry link
      - **Text:** "Retry" (underlined link)
      - **Location:** Inline error indicator
      - **Visible:** When used as `InlineError` component

---

## 4. Empty State (No Messages)

**Location:** `components/chat/EmptyState.tsx`

### Buttons (Suggestion Chips)

1. **"Audit my AI strategy" Button** (`components/chat/EmptyState.tsx` lines 49-65)
   - **Icon:** Zap
   - **Category:** Consulting
   - **Action:** Sends suggestion text to chat

2. **"Draft a sales script" Button** (`components/chat/EmptyState.tsx` lines 49-65)
   - **Icon:** MessageSquare
   - **Category:** Sales
   - **Action:** Sends suggestion text to chat

3. **"Research competitor pricing" Button** (`components/chat/EmptyState.tsx` lines 49-65)
   - **Icon:** Search
   - **Category:** Research
   - **Action:** Sends suggestion text to chat

4. **"Summarize this PDF" Button** (`components/chat/EmptyState.tsx` lines 49-65)
   - **Icon:** FileText
   - **Category:** Analysis
   - **Action:** Sends suggestion text to chat

### Components

- **F.B/c Logo** (`components/chat/EmptyState.tsx` lines 27-34)
  - **Style:** White/black rounded square with gradient shadow
  - **Text:** "F.B/c" with orange slash
  - **Size:** 80x80px

- **Welcome Text** (`components/chat/EmptyState.tsx` lines 37-44)
  - **Heading:** "Consulting Intelligence"
  - **Description:** "Advanced analysis, strategy formulation, and rapid content generation."

---

## 5. Floating Components

### FloatingToolIndicator Component

**Location:** `components/chat/ToolCallIndicator.tsx`

- **Visible:** When `activeTools.filter(t => t.status === 'running')` has items
- **Position:** Fixed bottom, centered horizontally
- **Content:**
  - Spinner icon
  - Active tool names (up to 2 shown)
  - "+N" badge if more than 2 tools
- **Style:** White/black backdrop with blur, rounded pill

### Lightbox Component

**Location:** `components/chat/Attachments.tsx` (lines 46-138)

- **Visible:** When `previewItem` is set
- **Action:** Full-screen attachment preview
- **Close Button** (`components/chat/Attachments.tsx` lines 85-90):
  - **Icon:** X (close icon)
  - **Location:** Top right corner
  - **Action:** Closes lightbox
  - **Alternative:** Click outside image to close
- **Features:**
  - Image zoom (scroll to zoom, drag to pan)
  - Text file preview with syntax highlighting
  - File metadata display
- **Props:** `onClose={() => setPreviewItem(null)}`

### Drag & Drop Overlay

**Location:** `components/MultimodalChat.tsx` (lines 272-280)

- **Visible:** When `isDragging === true`
- **Content:**
  - Upload icon
  - "Drop to Analyze" heading
  - "Images, PDFs, and text files supported" text
- **Style:** Blue dashed border, backdrop blur

---

## 6. Interactive Elements (Not Buttons)

### Resize Handle

**Location:** `components/MultimodalChat.tsx` (lines 283-289)

- **Platform:** Desktop only (hidden on mobile)
- **Action:** Drag to resize chat sidebar width
- **Position:** Left edge of chat panel
- **Constraints:** 300px - 800px width
- **Style:** Invisible handle that shows blue on hover

### Mobile Drag Handle

**Location:** `components/MultimodalChat.tsx` (lines 303-310)

- **Platform:** Mobile only
- **Action:** Swipe down to close chat
- **Position:** Top of chat panel
- **Style:** Gray rounded bar (12px width, 6px height)

### Scroll Area

- **Location:** Messages container
- **Features:**
  - Custom scrollbar styling
  - Auto-scroll to bottom on new messages
  - Mask gradient at top/bottom
  - Smooth scrolling

---

## 7. Component Hierarchy

```
MultimodalChat
├── Drag & Drop Overlay (conditional)
├── Resize Handle (desktop only)
├── Mobile Drag Handle (mobile only)
├── Chat Header
│   ├── Connection Dot
│   ├── F.B/c Title
│   ├── StatusBadges
│   │   ├── Location Active Badge
│   │   └── Thinking Badge
│   ├── Theme Toggle Button
│   ├── Export PDF Button
│   │   └── PDF Menu Dropdown
│   │       ├── Download PDF Button
│   │       └── Email PDF Button
│   └── Close Chat Button
├── Messages Area
│   ├── EmptyState (when no messages)
│   │   ├── F.B/c Logo
│   │   ├── Welcome Text
│   │   └── Suggestion Buttons (4)
│   └── ChatMessage[] (for each item)
│       ├── Avatar
│       ├── Attachment Preview Button
│       ├── CalendarWidget (conditional)
│       ├── Reasoning Toggle
│       ├── Message Bubble
│       ├── Grounding Sources
│       ├── Streaming Indicator (conditional)
│       └── ResponseTimeBadge (conditional)
├── FloatingToolIndicator
├── ChatInputDock
│   ├── Collapsed State
│   │   ├── Camera Toggle Button
│   │   ├── Expand Input Button
│   │   └── Voice Session Button
│   └── Expanded State
│       ├── StagingArea
│       │   └── Remove File Button
│       ├── Textarea
│       ├── Close Expanded View Button
│       ├── Voice Dictation Button
│       └── Toolbar
│           ├── Upload File Button
│           ├── Camera Toggle Button
│           ├── Screen Share Toggle Button
│           ├── Stop Generation Button (conditional)
│           └── Send Message Button
└── Lightbox (conditional)
    └── Close Button
```

---

## 8. Button States & Interactions

### Button States

- **Default:** Hover effects, transitions
- **Active:** Background color change, icon change
- **Disabled:** Opacity reduced, cursor not-allowed
- **Loading:** Spinner animation, pulse effect
- **Pressed:** Scale transform on click

### Interactive Features

- **Tooltips:** All buttons have tooltips via `Tooltip` component
- **Keyboard Shortcuts:**
  - Enter: Send message
  - Shift+Enter: New line
- **Drag & Drop:** File upload via drag over chat area
- **Paste:** Image paste support in textarea
- **Touch Gestures:** Mobile swipe to close

---

## 9. Component Files Reference

| Component | File Path |
|-----------|-----------|
| MultimodalChat | `components/MultimodalChat.tsx` |
| ChatInputDock | `components/chat/ChatInputDock.tsx` |
| ChatMessage | `components/chat/ChatMessage.tsx` |
| MarkdownRenderer | `components/chat/MarkdownRenderer.tsx` |
| EmptyState | `components/chat/EmptyState.tsx` |
| StatusBadges | `components/StatusBadges.tsx` |
| FloatingToolIndicator | `components/chat/ToolCallIndicator.tsx` |
| ResponseTimeBadge | `components/chat/MessageMetadata.tsx` |
| MessageMetadata | `components/chat/MessageMetadata.tsx` |
| CalendarWidget | `components/chat/CalendarWidget.tsx` |
| Lightbox | `components/chat/Attachments.tsx` |
| StagingArea | `components/chat/Attachments.tsx` |
| CodeBlock | `components/chat/CodeBlock.tsx` |
| ContextSources | `components/chat/ContextSources.tsx` |
| MarkdownTable | `components/chat/MarkdownTable.tsx` |
| ErrorMessage | `components/chat/ErrorMessage.tsx` |
| Tooltip | `components/chat/UIHelpers.tsx` |

---

## 10. Summary Statistics

- **Total Buttons:** ~35+ (varies by state, conditions, and message content)
- **Total Components:** ~25+ (including sub-components)
- **Interactive Elements:** 40+
- **States:** Collapsed/Expanded input, Connected/Disconnected, Generating/Idle
- **Responsive Breakpoints:** Mobile (< 768px) / Desktop (≥ 768px)

### Button Breakdown by Category

- **Header Buttons:** 3-4 (Theme, Export PDF, Book a Call [optional], Close)
- **Input Dock Buttons:** 7-8 (varies by state)
- **Message Content Buttons:** 5-10+ (varies by message type)
  - Attachment preview buttons
  - Calendar booking button
  - Code copy buttons
  - Metadata expand/collapse
  - Error retry/dismiss buttons
- **Empty State Buttons:** 4 (suggestion chips)
- **Floating/Modal Buttons:** 2-3 (Lightbox close, Tool indicator)
- **Utility Buttons:** Various (remove file, expand/collapse, etc.)

---

## 11. Book a Call Button Placement Options

The "Book a Call" button connects to Cal.com calendar booking. Below are placement options:

### Option 1: Header (Recommended) ✅

**Location:** `components/MultimodalChat.tsx` - Header right side, between PDF export and close button

**Implementation:**
```tsx
<button 
  onClick={() => window.open(CONTACT_CONFIG.SCHEDULING.BOOKING_URL, '_blank')}
  className={`w-8 h-8 flex items-center justify-center rounded-full transition-colors ${isDarkMode ? 'text-white/60 hover:bg-white/10' : 'text-black/60 hover:bg-black/5'}`}
  title="Book a Call"
>
  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
  </svg>
</button>
```

**Pros:**
- Always visible
- Consistent with header action pattern
- Doesn't interfere with chat flow
- Matches old design pattern

**Status:** Recommended implementation

### Option 2: Empty State CTA

**Location:** `components/chat/EmptyState.tsx` - Below suggestion chips

**Pros:**
- Prominent for first-time users
- Doesn't clutter header
- Natural placement in empty state

**Cons:**
- Only visible when chat is empty
- Less accessible during active conversation

### Option 3: Floating Button

**Location:** `components/MultimodalChat.tsx` - Fixed bottom-right, above input dock

**Pros:**
- Always accessible
- High visibility
- Doesn't interfere with header

**Cons:**
- May overlap with input dock on mobile
- Additional floating element

**Note:** The CalendarWidget component (`components/chat/CalendarWidget.tsx`) can also be embedded in messages via the `create_calendar_widget` tool call, providing contextual booking CTAs within conversation flow.

---

## Notes

- All buttons include accessibility features (tooltips, ARIA labels where applicable)
- Components follow monochrome design system with orange accent for active states
- Mobile and desktop have different layouts and interaction patterns
- File upload supports drag & drop, click, and paste methods
- Voice features require browser permissions (mic, camera)
- Screen sharing requires browser support and permissions

### Conditionally Rendered Components

Some components and their buttons only appear under specific conditions:

- **CodeBlock Copy Button:** Only visible when code blocks are rendered in messages
- **ErrorMessage Buttons:** Only visible when errors occur (retry, dismiss, show details)
- **ContextSources Component:** Only visible when context sources are available
- **MessageMetadata Expand Button:** Only visible when message has metadata (response time, tokens, etc.)
- **TableBadge Button:** Only visible when used as compact table representation (optional)
- **Stop Generation Button:** Only visible when `isGenerating === true`
- **PDF Export Buttons:** Disabled when `items.length === 0`
- **FloatingToolIndicator:** Only visible when active tools are running
- **ResponseTimeBadge:** Only visible on last model message with `processingTime`

---

---

## 12. Unused Components in Codebase

The following components exist in the codebase but are **NOT currently imported or rendered** in `MultimodalChat.tsx`:

### Not Imported in MultimodalChat

1. **FileUpload Component** (`components/chat/FileUpload.tsx`)
   - **Status:** ❌ Not imported anywhere
   - **Purpose:** Multi-file upload with progress bars, drag-and-drop, file type icons
   - **Exports:**
     - `FileUpload` (default export)
     - `UploadButton` (compact upload button)
   - **Note:** ChatInputDock uses native file input instead

2. **UploadButton Component** (`components/chat/FileUpload.tsx` lines 280-312)
   - **Status:** ❌ Not imported anywhere
   - **Purpose:** Compact upload button wrapper
   - **Note:** Standalone button component from FileUpload

3. **ContextSources Component** (`components/chat/ContextSources.tsx`)
   - **Status:** ✅ NOW CONNECTED in ChatMessage.tsx
   - **Purpose:** Shows what context the AI is using (company, person, location, files, etc.)
   - **Exports:**
     - `ContextSources` (default export)
     - `ContextBadge` (inline badge)
     - `buildContextSources` (helper function)
   - **Trigger:** Renders when `item.contextSources?.length > 0`
   - **Colors:** Neutralized to monochrome (zinc) + orange accent

4. **ErrorMessage Component** (`components/chat/ErrorMessage.tsx`)
   - **Status:** ✅ NOW CONNECTED in ChatMessage.tsx
   - **Purpose:** Contextual error display with retry functionality
   - **Exports:**
     - `ErrorMessage` (default export)
     - `InlineError` (inline error indicator)
     - `parseError` (error parsing function)
   - **Trigger:** Renders when `item.status === 'error' && item.error`
   - **Colors:** Neutralized to monochrome (zinc) + orange accent

5. **WebPreviewCard Component** (`components/chat/Attachments.tsx` lines 6-43)
   - **Status:** ⚠️ Used in AdminDashboard, not in MultimodalChat
   - **Purpose:** Preview card for web/map sources with favicon
   - **Note:** Currently only used in `components/AdminDashboard.tsx`

### Used Elsewhere (Not in MultimodalChat)

6. **WebcamPreview Component** (`components/chat/WebcamPreview.tsx`)
   - **Status:** ✅ Used in `App.tsx` (rendered separately as floating component)
   - **Location:** Rendered outside MultimodalChat in App.tsx (line 1850)
   - **Note:** This is intentional - webcam preview is a separate floating overlay

7. **ScreenSharePreview Component** (`components/chat/ScreenSharePreview.tsx`)
   - **Status:** ✅ Used in `App.tsx` (rendered separately as floating component)
   - **Location:** Rendered outside MultimodalChat in App.tsx (line 1868)
   - **Note:** This is intentional - screen share preview is a separate floating overlay

### Summary

- **Unused Components:** 3 (FileUpload, UploadButton, WebPreviewCard in chat)
- **Newly Connected:** 2 (ContextSources, ErrorMessage - now in ChatMessage.tsx)
- **Used Elsewhere:** 2 (WebcamPreview, ScreenSharePreview - rendered in App.tsx)
- **Total Not in MultimodalChat:** 7 components

### Potential Integration Points

- **ContextSources:** Could be added to message metadata or header to show active context
- **ErrorMessage:** Could be integrated for better error handling in chat messages
- **FileUpload:** Could replace native file input for better UX (though current implementation works)
- **WebPreviewCard:** Could be used in grounding sources display instead of plain links

---

## 13. AI Feature Implementation Status

Status of advanced AI features in the chat interface:

### ✅ Implemented Features

1. **Sources** (`components/chat/ChatMessage.tsx` lines 124-149)
   - **Status:** ✅ Fully Implemented
   - **Location:** Footer below message
   - **Features:**
     - Web search queries display (shows search terms used)
     - Verified sources list with clickable links
     - Source titles with hostnames
     - Numbered list format
   - **Data Source:** `item.groundingMetadata.groundingChunks` and `item.groundingMetadata.webSearchQueries`
   - **Note:** Sources appear at the bottom of messages, not inline

2. **Reasoning / Chain of Thought** (`components/chat/ChatMessage.tsx` lines 90-103)
   - **Status:** ✅ Fully Implemented
   - **Label:** "Thinking Process" (collapsible)
   - **Location:** Above message text
   - **Features:**
     - Expandable/collapsible details element
     - Monospace text display
     - Monochrome styling
   - **Data Source:** `item.reasoning` (type comment says "For Chain of Thought UI")
   - **Note:** Same feature, labeled as "Thinking Process" in UI

3. **Tool Use** (`components/chat/ToolCallIndicator.tsx`)
   - **Status:** ✅ Fully Implemented
   - **Component:** `FloatingToolIndicator`
   - **Location:** Fixed bottom, centered (floating above input)
   - **Features:**
     - Shows active tool names (up to 2 visible)
     - Spinner animation while tools are running
     - "+N" badge for additional tools
     - Status indicators (pending, running, complete, error)
   - **Data Source:** `activeTools` prop (ToolCall[])
   - **Visible:** Only when tools are actively running

### ⚠️ Partially Implemented

4. **Shimmer Effect** (`components/chat/UIHelpers.tsx` lines 16-27)
   - **Status:** ⚠️ Component Exists But Not Used
   - **Component:** `Shimmer` component available
   - **Current Implementation:** Shows "Thinking..." text instead (`components/chat/ChatMessage.tsx` lines 152-156)
   - **Note:** Shimmer component exists but is not imported/rendered. Current implementation uses simple text indicator.
   - **Location:** Would appear when `item.status === 'streaming' && !item.text`

### ❌ Not Implemented

5. **Inline Citations**
   - **Status:** ❌ Not Implemented
   - **Current Behavior:** Sources only appear at the bottom of messages
   - **Missing:** Inline citation markers (e.g., [1], [2]) within message text
   - **Note:** MarkdownRenderer supports links but not citation markers that connect to sources

### Feature Summary

| Feature | Status | Location | Notes |
|---------|--------|----------|-------|
| **Sources** | ✅ Implemented | Footer below message | Web queries + verified sources list |
| **Reasoning** | ✅ Implemented | Above message (collapsible) | Labeled as "Thinking Process" |
| **Chain of Thought** | ✅ Implemented | Same as Reasoning | Same feature, different name |
| **Tool Use** | ✅ Implemented | Floating indicator | Shows active tools |
| **Shimmer Effect** | ⚠️ Available but unused | N/A | Component exists, shows text instead |
| **Inline Citations** | ❌ Not implemented | N/A | Sources only at bottom |

### Implementation Details

**Sources Display:**
- Shows web search queries with search icon
- Lists verified sources with clickable links
- Format: `1. Source Title (hostname.com)`
- Appears when `item.groundingMetadata?.webSearchQueries?.length > 0`

**Reasoning Display:**
- Collapsible `<details>` element
- Label: "Thinking Process" (uppercase, monospace)
- Content: `item.reasoning` text in monospace font
- Appears when `item.reasoning` exists

**Tool Use Display:**
- Floating pill at bottom center
- Shows tool names (e.g., "WEB_SEARCH", "CALENDAR_WIDGET")
- Spinner animation during execution
- Only visible when `activeTools.filter(t => t.status === 'running').length > 0`

---

**Last Updated:** 2025-12-06  
**Maintained By:** Development Team

