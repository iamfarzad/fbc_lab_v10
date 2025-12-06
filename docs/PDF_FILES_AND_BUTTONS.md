# PDF Files and Buttons - Complete Inventory

**Date:** 2025-01-27  
**Scope:** All PDF-related files, buttons, and UI elements rendered in the application

---

## 1. PDF Export Buttons (Chat Header)

### Location
`components/MultimodalChat.tsx` (lines 347-388)

### 1.1 Export PDF Button (Main Trigger)
**File:** `components/MultimodalChat.tsx` lines 349-356

**Appearance:**
- **Icon:** Document/file icon (SVG)
- **Size:** 8x8 (w-8 h-8) rounded button
- **Position:** Header right side, between theme toggle and close button
- **Style:**
  - Light mode: `text-black/60 hover:bg-black/5`
  - Dark mode: `text-white/60 hover:bg-white/10`
  - Rounded full circle
  - Transition colors on hover
- **State:**
  - **Disabled:** When `items.length === 0`
  - **Disabled Style:** `opacity-30 cursor-not-allowed`
  - **Active:** Opens dropdown menu
- **Tooltip:** "Export Report"
- **Action:** Toggles PDF dropdown menu (`setShowPDFMenu(!showPDFMenu)`)

**Visual:**
```
[Document Icon] ← Small circular button, gray/white text
```

---

### 1.2 PDF Export Dropdown Menu
**File:** `components/MultimodalChat.tsx` lines 359-386

**Appearance:**
- **Position:** Absolute, right-aligned below trigger button
- **Size:** `w-48` (192px width)
- **Style:**
  - Light mode: `bg-white/90 border-black/10`
  - Dark mode: `bg-black/90 border-white/10`
  - Rounded corners (`rounded-lg`)
  - Shadow (`shadow-lg`)
  - Backdrop blur (`backdrop-blur-lg`)
  - Border with transparency
- **Visible:** Only when `showPDFMenu && items.length > 0`

**Visual:**
```
┌─────────────────────────┐
│ [Download Icon] Download PDF │
├─────────────────────────┤
│ [Email Icon] Email PDF  │
└─────────────────────────┘
```

---

### 1.3 Download PDF Button
**File:** `components/MultimodalChat.tsx` lines 362-371

**Appearance:**
- **Icon:** Download arrow icon (SVG, 16x16)
  - Arrow pointing down with line
- **Text:** "Download PDF"
- **Size:** Full width (`w-full`)
- **Padding:** `px-4 py-3`
- **Style:**
  - Light mode: `text-black/80 hover:bg-black/5`
  - Dark mode: `text-white/80 hover:bg-white/10`
  - Flex layout with gap-3
  - Text size: `text-sm`
  - Transition colors on hover
- **Action:** Calls `onGeneratePDF()` and closes menu
- **Visible:** Only when `onGeneratePDF` prop is provided

**Visual:**
```
┌─────────────────────────────┐
│ ⬇️  Download PDF            │
└─────────────────────────────┘
```

---

### 1.4 Email PDF Button
**File:** `components/MultimodalChat.tsx` lines 373-384

**Appearance:**
- **Icon:** Email/envelope icon (SVG, 16x16)
  - Envelope with mail lines
- **Text:** "Email PDF" + optional email prefix
  - Shows `Email PDF to {emailPrefix}...` if `userEmail` exists
  - Example: "Email PDF to john..."
- **Size:** Full width (`w-full`)
- **Padding:** `px-4 py-3`
- **Style:**
  - Light mode: `text-black/80 hover:bg-black/5`
  - Dark mode: `text-white/80 hover:bg-white/10`
  - Flex layout with gap-3
  - Text size: `text-sm`
  - Transition colors on hover
- **Action:** Calls `onEmailPDF()` and closes menu
- **Visible:** Only when `onEmailPDF` prop is provided

