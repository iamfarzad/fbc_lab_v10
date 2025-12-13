/**
 * Discovery Report Utilities (Client-Side)
 * 
 * Client-side utilities for generating and displaying the AI Discovery Report
 * PDF generation happens server-side via API, this handles HTML preview and data collection
 */

import type { TranscriptItem, ResearchResult } from '../types'
import type { 
  DiscoveryReportData, 
  ToolUsageRecord, 
  EngagementMetrics, 
  MultimodalObservation, 
  ExecutiveInsight 
} from '../src/core/pdf/utils/discovery-report-types'
import { 
  calculateEngagementMetrics, 
  calculateEngagementLevel,
  TOOL_LABELS 
} from '../src/core/pdf/utils/discovery-report-types'

interface UserProfile {
  name: string
  email: string
}

interface SummaryAgentOutput {
  executiveSummary?: string
  keyFindings?: {
    goals?: string
    painPoints?: string[]
    currentSituation?: string
    dataReality?: string
    teamReadiness?: string
    budgetSignals?: string
  }
  recommendedSolution?: 'workshop' | 'consulting'
  solutionRationale?: string
  expectedROI?: string
  pricingBallpark?: string
  nextSteps?: string
  multimodalInteractionSummary?: {
    voice?: string
    screenShare?: string
    documentsReviewed?: string[]
    engagementScore?: string
  }
}

interface DiscoveryReportInput {
  sessionId: string
  transcript: TranscriptItem[]
  userProfile: UserProfile | null
  researchContext?: ResearchResult | null
  voiceMinutes?: number
  screenMinutes?: number
  filesUploaded?: number
  toolsUsed?: ToolUsageRecord[]
  summaryAgentOutput?: SummaryAgentOutput // Optional Summary Agent output
}

/**
 * Extract insights from Summary Agent output or fallback to transcript
 */
function extractInsights(transcript: TranscriptItem[], summaryAgentOutput?: SummaryAgentOutput): ExecutiveInsight[] {
  // Use Summary Agent output if available
  if (summaryAgentOutput?.keyFindings) {
    const insights: ExecutiveInsight[] = []
    const findings = summaryAgentOutput.keyFindings
    
    if (findings.goals) {
      insights.push({ text: findings.goals, category: 'goal' })
    }
    
    if (findings.painPoints && Array.isArray(findings.painPoints)) {
      findings.painPoints.slice(0, 2).forEach(painPoint => {
        insights.push({ text: painPoint, category: 'pain_point' })
      })
    }
    
    if (findings.currentSituation) {
      insights.push({ text: findings.currentSituation, category: 'observation' })
    }
    
    if (insights.length > 0) {
      return insights
    }
  }
  
  // Fallback to transcript extraction (backward compatibility)
  const insights: ExecutiveInsight[] = []
  const aiMessages = transcript.filter(t => t.role === 'model' && t.isFinal && t.text)
  
  for (const msg of aiMessages) {
    const text = msg.text.toLowerCase()
    
    // Look for goal-related statements
    if (text.includes('your goal') || text.includes('you want to') || text.includes('you\'re looking to')) {
      const sentence = extractSentence(msg.text, ['goal', 'want to', 'looking to'])
      if (sentence) insights.push({ text: sentence, category: 'goal' })
    }
    
    // Look for pain points
    if (text.includes('challenge') || text.includes('pain point') || text.includes('struggling')) {
      const sentence = extractSentence(msg.text, ['challenge', 'pain point', 'struggling'])
      if (sentence) insights.push({ text: sentence, category: 'pain_point' })
    }
    
    // Look for opportunities
    if (text.includes('opportunity') || text.includes('could save') || text.includes('potential')) {
      const sentence = extractSentence(msg.text, ['opportunity', 'could save', 'potential'])
      if (sentence) insights.push({ text: sentence, category: 'opportunity' })
    }
  }
  
  // If no insights found, create generic ones from conversation
  if (insights.length === 0 && aiMessages.length > 0) {
    const lastMsg = aiMessages[aiMessages.length - 1]
    if (lastMsg && lastMsg.text.length > 50) {
      insights.push({
        text: lastMsg.text.substring(0, 150) + (lastMsg.text.length > 150 ? '...' : ''),
        category: 'observation'
      })
    }
  }
  
  return insights.slice(0, 5) // Max 5 insights
}

/**
 * Extract a sentence containing a keyword
 */
