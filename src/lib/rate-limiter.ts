/**
 * Rate Limiter - Per-minute abuse protection
 * 
 * Simple in-memory rate limiter for protecting API endpoints from abuse.
 * Tracks per-session limits with 60-second rolling windows.
 * 
 * Separate from usage-limits.ts which tracks session totals.
 * This tracks per-minute bursts.
 */

const sessions = new Map<string, { messages: number; analysis: number; resetAt: number }>()

/**
 * Check if a request should be rate limited
 * 
 * @param sessionId - Session identifier
 * @param type - Type of request ('message' or 'analysis')
 * @returns true if allowed, false if rate limited
 */
export function rateLimit(sessionId: string, type: 'message' | 'analysis' = 'message'): boolean {
  if (!sessionId) {
    return true // Allow if no session ID (shouldn't happen, but be safe)
  }

  const now = Date.now()
  let record = sessions.get(sessionId)

  // Create new record if doesn't exist or reset if window expired
  if (!record || now > record.resetAt) {
    record = { messages: 0, analysis: 0, resetAt: now + 60_000 }
    sessions.set(sessionId, record)
  }

  // Check limits
  if (type === 'message' && record.messages >= 40) {
    return false
  }

  if (type === 'analysis' && record.analysis >= 8) {
    return false
  }

  // Increment counter
  record[type === 'message' ? 'messages' : 'analysis']++
  sessions.set(sessionId, record)

  return true
}