**Visual:**
```
┌─────────────────────────────┐
│ ✉️  Email PDF to john...     │
└─────────────────────────────┘
```

---

## 2. PDF File Attachments (In Chat Messages)

### 2.1 PDF Attachment Preview Button
**File:** `components/chat/ChatMessage.tsx` lines 67-79

**Appearance:**
- **Location:** Above message text, in message bubble
- **Container Style:**
  - Rounded corners (`rounded-xl`)
  - Border: `border-zinc-200 dark:border-zinc-800`
  - Background: `bg-zinc-50 dark:bg-zinc-900`
  - Padding: `p-1`
  - Margin bottom: `mb-2`
- **Button Style:**
  - Full width clickable area
  - Flex layout with gap-3
  - Padding: `p-2`
  - Hover: `hover:bg-zinc-100 dark:hover:bg-zinc-800`
  - Rounded: `rounded-lg`
  - Transition colors
  - Text aligned left
- **Icon Container:**
  - Size: 16x16 SVG icon
  - Icon: Document/file icon (folded document)
  - Background: `bg-white dark:bg-black`
  - Border: `border-zinc-100 dark:border-zinc-800`
  - Padding: `p-2`
  - Rounded: `rounded-lg`
  - Color: `text-zinc-500`
- **File Name:**
  - Text: `text-xs font-medium`
  - Color: `text-zinc-700 dark:text-zinc-300`
  - Shows `item.attachment.name`
- **Action:** Opens PDF in Lightbox (`onPreview(item.attachment)`)
- **Visible:** When `item.attachment.type === 'file'` or `item.attachment.type === 'image'`

**Visual:**
```
┌─────────────────────────────────────┐
│ ┌───┐  document.pdf                 │
│ │ 📄 │  (clickable, hover effect)    │
│ └───┘                                │
└─────────────────────────────────────┘
```

---

## 3. PDF File Preview (Lightbox)

### 3.1 Lightbox Component for PDF Files
**File:** `components/chat/Attachments.tsx` lines 46-138

**Appearance:**
- **Container:**
  - Full screen overlay (`fixed inset-0`)
  - Z-index: `z-[100]`
  - Background: `bg-black/95 backdrop-blur-md`
  - Animation: `animate-fade-in-up`
  - Click outside to close

### 3.2 Lightbox Close Button
**File:** `components/chat/Attachments.tsx` lines 85-90

**Appearance:**
- **Position:** Absolute, top-right corner
  - `top-6 right-6`
- **Size:** Padding `p-3`
- **Style:**
  - Color: `text-white/50 hover:text-white`
  - Background on hover: `hover:bg-white/10`
  - Rounded: `rounded-full`
  - Transition: `transition-all`
  - Z-index: `z-[101]`
- **Icon:** X/close icon (24x24 SVG)
- **Action:** Closes lightbox (`onClose()`)

**Visual:**
```
                    [X] ← Top right corner
```

---

### 3.3 PDF Content Display (Non-Image Files)
**File:** `components/chat/Attachments.tsx` lines 114-127

**Appearance:**
- **Container:**
  - Max width: `max-w-3xl`
  - Max height: `max-h-[85vh]`
  - Background: `bg-[#1e1e1e]` (dark gray)
  - Rounded: `rounded-xl`
  - Shadow: `shadow-2xl`
  - Border: `border border-white/10`
  - Flex column layout

**Header Section:**
- **Background:** `bg-white/5 border-b border-white/5`
- **Padding:** `px-4 py-3`
- **Layout:** Flex justify-between
- **Icon:** Document icon (14x14, `text-white/40`)
- **File Name:**
  - Text: `text-xs font-mono text-white/70`
  - Shows: `attachment.name || 'Text Document'`
- **MIME Type:**
  - Text: `text-[10px] font-mono text-white/30 uppercase`
  - Shows: `attachment.mimeType` (e.g., "APPLICATION/PDF")

