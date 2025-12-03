/**
 * Generate Proposal Tool Executor
 * 
 * Generates a proposal based on conversation (wraps /api/generate-proposal logic).
 */

import { generateText, google } from 'src/lib/ai-client'
import { CONTACT_CONFIG, GEMINI_MODELS } from 'src/config/constants'
import { ContextStorage } from 'src/core/context/context-storage'
import { usageLimiter } from 'src/lib/usage-limits'
import { logger } from 'src/lib/logger'

const contextStorage = new ContextStorage()

/**
 * Generate proposal text from conversation
 * 
 * @param sessionId - Session ID to get conversation data from
 * @returns Markdown-formatted proposal text
 */
export async function generateProposal(sessionId: string): Promise<string> {
  try {
    // Get conversation context
    const context = await contextStorage.get(sessionId)
    const usage = await usageLimiter.getUsage(sessionId)
    
    if (!context || !usage) {
      throw new Error('Session not found or no usage data available')
    }
    
    const contextObj = context as unknown as Record<string, unknown>
    logger.debug('📄 Generating proposal for:', { name: (contextObj.name as string | undefined) || 'Unknown' })
    
    // Generate proposal content using AI (same logic as /api/generate-proposal)
    const proposalPrompt = `Based on this consulting conversation, generate a personalized proposal in markdown format:

CLIENT PROFILE:
- Name: ${(contextObj.name as string | undefined) || 'Not specified'}
- Email: ${context.email}
- Company: ${(contextObj.company_domain as string | undefined) || 'Not specified'}
- Industry: ${(() => {
  const companyContext = contextObj.company_context as Record<string, unknown> | undefined
  return typeof companyContext?.summary === 'string' ? companyContext.summary : 'Not specified'
})()}
- Role: ${(() => {
  const roleContext = contextObj.role_context as Record<string, unknown> | undefined
  return typeof roleContext?.summary === 'string' ? roleContext.summary : 'Not specified'
})()}

CONVERSATION INSIGHTS:
- Messages exchanged: ${usage.messages_sent}
- Voice time: ${Math.floor(usage.voice_minutes_used)} minutes
- Screen share used: ${usage.screen_minutes_used > 0 ? 'Yes' : 'No'}
- Research performed: ${usage.research_calls_used} queries

DISCOVERED CONTEXT:
${(() => {
  const industryInsights = contextObj.industry_insights as Record<string, unknown> | undefined
  return typeof industryInsights?.challenges === 'string' ? industryInsights.challenges : 'General AI consulting needs'
})()}

Generate a professional proposal with these sections:

# Your Personalized AI Strategy Proposal

## Executive Summary
- Who ${(contextObj.name as string | undefined) || 'the client'} is (based on research)
- Key challenges we identified in our conversation
- How F.B/c can help

## Recommended Solution
Choose one based on conversation depth:
- **AI Strategy Workshop (1-day, in-person)** - Best for exploring AI opportunities
- **Custom AI Implementation (4-8 weeks)** - Best for specific use case identified
- **AI Readiness Assessment (2 weeks)** - Best for early-stage exploration

Include timeline and expected outcomes.

## Your Company Context
${(() => {
  const companyOverview = contextObj.company_overview as Record<string, unknown> | undefined
  return typeof companyOverview?.summary === 'string' ? companyOverview.summary : 'Brief overview based on available information'
})()}

## Next Steps
1. Book a 30-minute strategy call: [${CONTACT_CONFIG.SCHEDULING.BOOKING_URL}](${CONTACT_CONFIG.SCHEDULING.BOOKING_URL})
2. Email: ${CONTACT_CONFIG.SUPPORT_EMAIL}
3. Website: ${CONTACT_CONFIG.WEBSITE_URL.replace(/^https?:\/\//, '')}

---

*This proposal was generated based on our ${usage.messages_sent}-message conversation and ${Math.floor(usage.session_duration_minutes || 0)} minutes of interaction.*

Format as clean, professional markdown. Be concise and specific.`

    const model = google(GEMINI_MODELS.DEFAULT_CHAT)
    const result = await generateText({
      model,
      prompt: proposalPrompt,
      temperature: 0.7
    })

    return result.text
  } catch (error) {
    console.error('[generateProposal] Error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to generate proposal: ${error.message}`
        : 'Failed to generate proposal'
    )
  }
}
