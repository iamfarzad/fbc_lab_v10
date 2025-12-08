/**
 * Extract Action Items Tool Executor
 * 
 * Extracts recommendations, next steps, key decisions, and important points
 * from the current conversation history.
 */

import { extractConversationInsights, buildConversationPairs } from '../pdf-generator-puppeteer.js'
import { multimodalContextManager } from '../context/multimodal-context.js'
import type { ActionItemsResult } from './tool-types.js'

/**
 * Extract action items from conversation history
 * 
 * @param sessionId - Session ID to get conversation history from
 * @returns Structured insights with recommendations, next steps, decisions, and important points
 */
export async function extractActionItems(sessionId: string): Promise<ActionItemsResult> {
  try {
    // Get conversation context from MultimodalContextManager
    const context = await multimodalContextManager.getConversationContext(sessionId, false, false)
    
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return {
        recommendations: [],
        nextSteps: [],
        keyDecisions: [],
        importantPoints: []
      }
    }

    // Convert ConversationEntry[] to format expected by buildConversationPairs
    const conversationHistory = context.conversationHistory.map(entry => {
      // Determine role from metadata.speaker or default to 'user' for text entries
      const role: 'user' | 'assistant' = entry.metadata?.speaker === 'model' || entry.metadata?.speaker === 'assistant' 
        ? 'assistant' 
        : 'user'
      
      return {
        role,
        content: entry.content || '',
        timestamp: entry.timestamp
      }
    })

    // Build conversation pairs
    const pairs = buildConversationPairs(conversationHistory)

    // Extract insights
    const insights = extractConversationInsights(pairs)

    return {
      recommendations: insights.recommendations,
      nextSteps: insights.nextSteps,
      keyDecisions: insights.keyDecisions,
      importantPoints: insights.importantPoints
    }
  } catch (error) {
    console.error('[extractActionItems] Error:', error)
    throw new Error(
      error instanceof Error 
        ? `Failed to extract action items: ${error.message}`
        : 'Failed to extract action items from conversation'
    )
  }
}