function extractSentence(text: string, keywords: string[]): string | null {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
  
  for (const keyword of keywords) {
    for (const sentence of sentences) {
      if (sentence.toLowerCase().includes(keyword)) {
        return sentence.trim().substring(0, 120) + (sentence.length > 120 ? '...' : '')
      }
    }
  }
  
  return null
}

/**
 * Extract tool usage from transcript
 */
function extractToolUsage(transcript: TranscriptItem[]): ToolUsageRecord[] {
  const tools: ToolUsageRecord[] = []
  
  for (const item of transcript) {
    // Look for tool indicators in the text
    if (item.role === 'model' && item.text) {
      const text = item.text.toLowerCase()
      
      if (text.includes('search') || text.includes('found') || item.groundingMetadata?.webSearchQueries?.length) {
        tools.push({
          name: 'search_web',
          timestamp: item.timestamp.toISOString(),
          insight: 'Web research conducted'
        })
      }
      
      if (text.includes('roi') || text.includes('return on investment') || text.includes('savings')) {
        tools.push({
          name: 'calculate_roi',
          timestamp: item.timestamp.toISOString(),
          insight: 'ROI analysis performed'
        })
      }
      
      if (text.includes('screen') || text.includes('dashboard') || text.includes('showing')) {
        tools.push({
          name: 'capture_screen_snapshot',
          timestamp: item.timestamp.toISOString(),
          insight: 'Screen analysis'
        })
      }
    }
    
    // Check for file attachments
    if (item.attachment && item.attachment.type === 'file') {
      tools.push({
        name: 'extract_action_items',
        timestamp: item.timestamp.toISOString(),
        insight: `Analyzed ${item.attachment.name}`
      })
    }
  }
  
  // Deduplicate by name
  const seen = new Set<string>()
  return tools.filter(t => {
    if (seen.has(t.name)) return false
    seen.add(t.name)
    return true
  })
}

/**
 * Extract multimodal observations from Summary Agent output or transcript
 */
function extractObservations(
  transcript: TranscriptItem[], 
  voiceMinutes: number, 
  screenMinutes: number, 
  _filesUploaded: number,
  summaryAgentOutput?: SummaryAgentOutput
): MultimodalObservation[] {
  const observations: MultimodalObservation[] = []
  
  // Use Summary Agent output if available
  if (summaryAgentOutput?.multimodalInteractionSummary) {
    const mm = summaryAgentOutput.multimodalInteractionSummary
    
    if (mm.voice) {
      observations.push({
        type: 'voice',
        icon: '',
        summary: mm.voice
      })
    }
    
    if (mm.screenShare) {
      observations.push({
        type: 'screen',
        icon: '',
        summary: mm.screenShare
      })
    }
    
    if (mm.documentsReviewed && Array.isArray(mm.documentsReviewed)) {
      mm.documentsReviewed.forEach(doc => {
        observations.push({
          type: 'file',
          icon: '',
          summary: doc
        })
      })
    }
    
    if (observations.length > 0) {
      return observations
    }
  }
  
  // Fallback to transcript extraction (backward compatibility)
  // Voice observation
  if (voiceMinutes > 0) {
    observations.push({
      type: 'voice',
      icon: '',
      summary: `${Math.round(voiceMinutes)} minutes of voice conversation discussing strategy and implementation`
    })
  }
  
  // Screen share observation
  if (screenMinutes > 0) {
    observations.push({
      type: 'screen',
      icon: '',
      summary: 'Analyzed shared screen content including dashboards and workflows'
    })
  }
  
  // File uploads
  const fileAttachments = transcript.filter(t => t.attachment?.type === 'file')
  for (const file of fileAttachments.slice(-3)) {
    observations.push({
      type: 'file',
      icon: '',
      summary: `Reviewed ${file.attachment?.name || 'uploaded document'}`
    })
  }
  
  // Image/webcam
  const imageAttachments = transcript.filter(t => t.attachment?.type === 'image')
  if (imageAttachments.length > 0) {
    observations.push({
      type: 'webcam',
      icon: '',
      summary: `Visual analysis of ${imageAttachments.length} shared image(s)`
    })
  }
  
  return observations
}

/**
 * Collect research sources from groundingMetadata across all transcript items
 */
