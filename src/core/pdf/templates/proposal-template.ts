import { PDF_DESIGN_TOKENS, getHslColor } from '../../pdf-design-tokens.js'
import { CONTACT_CONFIG } from '../../../config/constants.js'
import { FALLBACK_PRICING } from '../utils/constants.js'
import { escapeHtml } from '../utils/formatting.js'
import type { SummaryData } from '../utils/types.js'

/**
 * Generate approve mailto link
 */
export function generateApproveMailtoLink(
  proposal: SummaryData['proposal'],
  leadInfo: SummaryData['leadInfo']
): string {
  const solutionType = proposal?.recommendedSolution || 'consulting'
  const companyName = leadInfo.company || leadInfo.name || 'your company'
  const leadName = leadInfo.name || 'there'
  
  const subject = `Approved: ${solutionType === 'workshop' ? 'AI Strategy Workshop' : 'AI Consulting'} Plan - ${companyName}`
  
  const body = `Hi Farzad,

I'd like to approve and move forward with the ${solutionType === 'workshop' ? 'AI Strategy Workshop' : 'AI Consulting'} plan discussed in our session.

${proposal?.solutionRationale ? `\nBased on our conversation, ${proposal.solutionRationale}\n` : ''}${proposal?.pricingBallpark ? `\nInvestment: ${proposal.pricingBallpark}\n` : ''}${proposal?.expectedROI ? `\nExpected ROI: ${proposal.expectedROI}\n` : ''}
Looking forward to next steps!

Best,
${leadName}`
  
  return `mailto:${CONTACT_CONFIG.SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}

/**
 * Generate proposal section HTML
 */
export function generateProposalSection(summaryData: SummaryData): string {
  const proposal = summaryData.proposal
  const leadInfo = summaryData.leadInfo
  const companyName = leadInfo.company || leadInfo.name || 'your company'
  
  const approveLink = generateApproveMailtoLink(proposal, leadInfo)
  const bookingUrl = CONTACT_CONFIG.SCHEDULING.BOOKING_URL
  
  // If we have a recommendation, show it prominently
  if (proposal?.recommendedSolution) {
    const solutionType = proposal.recommendedSolution === 'workshop' ? 'AI Strategy Workshop' : 'Custom AI Implementation'
    const pricing = proposal.pricingBallpark || FALLBACK_PRICING[proposal.recommendedSolution as keyof typeof FALLBACK_PRICING]
    const solutionRationale = proposal.solutionRationale || `Based on our discovery conversation, a ${proposal.recommendedSolution === 'workshop' ? 'workshop' : 'consulting engagement'} aligns best with your needs.`
    
    return `
    <div class="section proposal-section" style="margin-top: ${PDF_DESIGN_TOKENS.spacing.xl.px}px;">
      <h2 class="section-title">Proposal & Next Steps</h2>
      
      <div class="recommendation-card" style="background: rgba(255, 107, 53, 0.05); border-left: 4px solid ${getHslColor('accent')}; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="color: ${getHslColor('accent')}; margin-top: 0; margin-bottom: 12px; font-size: ${PDF_DESIGN_TOKENS.typography.sectionTitle.size}px;">
          Recommended for ${escapeHtml(companyName)}: ${solutionType}
        </h3>
        <p style="margin-bottom: 16px; line-height: 1.6;">
          ${escapeHtml(solutionRationale)}
        </p>
        <div class="pricing-box" style="background: rgba(255, 255, 255, 0.8); padding: 16px; border-radius: 6px; margin: 16px 0;">
          <p style="margin: 4px 0;"><strong>Investment:</strong> ${escapeHtml(pricing)} <span style="color: ${getHslColor('mutedForeground')}; font-size: 0.9em;">(Estimated)</span></p>
          ${proposal.expectedROI ? `<p style="margin: 4px 0;"><strong>Expected ROI:</strong> ${escapeHtml(proposal.expectedROI)}</p>` : ''}
        </div>
      </div>
      
      <div class="cta-buttons" style="display: flex; gap: 16px; margin-top: 24px; flex-wrap: wrap;">
        <a href="${approveLink}" class="cta-button primary" style="flex: 1; min-width: 200px; display: inline-block; padding: 14px 28px; background: ${getHslColor('accent')}; color: white; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; font-size: ${PDF_DESIGN_TOKENS.typography.body.size}px;">
          Approve This Plan
        </a>
        <a href="${bookingUrl}" target="_blank" class="cta-button secondary" style="flex: 1; min-width: 200px; display: inline-block; padding: 14px 28px; background: transparent; color: ${getHslColor('accent')}; text-decoration: none; border: 2px solid ${getHslColor('accent')}; border-radius: 8px; text-align: center; font-weight: 600; font-size: ${PDF_DESIGN_TOKENS.typography.body.size}px;">
          Book 30-Min Free Call
        </a>
      </div>
    </div>
    `
  }
  
  // No recommendation: show both options
  return `
    <div class="section proposal-section" style="margin-top: ${PDF_DESIGN_TOKENS.spacing.xl.px}px;">
      <h2 class="section-title">Proposal & Next Steps</h2>
      
      <p style="margin-bottom: 20px;">Explore your options:</p>
      
      <div class="options-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
        <div class="option-card" style="background: rgba(255, 107, 53, 0.05); border: 2px solid ${getHslColor('lightGray')}; padding: 20px; border-radius: 8px;">
          <h3 style="color: ${getHslColor('accent')}; margin-top: 0; margin-bottom: 12px; font-size: ${PDF_DESIGN_TOKENS.typography.sectionTitle.size}px;">
            AI Strategy Workshop
          </h3>
          <p style="margin-bottom: 8px; color: ${getHslColor('text')}; line-height: 1.6;">
            1-day in-person intensive
          </p>
          <p style="margin-bottom: 8px; color: ${getHslColor('text')}; line-height: 1.6;">
            Identify AI opportunities and create a custom roadmap for your business
          </p>
          <p class="price" style="margin: 12px 0 0 0; font-size: ${PDF_DESIGN_TOKENS.typography.clientName.size}px; font-weight: 600; color: ${getHslColor('accent')};">
            ${FALLBACK_PRICING.workshop}
          </p>
        </div>
        
        <div class="option-card" style="background: rgba(255, 107, 53, 0.05); border: 2px solid ${getHslColor('lightGray')}; padding: 20px; border-radius: 8px;">
          <h3 style="color: ${getHslColor('accent')}; margin-top: 0; margin-bottom: 12px; font-size: ${PDF_DESIGN_TOKENS.typography.sectionTitle.size}px;">
            Custom AI Implementation
          </h3>
          <p style="margin-bottom: 8px; color: ${getHslColor('text')}; line-height: 1.6;">
            4-8 week consulting engagement
          </p>
          <p style="margin-bottom: 8px; color: ${getHslColor('text')}; line-height: 1.6;">
            End-to-end implementation with ongoing support included
          </p>
          <p class="price" style="margin: 12px 0 0 0; font-size: ${PDF_DESIGN_TOKENS.typography.clientName.size}px; font-weight: 600; color: ${getHslColor('accent')};">
            ${FALLBACK_PRICING.consulting}
          </p>
        </div>
      </div>
      
      <div class="cta-buttons" style="display: flex; gap: 16px; margin-top: 24px; flex-wrap: wrap;">
        <a href="${bookingUrl}" target="_blank" class="cta-button primary" style="flex: 1; min-width: 200px; display: inline-block; padding: 14px 28px; background: ${getHslColor('accent')}; color: white; text-decoration: none; border-radius: 8px; text-align: center; font-weight: 600; font-size: ${PDF_DESIGN_TOKENS.typography.body.size}px;">
          Book 30-Min Free Call
        </a>
      </div>
    </div>
  `
}

