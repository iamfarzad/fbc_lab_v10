# Complete Chat Page Inventory

**Generated:** December 6, 2025  
**Purpose:** Comprehensive list of everything that renders on the chat page, including all components, their file paths, imports, and unused files.

---

## 📋 Table of Contents

1. [Main Entry Point](#main-entry-point)
2. [Components Rendered on Chat Page](#components-rendered-on-chat-page)
3. [Component Dependency Tree](#component-dependency-tree)
4. [Files Imported and Used](#files-imported-and-used)
5. [Files NOT Imported (Unused)](#files-not-imported-unused)
6. [UI Elements Breakdown](#ui-elements-breakdown)
7. [Button Inventory](#button-inventory)

---

## Main Entry Point

### `components/MultimodalChat.tsx`
**Path:** `/Users/farzad/fbc_lab_v10/components/MultimodalChat.tsx`  
**Status:** ✅ **ACTIVE - Main chat container component**

**What it renders:**
- Chat header with connection status, badges, theme toggle, PDF menu, book call button, close button
- Empty state (when no messages)
- Chat messages list (via ChatMessage component)
- Floating tool indicator
- Chat input dock (bottom)
- Lightbox for attachments
- Drag & drop overlay
- Resize handle (desktop)
- Mobile drag handle

**Direct Imports:**
```typescript
import ChatMessage from './chat/ChatMessage'
import ChatInputDock from './chat/ChatInputDock'
import { Lightbox } from './chat/Attachments'
import { isTextMime } from './chat/UIHelpers'
import StatusBadges from './StatusBadges'
import EmptyState from './chat/EmptyState'
import { FloatingToolIndicator, ToolCall } from './chat/ToolCallIndicator'
import { ResponseTimeBadge } from './chat/MessageMetadata'
```

---

## Components Rendered on Chat Page

### 1. **ChatMessage** (`components/chat/ChatMessage.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/ChatMessage.tsx`  
**Status:** ✅ **ACTIVE - Renders individual chat messages**

**What it renders:**
- Avatar (User icon for user, "FB" text for AI)
- Speaker name ("You" or "F.B/c")
- File/Image attachments (with preview button)
- Calendar Widget (for calendar_widget attachments)
- AI Insights Report Preview (for discovery_report attachments)
- Reasoning/Thinking Process (collapsible details)
- Message bubble with MarkdownRenderer
- Grounding sources (web search queries and verified sources)
- Streaming indicator ("Thinking...")
- Error messages (via ErrorMessage component)
- Context Sources (compact badges)

**Imports:**
```typescript
import MarkdownRenderer from './MarkdownRenderer'
import { CalendarWidget } from './CalendarWidget'
import { DiscoveryReportPreview } from './DiscoveryReportPreview'
import ContextSources from './ContextSources'
import ErrorMessage from './ErrorMessage'
import { User } from 'lucide-react'
```

---

### 2. **ChatInputDock** (`components/chat/ChatInputDock.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/ChatInputDock.tsx`  
**Status:** ✅ **ACTIVE - Bottom input area**

**What it renders:**
- Text input textarea
- File upload button (paperclip icon)
- Webcam toggle button (camera icon)
- Screen share toggle button (monitor icon)
- Voice input button (mic icon)
- Send button (arrow up icon)
- Stop generation button (X icon, when generating)
- Connection status indicator
- StagingArea (file preview before sending)

**Imports:**
```typescript
import { Tooltip, isTextMime } from './UIHelpers'
import { StagingArea } from './Attachments'
import { Mic, Camera, CameraOff, Monitor, MonitorOff, Paperclip, X, ArrowUp, AudioLines } from 'lucide-react'
```

---

### 3. **EmptyState** (`components/chat/EmptyState.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/EmptyState.tsx`  
**Status:** ✅ **ACTIVE - Shown when no messages**

**What it renders:**
- F.B/c logo (in white/black box with shadow)
- Welcome text ("Consulting Intelligence")
- Description text
- Suggestion pills (4 buttons: "Audit my AI strategy", "Draft a sales script", "Research competitor pricing", "Summarize this PDF")

**Imports:**
```typescript
import { MessageSquare, Zap, FileText, Search } from 'lucide-react'
```

---

### 4. **StatusBadges** (`components/StatusBadges.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/StatusBadges.tsx`  
**Status:** ✅ **ACTIVE - Header badges**

**What it renders:**
- Location badge (if location shared)
- AI Processing badge (if processing)

**Imports:**
```typescript
import { MapPin, Brain } from 'lucide-react'
```

---

### 5. **MarkdownRenderer** (`components/chat/MarkdownRenderer.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/MarkdownRenderer.tsx`  
**Status:** ✅ **ACTIVE - Renders markdown in messages**

**What it renders:**
- Headers (h2, h3)
- Lists (ul, li)
- Blockquotes
- Code blocks (via CodeBlock component)
- Markdown tables (via MarkdownTable component)
- Inline code
- Bold text
- Italic text
- Links (with cal.com URL detection for CalendarWidget)

**Imports:**
```typescript
import CodeBlock from './CodeBlock'
import MarkdownTable, { isMarkdownTable } from './MarkdownTable'
import { CalendarWidget } from './CalendarWidget'
```

---

### 6. **CodeBlock** (`components/chat/CodeBlock.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/CodeBlock.tsx`  
**Status:** ✅ **ACTIVE - Code syntax highlighting**

**What it renders:**
- Syntax highlighted code
- Copy button
- Language label

**Imports:**
```typescript
import { Copy, Check } from 'lucide-react'
```

---

### 7. **MarkdownTable** (`components/chat/MarkdownTable.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/MarkdownTable.tsx`  
**Status:** ✅ **ACTIVE - Renders markdown tables**

**What it renders:**
- Styled HTML tables from markdown
- Table badge indicator

---

### 8. **CalendarWidget** (`components/chat/CalendarWidget.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/CalendarWidget.tsx`  
**Status:** ✅ **ACTIVE - Booking calendar widget**

**What it renders:**
- Particle background canvas
- F.B/c logo badge
- Title and description
- "Book Free 30-Min Call" button
- Footer with branding

**Imports:**
```typescript
import { CONTACT_CONFIG } from 'src/config/constants'
```

---

### 9. **DiscoveryReportPreview** (`components/chat/DiscoveryReportPreview.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/DiscoveryReportPreview.tsx`  
**Status:** ✅ **ACTIVE - AI Insights Report preview**

**What it renders:**
- **Inline view:**
  - Header with report name and expand button
  - Scaled-down iframe preview (50% scale)
  - Action buttons (Download, Email, Book Call)
- **Expanded view (modal):**
  - Full-screen iframe
  - Close button (X)
  - Action bar at bottom (Download PDF, Email Report, Book Call)

**Imports:**
```typescript
import { Download, Mail, Calendar, Maximize2, X, FileText } from 'lucide-react'
```

---

### 10. **ContextSources** (`components/chat/ContextSources.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/ContextSources.tsx`  
**Status:** ✅ **ACTIVE - Context source indicators**

**What it renders:**
- **Compact mode (default):**
  - Info icon with tooltip
  - Source type icons (Building, User, MapPin, MessageSquare, FileText, Camera, Monitor, Globe)
  - "+N more" indicator if >4 sources
- **Expanded mode:**
  - Collapsible list with full source details
  - External link icons

**Imports:**
```typescript
import { Building, User, MapPin, MessageSquare, FileText, Camera, Monitor, ChevronDown, ChevronUp, Globe, ExternalLink, Info } from 'lucide-react'
import { Tooltip } from './UIHelpers'
```

---

### 11. **ErrorMessage** (`components/chat/ErrorMessage.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/ErrorMessage.tsx`  
**Status:** ✅ **ACTIVE - Error display**

**What it renders:**
- Error message text
- Error type indicator
- Retry button (if retryable)
- Details (if available)

---

### 12. **ToolCallIndicator** (`components/chat/ToolCallIndicator.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/ToolCallIndicator.tsx`  
**Status:** ✅ **ACTIVE - Floating tool indicator**

**What it renders:**
- Floating badge showing active tools
- Tool status (pending, running, complete, error)
- Tool name

**Imports:**
```typescript
import { Loader2, Check, X } from 'lucide-react'
```

---

### 13. **MessageMetadata** (`components/chat/MessageMetadata.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/MessageMetadata.tsx`  
**Status:** ✅ **ACTIVE - Message metadata**

**What it renders:**
- **ResponseTimeBadge** (exported component used in MultimodalChat)
- **MessageMetadata** (full expandable metadata - NOT currently used in chat)
- **InlineTimestamp** (exported but NOT currently used)

**Exports:**
- `ResponseTimeBadge` - Used in MultimodalChat
- `MessageMetadata` - Full component (unused)
- `InlineTimestamp` - Inline timestamp (unused)

**Imports:**
```typescript
import { Clock, Cpu, Hash, ChevronDown, ChevronUp, Wrench, Zap } from 'lucide-react'
```

---

### 14. **Attachments** (`components/chat/Attachments.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/Attachments.tsx`  
**Status:** ✅ **ACTIVE - Attachment components**

**What it exports:**
- **Lightbox** - Full-screen attachment preview (used in MultimodalChat)
- **StagingArea** - File preview before sending (used in ChatInputDock)
- **WebPreviewCard** - Web source preview card (NOT currently used)

**Imports:**
```typescript
import { getDomain, decodeBase64, formatBytes } from './UIHelpers'
```

---

### 15. **UIHelpers** (`components/chat/UIHelpers.tsx`)
**Path:** `/Users/farzad/fbc_lab_v10/components/chat/UIHelpers.tsx`  
**Status:** ✅ **ACTIVE - Utility components and functions**

**What it exports:**
- `Tooltip` - Tooltip component (used in ChatInputDock, ContextSources)
- `Shimmer` - Shimmer effect component (NOT currently used)
- `isTextMime` - MIME type checker (used in MultimodalChat, ChatInputDock)
- `decodeBase64` - Base64 decoder (used in Attachments)
- `getDomain` - URL domain extractor (used in Attachments)
- `formatBytes` - File size formatter (used in Attachments, ChatInputDock)

---

## Component Dependency Tree

```
MultimodalChat.tsx
├── ChatMessage.tsx
│   ├── MarkdownRenderer.tsx
│   │   ├── CodeBlock.tsx
│   │   ├── MarkdownTable.tsx
│   │   └── CalendarWidget.tsx
│   ├── CalendarWidget.tsx
│   ├── DiscoveryReportPreview.tsx
│   ├── ContextSources.tsx
│   │   └── UIHelpers.tsx (Tooltip)
│   └── ErrorMessage.tsx
├── ChatInputDock.tsx
│   ├── UIHelpers.tsx (Tooltip, isTextMime)
│   └── Attachments.tsx (StagingArea)
├── EmptyState.tsx
├── StatusBadges.tsx
├── ToolCallIndicator.tsx
├── MessageMetadata.tsx (ResponseTimeBadge only)
└── Attachments.tsx (Lightbox)
```

---

## Files Imported and Used

### ✅ Active Components (16 files)

1. `components/MultimodalChat.tsx` - Main container
2. `components/chat/ChatMessage.tsx` - Message renderer
3. `components/chat/ChatInputDock.tsx` - Input area
4. `components/chat/EmptyState.tsx` - Empty state
5. `components/StatusBadges.tsx` - Header badges
6. `components/chat/MarkdownRenderer.tsx` - Markdown parser
7. `components/chat/CodeBlock.tsx` - Code syntax highlighting
8. `components/chat/MarkdownTable.tsx` - Table renderer
9. `components/chat/CalendarWidget.tsx` - Booking widget
10. `components/chat/DiscoveryReportPreview.tsx` - Report preview
11. `components/chat/ContextSources.tsx` - Context indicators
12. `components/chat/ErrorMessage.tsx` - Error display
13. `components/chat/ToolCallIndicator.tsx` - Tool status
14. `components/chat/MessageMetadata.tsx` - Metadata (partial use)
15. `components/chat/Attachments.tsx` - Attachment components
16. `components/chat/UIHelpers.tsx` - Utilities

### ✅ External Dependencies

- `lucide-react` - Icons (used extensively)
- `types` - TypeScript types (TranscriptItem, LiveConnectionState)
- `src/config/constants` - CONTACT_CONFIG

---

## Files NOT Imported (Unused)

### ❌ Unused Components in `components/chat/` (3 files)

1. **`components/chat/FileUpload.tsx`**
   - **Status:** ❌ **NOT IMPORTED**
   - **Purpose:** Multi-file upload with progress bars
   - **Why unused:** File upload is handled inline in ChatInputDock
   - **What it does:** Drag-and-drop, progress bars, file type icons, validation

2. **`components/chat/WebcamPreview.tsx`**
   - **Status:** ❌ **NOT IMPORTED**
   - **Purpose:** Webcam preview with face landmarks
   - **Why unused:** Webcam functionality may be handled elsewhere or not fully implemented
   - **What it does:** Camera feed, face mesh overlay, flip camera, capture frame

3. **`components/chat/ScreenSharePreview.tsx`**
   - **Status:** ❌ **NOT IMPORTED**
   - **Purpose:** Screen share preview component
   - **Why unused:** Screen share may be handled elsewhere or not fully implemented
   - **What it does:** Screen share stream display, toggle controls, capture button

### ⚠️ Partially Used Components

1. **`components/chat/Attachments.tsx`**
   - **WebPreviewCard** - Exported but NOT used anywhere
   - **Lightbox** - ✅ Used in MultimodalChat
   - **StagingArea** - ✅ Used in ChatInputDock

2. **`components/chat/MessageMetadata.tsx`**
   - **ResponseTimeBadge** - ✅ Used in MultimodalChat
   - **MessageMetadata** - ❌ Full component NOT used
   - **InlineTimestamp** - ❌ NOT used

3. **`components/chat/UIHelpers.tsx`**
   - **Shimmer** - ❌ Component exported but NOT used

---

## UI Elements Breakdown

### Header Section (MultimodalChat)

1. **Connection Dot** - Orange pulsing dot (connected) or gray (disconnected)
2. **Brand Text** - "F.B/c" (mono font)
3. **Divider** - Vertical line
4. **StatusBadges** - Location, AI Processing indicators
5. **Theme Toggle Button** - Sun/moon icon
6. **PDF Export Menu Button** - Document icon with dropdown
   - AI Insights Report option
   - Download Transcript option
   - Email PDF option
7. **Book a Call Button** - Phone icon
8. **Close Button** - X icon (if onToggleVisibility provided)

### Empty State (when no messages)

1. **Logo Box** - White/black rounded box with F.B/c logo
2. **Welcome Heading** - "Consulting Intelligence"
3. **Description Text** - Subtitle
4. **Suggestion Pills** (4 buttons):
   - "Audit my AI strategy" (Zap icon)
   - "Draft a sales script" (MessageSquare icon)
   - "Research competitor pricing" (Search icon)
   - "Summarize this PDF" (FileText icon)

### Chat Messages (ChatMessage)

1. **Avatar** - User icon (user) or "FB" text (AI)
2. **Speaker Name** - "You" or "F.B/c"
3. **File Attachment Card** - If file/image attached
4. **Calendar Widget** - If calendar_widget attachment
5. **AI Insights Report Preview** - If discovery_report attachment
6. **Reasoning Section** - Collapsible "Thinking Process" details
7. **Message Bubble** - White/transparent with MarkdownRenderer
8. **Grounding Sources** - Web search queries and verified source links
9. **Streaming Indicator** - "Thinking..." text
10. **Error Message** - ErrorMessage component
11. **Context Sources** - Compact icon badges

### Input Dock (ChatInputDock)

1. **Textarea** - Message input field
2. **File Upload Button** - Paperclip icon
3. **Webcam Toggle** - Camera/CameraOff icon
4. **Screen Share Toggle** - Monitor/MonitorOff icon
5. **Voice Input Button** - Mic icon
6. **Send Button** - ArrowUp icon
7. **Stop Generation Button** - X icon (when generating)
8. **Connection Status** - Connected/Disconnected indicator
9. **StagingArea** - File preview before sending

### Floating Elements

1. **FloatingToolIndicator** - Shows active tool calls
2. **Lightbox** - Full-screen attachment preview (modal)

---

## Button Inventory

### Header Buttons (8 total)

1. **Theme Toggle** - `components/MultimodalChat.tsx:336`
   - Icon: Sun/Moon (lucide-react)
   - Action: `onToggleTheme()`

2. **PDF Export Menu** - `components/MultimodalChat.tsx:351`
   - Icon: Document (inline SVG)
   - Action: Opens dropdown menu
   - **Sub-buttons:**
     - AI Insights Report - `components/MultimodalChat.tsx:365`
     - Download Transcript - `components/MultimodalChat.tsx:379`
     - Email PDF - `components/MultimodalChat.tsx:391`

3. **Book a Call** - `components/MultimodalChat.tsx:409`
   - Icon: Phone (inline SVG)
   - Action: Opens `https://cal.com/farzadbayat/30min`

4. **Close Chat** - `components/MultimodalChat.tsx:417`
   - Icon: X (inline SVG)
   - Action: `onToggleVisibility(false)`

### Empty State Buttons (4 total)

1. **Audit my AI strategy** - `components/chat/EmptyState.tsx:49`
   - Icon: Zap
   - Action: `onSuggest("Audit my AI strategy")`

2. **Draft a sales script** - `components/chat/EmptyState.tsx:49`
   - Icon: MessageSquare
   - Action: `onSuggest("Draft a sales script")`

3. **Research competitor pricing** - `components/chat/EmptyState.tsx:49`
   - Icon: Search
   - Action: `onSuggest("Research competitor pricing")`

4. **Summarize this PDF** - `components/chat/EmptyState.tsx:49`
   - Icon: FileText
   - Action: `onSuggest("Summarize this PDF")`

### Chat Message Buttons

1. **File Preview Button** - `components/chat/ChatMessage.tsx:77`
   - Action: `onPreview(item.attachment)`

2. **Reasoning Toggle** - `components/chat/ChatMessage.tsx:115`
   - Action: Expands/collapses reasoning section

3. **Calendar Widget Button** - `components/chat/CalendarWidget.tsx:145`
   - Text: "Book Free 30-Min Call"
   - Action: Opens booking URL

4. **Report Expand Button** - `components/chat/DiscoveryReportPreview.tsx:181`
   - Icon: Maximize2
   - Action: Expands report to full screen

5. **Report Download** (inline) - `components/chat/DiscoveryReportPreview.tsx:221`
   - Icon: Download
   - Action: `handleDownload()`

6. **Report Email** (inline) - `components/chat/DiscoveryReportPreview.tsx:232`
   - Icon: Mail
   - Action: `onEmail()`

7. **Report Book Call** (inline) - `components/chat/DiscoveryReportPreview.tsx:245`
   - Icon: Calendar
   - Action: `handleBookCall()`

8. **Report Close** (expanded) - `components/chat/DiscoveryReportPreview.tsx:95`
   - Icon: X
   - Action: `setIsExpanded(false)`

9. **Report Download** (expanded) - `components/chat/DiscoveryReportPreview.tsx:121`
   - Icon: Download
   - Action: `handleDownload()`

10. **Report Email** (expanded) - `components/chat/DiscoveryReportPreview.tsx:133`
    - Icon: Mail
    - Action: `onEmail()`

11. **Report Book Call** (expanded) - `components/chat/DiscoveryReportPreview.tsx:145`
    - Icon: Calendar
    - Action: `handleBookCall()`

12. **Context Sources Expand** - `components/chat/ContextSources.tsx:103`
    - Icon: ChevronDown/ChevronUp
    - Action: `setExpanded(!expanded)`

13. **Context Source Link** - `components/chat/ContextSources.tsx:154`
    - Icon: ExternalLink
    - Action: Opens source URL

14. **Error Retry** - `components/chat/ErrorMessage.tsx` (if retryable)
    - Action: Retry failed request

### Input Dock Buttons (7 total)

1. **File Upload** - `components/chat/ChatInputDock.tsx`
   - Icon: Paperclip
   - Action: Opens file picker

2. **Webcam Toggle** - `components/chat/ChatInputDock.tsx`
   - Icon: Camera/CameraOff
   - Action: `onWebcamChange(!isWebcamActive)`

3. **Screen Share Toggle** - `components/chat/ChatInputDock.tsx`
   - Icon: Monitor/MonitorOff
   - Action: `onScreenShareToggle()`

4. **Voice Input** - `components/chat/ChatInputDock.tsx`
   - Icon: Mic
   - Action: Starts voice recording

5. **Send** - `components/chat/ChatInputDock.tsx`
   - Icon: ArrowUp
   - Action: `onSendMessage(inputValue, file)`

6. **Stop Generation** - `components/chat/ChatInputDock.tsx`
   - Icon: X
   - Action: `onStopGeneration()`
   - Condition: Only shown when `isGenerating === true`

7. **Remove File** (StagingArea) - `components/chat/Attachments.tsx:172`
   - Icon: X
   - Action: `onRemove()`

### Lightbox Buttons

1. **Close Lightbox** - `components/chat/Attachments.tsx:86`
   - Icon: X
   - Action: `onClose()`

### Code Block Buttons

1. **Copy Code** - `components/chat/CodeBlock.tsx`
   - Icon: Copy/Check
   - Action: Copies code to clipboard

### Message Metadata Buttons

1. **Expand Metadata** - `components/chat/MessageMetadata.tsx:83`
   - Action: Expands metadata details

2. **Collapse Metadata** - `components/chat/MessageMetadata.tsx:115`
   - Icon: ChevronUp
   - Action: `setExpanded(false)`

---

## Summary Statistics

- **Total Components:** 16 active, 3 unused
- **Total Buttons:** ~40+ interactive buttons
- **Total Icons:** 30+ unique icons from lucide-react
- **Files Imported:** 16
- **Files NOT Imported:** 3 (FileUpload, WebcamPreview, ScreenSharePreview)
- **Partially Used:** 3 (Attachments, MessageMetadata, UIHelpers)

---

## Notes

1. **WebcamPreview** and **ScreenSharePreview** exist but are not imported. They may be used elsewhere or are legacy components.

2. **FileUpload** component exists but file upload is handled inline in ChatInputDock.

3. **WebPreviewCard** is exported from Attachments.tsx but never used.

4. **Shimmer** component exists in UIHelpers but is not used (may be for future shimmer effect feature).

5. **MessageMetadata** full component is exported but only ResponseTimeBadge is used.

6. **InlineTimestamp** is exported but not used anywhere.

---

**Last Updated:** December 6, 2025  
**Maintained by:** AI Assistant

