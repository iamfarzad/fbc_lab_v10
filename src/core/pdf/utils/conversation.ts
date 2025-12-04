import type { SummaryData, ConversationPair } from './types.js'

/**
 * Build conversation pairs from history
 */
export function buildConversationPairs(history: SummaryData['conversationHistory'] = []): ConversationPair[] {
  const pairs: ConversationPair[] = []
  let pendingUser: { content: string; timestamp: string } | null = null

  for (const entry of history) {
    const trimmed = entry.content?.trim()
    if (!trimmed) continue

    if (entry.role === 'user') {
      pendingUser = { content: trimmed, timestamp: entry.timestamp }
    } else if (entry.role === 'assistant') {
      if (pendingUser) {
        pairs.push({ user: pendingUser, assistant: { content: trimmed, timestamp: entry.timestamp } })
        pendingUser = null
      } else if (pairs.length > 0) {
        const last = pairs[pairs.length - 1]
        if (last && !last.assistant) {
          last.assistant = { content: trimmed, timestamp: entry.timestamp }
        }
      }
    }
  }

  if (pendingUser) {
    pairs.push({ user: pendingUser })
  }

  return pairs
}

