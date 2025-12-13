import { MESSAGE_TYPES } from '../message-types.js'
import { ensureWsAdmin } from '../utils/admin-check.js'
import { serverLogger } from '../utils/env-setup.js'

// Connection state for rate limiting
export type ConnectionState = {
  isReady: boolean
  lastPing: number
  messageCount: number
  lastMessageAt: number
  audioCount: number
  audioLastAt: number
  mediaCount: number
  mediaLastAt: number
}

// Rate limiting configuration
export const CLIENT_RATE_LIMIT = { windowMs: 60000, max: 100 } // 100 messages per minute for clients
export const ADMIN_RATE_LIMIT = { windowMs: 60000, max: 500 } // 500 messages per minute for admin
// High-frequency audio messages use a separate, per-second window
export const AUDIO_RATE_LIMIT = { windowMs: 1000, max: 200 } // 200 audio chunks/second (relaxed from 60)
export const MEDIA_RATE_LIMIT = { windowMs: 60000, max: 300 } // 300 frames/minute (5 FPS)

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
  messageType?: string,
  mimeType?: string
): { allowed: boolean; remaining?: number } {
  let st = connectionStates.get(connectionId)
  if (!st) {
    // This should never happen - connectionState should be initialized in connection-manager
    // Log as ERROR with full context for investigation
    const stackTrace = new Error().stack
    serverLogger.error('CRITICAL: ConnectionState missing in checkRateLimit', new Error('ConnectionState missing in rate limiter'), {
      connectionId,
      sessionId,
      messageType,
      availableConnections: Array.from(connectionStates.keys()),
      connectionCount: connectionStates.size,
      stackTrace: stackTrace?.split('\n').slice(0, 10).join('\n')
    })
    
    // Initialize defensively to prevent crash, but this indicates a bug
    const now = Date.now()
    const defaultState: ConnectionState = {
      isReady: false,
      lastPing: now,
      messageCount: 0,
      lastMessageAt: now,
      audioCount: 0,
      audioLastAt: now,
      mediaCount: 0,
      mediaLastAt: now
    }
    connectionStates.set(connectionId, defaultState)
    st = defaultState
    // Allow first message to pass through, but this is a bug that needs investigation
  }

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

  // Media rate limiting (images/videos)
  if (messageType === MESSAGE_TYPES.REALTIME_INPUT && mimeType) {
    const isMedia = mimeType.startsWith('image/') || mimeType.startsWith('video/')
    if (isMedia) {
      // Sliding window starting timestamp is stored in mediaLastAt
      if (now - st.mediaLastAt >= MEDIA_RATE_LIMIT.windowMs) {
        st.mediaCount = 0
        st.mediaLastAt = now
      }
      if (st.mediaCount >= MEDIA_RATE_LIMIT.max) {
        return { allowed: false, remaining: Math.ceil((MEDIA_RATE_LIMIT.windowMs - (now - st.mediaLastAt)) / 1000) }
      }
      st.mediaCount++
      return { allowed: true }
    }
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