**Content Section:**
- **Background:** `bg-[#1a1a1a]` (darker gray)
- **Padding:** `p-6`
- **Overflow:** Auto scroll with custom scrollbar
- **Text Display:**
  - Font: `font-mono`
  - Size: `text-xs md:text-sm`
  - Color: `text-gray-300`
  - Whitespace: `whitespace-pre-wrap`
  - Line height: `leading-relaxed`
  - Content: Decoded PDF text content or base64 data

**Visual:**
```
┌─────────────────────────────────────┐
│ 📄 document.pdf    APPLICATION/PDF │
├─────────────────────────────────────┤
│                                     │
│  [PDF text content displayed here]  │
│  (monospace, scrollable)            │
│                                     │
└─────────────────────────────────────┘
```

**Note:** PDFs are displayed as text content (extracted text), not as rendered PDF pages. The system decodes base64 data or uses `attachment.textContent`.

---

## 4. PDF File Upload/Selection

### 4.1 Upload File Button (Accepts PDFs)
**File:** `components/chat/ChatInputDock.tsx` lines 258-265

**Appearance:**
- **Location:** Bottom toolbar, left side (expanded input view)
- **Icon:** Paperclip icon
- **Size:** Standard toolbar button
- **Style:**
  - Standard button styling
  - Hover effects
  - Tooltip: "Upload File"
- **File Input:**
  - Hidden input element
  - Accepts: `image/*, application/pdf, text/plain, text/csv, application/json`
  - **PDF MIME Type:** `application/pdf`
- **Action:** Opens file picker, allows PDF selection

**Visual:**
```
[📎] ← Paperclip icon button
```

---

### 4.2 StagingArea Component (PDF Preview Before Send)
**File:** `components/chat/Attachments.tsx` lines 146-182

**Appearance:**
- **Location:** Above textarea in expanded input view
- **Container:**
  - Full width (`w-full`)
  - Animation: `animate-fade-in-up`
  - Background: `bg-white/50 dark:bg-black/40`
  - Backdrop blur: `backdrop-blur-sm`
  - Rounded: `rounded-xl`
  - Border: `border border-white/40 dark:border-white/10`
  - Shadow: `shadow-[0_2px_12px_rgba(0,0,0,0.04)]`
  - Ring: `ring-1 ring-black/5`
  - Padding: `p-3`
  - Flex layout with gap-4

**Icon/Preview:**
- **Container:** `w-12 h-12` rounded square
- **Background:** `bg-gray-100 border border-gray-200`
- **For PDFs:** Shows document icon (SVG, 24x24)
  - Icon: Folded document with lines
  - Color: `text-gray-400`
- **For Images:** Shows image preview

**Metadata:**
- **File Name:**
  - Text: `text-xs font-semibold`
  - Color: `text-gray-900 dark:text-gray-100`
  - Truncated with title attribute
- **File Info:**
  - MIME type: Uppercase, `font-medium tracking-wider`
  - Size: Formatted bytes
  - Text: `text-[10px] text-gray-500`
  - Separator: Dot between type and size

**Remove Button:**
- **Position:** Right side
- **Size:** `p-1.5`
- **Icon:** X/close icon (16x16)
- **Style:**
  - Color: `text-gray-400 hover:text-red-500`
  - Background: `hover:bg-red-50`
  - Rounded: `rounded-full`
  - Transition: `transition-colors`
- **Tooltip:** "Remove file"
- **Action:** Removes selected file (`onRemove()`)

**Visual:**
```
┌─────────────────────────────────────┐
│ ┌──┐  document.pdf          [X]     │
│ │📄│  PDF • 2.5 MB                 │
│ └──┘                                │
└─────────────────────────────────────┘
```

---

## 5. PDF Suggestion Button (Empty State)

### 5.1 "Summarize this PDF" Suggestion Chip
**File:** `components/chat/EmptyState.tsx` line 20

