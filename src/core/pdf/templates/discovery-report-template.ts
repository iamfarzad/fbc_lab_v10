/**
 * Discovery Report Template
 * 
 * McKinsey/BCG-style 1-page AI Discovery Report
 * Lead magnet designed to drive 30-min booking conversions
 */

import type { DiscoveryReportData, MultimodalObservation, ExecutiveInsight } from '../utils/discovery-report-types.js'
import { generateROIChart } from '../charts/roi-chart.js'
import { generateEngagementRadar } from '../charts/engagement-radar.js'
import { generateToolsTimeline } from '../charts/tools-timeline.js'

/**
 * Generate the full HTML content for the Discovery Report
 */
export function generateDiscoveryReportHTML(data: DiscoveryReportData): string {
  // Generate chart SVGs
  const roiChartSVG = data.roi ? generateROIChart(data.roi) : generateROIChart({ hasData: false })
  const radarChartSVG = generateEngagementRadar(data.engagementMetrics)
  const timelineSVG = generateToolsTimeline(data.toolsUsed)
  
  // Format observations
  const observationsHTML = generateObservationsHTML(data.observations)
  
  // Format insights
  const insightsHTML = generateInsightsHTML(data.insights)
  
  // Engagement badge color
  const engagementColor = data.engagementLevel === 'High' ? '#00A878' : data.engagementLevel === 'Medium' ? '#FF6B35' : '#9ca3af'
  
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Discovery Report - ${data.client.company || data.client.name}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    @page {
      size: A4;
      margin: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a2e;
      line-height: 1.5;
      background: white;
      font-size: 11px;
    }
    
    .page {
      width: 210mm;
      min-height: 297mm;
      max-height: 297mm;
      padding: 16mm 18mm;
      background: white;
      overflow: hidden;
    }
    
    /* Header */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 14px;
      padding-bottom: 12px;
      border-bottom: 3px solid #FF6B35;
    }
    
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 800;
      color: #1a1a2e;
      letter-spacing: -0.5px;
    }
    
    .logo-slash {
      color: #FF6B35;
    }
    
    .report-type {
      font-size: 10px;
      font-weight: 600;
      color: #FF6B35;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      padding: 4px 10px;
      background: #fff7ed;
      border-radius: 4px;
    }
    
    .header-meta {
      text-align: right;
      font-size: 9px;
      color: #6b7280;
    }
    
    .header-meta .date {
      font-weight: 600;
      color: #1a1a2e;
    }
    
    /* Client Section */
    .client-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
      border-radius: 8px;
      border-left: 4px solid #FF6B35;
    }
    
    .client-info h1 {
      font-size: 18px;
      font-weight: 700;
      color: #1a1a2e;
      margin-bottom: 2px;
    }
    
    .client-info .subtitle {
      font-size: 11px;
      color: #6b7280;
    }
    
    .engagement-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 10px;
      font-weight: 700;
      color: ${engagementColor};
      background: ${engagementColor}15;
    }
    
    .engagement-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${engagementColor};
    }
    
    /* Section Styling */
    .section {
      margin-bottom: 14px;
    }
    
    .section-title {
      font-size: 10px;
      font-weight: 700;
      color: #FF6B35;
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 8px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e7eb;
    }
    
    /* Insights */
    .insights-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    
    .insight-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 12px;
      background: #fafafa;
      border-radius: 6px;
      border-left: 3px solid #FF6B35;
    }
    
    .insight-bullet {
      color: #FF6B35;
      font-weight: 700;
      font-size: 14px;
      line-height: 1;
      margin-top: 1px;
    }
    
    .insight-text {
      flex: 1;
      font-size: 11px;
      color: #374151;
      line-height: 1.4;
    }
    
    /* Observations */
    .observations-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }
    
    .observation-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      padding: 8px 10px;
      background: #f8fafc;
      border-radius: 6px;
    }
    
    .observation-icon {
      font-size: 16px;
      line-height: 1;
    }
    
    .observation-content {
      flex: 1;
    }
    
    .observation-type {
      font-size: 9px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .observation-summary {
      font-size: 10px;
      color: #374151;
      line-height: 1.3;
    }
    
    /* Charts Section */
    .charts-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    
    .chart-container {
      background: #fafafa;
      border-radius: 8px;
      padding: 8px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    
    /* Timeline */
    .timeline-container {
      background: #fafafa;
      border-radius: 8px;
      padding: 8px 12px;
      margin-top: 10px;
    }
    
    /* CTA Section */
    .cta-section {
      margin-top: 16px;
      padding: 16px 20px;
      background: linear-gradient(135deg, #1a1a2e 0%, #2d2d44 100%);
      border-radius: 12px;
      text-align: center;
    }
    
    .cta-title {
      font-size: 13px;
      font-weight: 700;
      color: white;
      margin-bottom: 8px;
    }
    
    .cta-subtitle {
      font-size: 10px;
      color: rgba(255, 255, 255, 0.7);
      margin-bottom: 12px;
    }
    
    .cta-button {
      display: inline-block;
      padding: 10px 28px;
      background: #FF6B35;
      color: white;
      font-size: 11px;
      font-weight: 700;
      text-decoration: none;
      border-radius: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .cta-link {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.5);
      margin-top: 8px;
      font-family: monospace;
    }
    
    .cta-alternative {
      font-size: 9px;
      color: rgba(255, 255, 255, 0.6);
      margin-top: 10px;
    }
    
    /* Footer */
    .footer {
      margin-top: 14px;
      padding-top: 10px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #9ca3af;
    }
    
    .footer-contact {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    
    .footer-contact a {
      color: #6b7280;
      text-decoration: none;
    }
    
    .footer-gdpr {
      font-size: 8px;
      color: #d1d5db;
    }
    
    /* Print styles */
    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .page {
        page-break-after: avoid;
      }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
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
    
    <!-- Client Section -->
    <div class="client-section">
      <div class="client-info">
        <h1>${data.client.company || data.client.name}</h1>
        <div class="subtitle">${data.client.name}${data.client.role ? ` • ${data.client.role}` : ''}</div>
      </div>
      <div class="engagement-badge">
        <div class="engagement-dot"></div>
        ${data.engagementLevel} Engagement
      </div>
    </div>
    
    <!-- Executive Insights -->
    <div class="section">
      <div class="section-title">Executive Insights</div>
      <div class="insights-list">
        ${insightsHTML}
      </div>
    </div>
    
    <!-- What AI Observed -->
    <div class="section">
      <div class="section-title">What Our AI Observed</div>
      <div class="observations-grid">
        ${observationsHTML}
      </div>
    </div>
    
    <!-- Capabilities Timeline -->
    <div class="section">
      <div class="timeline-container">
        ${timelineSVG}
      </div>
    </div>
    
    <!-- Charts -->
    <div class="charts-section">
      <div class="chart-container">
        ${roiChartSVG}
      </div>
      <div class="chart-container">
        ${radarChartSVG}
      </div>
    </div>
    
    <!-- CTA Section -->
    <div class="cta-section">
      <div class="cta-title">Ready to Explore These Insights Further?</div>
      <div class="cta-subtitle">Book a free 30-minute consultation to discuss solutions tailored to your needs.</div>
      <a href="${data.bookingUrl}" class="cta-button">Book Your Free Consultation</a>
      <div class="cta-link">${data.bookingUrl}</div>
      <div class="cta-alternative">Questions? Email ${data.consultantEmail}</div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="footer-contact">
        <span><strong>${data.consultantName}</strong></span>
        <a href="mailto:${data.consultantEmail}">${data.consultantEmail}</a>
        <span>farzadbayat.com</span>
      </div>
      <div class="footer-gdpr">
        Session data retained for 7 days • GDPR compliant
      </div>
    </div>
  </div>
</body>
</html>`
}

/**
 * Generate HTML for observations list
 */
function generateObservationsHTML(observations: MultimodalObservation[]): string {
  if (!observations || observations.length === 0) {
    return `
      <div class="observation-item" style="grid-column: span 2; text-align: center; color: #9ca3af;">
        <span style="font-size: 10px;">No multimodal observations recorded</span>
      </div>
    `
  }
  
  const iconMap: Record<string, string> = {
    voice: '🎤',
    screen: '🖥️',
    file: '📄',
    webcam: '📷'
  }
  
  const typeLabels: Record<string, string> = {
    voice: 'Voice Analysis',
    screen: 'Screen Analysis',
    file: 'Document Review',
    webcam: 'Visual Analysis'
  }
  
  return observations.map(obs => `
    <div class="observation-item">
      <div class="observation-icon">${iconMap[obs.type] || '💡'}</div>
      <div class="observation-content">
        <div class="observation-type">${typeLabels[obs.type] || obs.type}</div>
        <div class="observation-summary">${escapeHtml(obs.summary)}</div>
      </div>
    </div>
  `).join('')
}

/**
 * Generate HTML for insights list
 */
function generateInsightsHTML(insights: ExecutiveInsight[]): string {
  if (!insights || insights.length === 0) {
    return `
      <div class="insight-item">
        <span class="insight-bullet">•</span>
        <span class="insight-text" style="color: #9ca3af;">Insights will be generated from your conversation</span>
      </div>
    `
  }
  
  return insights.slice(0, 5).map(insight => `
    <div class="insight-item">
      <span class="insight-bullet">•</span>
      <span class="insight-text">${escapeHtml(insight.text)}</span>
    </div>
  `).join('')
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Generate a default/sample Discovery Report for testing
 */
export function generateSampleDiscoveryReport(): DiscoveryReportData {
  return {
    reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    reportRef: `FBC-${Date.now().toString().slice(-8)}`,
    client: {
      name: 'John Doe',
      company: 'Acme Corporation',
      role: 'CTO',
      email: 'john@acme.com'
    },
    engagementLevel: 'High',
    engagementMetrics: {
      text: 75,
      voice: 80,
      screen: 60,
      files: 50
    },
    insights: [
      { text: 'Primary goal is to automate customer support workflows to reduce response times', category: 'goal' },
      { text: 'Current pain point: Manual data entry consuming 40% of team capacity', category: 'pain_point' },
      { text: 'Opportunity identified: AI-powered document processing could save $200K annually', category: 'opportunity' }
    ],
    observations: [
      { type: 'voice', icon: '🎤', summary: '15 minutes discussing AI implementation strategy and team readiness' },
      { type: 'screen', icon: '🖥️', summary: 'Analyzed CRM dashboard showing customer ticket backlog trends' },
      { type: 'file', icon: '📄', summary: 'Reviewed budget.xlsx - Q4 projections and resource allocation' }
    ],
    toolsUsed: [
      { name: 'search_web', timestamp: new Date().toISOString(), insight: 'Researched industry benchmarks' },
      { name: 'calculate_roi', timestamp: new Date().toISOString(), insight: 'Projected 340% ROI' },
      { name: 'capture_screen_snapshot', timestamp: new Date().toISOString(), insight: 'Analyzed dashboard metrics' }
    ],
    roi: {
      hasData: true,
      investment: 50000,
      projectedSavings: 200000,
      roiPercentage: 300,
      paybackPeriod: '4 months'
    },
    recommendedSolution: 'consulting',
    solutionRationale: 'Based on the complexity of your requirements and team size',
    sessionId: 'sample-session',
    sessionDuration: 25,
    totalMessages: 32,
    modalitiesUsed: ['text', 'voice', 'screen', 'upload'],
    bookingUrl: 'https://cal.com/farzad-bayat/30min',
    consultantEmail: 'contact@farzadbayat.com',
    consultantName: 'Farzad Bayat'
  }
}

