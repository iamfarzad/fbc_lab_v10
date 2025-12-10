import type { IntelligenceContext } from '../../src/core/agents/types.js'

interface CacheEntry {
  context: IntelligenceContext
  timestamp: number
}

const cache = new Map<string, CacheEntry>()
const TTL_MS = 5 * 60 * 1000 // 5 minutes

/**
 * Get cached intelligence context or load it using the provided loader function
 */
export function getCachedIntelligenceContext(
  sessionId: string,
  loader: (sessionId: string) => Promise<IntelligenceContext | null>
): Promise<IntelligenceContext | null> {
  const entry = cache.get(sessionId)
  const now = Date.now()
  
  if (entry && (now - entry.timestamp) < TTL_MS) {
    return Promise.resolve(entry.context)
  }
  
  return loader(sessionId).then(context => {
    if (context) {
      cache.set(sessionId, { context, timestamp: now })
    }
    return context
  })
}

/**
 * Invalidate cached intelligence context for a session
 */
export function invalidateIntelligenceContext(sessionId: string): void {
  cache.delete(sessionId)
}

/**
 * Clear all cached intelligence contexts (useful for testing or memory management)
 */
export function clearIntelligenceContextCache(): void {
  cache.clear()
}