**Appearance:**
- **Location:** Empty state, suggestion chips area
- **Label:** "Summarize this PDF"
- **Icon:** FileText icon (`w-3.5 h-3.5`)
- **Category:** "Analysis"
- **Style:**
  - Suggestion chip button
  - Hover effects
  - Category-based styling
- **Action:** Sends suggestion text to chat
- **Visible:** Only when chat is empty (no messages)

**Visual:**
```
[📄 Summarize this PDF] ← Suggestion chip
```

---

## 6. Admin Dashboard PDF Button

### 6.1 View PDF Button (Admin Dashboard)
**File:** `components/admin/sections/FailedConversationsSection.tsx` lines 371-388

**Appearance:**
- **Location:** Admin dashboard, failed conversations section
- **Container:**
  - Card component
  - CardHeader with title
  - CardContent with button

**Card Header:**
- **Title:** "Generated PDF"
- **Icon:** FileText icon (`size-5`)
- **Layout:** Flex with gap-2

**Button:**
- **Variant:** `outline`
- **Icon:** FileText icon (`mr-2 size-4`)
- **Text:** "View PDF"
- **Style:** Standard shadcn/ui Button component
- **Link:** Opens `conversation.pdf_url` in new tab
- **Target:** `_blank` with `rel="noopener noreferrer"`
- **Visible:** Only when `conversation.pdf_url` exists

**Visual:**
```
┌─────────────────────────┐
│ 📄 Generated PDF        │
├─────────────────────────┤
│ [📄 View PDF]           │
└─────────────────────────┘
```

---

## 7. Drag & Drop Overlay (PDF Support)

### 7.1 Drag & Drop Overlay Text
**File:** `components/MultimodalChat.tsx` line 278

**Appearance:**
- **Location:** Full screen overlay when dragging files
- **Text:** "Images, PDFs, and text files supported"
- **Style:**
  - Color: `text-blue-600/60 dark:text-blue-200/60`
  - Margin top: `mt-2`
- **Context:** Shown in drag & drop overlay
- **Action:** Accepts dropped PDF files

**Visual:**
```
┌─────────────────────────────────────┐
│      [Upload Icon]                  │
│      Drop to Analyze                 │
│      Images, PDFs, and text files   │
│      supported                       │
└─────────────────────────────────────┘
```

---

## Summary

### PDF-Related Buttons (Total: 7)

1. **Export PDF Button** (Header) - Triggers dropdown
2. **Download PDF Button** (Dropdown) - Downloads transcript PDF
3. **Email PDF Button** (Dropdown) - Emails PDF
4. **PDF Attachment Preview Button** (Message) - Opens PDF in lightbox
5. **Lightbox Close Button** (Lightbox) - Closes PDF preview
6. **Remove PDF Button** (StagingArea) - Removes selected PDF
7. **View PDF Button** (Admin) - Opens generated PDF URL

### PDF File Displays (Total: 3)

1. **PDF Attachment in Message** - Clickable preview card
2. **PDF in Lightbox** - Full-screen text preview
3. **PDF in StagingArea** - Preview before sending

### PDF-Related UI Elements (Total: 2)

1. **Upload File Button** - Accepts PDF files
2. **"Summarize this PDF" Suggestion** - Empty state chip

### PDF Support Features

- **File Upload:** Accepts `application/pdf` MIME type
- **File Display:** Shows PDF as text content (extracted text)
- **File Preview:** Lightbox with monospace text display
- **File Metadata:** Shows file name, MIME type, and size
- **Export:** Generate and download/email conversation PDFs
- **Admin:** View generated PDFs from failed conversations

---

## Visual States

### Disabled States
- **Export PDF Button:** Disabled when `items.length === 0` (opacity-30, cursor-not-allowed)
- **PDF Dropdown:** Only visible when `items.length > 0`

### Hover States
- All buttons have hover effects (background color changes)
- Attachment preview buttons show hover background
- Remove button shows red hover state