function collectResearchSources(transcript: TranscriptItem[]): Array<{ title: string; url: string }> {
  const sources: Array<{ title: string; url: string }> = []
  const seenUrls = new Set<string>()
  
  for (const item of transcript) {
    if (item.groundingMetadata?.groundingChunks) {
      for (const chunk of item.groundingMetadata.groundingChunks) {
        const url = chunk.web?.uri || chunk.maps?.uri
        const title = chunk.web?.title || chunk.maps?.title || 'Source'
        
        if (url && !seenUrls.has(url)) {
          seenUrls.add(url)
          sources.push({ title, url })
        }
      }
    }
  }
  
  return sources.slice(0, 10) // Max 10 sources
}

/**
 * Build AI Insights Report data from client-side inputs (using Summary Agent output when available)
 */
export function buildDiscoveryReportFromClient(input: DiscoveryReportInput): DiscoveryReportData {
  const { 
    sessionId, 
    transcript, 
    userProfile, 
    researchContext, 
    voiceMinutes = 0, 
    screenMinutes = 0, 
    filesUploaded = 0,
    summaryAgentOutput 
  } = input
  
  // Calculate engagement metrics
  const metrics: EngagementMetrics = calculateEngagementMetrics({
    messageCount: transcript.length,
    voiceMinutes,
    screenMinutes,
    filesUploaded
  })
  
  // Extract insights (use Summary Agent output if available)
  const insights = extractInsights(transcript, summaryAgentOutput)
  
  // Extract tools used
  const toolsUsed = input.toolsUsed || extractToolUsage(transcript)
  
  // Extract observations (use Summary Agent output if available)
  const observations = extractObservations(transcript, voiceMinutes, screenMinutes, filesUploaded, summaryAgentOutput)
  
  // Collect research sources from groundingMetadata
  const researchSources = collectResearchSources(transcript)
  
  // Build modalities used
  const modalitiesUsed: string[] = ['text']
  if (voiceMinutes > 0) modalitiesUsed.push('voice')
  if (screenMinutes > 0) modalitiesUsed.push('screen')
  if (filesUploaded > 0) modalitiesUsed.push('upload')
  
  // Extract ROI from Summary Agent output or transcript
  let roi: DiscoveryReportData['roi'] = { hasData: false }
  if (summaryAgentOutput?.expectedROI) {
    // Try to extract numbers from ROI string
    const roiMatch = summaryAgentOutput.expectedROI.match(/(\d+)%/i)
    if (roiMatch) {
      roi = {
        hasData: true,
        investment: 50000, // Placeholder
        projectedSavings: 150000, // Placeholder
        roiPercentage: roiMatch && roiMatch[1] ? parseInt(roiMatch[1], 10) : 0
      }
    }
  } else {
    // Fallback: Look for ROI data in transcript
    for (const item of transcript) {
      if (item.role === 'model' && item.text) {
        const roiMatch = item.text.match(/(\d+)%\s*(ROI|return)/i)
        const savingsMatch = item.text.match(/\$[\d,]+|\d+K|\d+M/i)
        
        if (roiMatch || savingsMatch) {
          roi = {
            hasData: true,
            investment: 50000, // Placeholder
            projectedSavings: 150000, // Placeholder
            roiPercentage: roiMatch && roiMatch[1] ? parseInt(roiMatch[1], 10) : 200
          }
          break
        }
      }
    }
  }
  
  // Build client object, only including defined values
  const client: DiscoveryReportData['client'] = {
    name: userProfile?.name || researchContext?.person?.fullName || 'Valued Client'
  }
  if (researchContext?.company?.name) client.company = researchContext.company.name
  if (researchContext?.person?.role) client.role = researchContext.person.role
  if (userProfile?.email) client.email = userProfile.email

  // Use Summary Agent output for solution and rationale
  const recommendedSolution = summaryAgentOutput?.recommendedSolution || 'consulting'
  const solutionRationale = summaryAgentOutput?.solutionRationale || 'Based on your needs and conversation'

  return {
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportRef: `FBC-${sessionId.slice(-8)}`,
    client,
    engagementLevel: calculateEngagementLevel(metrics),
    engagementMetrics: metrics,
    insights,
    observations,
    toolsUsed,
    roi,
    recommendedSolution,
    solutionRationale,
    sessionId,
    sessionDuration: voiceMinutes || Math.round(transcript.length * 0.5),
    totalMessages: transcript.length,
    modalitiesUsed,
    bookingUrl: 'https://cal.com/farzad-bayat/30min',
    consultantEmail: 'contact@farzadbayat.com',
    consultantName: 'Farzad Bayat',
    // Store additional data for template
    executiveSummary: summaryAgentOutput?.executiveSummary,
    pricingBallpark: summaryAgentOutput?.pricingBallpark,
    expectedROI: summaryAgentOutput?.expectedROI,
    researchSources
  } as DiscoveryReportData & { 
    executiveSummary?: string
    pricingBallpark?: string
    expectedROI?: string
    researchSources?: Array<{ title: string; url: string }>
  }
}

