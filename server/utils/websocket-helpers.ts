import { WebSocket } from 'ws'
import type { RawData } from 'ws'
import { serverLogger } from './env-setup'

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
    ws.send(data, { binary: isBinary })
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