### Active States
- PDF dropdown menu shows when `showPDFMenu === true`
- Lightbox shows when `previewItem` is set
- StagingArea shows when `selectedFile` exists

---

---

## 8. Post-Conversation Summary PDF (Similar to "Quota PDF")

### Overview
Yes, there IS a similar concept to a "quota PDF" - it's a **Consultation Summary/Certificate PDF** that users can download or receive via email after completing a conversation.

### 8.1 Summary PDF Generation System

**Location:** `src/core/agents/summary-agent.ts`

**Trigger Conditions:**
- Conversation ends (`conversation_end` trigger)
- Exit intent: `WRAP_UP`
- Force exit after frustration
- Timeout or limits reached
- User says goodbye

**Process:**
1. **Summary Agent** analyzes full conversation
2. Generates structured JSON summary
3. PDF generated with conversation transcript + insights
4. User can download or receive via email

---

### 8.2 PDF Content Structure

**File:** `utils/pdfUtils.ts` (client-side) and `src/core/pdf/generator.ts` (server-side)

**Sections Included:**

1. **Executive Summary & Context**
   - Branding header ("F.B/c CONSULTATION REPORT")
   - Session metadata (date, session ID)
   - Client profile (name, email)
   - Strategic context (role, company, industry from research)

2. **Full Conversation Transcript**
   - All messages with timestamps
   - User vs F.B/c Consultant labels
   - Visual attachments (images) embedded
   - Markdown stripped for clean text

3. **Proposed Offer / Quotation Section**
   - Service type (e.g., "AI Consulting & Strategy Workshop")
   - Investment/pricing information
   - Timeline
   - Next steps
   - CTA: Booking link

4. **Footer**
   - GDPR notice: "Voice transcripts & visual captures are deleted after 7 days"
   - Branding: "F.B/c AI Consultation"
   - Page numbers

---

### 8.3 PDF Delivery Methods

#### Method 1: Download PDF (Client-Side)
**Location:** `utils/pdfUtils.ts`, `App.tsx` → `onGeneratePDF()`

**Trigger:**
- User clicks "Download PDF" button in header dropdown
- Tool suggestion: "Generate a PDF summary" (for workshop leads)

**Process:**
- PDF generated client-side using jsPDF library
- Browser-based generation (no server required)
- Direct download via `doc.save(filename)`
- Filename format: `FBC-Consultation-{Name}-{Date}.pdf`

**Visual:**
```
User clicks "Download PDF" → PDF downloads immediately
```

#### Method 2: Email PDF (Server-Side)
**Location:** `api/send-pdf-summary/route.ts`

**Trigger:**
- User clicks "Email PDF" button in header dropdown
- Tool suggestion: "Finish & Email Summary" (for consulting leads)
- Recommended when `recommendedSolution === 'consulting'`

**Process:**
1. PDF generated client-side or server-side
2. Base64 PDF data sent to `/api/send-pdf-summary`
3. Email sent with PDF attachment
4. Email includes:
   - Subject: "Your F.B/c AI Consultation Report"
   - HTML body with summary
   - PDF attachment: `FBC-Consultation-{Name}-{Date}.pdf`

**Email Content:**
- Greeting with recipient name
- Summary of what's included:
  - Executive summary
  - Full conversation transcript
  - Key insights and recommendations
- CTA for follow-up questions
- F.B/c Team signature

**Visual:**
```
User clicks "Email PDF" → PDF sent to user's email address
```

---

### 8.4 Summary Agent Output Structure

**File:** `src/core/agents/summary-agent.ts`

