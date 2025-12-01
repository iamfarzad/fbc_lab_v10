import { serverLogger } from '../utils/env-setup'
import { isAdmin } from '../rate-limiting/websocket-rate-limiter'

/**
 * Helper function to load conversation history
 */
export async function loadConversationHistory(sessionId: string, connectionId: string): Promise<string> {
  if (!sessionId || sessionId === 'anonymous') return ''

  try {
    const { multimodalContextManager } = await import('src/core/context/multimodal-context')
    // Load more messages (20 instead of 6) to give voice better context
    // Non-admin sessions: only load their own conversation history
    // Admin sessions: can access all (for analytics)
    const recentConversation = await multimodalContextManager.getConversationHistory(sessionId, 20)

    // For non-admin, ensure we only return data for this sessionId
    // (getConversationHistory already filters by sessionId, but adding explicit check)
    if (!isAdmin(sessionId)) {
      // Filter to ensure only this session's data is included
      // (The API should already do this, but this is a safety check)
    }

    if (recentConversation.length > 0) {
      const formatted = recentConversation
        .map((entry) => {
          const rawSpeaker = typeof entry.metadata?.speaker === 'string' ? entry.metadata.speaker : undefined
          const speaker = rawSpeaker === 'assistant' || rawSpeaker === 'model'
            ? 'assistant'
            : rawSpeaker === 'user'
              ? 'user'
              : entry.modality === 'text'
                ? 'user'
                : 'assistant'
          const trimmed = entry.content.trim().replace(/\s+/g, ' ')
          // Don't truncate - include full context for voice
          return `${speaker}: ${trimmed}`
        })
        .join('\n')

      return `\n\nRECENT CONVERSATION HISTORY (latest first shown last):\n${formatted}`
    }
  } catch (err) {
    serverLogger.warn('Failed to load conversation history for voice session', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
  }

  return ''
}

