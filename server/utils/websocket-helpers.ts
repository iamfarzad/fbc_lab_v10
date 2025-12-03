import { WebSocket } from 'ws'
import type { RawData } from 'ws'
import { serverLogger } from './env-setup'
import type { ConnectionState } from '../rate-limiting/websocket-rate-limiter'
import { connectionStates } from '../rate-limiting/websocket-rate-limiter'

/**
 * Decode raw WebSocket message data to string
 */
export function decodeRawMessage(raw: RawData): string {
  if (typeof raw === 'string') return raw
  if (Buffer.isBuffer(raw)) return raw.toString('utf8')
  if (ArrayBuffer.isView(raw)) return Buffer.from(raw.buffer).toString('utf8')
  if (raw instanceof ArrayBuffer) return Buffer.from(raw).toString('utf8')
  return ''
}

/**
 * Helper function for safe WebSocket sends
 * Checks buffer size and connection state before sending
 */
export function safeSend(ws: WebSocket, data: any, isBinary = false): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    serverLogger.warn('safeSend: socket not open, dropping message', {
      readyState: ws.readyState
    })
    return false
  }
  
  const MAX_BUFFERED_AMOUNT = 500_000 // 500KB - match client threshold
  if (ws.bufferedAmount > MAX_BUFFERED_AMOUNT) {
    serverLogger.warn('safeSend: Buffer full, dropping message', {
      bufferedAmount: ws.bufferedAmount,
      threshold: MAX_BUFFERED_AMOUNT
    })
    return false
  }
  
  try {
    ws.send(data as string | Buffer | ArrayBuffer | Buffer[], { binary: isBinary })
    return true
  } catch (e) {
    serverLogger.error('safeSend error', e instanceof Error ? e : undefined)
    return false
  }
}

/**
 * Send priority message (heartbeat pong) - bypasses buffer check
 * Critical for connection health, must always be sent
 */
export function safeSendPriority(ws: WebSocket, data: string): boolean {
  if (ws.readyState !== WebSocket.OPEN) {
    return false
  }
  
  try {
    ws.send(data)
    return true
  } catch (e) {
    serverLogger.error('safeSendPriority error', e instanceof Error ? e : undefined)
    return false
  }
}

/**
 * Defensive initialization of ConnectionState with proper alerting
 * 
 * This should NEVER happen in normal operation. If it does, it indicates:
 * - Connection lifecycle bug (connectionId not properly initialized)
 * - Race condition in connection setup
 * - Memory leak or premature cleanup
 * 
 * Logs as ERROR with full context including stack trace for investigation.
 */
export function ensureConnectionState(
  connectionId: string,
  context: {
    handler: string
    phase: string
    additionalContext?: Record<string, unknown>
  }
): ConnectionState {
  const existing = connectionStates.get(connectionId)
  if (existing) {
    return existing
  }

  // This is a CRITICAL error - connectionState should always exist
  const stackTrace = new Error().stack
  const now = Date.now()
  
  const defaultState: ConnectionState = {
    isReady: false,
    lastPing: now,
    messageCount: 0,
    lastMessageAt: now,
    audioCount: 0,
    audioLastAt: now
  }

  // Log as ERROR with full context
  serverLogger.error('CRITICAL: ConnectionState missing - defensive initialization', new Error('ConnectionState missing'), {
    connectionId,
    handler: context.handler,
    phase: context.phase,
    availableConnections: Array.from(connectionStates.keys()),
    connectionCount: connectionStates.size,
    stackTrace: stackTrace?.split('\n').slice(0, 10).join('\n'), // First 10 lines of stack
    ...context.additionalContext
  })

  connectionStates.set(connectionId, defaultState)
  return defaultState
}