**JSON Structure Generated:**
```json
{
  "executiveSummary": "2-3 sentences covering what was discussed",
  "multimodalInteractionSummary": {
    "voice": "duration and key topics (if used)",
    "screenShare": "what was shown (if used)",
    "documentsReviewed": ["filename: key insight"],
    "engagementScore": "High/Medium/Low"
  },
  "keyFindings": {
    "goals": "from discovery",
    "painPoints": ["prioritized list"],
    "currentSituation": "what they're doing now",
    "dataReality": "where their data lives",
    "teamReadiness": "change management signals",
    "budgetSignals": "timeline and investment indicators"
  },
  "recommendedSolution": "workshop" | "consulting",
  "solutionRationale": "why this solution fits",
  "expectedROI": "specific outcome projection",
  "pricingBallpark": "e.g. $5K-$15K or $50K-$150K",
  "nextSteps": "primary CTA: book call, secondary: reply with questions"
}
```

---

### 8.5 PDF Generation Engines

#### Engine 1: Client-Side (jsPDF)
**File:** `utils/pdfUtils.ts`

**Features:**
- Browser-based generation
- No server required
- Fast generation
- Limited formatting options
- Used for immediate downloads

#### Engine 2: Server-Side (Puppeteer)
**File:** `src/core/pdf/renderers/puppeteer-renderer.ts`

**Features:**
- Full HTML/CSS rendering
- Professional formatting
- Chart/image support
- Used for email attachments
- Falls back to pdf-lib if Puppeteer fails

#### Engine 3: Server-Side (pdf-lib)
**File:** `src/core/pdf/renderers/pdf-lib-renderer.ts`

**Features:**
- Programmatic PDF generation
- Reliable fallback
- Good for structured documents
- Used when Puppeteer unavailable

---

### 8.6 Tool Suggestions for PDF Generation

**Location:** `src/core/intelligence/tool-suggestion-engine.ts`

**Suggestions Based on Intent:**

1. **Consulting Intent:**
   - Tool: "Finish & Email Summary"
   - Capability: `exportPdf`
   - Action: Email PDF to user

2. **Workshop/Other Intent:**
   - Tool: "Generate a PDF summary"
   - Capability: `exportPdf`
   - Action: Download PDF

---

### 8.7 PDF Storage & Access

**Database Fields:**
- `pdf_url` - URL to generated PDF (stored in Supabase)
- `pdf_generated_at` - Timestamp of PDF generation

**Admin Dashboard:**
- View generated PDFs for failed conversations
- "View PDF" button opens PDF URL in new tab
- Location: `components/admin/sections/FailedConversationsSection.tsx`

---

### 8.8 Comparison: "Quota PDF" vs Current System

| Feature | "Quota PDF" Concept | Current F.B/c System |
|---------|---------------------|---------------------|
| **Trigger** | After conversation/quota complete | After conversation ends |
| **Content** | Summary/certificate | Full transcript + insights + offer |
| **Delivery** | Download | Download OR Email |
| **Format** | Certificate-style | Professional consultation report |
| **Includes** | Summary only | Transcript + insights + proposal |
| **Purpose** | Proof of completion | Consultation record + next steps |

**Similarities:**
- ✅ Generated after conversation completes
- ✅ Downloadable document
- ✅ Summary of interaction
- ✅ Professional format
- ✅ Can be shared with stakeholders

**Differences:**
- Current system includes FULL transcript (not just summary)
- Current system includes proposed offer/quotation
- Current system has email delivery option
- Current system is more comprehensive (certificate vs report)

---

### 8.9 Usage Flow

**Example User Journey:**

1. User has conversation with F.B/c AI
2. Conversation ends (goodbye, timeout, etc.)
3. Summary Agent analyzes conversation
4. User sees tool suggestion: "Finish & Email Summary" or "Generate a PDF summary"
5. User clicks suggestion OR clicks "Export PDF" button in header
6. PDF generated with:
   - Full transcript
   - Executive summary
   - Key findings
   - Proposed offer
   - Next steps
7. PDF downloaded or emailed to user
8. User can share PDF with stakeholders

---

**Last Updated:** 2025-01-27  
**Maintained By:** Development Team

