# PDF Design Pipeline Analysis

**Date:** 2025-12-07  
**Scope:** Complete analysis of the PDF design system, from design tokens through rendering

---

## Overview

The PDF design pipeline is a **multi-layered system** that transforms raw session data into professionally designed PDF documents. It follows a **design token → template → renderer** architecture with two rendering backends (Puppeteer and pdf-lib).

### Architecture Flow

```
Session Data → Type System → Design Tokens → Templates → Charts → HTML/SVG → Renderers → PDF
```

---

## 1. Design Token System

**Location:** `src/core/pdf-design-tokens.ts`

### Purpose

The design token system provides a **single source of truth** for all visual design values, extracted from the app's CSS design system (`globals.css`). It converts CSS variables into PDF-usable formats (RGB for pdf-lib, HSL for HTML).

### Structure

```typescript
PDF_DESIGN_TOKENS = {
  colors: {
    accent: { hsl, rgb, hex },      // Orange: #ff5b04
    foreground: { hsl, rgb, hex },  // Dark: #1f2937
    dark: { hsl, rgb, hex },        // #222
    mutedForeground: { hsl, rgb, hex }, // #666
    lightGray: { hsl, rgb, hex },   // #e0e0e0
    text: { hsl, rgb, hex }         // #444
  },
  typography: {
    title: { size, px, weight, lineHeight, letterSpacing },
    clientName: { size, px, weight, lineHeight },
    sectionTitle: { size, px, weight, lineHeight, letterSpacing },
    body: { size, px, weight, lineHeight },
    small: { size, px, weight, lineHeight },
    logo: { size, px, weight }
  },
  spacing: {
    xs, sm, md, lg, xl, xxl,      // rem-based spacing
    sectionMargin,                 // Between sections (40px/30pt)
    pageMargin                     // Page margins (96px/72pt)
  },
  border: {
    headerThickness: 2,            // px
    footerThickness: 1             // px
  }
}
```

### Key Features

1. **Dual Format Support**
   - RGB arrays for pdf-lib (programmatic rendering)
   - HSL strings for HTML templates (CSS)
   - Hex values for reference

2. **Unit Conversion**
   - `remToPt()`: Converts rem → points (1rem = 12pt)
   - `remToPx()`: Converts rem → pixels (1rem = 16px)
   - `hslToRgb()`: Converts HSL → RGB arrays

3. **Consistency**
   - All values extracted from `globals.css`
   - Ensures PDF matches web app design
   - Single point of maintenance

### Usage Examples

```typescript
// For pdf-lib renderer
const [r, g, b] = getRgbColor('accent')
const orangeColor = rgb(r, g, b)

// For HTML templates
const accentColor = getHslColor('accent') // 'hsl(17, 90%, 55%)'

// Direct access
const margin = PDF_DESIGN_TOKENS.spacing.pageMargin.pt // 72pt
const fontSize = PDF_DESIGN_TOKENS.typography.body.size // 10.5pt
```

---

## 2. Template System

The template system generates HTML from structured data using design tokens. There are **two main templates**:

### 2.1 Base Template

**Location:** `src/core/pdf/templates/base-template.ts`

**Purpose:** Standard PDF template for conversation summaries, proposals, and assessment reports.

**Sections:**
- Header (logo + date)
- Title section (main title + client name)
- Summary sections (conversation summary, consultant brief)
- AI Capabilities (extracted from conversation)
- Key Outcomes & Next Steps (recommendations, decisions, next steps)
- Research Highlights (from Google Grounding)
- Generated Artifacts (ROI charts, proposals)
- Proposal Section (CTA with mailto link)
- Footer (contact info)

**Design Features:**
- Uses `PDF_DESIGN_TOKENS` for all spacing/colors/typography
- Responsive grid layouts (`info-grid`)
- Print-optimized CSS (`@media print`)
- Semantic HTML structure

### 2.2 Discovery Report Template

**Location:** `src/core/pdf/templates/discovery-report-template.ts`

**Purpose:** McKinsey/BCG-style lead magnet PDF designed to drive 30-min booking conversions.

**Layout:** Single-page A4 (210mm × 297mm) with **precise spacing** (16mm/18mm padding).

