import { MESSAGE_TYPES } from '../message-types.js'
import { ensureWsAdmin } from '../utils/admin-check.js'

// Connection state for rate limiting
export type ConnectionState = {
  isReady: boolean
  lastPing: number
  messageCount: number
  lastMessageAt: number
  audioCount: number
  audioLastAt: number
}

// Rate limiting configuration
export const CLIENT_RATE_LIMIT = { windowMs: 60000, max: 100 } // 100 messages per minute for clients
export const ADMIN_RATE_LIMIT = { windowMs: 60000, max: 500 } // 500 messages per minute for admin
// High-frequency audio messages use a separate, per-second window
export const AUDIO_RATE_LIMIT = { windowMs: 1000, max: 200 } // 200 audio chunks/second (relaxed from 60)

// Store connection states for rate limiting
export const connectionStates = new Map<string, ConnectionState>()

// Authoritative admin session check
export function isAdmin(sessionId?: string): boolean {
  return ensureWsAdmin(sessionId)
}

/**
 * WebSocket Rate Limiting
 * 
 * This rate limiting implementation is intentionally separate from HTTP rate limiting
 * (`app/api-utils/rate-limiting.ts`) due to fundamentally different requirements:
 * 
 * 1. Connection-based tracking: WebSocket rate limiting tracks per-connection state,
 *    not per-IP address (connections persist across multiple messages)
 * 2. Per-connection state: Uses connectionStates Map to track message counts per connection
 * 3. Message type differentiation: Audio messages use per-second window (60/sec),
 *    while regular messages use per-minute window (100/min for clients, 500/min for admin)
 * 4. Different return format: Returns { allowed: boolean; remaining?: number } instead
 *    of NextResponse (WebSocket doesn't use HTTP responses)
 * 
 * While both use sliding window algorithms, the implementations serve different
 * purposes and cannot be unified without significant complexity.
 */
export function checkRateLimit(
  connectionId: string,
  sessionId?: string,
  messageType?: string
): { allowed: boolean; remaining?: number } {
  const st = connectionStates.get(connectionId)
  if (!st) return { allowed: false }

  const now = Date.now()
  // Apply per-type limits: audio has higher allowance
  if (messageType === MESSAGE_TYPES.USER_AUDIO || messageType === 'user_audio') {
    // Sliding window starting timestamp is stored in audioLastAt
    if (now - st.audioLastAt >= AUDIO_RATE_LIMIT.windowMs) {
      st.audioCount = 0
      st.audioLastAt = now
    }
    if (st.audioCount >= AUDIO_RATE_LIMIT.max) {
      return { allowed: false, remaining: Math.ceil((AUDIO_RATE_LIMIT.windowMs - (now - st.audioLastAt)) / 1000) }
    }
    st.audioCount++
    return { allowed: true }
  }

  const limit = isAdmin(sessionId) ? ADMIN_RATE_LIMIT : CLIENT_RATE_LIMIT

  // Reset window if expired
  if (now - st.lastMessageAt > limit.windowMs) {
    st.messageCount = 0
    st.lastMessageAt = now
  }

  // Check limit
  if (st.messageCount >= limit.max) {
    return { allowed: false, remaining: Math.ceil((limit.windowMs - (now - st.lastMessageAt)) / 1000) }
  }

  // Increment and allow
  st.messageCount++
  st.lastMessageAt = now
  return { allowed: true }
}

