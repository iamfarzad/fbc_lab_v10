/**
 * Draft Follow-Up Email Tool Executor
 * 
 * Drafts personalized follow-up emails based on conversation
 * using the retargetingAgent pattern adapted for mid-session use.
 */

import { google, generateText } from 'src/lib/ai-client'
import { GEMINI_MODELS } from 'src/config/constants'
import { multimodalContextManager } from 'src/core/context/multimodal-context'
import { ContextStorage } from 'src/core/context/context-storage'
import type { EmailDraftResult } from './tool-types'
import { extractConversationInsights, buildConversationPairs } from 'src/pdf-generator-puppeteer'

const contextStorage = new ContextStorage()

interface EmailDraftOptions {
  recipient: 'client' | 'team' | 'farzad'
  tone: 'professional' | 'casual' | 'technical'
  includeSummary?: boolean
}

/**
 * Draft follow-up email based on conversation
 * 
 * @param sessionId - Session ID to get conversation data from
 * @param options - Email draft options
 * @returns Drafted email with subject, body, and CTA
 */
export async function draftFollowUpEmail(
  sessionId: string,
  options: EmailDraftOptions
): Promise<EmailDraftResult> {
  try {
    // Get conversation context
    const context = await multimodalContextManager.getConversationContext(sessionId, false, false)
    
    // Get lead context
    const leadContext = await contextStorage.get(sessionId)
    const leadName = leadContext?.name || 'there'
    const companyContext = leadContext?.company_context
    const companyName = (companyContext && typeof companyContext === 'object' && 'name' in companyContext && typeof companyContext.name === 'string')
      ? companyContext.name
      : leadContext?.name || 'your company'
    const leadEmail = leadContext?.email || ''

    // Build conversation summary from insights
    let conversationSummary = ''
    if (context.conversationHistory.length > 0) {
      const conversationHistory = context.conversationHistory.map(entry => {
        const role = entry.metadata?.speaker === 'model' || entry.metadata?.speaker === 'assistant' 
          ? 'assistant' 
          : 'user'
        
        return {
          role: role as 'user' | 'assistant',
          content: entry.content || '',
          timestamp: entry.timestamp
        }
      })

      const pairs = buildConversationPairs(conversationHistory)
      const insights = extractConversationInsights(pairs)

      conversationSummary = `Conversation highlights:
- Recommendations discussed: ${insights.recommendations.length > 0 ? insights.recommendations.slice(0, 2).join('; ') : 'None yet'}
- Next steps identified: ${insights.nextSteps.length > 0 ? insights.nextSteps.slice(0, 2).join('; ') : 'None yet'}
- Key decisions: ${insights.keyDecisions.length > 0 ? insights.keyDecisions.slice(0, 2).join('; ') : 'None yet'}
- Total messages exchanged: ${context.conversationHistory.length}`
    } else {
      conversationSummary = 'Early conversation - limited context available.'
    }

    // Build system prompt based on recipient and tone
    const toneStyle = {
      professional: 'Professional and polished, business-appropriate language.',
      casual: 'Conversational and friendly, approachable tone.',
      technical: 'Technical and precise, detail-oriented language.'
    }

    const recipientContext = {
      client: `Email to: ${leadName} (${leadEmail}) at ${companyName}`,
      team: `Internal email to Farzad's team summarizing the conversation with ${leadName}`,
      farzad: `Email to Farzad summarizing the conversation with ${leadName} from ${companyName}`
    }

    const systemPrompt = `You are F.B/c AI - draft follow-up emails.

LEAD INFORMATION:
${JSON.stringify({
  name: leadName,
  email: leadEmail,
  company: companyName
}, null, 2)}

CONVERSATION SUMMARY:
${options.includeSummary ? conversationSummary : 'Summary requested to be omitted.'}

${recipientContext[options.recipient]}

TONE: ${toneStyle[options.tone]}

EMAIL GUIDELINES:
- Subject line should be clear and actionable
- Body should reference specific conversation points if summary is included
- Include a clear call-to-action
- Keep it concise (2-3 paragraphs max)
- Match the specified tone

OUTPUT FORMAT (JSON):
{
  "subject": "Email subject line",
  "body": "Email body text with proper formatting",
  "cta": "Primary call-to-action text"
}

TONE: ${options.tone === 'professional' ? 'Professional but warm' : options.tone === 'casual' ? 'Casual and friendly' : 'Technical and precise'}`

    const result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_CHAT),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Generate a ${options.tone} follow-up email for ${options.recipient}.` }
      ],
      temperature: 0.7
    })

    // Parse JSON from response
    let email: EmailDraftResult
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        email = JSON.parse(jsonMatch[0]) as EmailDraftResult
      } else {
        throw new Error('No JSON found in email response')
      }
    } catch (error) {
      console.error('Failed to parse email draft:', error)
      // Fallback email
      email = {
        subject: `Following up on our AI conversation${options.recipient === 'farzad' ? ` - ${leadName}` : ''}`,
        body: `Hi ${options.recipient === 'client' ? leadName : options.recipient === 'team' ? 'Team' : 'Farzad'},

${options.includeSummary ? conversationSummary : 'I wanted to follow up on our recent conversation about AI strategy.'}

${options.recipient === 'client' ? 'Let me know if you\'d like to continue the discussion.' : 'Thought you\'d want an update on this conversation.'}

Best,
${options.recipient === 'client' ? 'F.B/c Team' : 'AI Assistant'}`,
        cta: options.recipient === 'client' ? 'Reply to this email' : 'Review conversation details'
      }
    }

    return email
  } catch (error) {
    console.error('[draftFollowUpEmail] Error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to draft follow-up email: ${error.message}`
        : 'Failed to draft follow-up email'
    )
  }
}
