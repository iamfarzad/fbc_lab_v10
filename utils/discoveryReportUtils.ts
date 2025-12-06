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

interface DiscoveryReportInput {
  sessionId: string
  transcript: TranscriptItem[]
  userProfile: UserProfile | null
  researchContext?: ResearchResult | null
  voiceMinutes?: number
  screenMinutes?: number
  filesUploaded?: number
  toolsUsed?: ToolUsageRecord[]
}

/**
 * Extract insights from transcript
 */
function extractInsights(transcript: TranscriptItem[]): ExecutiveInsight[] {
  const insights: ExecutiveInsight[] = []
  
  // Look for key patterns in AI responses
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
 * Extract multimodal observations from transcript
 */
function extractObservations(
  transcript: TranscriptItem[], 
  voiceMinutes: number, 
  screenMinutes: number, 
  _filesUploaded: number
): MultimodalObservation[] {
  const observations: MultimodalObservation[] = []
  
  // Voice observation
  if (voiceMinutes > 0) {
    observations.push({
      type: 'voice',
      icon: '🎤',
      summary: `${Math.round(voiceMinutes)} minutes of voice conversation discussing strategy and implementation`
    })
  }
  
  // Screen share observation
  if (screenMinutes > 0) {
    observations.push({
      type: 'screen',
      icon: '🖥️',
      summary: 'Analyzed shared screen content including dashboards and workflows'
    })
  }
  
  // File uploads
  const fileAttachments = transcript.filter(t => t.attachment?.type === 'file')
  for (const file of fileAttachments.slice(-3)) {
    observations.push({
      type: 'file',
      icon: '📄',
      summary: `Reviewed ${file.attachment?.name || 'uploaded document'}`
    })
  }
  
  // Image/webcam
  const imageAttachments = transcript.filter(t => t.attachment?.type === 'image')
  if (imageAttachments.length > 0) {
    observations.push({
      type: 'webcam',
      icon: '📷',
      summary: `Visual analysis of ${imageAttachments.length} shared image(s)`
    })
  }
  
  return observations
}

/**
 * Build Discovery Report data from client-side inputs
 */
export function buildDiscoveryReportFromClient(input: DiscoveryReportInput): DiscoveryReportData {
  const { sessionId, transcript, userProfile, researchContext, voiceMinutes = 0, screenMinutes = 0, filesUploaded = 0 } = input
  
  // Calculate engagement metrics
  const metrics: EngagementMetrics = calculateEngagementMetrics({
    messageCount: transcript.length,
    voiceMinutes,
    screenMinutes,
    filesUploaded
  })
  
  // Extract insights
  const insights = extractInsights(transcript)
  
  // Extract tools used
  const toolsUsed = input.toolsUsed || extractToolUsage(transcript)
  
  // Extract observations
  const observations = extractObservations(transcript, voiceMinutes, screenMinutes, filesUploaded)
  
  // Build modalities used
  const modalitiesUsed: string[] = ['text']
  if (voiceMinutes > 0) modalitiesUsed.push('voice')
  if (screenMinutes > 0) modalitiesUsed.push('screen')
  if (filesUploaded > 0) modalitiesUsed.push('upload')
  
  // Look for ROI data in transcript
  let roi: DiscoveryReportData['roi'] = { hasData: false }
  for (const item of transcript) {
    if (item.role === 'model' && item.text) {
      // Look for ROI numbers in the text
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
  
  // Build client object, only including defined values
  const client: DiscoveryReportData['client'] = {
    name: userProfile?.name || researchContext?.person?.fullName || 'Valued Client'
  }
  if (researchContext?.company?.name) client.company = researchContext.company.name
  if (researchContext?.person?.role) client.role = researchContext.person.role
  if (userProfile?.email) client.email = userProfile.email

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
    recommendedSolution: 'consulting', // Default
    solutionRationale: 'Based on your needs and conversation',
    sessionId,
    sessionDuration: voiceMinutes || Math.round(transcript.length * 0.5),
    totalMessages: transcript.length,
    modalitiesUsed,
    bookingUrl: 'https://cal.com/farzad-bayat/30min',
    consultantEmail: 'farzad@fbc.ai',
    consultantName: 'Farzad Bayat'
  }
}

/**
 * Generate Discovery Report HTML (client-side template)
 */
export function generateDiscoveryReportHTMLClient(data: DiscoveryReportData): string {
  // Generate inline SVG charts
  const roiChartSVG = generateROIChartSVG(data.roi)
  const radarChartSVG = generateEngagementRadarSVG(data.engagementMetrics)
  const timelineSVG = generateToolsTimelineSVG(data.toolsUsed)
  
  const engagementColor = data.engagementLevel === 'High' ? '#00A878' : data.engagementLevel === 'Medium' ? '#FF6B35' : '#9ca3af'
  
  const insightsHTML = data.insights.length > 0 
    ? data.insights.map(i => `
      <div style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 12px; background: #fafafa; border-radius: 6px; border-left: 3px solid #FF6B35;">
        <span style="color: #FF6B35; font-weight: 700; font-size: 14px;">•</span>
        <span style="flex: 1; font-size: 11px; color: #374151; line-height: 1.4;">${escapeHtml(i.text)}</span>
      </div>
    `).join('')
    : '<div style="padding: 8px; color: #9ca3af;">Insights from your conversation</div>'
  
  const observationsHTML = data.observations.length > 0
    ? data.observations.map(o => `
      <div style="display: flex; align-items: flex-start; gap: 8px; padding: 8px 10px; background: #f8fafc; border-radius: 6px;">
        <span style="font-size: 16px;">${o.icon || '💡'}</span>
        <div>
          <div style="font-size: 9px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">${o.type}</div>
          <div style="font-size: 10px; color: #374151; line-height: 1.3;">${escapeHtml(o.summary)}</div>
        </div>
      </div>
    `).join('')
    : '<div style="padding: 8px; color: #9ca3af;">No multimodal observations</div>'

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Discovery Report - ${escapeHtml(data.client.company || data.client.name)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #1a1a2e; line-height: 1.5; background: white; font-size: 11px; }
    .page { width: 100%; max-width: 800px; margin: 0 auto; padding: 24px; background: white; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 16px; padding-bottom: 12px; border-bottom: 3px solid #FF6B35; }
    .brand { display: flex; align-items: center; gap: 10px; }
    .logo { font-size: 24px; font-weight: 800; color: #1a1a2e; }
    .logo-slash { color: #FF6B35; }
    .report-type { font-size: 10px; font-weight: 600; color: #FF6B35; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 10px; background: #fff7ed; border-radius: 4px; }
    .header-meta { text-align: right; font-size: 9px; color: #6b7280; }
    .header-meta .date { font-weight: 600; color: #1a1a2e; }
    .client-section { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 16px; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 8px; border-left: 4px solid #FF6B35; }
    .client-info h1 { font-size: 18px; font-weight: 700; color: #1a1a2e; margin-bottom: 2px; }
    .client-info .subtitle { font-size: 11px; color: #6b7280; }
    .engagement-badge { display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; color: ${engagementColor}; background: ${engagementColor}15; }
    .engagement-dot { width: 8px; height: 8px; border-radius: 50%; background: ${engagementColor}; }
    .section { margin-bottom: 16px; }
    .section-title { font-size: 10px; font-weight: 700; color: #FF6B35; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; padding-bottom: 4px; border-bottom: 1px solid #e5e7eb; }
    .insights-list { display: flex; flex-direction: column; gap: 6px; }
    .observations-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .charts-section { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 12px; }
    .chart-container { background: #fafafa; border-radius: 8px; padding: 8px; display: flex; justify-content: center; align-items: center; }
    .timeline-container { background: #fafafa; border-radius: 8px; padding: 8px 12px; margin-top: 10px; }
    .cta-section { margin-top: 20px; padding: 16px 20px; background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%); border-radius: 12px; text-align: center; }
    .cta-title { font-size: 13px; font-weight: 700; color: white; margin-bottom: 8px; }
    .cta-subtitle { font-size: 10px; color: rgba(255,255,255,0.7); margin-bottom: 12px; }
    .cta-button { display: inline-block; padding: 10px 28px; background: #FF6B35; color: white; font-size: 11px; font-weight: 700; text-decoration: none; border-radius: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
    .cta-link { font-size: 9px; color: rgba(255,255,255,0.5); margin-top: 8px; font-family: monospace; }
    .cta-alternative { font-size: 9px; color: rgba(255,255,255,0.6); margin-top: 10px; }
    .footer { margin-top: 16px; padding-top: 10px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
    .footer-contact { display: flex; gap: 12px; }
    .footer-contact a { color: #6b7280; text-decoration: none; }
  </style>
</head>
<body>
  <div class="page">
    <div class="header">
      <div class="brand">
        <div class="logo">F.B<span class="logo-slash">/</span>c</div>
        <div class="report-type">AI Discovery Report</div>
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
    
    <div class="section">
      <div class="section-title">Executive Insights</div>
      <div class="insights-list">${insightsHTML}</div>
    </div>
    
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
    
    <div class="cta-section">
      <div class="cta-title">Ready to Explore These Insights Further?</div>
      <div class="cta-subtitle">Book a free 30-minute consultation to discuss solutions tailored to your needs.</div>
      <a href="${data.bookingUrl}" class="cta-button">Book Your Free Consultation</a>
      <div class="cta-link">${data.bookingUrl}</div>
      <div class="cta-alternative">Questions? Email ${data.consultantEmail}</div>
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
    return `<svg width="280" height="180" viewBox="0 0 280 180"><rect width="280" height="180" fill="#f9fafb" rx="8"/><text x="140" y="85" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="11" font-weight="500">ROI Analysis</text><text x="140" y="100" text-anchor="middle" fill="#d1d5db" font-family="system-ui" font-size="9">Available after ROI calculation</text></svg>`
  }
  
  const maxVal = Math.max(roi.investment, roi.projectedSavings)
  const invH = (roi.investment / maxVal) * 100
  const savH = (roi.projectedSavings / maxVal) * 100
  const formatK = (n: number) => n >= 1000 ? `$${(n/1000).toFixed(0)}K` : `$${n}`
  
  return `<svg width="280" height="180" viewBox="0 0 280 180">
    <text x="140" y="18" text-anchor="middle" fill="#1a1a2e" font-family="system-ui" font-size="11" font-weight="600">Investment vs Projected Savings</text>
    <rect x="60" y="${140-invH}" width="60" height="${invH}" fill="#FF6B35" rx="4"/>
    <text x="90" y="${130-invH}" text-anchor="middle" fill="#FF6B35" font-family="system-ui" font-size="12" font-weight="700">${formatK(roi.investment)}</text>
    <text x="90" y="158" text-anchor="middle" fill="#6b7280" font-family="system-ui" font-size="9">Investment</text>
    <rect x="160" y="${140-savH}" width="60" height="${savH}" fill="#00A878" rx="4"/>
    <text x="190" y="${130-savH}" text-anchor="middle" fill="#00A878" font-family="system-ui" font-size="12" font-weight="700">${formatK(roi.projectedSavings)}</text>
    <text x="190" y="158" text-anchor="middle" fill="#6b7280" font-family="system-ui" font-size="9">Proj. Savings</text>
    ${roi.roiPercentage ? `<rect x="215" y="8" width="55" height="20" rx="10" fill="#00A878" opacity="0.15"/><text x="242" y="22" text-anchor="middle" fill="#00A878" font-family="system-ui" font-size="10" font-weight="700">${roi.roiPercentage}% ROI</text>` : ''}
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
  const badgeColor = avg >= 60 ? '#00A878' : avg >= 30 ? '#FF6B35' : '#9ca3af'
  
  return `<svg width="280" height="180" viewBox="0 0 280 180">
    <text x="140" y="14" text-anchor="middle" fill="#1a1a2e" font-family="system-ui" font-size="11" font-weight="600">Engagement by Modality</text>
    <circle cx="${cx}" cy="${cy}" r="${r*0.25}" fill="none" stroke="#e5e7eb" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r*0.5}" fill="none" stroke="#e5e7eb" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r*0.75}" fill="none" stroke="#e5e7eb" stroke-dasharray="2,2"/>
    <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="#e5e7eb"/>
    ${axes.map(a => { const p = toXY(100, a.angle); return `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="#e5e7eb"/>`}).join('')}
    <polygon points="${polygon}" fill="#FF6B35" fill-opacity="0.2" stroke="#FF6B35" stroke-width="2"/>
    ${points.map(p => `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#FF6B35" stroke="white" stroke-width="2"/>`).join('')}
    ${axes.map(a => { const p = toXY(118, a.angle); const anchor = a.angle === 0 ? 'middle' : a.angle === 90 ? 'start' : a.angle === 180 ? 'middle' : 'end'; return `<text x="${p.x}" y="${p.y+3}" text-anchor="${anchor}" fill="#6b7280" font-family="system-ui" font-size="9">${a.label}</text>`}).join('')}
    <rect x="225" y="4" width="50" height="18" rx="9" fill="${badgeColor}" opacity="0.15"/>
    <text x="250" y="16" text-anchor="middle" fill="${badgeColor}" font-family="system-ui" font-size="9" font-weight="700">${badge}</text>
  </svg>`
}

function generateToolsTimelineSVG(tools: ToolUsageRecord[]): string {
  if (!tools || tools.length === 0) {
    return `<svg width="560" height="80" viewBox="0 0 560 80"><rect width="560" height="80" fill="#f9fafb" rx="8"/><text x="280" y="36" text-anchor="middle" fill="#9ca3af" font-family="system-ui" font-size="11" font-weight="500">AI Capabilities</text><text x="280" y="52" text-anchor="middle" fill="#d1d5db" font-family="system-ui" font-size="9">Tools will appear as they're used</text></svg>`
  }
  
  const icons: Record<string, string> = { search_web: '🔍', calculate_roi: '📊', capture_screen_snapshot: '🖥️', extract_action_items: '✅', generate_summary_preview: '📋' }
  const displayTools = tools.slice(0, 5)
  const spacing = displayTools.length > 1 ? 500 / (displayTools.length - 1) : 0
  
  const nodes = displayTools.map((t, i) => {
    const x = displayTools.length === 1 ? 280 : 30 + i * spacing
    const icon = icons[t.name] || '⚡'
    const label = (TOOL_LABELS[t.name] || t.name).substring(0, 12)
    return `<g transform="translate(${x}, 40)"><circle cx="0" cy="0" r="14" fill="#fff7ed" stroke="#FF6B35" stroke-width="2"/><text x="0" y="5" text-anchor="middle" font-size="12">${icon}</text><text x="0" y="28" text-anchor="middle" fill="#6b7280" font-family="system-ui" font-size="8" font-weight="500">${label}</text></g>`
  }).join('')
  
  const arrows = displayTools.slice(0, -1).map((_, i) => {
    const x1 = 30 + i * spacing + 18
    const x2 = 30 + (i + 1) * spacing - 18
    return `<line x1="${x1}" y1="40" x2="${x2-6}" y2="40" stroke="#e5e7eb" stroke-width="2"/><polygon points="${x2},40 ${x2-6},36 ${x2-6},44" fill="#e5e7eb"/>`
  }).join('')
  
  return `<svg width="560" height="80" viewBox="0 0 560 80"><text x="20" y="14" fill="#1a1a2e" font-family="system-ui" font-size="11" font-weight="600">AI Capabilities Demonstrated</text>${arrows}${nodes}</svg>`
}

/**
 * Create a transcript item with discovery report attachment
 */
export function createDiscoveryReportTranscriptItem(data: DiscoveryReportData, htmlContent: string, pdfDataUrl?: string): TranscriptItem {
  const attachment: TranscriptItem['attachment'] = {
    type: 'discovery_report',
    name: `AI Discovery Report - ${data.client.company || data.client.name}`,
    htmlContent,
    url: data.bookingUrl
  }
  if (pdfDataUrl) attachment.data = pdfDataUrl

  return {
    id: `discovery-report-${Date.now()}`,
    role: 'model',
    text: "I've prepared your personalized AI Discovery Report! Review your insights and book a free consultation to discuss next steps.",
    timestamp: new Date(),
    isFinal: true,
    status: 'complete',
    attachment
  }
}

