import { escapeHtml } from '../utils/formatting'

interface SummarySectionsParams {
  translatedSummary: string
  translatedBrief: string
  leadName: string
  leadCompany: string
  leadRole: string
  docDate: string
  aiCapabilities: string[]
}

/**
 * Generate summary sections HTML (Executive Summary, Lead Info, Consultant Brief)
 */
export function generateSummarySections(params: SummarySectionsParams): string {
  const { translatedSummary, translatedBrief, leadName, leadCompany, leadRole, docDate, aiCapabilities } = params

  const aiCapabilitiesSection = aiCapabilities.length > 0
    ? `<div class="section">
        <h2 class="section-title">AI Capabilities Identified</h2>
        <ul>
          ${aiCapabilities.map(cap => `<li>${escapeHtml(cap)}</li>`).join('')}
        </ul>
      </div>`
    : ''

  return `
    <!-- Executive Summary -->
    <div class="section">
      <h2 class="section-title">Executive Summary</h2>
      <div class="section-content">
        ${translatedSummary ? escapeHtml(translatedSummary) : 'Our AI analysis session is complete. Review the details below for tailored insights.'}
      </div>
    </div>
    
    <!-- Lead Information -->
    <div class="section">
      <h2 class="section-title">Lead Information</h2>
      <div class="info-grid">
        <div class="info-item">
          <span class="info-label">Name:</span>
          <span class="info-value">${escapeHtml(leadName)}</span>
        </div>
        ${leadCompany ? `
        <div class="info-item">
          <span class="info-label">Company:</span>
          <span class="info-value">${escapeHtml(leadCompany)}</span>
        </div>
        ` : ''}
        ${leadRole ? `
        <div class="info-item">
          <span class="info-label">Role:</span>
          <span class="info-value">${escapeHtml(leadRole)}</span>
        </div>
        ` : ''}
        <div class="info-item">
          <span class="info-label">Date:</span>
          <span class="info-value">${docDate}</span>
        </div>
      </div>
    </div>
    
    <!-- Consultant Brief -->
    <div class="section">
      <h2 class="section-title">Consultant Brief</h2>
      <div class="section-content">
        ${translatedBrief ? escapeHtml(translatedBrief) : 'We have compiled the key findings and recommendations for your team.'}
      </div>
    </div>
    
    ${aiCapabilitiesSection}
  `
}

