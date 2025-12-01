/**
 * Generate Summary Preview Tool Executor
 * 
 * Generates a text preview of what will be included in the final PDF
 * without actually generating the PDF file.
 */

import { extractConversationInsights, buildConversationPairs } from 'src/pdf-generator-puppeteer'
import { multimodalContextManager } from 'src/core/context/multimodal-context'
import { ContextStorage } from 'src/core/context/context-storage'

const contextStorage = new ContextStorage()

interface SummaryPreviewOptions {
  includeRecommendations?: boolean
  includeNextSteps?: boolean
}

/**
 * Generate summary preview text
 * 
 * @param sessionId - Session ID to get conversation data from
 * @param options - Options for what to include in preview
 * @returns Markdown-formatted preview text
 */
export async function generateSummaryPreview(
  sessionId: string,
  options: SummaryPreviewOptions = {}
): Promise<string> {
  try {
    const includeRecommendations = options.includeRecommendations !== false
    const includeNextSteps = options.includeNextSteps !== false

    // Get conversation context
    const context = await multimodalContextManager.getConversationContext(sessionId, false, false)
    
    // Get lead context
    const leadContext = await contextStorage.get(sessionId)
    const leadName = leadContext?.name || 'there'
    const companyContext = leadContext?.company_context
    const companyName = (companyContext && typeof companyContext === 'object' && 'name' in companyContext && typeof companyContext.name === 'string')
      ? companyContext.name
      : leadContext?.name || 'your company'

    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return `# Conversation Summary Preview\n\nNo conversation history available yet.`
    }

    // Convert ConversationEntry[] to format expected by buildConversationPairs
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

    // Build conversation pairs and extract insights
    const pairs = buildConversationPairs(conversationHistory)
    const insights = extractConversationInsights(pairs)

    // Build preview text
    const sections: string[] = []
    
    sections.push(`# Conversation Summary Preview\n`)
    sections.push(`**Client:** ${leadName}`)
    sections.push(`**Company:** ${companyName}`)
    sections.push(`**Total Messages:** ${context.conversationHistory.length}\n`)

    // Executive Summary (from conversation history)
    sections.push(`## Executive Summary\n`)
    if (pairs.length > 0) {
      const lastPair = pairs[pairs.length - 1]
      const summaryText = lastPair.assistant?.content 
        ? lastPair.assistant.content.slice(0, 300) + (lastPair.assistant.content.length > 300 ? '...' : '')
        : 'Summary of our discussion about AI strategy and implementation.'
      sections.push(summaryText + '\n')
    }

    // Key Outcomes & Next Steps
    if (includeNextSteps && (insights.nextSteps.length > 0 || insights.keyDecisions.length > 0)) {
      sections.push(`## Key Outcomes & Next Steps\n`)
      
      if (insights.keyDecisions.length > 0) {
        sections.push(`### Key Decisions`)
        insights.keyDecisions.forEach((decision, idx) => {
          sections.push(`${idx + 1}. ${decision}`)
        })
        sections.push('')
      }

      if (insights.nextSteps.length > 0) {
        sections.push(`### Next Steps`)
        insights.nextSteps.forEach((step, idx) => {
          sections.push(`${idx + 1}. ${step}`)
        })
        sections.push('')
      }
    }

    // Recommendations
    if (includeRecommendations && insights.recommendations.length > 0) {
      sections.push(`## Recommendations\n`)
      insights.recommendations.forEach((rec, idx) => {
        sections.push(`${idx + 1}. ${rec}`)
      })
      sections.push('')
    }

    // Important Points
    if (insights.importantPoints.length > 0) {
      sections.push(`## Important Points Discussed\n`)
      insights.importantPoints.forEach((point, idx) => {
        sections.push(`${idx + 1}. ${point}`)
      })
      sections.push('')
    }

    return sections.join('\n')
  } catch (error) {
    console.error('[generateSummaryPreview] Error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to generate summary preview: ${error.message}`
        : 'Failed to generate summary preview'
    )
  }
}

