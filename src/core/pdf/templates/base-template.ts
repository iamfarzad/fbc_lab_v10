import { PDF_DESIGN_TOKENS, getHslColor } from 'src/core/pdf-design-tokens'
import type { SummaryData, Mode } from '../utils/types'
import { formatDate, escapeHtml, shortenText } from '../utils/formatting'
import { generateProposalSection } from './proposal-template'
import { generateSummarySections } from './summary-template'
import { generateROIChartsHTML, isValidROIData } from '../renderers/chart-renderer'
import { extractConversationInsights } from '../utils/insights'
import { buildConversationPairs } from '../utils/conversation'

/**
 * Lightweight text helper until the Gemini translator is migrated.
 */
function translateText(text: string) {
  return text
}

/**
 * Generate base HTML template with all sections
 */
export function generateHtmlContent(summaryData: SummaryData, _mode: Mode, language: string): string {
  const leadName = summaryData.leadInfo.name || 'Valued Client'
  const leadCompany = summaryData.leadInfo.company || ''
  const leadRole = summaryData.leadInfo.role || ''
  const translatedSummary = translateText(summaryData.leadResearch?.conversation_summary || '')
  const translatedBrief = translateText(summaryData.leadResearch?.consultant_brief || '')
  const conversationPairs = buildConversationPairs(summaryData.conversationHistory)

  const docDate = formatDate()

  // Extract AI capabilities from consultant brief or leadResearch
  const extractAICapabilities = (): string[] => {
    const capabilities: string[] = []
    
    if (summaryData.leadResearch?.ai_capabilities_shown) {
      const caps = summaryData.leadResearch.ai_capabilities_shown.split(',').map(c => c.trim())
      capabilities.push(...caps)
    }
    
    // Also try to extract from consultant brief
    if (translatedBrief) {
      const briefLower = translatedBrief.toLowerCase()
      if (briefLower.includes('nlp') || briefLower.includes('natural language')) {
        capabilities.push('Natural language processing')
      }
      if (briefLower.includes('automation') || briefLower.includes('automated')) {
        capabilities.push('Process automation')
      }
      if (briefLower.includes('analytics') || briefLower.includes('analysis')) {
        capabilities.push('Data analytics')
      }
      if (briefLower.includes('chatbot') || briefLower.includes('chat')) {
        capabilities.push('Intelligent chatbots')
      }
      if (briefLower.includes('sentiment')) {
        capabilities.push('Sentiment analysis')
      }
    }
    
    // Default capabilities if none found
    if (capabilities.length === 0) {
      capabilities.push('AI consultation', 'Strategy development', 'Implementation planning')
    }
    
    return [...new Set(capabilities)].slice(0, 8) // Remove duplicates, limit to 8
  }

  const aiCapabilities = extractAICapabilities()

  const researchSection = (summaryData.researchHighlights && summaryData.researchHighlights.length > 0)
    ? `<div class="section">
      <h2 class="section-title">Research Highlights</h2>
      <div class="section-content">
        ${summaryData.researchHighlights.slice(0, 3).map((highlight, index) => {
          const sources = Array.isArray(highlight.urlsUsed) && highlight.urlsUsed.length > 0
            ? `<ul>${highlight.urlsUsed.slice(0, 5).map(url => `<li>${escapeHtml(url)}</li>`).join('')}</ul>`
            : ''
          const metrics = [
            typeof highlight.citationCount === 'number' ? `Citations: ${highlight.citationCount}` : '',
            typeof highlight.searchGroundingUsed === 'number' ? `Search Grounding: ${highlight.searchGroundingUsed}` : '',
            typeof highlight.urlContextUsed === 'number' ? `URL Context: ${highlight.urlContextUsed}` : ''
          ].filter(Boolean).join(' • ')
          const answer = highlight.combinedAnswer ? `<p>${escapeHtml(shortenText(highlight.combinedAnswer, 3))}</p>` : ''
          const metricBlock = metrics ? `<p><strong>${metrics}</strong></p>` : ''
          const note = highlight.error ? `<p>Note: ${escapeHtml(highlight.error)}</p>` : ''
          return `
            <p><strong>${escapeHtml(highlight.query || `Insight ${index + 1}`)}</strong></p>
            ${answer}
            ${metricBlock}
            ${sources}
            ${note}
          `
        }).join('')}
      </div>
    </div>`
    : ''

  const artifactsSection = (summaryData.artifactInsights && summaryData.artifactInsights.length > 0)
    ? `<div class="section">
      <h2 class="section-title">Generated Artifacts</h2>
      <div class="section-content">
        ${summaryData.artifactInsights.map((artifact) => {
          const status = artifact.status ? `<p><strong>Status:</strong> ${escapeHtml(artifact.status)}</p>` : ''
          const error = artifact.error ? `<p><strong>Error:</strong> ${escapeHtml(artifact.error)}</p>` : ''
          return `
            <p><strong>${escapeHtml(artifact.type || 'Artifact')}</strong></p>
            ${status}
            ${error}
          `
        }).join('')}
      </div>
    </div>`
    : ''

  // Detect and generate ROI charts section
  const roiArtifact = summaryData.artifactInsights?.find(
    a => a.type === 'Cost-Benefit Analysis' && a.payload && isValidROIData(a.payload)
  )
  const roiSection: string = roiArtifact && isValidROIData(roiArtifact.payload!)
    ? generateROIChartsHTML(roiArtifact.payload)
    : ''

  const insights = extractConversationInsights(conversationPairs)
  const hasInsights = insights.recommendations.length > 0 || 
                     insights.nextSteps.length > 0 || 
                     insights.keyDecisions.length > 0 ||
                     insights.importantPoints.length > 0

  const conversationSection = hasInsights
    ? `<div class="section">
        <h2 class="section-title">Key Outcomes & Next Steps</h2>
        <div class="section-content">
          ${insights.recommendations.length > 0 ? `
            <p><strong>Recommendations:</strong></p>
            <ul>
              ${insights.recommendations.map(rec => `<li>${escapeHtml(shortenText(rec, 4))}</li>`).join('')}
            </ul>
          ` : ''}
          ${insights.nextSteps.length > 0 ? `
            <p><strong>Next Steps:</strong></p>
            <ul>
              ${insights.nextSteps.map(step => `<li>${escapeHtml(shortenText(step, 4))}</li>`).join('')}
            </ul>
          ` : ''}
          ${insights.keyDecisions.length > 0 ? `
            <p><strong>Key Decisions:</strong></p>
            <ul>
              ${insights.keyDecisions.map(decision => `<li>${escapeHtml(shortenText(decision, 4))}</li>`).join('')}
            </ul>
          ` : ''}
          ${insights.importantPoints.length > 0 ? `
            <p><strong>Important Points Discussed:</strong></p>
            <ul>
              ${insights.importantPoints.map(point => `<li>${escapeHtml(shortenText(point, 4))}</li>`).join('')}
            </ul>
          ` : ''}
        </div>
      </div>`
    : ''

  const aiCapabilitiesSection = aiCapabilities.length > 0
    ? `<div class="section">
        <h2 class="section-title">AI Capabilities Identified</h2>
        <ul>
          ${aiCapabilities.map(cap => `<li>${escapeHtml(cap)}</li>`).join('')}
        </ul>
      </div>`
    : ''

  // Get design token values for HTML
  const accentColor = getHslColor('accent')
  const foregroundColor = getHslColor('foreground')
  const mutedForegroundColor = getHslColor('mutedForeground')
  const textColor = getHslColor('text')
  const lightGrayColor = getHslColor('lightGray')

  const summarySections = generateSummarySections({
    translatedSummary,
    translatedBrief,
    leadName,
    leadCompany,
    leadRole,
    docDate,
    aiCapabilities
  })

  return `<!DOCTYPE html>
<html lang="${language}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>AI Consulting Assessment</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: ${foregroundColor};
      line-height: ${PDF_DESIGN_TOKENS.typography.body.lineHeight};
      background: white;
    }
    
    .page {
      width: 8.5in;
      min-height: 11in;
      margin: 0 auto;
      background: white;
      padding: ${PDF_DESIGN_TOKENS.spacing.pageMargin.px}px;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: ${PDF_DESIGN_TOKENS.spacing.lg.px}px;
      border-bottom: ${PDF_DESIGN_TOKENS.border.headerThickness}px solid ${accentColor};
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.sectionMargin.px}px;
    }
    
    .logo {
      font-size: ${PDF_DESIGN_TOKENS.typography.logo.px}px;
      font-weight: ${PDF_DESIGN_TOKENS.typography.logo.weight};
      color: ${accentColor};
    }
    
    .doc-date {
      color: ${mutedForegroundColor};
      font-size: ${PDF_DESIGN_TOKENS.typography.body.px}px;
    }
    
    /* Title Section */
    .title-section {
      text-align: center;
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.xxl.px}px;
    }
    
    .main-title {
      font-size: ${PDF_DESIGN_TOKENS.typography.title.px}px;
      font-weight: ${PDF_DESIGN_TOKENS.typography.title.weight};
      color: ${foregroundColor};
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.lg.px}px;
      letter-spacing: ${PDF_DESIGN_TOKENS.typography.title.letterSpacing}em;
      line-height: ${PDF_DESIGN_TOKENS.typography.title.lineHeight};
    }
    
    .client-name {
      font-size: ${PDF_DESIGN_TOKENS.typography.clientName.px}px;
      color: ${accentColor};
      font-weight: ${PDF_DESIGN_TOKENS.typography.clientName.weight};
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.sm.px}px;
      line-height: ${PDF_DESIGN_TOKENS.typography.clientName.lineHeight};
    }
    
    .prepared-by {
      font-size: ${PDF_DESIGN_TOKENS.typography.body.px}px;
      color: ${mutedForegroundColor};
    }
    
    /* Section Styles */
    .section {
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.sectionMargin.px}px;
    }
    
    .section-title {
      font-size: ${PDF_DESIGN_TOKENS.typography.sectionTitle.px}px;
      font-weight: ${PDF_DESIGN_TOKENS.typography.sectionTitle.weight};
      color: ${accentColor};
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.md.px}px;
      text-transform: uppercase;
      letter-spacing: ${PDF_DESIGN_TOKENS.typography.sectionTitle.letterSpacing}px;
      line-height: ${PDF_DESIGN_TOKENS.typography.sectionTitle.lineHeight};
    }
    
    .section-content {
      color: ${textColor};
      font-size: ${PDF_DESIGN_TOKENS.typography.body.px}px;
      line-height: ${PDF_DESIGN_TOKENS.typography.body.lineHeight};
    }
    
    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: ${PDF_DESIGN_TOKENS.spacing.md.px}px;
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.lg.px}px;
    }
    
    .info-item {
      font-size: ${PDF_DESIGN_TOKENS.typography.body.px}px;
    }
    
    .info-label {
      font-weight: ${PDF_DESIGN_TOKENS.typography.sectionTitle.weight};
      color: ${foregroundColor};
      display: inline-block;
      min-width: 80px;
    }
    
    .info-value {
      color: ${mutedForegroundColor};
    }
    
    /* List Styles */
    ul {
      list-style: none;
      padding-left: 0;
    }
    
    ul li {
      position: relative;
      padding-left: ${PDF_DESIGN_TOKENS.spacing.lg.px}px;
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.sm.px}px;
      font-size: ${PDF_DESIGN_TOKENS.typography.body.px}px;
      color: ${textColor};
      line-height: ${PDF_DESIGN_TOKENS.typography.body.lineHeight};
    }
    
    ul li:before {
      content: "•";
      color: ${accentColor};
      font-weight: ${PDF_DESIGN_TOKENS.typography.sectionTitle.weight};
      position: absolute;
      left: 0;
    }
    
    /* CTA Link */
    .cta-link {
      color: ${accentColor};
      text-decoration: none;
      font-weight: ${PDF_DESIGN_TOKENS.typography.clientName.weight};
      border-bottom: 1px solid ${accentColor};
    }
    
    /* Footer */
    .footer {
      margin-top: ${PDF_DESIGN_TOKENS.spacing.xxl.px * 2}px;
      padding-top: ${PDF_DESIGN_TOKENS.spacing.xl.px}px;
      border-top: ${PDF_DESIGN_TOKENS.border.footerThickness}px solid ${lightGrayColor};
      text-align: center;
      font-size: ${PDF_DESIGN_TOKENS.typography.small.px}px;
      color: ${mutedForegroundColor};
    }
    
    .footer-name {
      font-weight: ${PDF_DESIGN_TOKENS.typography.sectionTitle.weight};
      color: ${foregroundColor};
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.xs.px}px;
    }
    
    .footer-contact {
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.xs.px}px;
    }
    
    .footer-website {
      color: ${accentColor};
      text-decoration: none;
    }
    
    p {
      margin-bottom: ${PDF_DESIGN_TOKENS.spacing.sm.px}px;
    }
    
    strong {
      color: ${foregroundColor};
      font-weight: ${PDF_DESIGN_TOKENS.typography.sectionTitle.weight};
    }
    
    /* Page break for printing */
    @media print {
      .page {
        page-break-after: always;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="logo">F.B/c</div>
      <div class="doc-date">${docDate}</div>
    </div>
    
    <!-- Title -->
    <div class="title-section">
      <h1 class="main-title">AI Consulting Assessment</h1>
      <div class="client-name">${escapeHtml(leadCompany || leadName)}</div>
      <div class="prepared-by">Prepared by Farzad Bayat</div>
    </div>
    
    ${summarySections}
    
    ${aiCapabilitiesSection}
    
    ${conversationSection}
    
    ${researchSection}
    
    ${artifactsSection}
    
    ${roiSection}
    
    ${generateProposalSection(summaryData)}
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-name">Farzad Bayat – AI Consulting Specialist</div>
      <div class="footer-contact">contact@farzadbayat.com • +47 944 46 446</div>
      <div><a href="https://www.farzadbayat.com" class="footer-website">www.farzadbayat.com</a></div>
    </div>
  </div>
</body>
</html>`
}