**Sections:**
1. **Header**
   - Brand: "F.B/c" logo with orange slash
   - Badge: "AI Insights Report"
   - Meta: Date + Reference ID

2. **Client Section**
   - Company name (18px, bold)
   - Role + name subtitle
   - Engagement badge (High/Medium/Low with color-coded dot)

3. **Executive Insights**
   - Bullet-point insights (extracted from conversation)
   - Orange accent bullets
   - Gray background cards

4. **What AI Observed**
   - 2-column grid of multimodal observations
   - Icons: Voice, Screen, File, Webcam
   - Professional SVG icons

5. **Capabilities Timeline**
   - Horizontal timeline with tool icons
   - Shows tools used during session
   - SVG-generated visualization

6. **Charts Section**
   - ROI Chart (Investment vs Savings bar chart)
   - Engagement Radar (4-axis: Text/Voice/Screen/Files)

7. **CTA Section**
   - Dark navy gradient background
   - Orange "Book Your Free Consultation" button
   - Booking URL + email fallback
   - Clear value proposition

8. **Footer**
   - Consultant contact info
   - GDPR compliance note (7-day retention)

**Design Philosophy:**
- **Data-driven:** Charts and metrics prominently displayed
- **Clean typography:** High contrast, readable at 11px base
- **Professional colors:** Navy (#1a1a2e) + Orange (#FF6B35) + Green (#00A878)
- **Single CTA:** Clear conversion goal
- **White space:** Generous spacing for readability

**Color System:**
- Primary: `#1a1a2e` (navy) - Headers, text
- Accent: `#FF6B35` (orange) - CTAs, highlights, brand
- Success: `#00A878` (green) - Positive metrics, ROI
- Neutral: `#6b7280` (gray) - Muted text, borders
- Background: `#fafafa`, `#f8fafc` (light gray) - Cards, sections

---

## 3. Chart Generation System

**Location:** `src/core/pdf/charts/`

### 3.1 ROI Chart

**File:** `roi-chart.ts`

**Type:** Horizontal bar chart (SVG)

**Data Input:**
```typescript
{
  hasData: boolean
  investment?: number
  projectedSavings?: number
  roiPercentage?: number
  paybackPeriod?: string
}
```

**Visual Elements:**
- Two bars: Investment (orange) vs Projected Savings (green)
- Gradient fills for depth
- Currency formatting ($50K, $200K, $1.5M)
- ROI badge (top-right) if percentage available
- Baseline and labels

**Dimensions:** 280px × 180px (configurable)

**Fallback:** Placeholder SVG when no data available

### 3.2 Engagement Radar Chart

**File:** `engagement-radar.ts`

**Type:** 4-axis radar/spider chart (SVG)

**Axes:**
- Text engagement
- Voice engagement
- Screen engagement
- Files engagement

**Scoring:**
- Calculated from session metrics (message count, voice minutes, screen minutes, files uploaded)
- Normalized to 0-100 scale
- Color-coded by engagement level

**Visual Design:**
- Circular grid with 4 axes
- Filled polygon showing engagement profile
- Gradient fill (orange → transparent)
- Axis labels and percentage values

### 3.3 Tools Timeline

**File:** `tools-timeline.ts`

**Type:** Horizontal timeline with icons (SVG)

**Data Input:**
```typescript
ToolUsageRecord[] = {
  name: string        // Tool name (e.g., 'calculate_roi')
  timestamp: string   // ISO timestamp
  insight: string     // What was learned
}
```

**Visual Elements:**
- Horizontal line (timeline)
- Tool icons at time points
- Tool labels below icons
- Tooltip-style insights on hover (if interactive)

**Icon Mapping:**
- `calculate_roi` → Calculator icon
- `search_web` → Search icon
- `capture_screen_snapshot` → Screen icon
- etc.

---

## 4. Renderer Pipeline

The system supports **two rendering backends** with automatic fallback:

### 4.1 Puppeteer Renderer (Primary)

**Location:** `src/core/pdf/renderers/puppeteer-renderer.ts`

**Process:**
1. Generate HTML from template
2. Launch headless Chrome via Puppeteer
3. Load HTML content
4. Wait for DOM/content ready
5. Generate PDF buffer
6. Close browser

**Configuration:**
```typescript
{
  headless: true,
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--single-process',
    '--disable-extensions'
  ],
  timeout: 15000
}
```

**PDF Options:**
```typescript
{
  format: 'A4',
  margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' },
  printBackground: true,
  preferCSSPageSize: true
}
```

**Advantages:**
- Perfect CSS rendering
- Full HTML/CSS support
- Charts render as SVG
- Print-optimized styles work

**Limitations:**
- Requires Chrome/Chromium binary
- Slower than pdf-lib
- More memory intensive
- Can fail in serverless environments

### 4.2 pdf-lib Renderer (Fallback)

**Location:** `src/core/pdf/renderers/pdf-lib-renderer.ts`

**Process:**
1. Create PDFDocument
2. Add pages as needed
3. Embed fonts (Helvetica, HelveticaBold)
4. Use design tokens for positioning
5. Draw text, shapes, lines programmatically
6. Handle pagination manually

**Implementation Details:**
- Cursor-based positioning (`cursorY`)
- Manual page breaks (`ensureRoom()`)
- Font embedding from StandardFonts
- RGB color conversion from design tokens
- Line-by-line text rendering

**Advantages:**
- No external dependencies (except pdf-lib)
- Fast rendering
- Lightweight
- Works in serverless

**Limitations:**
- No CSS support
- Manual layout calculations
- Limited typography options
- Charts must be converted to paths/shapes

### 4.3 Renderer Selection

**Location:** `src/core/pdf/generator.ts`

**Logic:**
```typescript
const usePdfLib = process.env.PDF_USE_PDFLIB === 'true'

if (!usePdfLib) {
  try {
    return await generatePdfWithPuppeteerRenderer(...)
  } catch (error) {
    // Fall through to pdf-lib
  }
}

return await generatePdfWithPdfLib(...)
```

**Fallback Strategy:**
- Try Puppeteer first (if not explicitly disabled)
- On error, automatically fall back to pdf-lib
- Ensures PDF generation always succeeds

---

## 5. Discovery Report Generation Flow

**Location:** `src/core/pdf/discovery-report-generator.ts`

### 5.1 Data Collection

**Input:** `SessionDataInput`

**Fields:**
- `sessionId`, `leadInfo`, `conversationSummary`
- `keyFindings` (goals, pain points, current situation)
- `multimodalContext` (voice, screen, files, webcam)
- `toolsUsed`, `roiData`
- `recommendedSolution`, `solutionRationale`
- `messageCount`

### 5.2 Data Transformation

**Function:** `buildDiscoveryReportData()`

**Process:**
1. **Calculate Engagement Metrics**
   - Uses `calculateEngagementMetrics()` from types
   - Normalizes to 0-100 scale per modality
   - Calculates overall engagement level (High/Medium/Low)

2. **Build Observations**
   - Extracts from `multimodalContext`
   - Maps voice/screen/files/webcam to `MultimodalObservation[]`
   - Includes summaries and file names

3. **Extract Insights**
   - From `keyFindings` (goals, pain points)
   - From `conversationSummary` if no key findings
   - Formats as `ExecutiveInsight[]`

4. **Build Client Object**
   - Only includes defined values (optional fields)

5. **Build ROI Object**
   - Includes if `investment` or `projectedSavings` present
   - Calculates `roiPercentage` if not provided

6. **Assemble Final Data**
   - Adds metadata (date, ref ID, consultant info)
   - Includes booking URL and contact info
   - Returns `DiscoveryReportData`

### 5.3 PDF Generation

**Function:** `generateDiscoveryReportPDF()`

**Process:**
1. Generate HTML string via `generateDiscoveryReportHTML()`
2. Launch Puppeteer
3. Set HTML content
4. Generate PDF buffer
5. Return as `Uint8Array`

### 5.4 HTML Preview Generation

**Function:** `generateDiscoveryReportHTMLString()`

**Purpose:** Generate HTML for inline preview in chat (before PDF download)

**Usage:**
- Embedded in `DiscoveryReportPreview.tsx`
- Scrollable preview in chat UI
- Expandable to modal
- Download/Email/Book actions

---

## 6. Type System

**Location:** `src/core/pdf/utils/discovery-report-types.ts`

### Core Types

```typescript
DiscoveryReportData = {
  reportDate: string
  reportRef: string
  client: {
    name: string
    company?: string
    role?: string
    email?: string
  }
  engagementLevel: 'High' | 'Medium' | 'Low'
  engagementMetrics: EngagementMetrics
  insights: ExecutiveInsight[]
  observations: MultimodalObservation[]
  toolsUsed: ToolUsageRecord[]
  roi?: DiscoveryROIData
  recommendedSolution?: 'workshop' | 'consulting' | 'both'
  solutionRationale?: string
  sessionId: string
  sessionDuration?: number
  totalMessages?: number
  modalitiesUsed: string[]
  bookingUrl: string
  consultantEmail: string
  consultantName: string
}
```

### Helper Functions

**`calculateEngagementMetrics()`**
- Input: Message count, voice minutes, screen minutes, files uploaded
- Output: Normalized 0-100 scores per modality

**`calculateEngagementLevel()`**
- Input: `EngagementMetrics`
- Output: 'High' | 'Medium' | 'Low'
- Logic: Weighted average with thresholds

**Tool Label/Icon Mappings:**
- Maps tool names to human-readable labels
- Maps tool names to icon identifiers

---

## 7. Integration Points

### 7.1 Context Integration

**Location:** `src/core/context/multimodal-context.ts`

**Methods:**
- `getToolsUsed()` - Extract tools from conversation turns
- `getSessionEngagementMetrics()` - Calculate engagement scores
- `getMultimodalObservations()` - Summarize observations
- `getDiscoveryReportData()` - All-in-one data collection

### 7.2 UI Integration

**Components:**
- `components/chat/DiscoveryReportPreview.tsx` - Preview component
- `components/chat/ChatMessage.tsx` - Renders discovery_report attachment
- `components/MultimodalChat.tsx` - PDF menu with discovery report option
- `App.tsx` - Generation handler

**Attachment Type:**
```typescript
{
  type: 'discovery_report',
  data: string,        // JSON stringified DiscoveryReportData
  htmlContent: string, // HTML for preview
  name: string
}
```

### 7.3 Queue Integration

**Location:** `src/core/queue/workers.ts`

**Job Type:** `GENERATE_PDF`

**Payload:**
```typescript
{
  sessionId: string
  summaryData: SummaryData
  outputPath?: string
  mode?: 'client' | 'internal'
  language?: string
}
```

**Worker:**
- Imports PDF generator
- Generates PDF asynchronously
- Logs success/failure

---

## 8. Design Principles

### 8.1 Consistency

- **Single source of truth:** All design values from `PDF_DESIGN_TOKENS`
- **Shared color system:** Matches web app (`globals.css`)
- **Consistent typography:** Same font sizes/weights across templates

### 8.2 Print Optimization

- **A4 format:** Standard business document size
- **High contrast:** Dark text on white background
- **Readable fonts:** System fonts for reliability
- **Page breaks:** Proper sectioning for multi-page docs

### 8.3 Performance

- **Lazy chart generation:** Charts only generated when data available
- **Fallback renderer:** Ensures PDF always generates
- **Optimized Puppeteer:** Minimal browser flags for speed
- **Caching:** HTML generation is fast (no external calls)

### 8.4 Accessibility

- **Semantic HTML:** Proper heading hierarchy
- **Alt text:** Charts include text alternatives
- **High contrast:** WCAG AA compliant colors
- **Readable fonts:** Minimum 11px base size

---

## 9. File Structure

```
src/core/
├── pdf-design-tokens.ts              # Design token system
├── pdf/
│   ├── generator.ts                  # Main orchestrator
│   ├── discovery-report-generator.ts # Discovery report builder
│   ├── charts/
│   │   ├── roi-chart.ts             # ROI bar chart
│   │   ├── engagement-radar.ts      # Engagement radar chart
│   │   ├── tools-timeline.ts        # Tools timeline
│   │   └── index.ts                 # Chart exports
│   ├── renderers/
│   │   ├── puppeteer-renderer.ts    # Puppeteer backend
│   │   ├── pdf-lib-renderer.ts      # pdf-lib backend
│   │   └── chart-renderer.ts        # Chart utilities
│   ├── templates/
│   │   ├── base-template.ts         # Standard PDF template
│   │   ├── discovery-report-template.ts # Discovery report template
│   │   ├── proposal-template.ts     # Proposal section
│   │   └── summary-template.ts      # Summary sections
│   └── utils/
│       ├── discovery-report-types.ts # Type definitions
│       ├── types.ts                  # Base types
│       ├── formatting.ts             # Text formatting helpers
│       ├── conversation.ts           # Conversation processing
│       ├── insights.ts               # Insight extraction
│       ├── paths.ts                  # Path utilities
│       ├── validation.ts             # Data validation
│       └── constants.ts              # Constants
```

---

## 10. Current State & Future Improvements

### ✅ Completed

- Design token system with dual format support
- Base template with full section support
- Discovery report template (McKinsey-style)
- Chart generation (ROI, Engagement, Timeline)
- Dual renderer system with fallback
- Type system with helper functions
- UI integration (preview component)
- Queue integration for async generation

### 🚧 Potential Improvements

1. **Chart Enhancements**
   - Interactive tooltips (if HTML preview)
   - More chart types (pie, line, area)
   - Customizable colors per report

2. **Template Variants**
   - Industry-specific templates
   - Language localization
   - Custom branding options

3. **Performance**
   - HTML caching for repeated generations
   - PDF caching with invalidation
   - Progressive rendering for large reports

4. **Accessibility**
   - PDF tags for screen readers
   - Better alt text for charts
   - Structured document outline

5. **Design System**
   - Theme variants (dark mode support)
   - Custom color palettes
   - Font substitution (if custom fonts needed)

---

## 11. Testing Recommendations

### Unit Tests

- Design token conversions (HSL→RGB, rem→pt)
- Chart generation with various data inputs
- Template generation with edge cases (missing data)
- Type helpers (engagement calculations)

### Integration Tests

- End-to-end PDF generation (data → PDF)
- Renderer fallback logic
- Chart embedding in templates
- Preview component rendering

### Visual Tests

- PDF output comparison (regression testing)
- Chart accuracy (data → visual)
- Template layout consistency
- Print preview rendering

---

## 12. Usage Examples

### Generate Discovery Report

```typescript
import { generateDiscoveryReportFromSession } from 'src/core/pdf/discovery-report-generator'

const input: SessionDataInput = {
  sessionId: 'abc123',
  leadInfo: { name: 'John Doe', company: 'Acme Corp', role: 'CTO' },
  conversationSummary: 'Discussed AI automation...',
  keyFindings: {
    goals: 'Automate customer support',
    painPoints: ['Manual data entry', 'Slow response times']
  },
  multimodalContext: {
    voiceMinutes: 15,
    screenSummary: 'Analyzed CRM dashboard'
  },
  toolsUsed: [
    { name: 'calculate_roi', timestamp: new Date().toISOString(), insight: '340% ROI' }
  ],
  roiData: {
    investment: 50000,
    projectedSavings: 200000,
    roiPercentage: 300
  },
  messageCount: 32
}

const { html, pdf, data } = await generateDiscoveryReportFromSession(input)

// Use html for preview, pdf for download
```

### Generate Base PDF

```typescript
import { generatePdfWithPuppeteer } from 'src/core/pdf/generator'

const summaryData: SummaryData = {
  leadInfo: { name: 'Jane Smith', company: 'Tech Inc' },
  conversationHistory: [...],
  leadResearch: {...}
}

const pdfBuffer = await generatePdfWithPuppeteer(
  summaryData,
  '/tmp/report.pdf',
  'client',
  'en'
)

// pdfBuffer is Uint8Array ready for download/email
```

---

## Summary

The PDF design pipeline is a **well-architected system** with:

- ✅ **Consistent design system** via tokens
- ✅ **Flexible templates** for different use cases
- ✅ **Robust rendering** with dual backends
- ✅ **Rich visualizations** via SVG charts
- ✅ **Type safety** throughout
- ✅ **Production ready** with fallbacks and error handling

The system successfully balances **design consistency**, **performance**, and **maintainability** while supporting both standard PDFs and specialized lead magnets like the Discovery Report.






