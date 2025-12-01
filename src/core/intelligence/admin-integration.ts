/**
 * Admin Integration Handler
 * Server-side integration for intelligence system with admin chat
 * This file can safely import Node.js dependencies since it's server-side only
 */

import { supabaseService } from 'src/core/supabase/client'
import { LeadResearchService, type ResearchResult } from './lead-research'

export interface AdminIntelligenceContext {
  leadResearch: ResearchResult[]
  adminContext: string
  conversationIds: string[]
}

/**
 * Server-side handler for admin intelligence integration
 * This can be called from admin API routes (server-side, not Edge Runtime)
 */
export class AdminIntelligenceHandler {
  private researchService = new LeadResearchService()

  /**
   * Build intelligence context for admin chat
   */
  async buildAdminContext(
    conversationIds: string[],
    sessionId: string,
    userMessage?: string
  ): Promise<AdminIntelligenceContext> {
    void userMessage
    const leadResearch: ResearchResult[] = []
    let adminContext = ''

    // Research each lead
    for (const conversationId of conversationIds) {
      try {
        // Get lead data from database
        const { data: leadData, error: leadError } = await supabaseService
          .from('conversations')
          .select('email, name, company_url')
          .eq('id', conversationId)
          .single()

        if (!leadError && leadData) {
          const leadObj = leadData as unknown as Record<string, unknown>
          const email = typeof leadObj.email === 'string' ? leadObj.email : undefined
          const name = typeof leadObj.name === 'string' ? leadObj.name : undefined
          if (email) {
            // Use intelligence service to research this lead
            const researchResult = await this.researchService.researchLead(
              email,
              name,
              undefined, // companyUrl not passed in original call, but available in leadData if needed
              sessionId
            )

            if (researchResult) {
              leadResearch.push(researchResult)

              // Build admin context string
              adminContext += `\n\nLead ${conversationId}:\n`
              adminContext += `- Company: ${researchResult.company?.name || 'Unknown'} (${researchResult.company?.industry || 'Unknown industry'})\n`
              adminContext += `- Person: ${researchResult.person?.fullName || 'Unknown'} (${researchResult.role || 'Unknown role'})\n`
              adminContext += `- Confidence: ${Math.round(researchResult.confidence * 100)}%\n`
              if (researchResult.citations && researchResult.citations.length > 0) {
                adminContext += `- Sources: ${researchResult.citations.length} citations\n`
              }
            }
          }
        }
      } catch (error) {
        console.warn(`Failed to research lead ${conversationId}:`, error)
        // Continue with other leads
      }
    }

    return {
      leadResearch,
      adminContext: adminContext.trim(),
      conversationIds
    }
  }

  /**
   * Get intelligence context for a single lead
   */
  async getLeadIntelligence(email: string, name?: string, companyUrl?: string): Promise<ResearchResult> {
    return this.researchService.researchLead(email, name, companyUrl, 'temp-admin-session')
  }
}

// Export singleton instance
export const adminIntelligenceHandler = new AdminIntelligenceHandler()