/**
 * Generate AI Insights Report HTML (client-side template)
 * Matches pdfUtils.ts design: simple, minimal, orange accent, no gradients/shadows
 */
export function generateDiscoveryReportHTMLClient(data: DiscoveryReportData & { 
  executiveSummary?: string
  pricingBallpark?: string
  expectedROI?: string
  researchSources?: Array<{ title: string; url: string }>
}): string {
  // Generate inline SVG charts
  const roiChartSVG = generateROIChartSVG(data.roi)
  const radarChartSVG = generateEngagementRadarSVG(data.engagementMetrics)
  const timelineSVG = generateToolsTimelineSVG(data.toolsUsed)
  
  const engagementColor = data.engagementLevel === 'High' ? '#00A878' : data.engagementLevel === 'Medium' ? '#F97316' : '#9ca3af'
  
  // Executive Summary (from Summary Agent or insights)
  const executiveSummaryHTML = data.executiveSummary 
    ? `<div style="padding: 12px; background: #fafafa; border-left: 3px solid #F97316; border-radius: 4px; margin-bottom: 12px;">
        <div style="font-size: 11px; color: #374151; line-height: 1.5;">${escapeHtml(data.executiveSummary)}</div>
      </div>`
    : (data.insights.length > 0 
      ? data.insights.map(i => `
        <div style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; background: #fafafa; border-radius: 4px; border-left: 3px solid #F97316; margin-bottom: 6px;">
          <span style="color: #F97316; font-weight: 700; font-size: 12px;">•</span>
          <span style="flex: 1; font-size: 11px; color: #374151; line-height: 1.4;">${escapeHtml(i.text)}</span>
        </div>
      `).join('')
      : '<div style="padding: 8px; color: #9ca3af; font-size: 10px;">Key insights from your conversation</div>')
  
  const observationsHTML = data.observations.length > 0
    ? data.observations.map(o => `
      <div style="padding: 8px 10px; background: #f8fafc; border-radius: 4px; border-left: 2px solid #e5e7eb; margin-bottom: 6px;">
        <div style="font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${o.type}</div>
        <div style="font-size: 10px; color: #374151; line-height: 1.3;">${escapeHtml(o.summary)}</div>
      </div>
    `).join('')
    : '<div style="padding: 8px; color: #9ca3af; font-size: 10px;">No multimodal observations</div>'
  
  // Research Sources
  const researchSourcesHTML = (data.researchSources && data.researchSources.length > 0)
    ? data.researchSources.map((source, i) => `
      <div style="padding: 6px 0; border-bottom: 1px solid #e5e7eb;">
        <a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" style="font-size: 10px; color: #6b7280; text-decoration: none; display: block;">
          ${i + 1}. ${escapeHtml(source.title)}
          <span style="color: #9ca3af; font-size: 9px; margin-left: 6px;">(${new URL(source.url).hostname.replace('www.', '')})</span>
        </a>
      </div>
    `).join('')
    : '<div style="padding: 8px; color: #9ca3af; font-size: 10px;">No research sources available</div>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Insights Report - ${escapeHtml(data.client.company || data.client.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #212529; line-height: 1.5; background: white; font-size: 11px; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 24px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #F97316; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 24px; font-weight: 800; color: #212529; }
    .logo-slash { color: #212529; }
    .report-type { font-size: 10px; font-weight: 600; color: #F97316; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; background: #fff7ed; border-radius: 4px; }
    .header-meta { text-align: right; font-size: 9px; color: #6c757d; }
    .header-meta .date { font-weight: 600; color: #212529; }
    .client-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #F97316; }
    .client-info h1 { font-size: 18px; font-weight: 700; color: #212529; margin-bottom: 2px; }
    .client-info .subtitle { font-size: 11px; color: #6c757d; }
    .engagement-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 4px; font-size: 10px; font-weight: 700; color: ${engagementColor}; background: ${engagementColor}15; }
    .engagement-dot { width: 8px; height: 8px; border-radius: 50%; background: ${engagementColor}; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; color: #F97316; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #dee2e6; }
    .insights-list { display: flex; flex-direction: column; gap: 6px; }
    .observations-grid { display: flex; flex-direction: column; gap: 6px; }
    .charts-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .chart-container { background: #f8f9fa; border-radius: 4px; padding: 8px; display: flex; justify-content: center; align-items: center; border: 1px solid #dee2e6; }
    .timeline-container { background: #f8f9fa; border-radius: 4px; padding: 8px 12px; margin-top: 10px; border: 1px solid #dee2e6; }
    .sources-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid #dee2e6; }
    .cta-section { margin-top: 20px; padding: 16px 20px; background: #212529; border-radius: 4px; text-align: center; }
    .cta-title { font-size: 13px; font-weight: 700; color: white; margin-bottom: 8px; }
    .cta-subtitle { font-size: 10px; color: rgba(255,255,255,0.8); margin-bottom: 12px; }
    .cta-button { display: inline-block; padding: 10px 28px; background: #F97316; color: white; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cta-link { font-size: 9px; color: rgba(255,255,255,0.6); margin-top: 8px; font-family: monospace; }
    .cta-alternative { font-size: 9px; color: rgba(255,255,255,0.7); margin-top: 10px; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #dee2e6; display: flex; justify-content: space-between; font-size: 9px; color: #6c757d; }
    .footer-contact { display: flex; gap: 12px; }
    .footer-contact a { color: #6c757d; text-decoration: none; }
    .solution-info { padding: 12px; background: #f8f9fa; border-radius: 4px; border-left: 3px solid #F97316; margin-bottom: 12px; }
    .solution-info strong { color: #212529; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">F.B<span class="logo-slash">/</span>c</div>
        <div class="report-type">AI Insights Report</div>
      </div>
      <div class="header-meta">
        <div class="date">${data.reportDate}</div>
        <div>Ref: ${data.reportRef}</div>
      </div>
    </div>
    
    <div class="client-section">
      <div class="client-info">
        <h1>${escapeHtml(data.client.company || data.client.name)}</h1>
        <div class="subtitle">${escapeHtml(data.client.name)}${data.client.role ? ` • ${escapeHtml(data.client.role)}` : ''}</div>
      </div>
      <div class="engagement-badge">
        <div class="engagement-dot"></div>
        ${data.engagementLevel} Engagement
      </div>
    </div>
    
    ${data.executiveSummary ? `
    <div class="section">
      <div class="section-title">Executive Summary</div>
      ${executiveSummaryHTML}
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">Key Insights</div>
      <div class="insights-list">${executiveSummaryHTML}</div>
    </div>
    
    ${data.pricingBallpark || data.expectedROI ? `
    <div class="section">
      <div class="solution-info">
        ${data.recommendedSolution ? `<div style="margin-bottom: 8px;"><strong>Recommended Solution:</strong> ${data.recommendedSolution === 'consulting' ? 'Consulting Engagement' : 'Workshop'}</div>` : ''}
        ${data.solutionRationale ? `<div style="margin-bottom: 8px; font-size: 10px; color: #495057;">${escapeHtml(data.solutionRationale)}</div>` : ''}
        ${data.pricingBallpark ? `<div style="margin-bottom: 8px;"><strong>Investment Range:</strong> ${escapeHtml(data.pricingBallpark)}</div>` : ''}
        ${data.expectedROI ? `<div><strong>Expected ROI:</strong> ${escapeHtml(data.expectedROI)}</div>` : ''}
      </div>
    </div>
    ` : ''}
    
    <div class="section">
      <div class="section-title">What Our AI Observed</div>
      <div class="observations-grid">${observationsHTML}</div>
    </div>
    
    <div class="section">
      <div class="timeline-container">${timelineSVG}</div>
    </div>
    
    <div class="charts-section">
      <div class="chart-container">${roiChartSVG}</div>
      <div class="chart-container">${radarChartSVG}</div>
    </div>
    
    ${data.researchSources && data.researchSources.length > 0 ? `
    <div class="section sources-section">
      <div class="section-title">Research Sources</div>
      ${researchSourcesHTML}
    </div>
    ` : ''}
    
    <div class="cta-section">
      <div class="cta-title">Ready to Explore These Insights Further?</div>
      <div class="cta-subtitle">Book a free 30-minute consultation to discuss solutions tailored to your needs.</div>
      <a href="${data.bookingUrl}" class="cta-button">Book Your Free Consultation</a>
      <div class="cta-link">${data.bookingUrl}</div>
      <div class="cta-alternative">Questions? Email ${escapeHtml(data.consultantEmail)}</div>
    </div>
    
    <div class="footer">
      <div class="footer-contact">
        <span><strong>${data.consultantName}</strong></span>
        <a href="mailto:${data.consultantEmail}">${data.consultantEmail}</a>
        <span>farzadbayat.com</span>
      </div>
      <div>Session data retained for 7 days • GDPR compliant</div>
    </div>
  </div>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Simplified inline SVG generators for client-side
function generateROIChartSVG(roi?: { hasData: boolean; investment?: number; projectedSavings?: number; roiPercentage?: number }): string {
  if (!roi?.hasData || !roi.investment || !roi.projectedSavings) {
    return `<svg width="280" height="180" viewBox="0 0 280 180"><rect width="280" height="180" fill="#f8f9fa" rx="4" stroke="#dee2e6"/><text x="140" y="85" text-anchor="middle" fill="#6c757d" font-family="system-ui" font-size="11" font-weight="500">ROI Analysis</text><text x="140" y="100" text-anchor="middle" fill="#adb5bd" font-family="system-ui" font-size="9">Available after ROI calculation</text></svg>`
  }
  
  const maxVal = Math.max(roi.investment, roi.projectedSavings)
  const invH = (roi.investment / maxVal) * 100
  const savH = (roi.projectedSavings / maxVal) * 100
  const formatK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
  
  return `<svg width="280" height="180" viewBox="0 0 280 180">
    <text x="140" y="18" text-anchor="middle" fill="#212529" font-family="system-ui" font-size="11" font-weight="600">Investment vs Projected Savings</text>
    <rect x="60" y="${140-invH}" width="60" height="${invH}" fill="#F97316" rx="2"/>
    <text x="90" y="${130-invH}" text-anchor="middle" fill="#F97316" font-family="system-ui" font-size="12" font-weight="700">${formatK(roi.investment)}</text>
    <text x="90" y="158" text-anchor="middle" fill="#6c757d" font-family="system-ui" font-size="9">Investment</text>
    <rect x="160" y="${140-savH}" width="60" height="${savH}" fill="#00A878" rx="2"/>
    <text x="190" y="${130-savH}" text-anchor="middle" fill="#00A878" font-family="system-ui" font-size="12" font-weight="700">${formatK(roi.projectedSavings)}</text>
    <text x="190" y="158" text-anchor="middle" fill="#6c757d" font-family="system-ui" font-size="9">Proj. Savings</text>
    ${roi.roiPercentage ? `<rect x="215" y="8" width="55" height="20" rx="4" fill="#00A878" opacity="0.15" stroke="#00A878" stroke-width="1"/><text x="242" y="22" text-anchor="middle" fill="#00A878" font-family="system-ui" font-size="10" font-weight="700">${roi.roiPercentage}% ROI</text>` : ''}
  </svg>`
}

function generateEngagementRadarSVG(metrics: EngagementMetrics): string {
  const cx = 140, cy = 100, r = 60
  const axes = [
    { label: 'Text', value: metrics.text, angle: 0 },
    { label: 'Voice', value: metrics.voice, angle: 90 },
    { label: 'Screen', value: metrics.screen, angle: 180 },
    { label: 'Files', value: metrics.files, angle: 270 }
  ]
  
  const toXY = (val: number, angle: number) => {
    const rad = (angle - 90) * Math.PI / 180
    const dist = (val / 100) * r
    return { x: cx + dist * Math.cos(rad), y: cy + dist * Math.sin(rad) }
  }
  
  const points = axes.map(a => toXY(a.value, a.angle))
  const polygon = points.map(p => `${p.x},${p.y}`).join(' ')
  
  const avg = (metrics.text + metrics.voice + metrics.screen + metrics.files) / 4
  const badge = avg >= 60 ? 'High' : avg >= 30 ? 'Medium' : 'Low'
  const badgeColor = avg >= 60 ? '#00A878' : avg >= 30 ? '#F97316' : '#6c757d'
  
  return `<svg width="280" height="180" viewBox="0 0 280 180">
    <text x="140" y="14" text-anchor="middle" fill="#212529" font-family="system-ui" font-size="11" font-weight="600">Engagement by Modality</text>
    <circle cx="${cx}" cy="${cy}" r="${r*0.25}" fill="none" stroke="#dee2e6" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r*0.5}" fill="none" stroke="#dee2e6" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="none" stroke="#dee2e6" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#dee2e6"/>
    ${axes.map(a => { const p = toXY(100, a.angle); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#dee2e6"/>`}).join('')}
    <polygon points="${polygon}" fill="#F97316" fill-opacity="0.2" stroke="#F97316" stroke-width="2"/>
    ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#F97316" stroke="white" stroke-width="2"/>`).join('')}
    ${axes.map(a => { const p = toXY(118, a.angle); const anchor = a.angle === 0 ? 'middle' : a.angle === 90 ? 'start' : a.angle === 180 ? 'middle' : 'end'; return `<text x="${p.x}" y="${p.y+3}" text-anchor="${anchor}" fill="#6c757d" font-family="system-ui" font-size="9">${a.label}</text>`}).join('')}
    <rect x="225" y="4" width="50" height="18" rx="4" fill="${badgeColor}" opacity="0.15" stroke="${badgeColor}" stroke-width="1"/>
    <text x="250" y="16" text-anchor="middle" fill="${badgeColor}" font-family="system-ui" font-size="9" font-weight="700">${badge}</text>
  </svg>`
}

function generateToolsTimelineSVG(tools: ToolUsageRecord[]): string {
  if (!tools || tools.length === 0) {
    return `<svg width="560" height="80" viewBox="0 0 560 80"><rect width="560" height="80" fill="#f8f9fa" rx="4" stroke="#dee2e6"/><text x="280" y="36" text-anchor="middle" fill="#6c757d" font-family="system-ui" font-size="11" font-weight="500">AI Capabilities</text><text x="280" y="52" text-anchor="middle" fill="#adb5bd" font-family="system-ui" font-size="9">Tools will appear as they're used</text></svg>`
  }
  
  // Remove emojis, use text labels only
  const displayTools = tools.slice(0, 5)
  const spacing = displayTools.length > 1 ? 500 / (displayTools.length - 1) : 0
  
  const nodes = displayTools.map((t, i) => {
    const x = displayTools.length === 1 ? 280 : 30 + i * spacing
    const label = (TOOL_LABELS[t.name] || t.name).substring(0, 12)
    return `<g transform="translate(${x}, 40)"><circle cx="0" cy="0" r="14" fill="#fff7ed" stroke="#F97316" stroke-width="2"/><text x="0" y="4" text-anchor="middle" fill="#F97316" font-family="system-ui" font-size="8" font-weight="700">${label.charAt(0).toUpperCase()}</text><text x="0" y="28" text-anchor="middle" fill="#6c757d" font-family="system-ui" font-size="8" font-weight="500">${label}</text></g>`
  }).join('')
  
  const arrows = displayTools.slice(0, -1).map((_, i) => {
    const x1 = 30 + i * spacing + 18
    const x2 = 30 + (i + 1) * spacing - 18
    return `<line x1="${x1}" y1="40" x2="${x2-6}" y2="40" stroke="#dee2e6" stroke-width="2"/><polygon points="${x2},40 ${x2-6},36 ${x2-6},44" fill="#dee2e6"/>`
  }).join('')
  
  return `<svg width="560" height="80" viewBox="0 0 560 80"><text x="20" y="14" fill="#212529" font-family="system-ui" font-size="11" font-weight="600">AI Capabilities Demonstrated</text>${arrows}${nodes}</svg>`
}

/**
 * Create a transcript item with discovery report attachment
 */
export function createDiscoveryReportTranscriptItem(data: DiscoveryReportData, htmlContent: string, pdfDataUrl?: string): TranscriptItem {
  const attachment: TranscriptItem['attachment'] = {
    type: 'discovery_report',
    name: `AI Insights Report - ${data.client.company || data.client.name}`,
    htmlContent,
    url: data.bookingUrl
  }
  if (pdfDataUrl) attachment.data = pdfDataUrl

  return {
    id: `insights-report-${Date.now()}`,
    role: 'model',
    text: "I've prepared your personalized AI Insights Report! Review your insights and book a free consultation to discuss next steps.",
    timestamp: new Date(),
    isFinal: true,
    status: 'complete',
    attachment
  }
}
