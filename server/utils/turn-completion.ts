import { WebSocket } from 'ws'
import { MESSAGE_TYPES } from '../message-types'
import { safeSend } from './websocket-helpers'
import { serverLogger } from './env-setup'
import type { SessionLogger } from '../session-logger'

// Turn completion timeout configuration
export const TURN_COMPLETION_TIMEOUT_MS = 3000 // 3 seconds of silence = turn complete

// Logging configuration
export const DEBUG_MODE = process.env.WEBSOCKET_DEBUG === 'true'
export const AUDIO_LOG_INTERVAL = 50 // Log audio stats every N chunks to reduce spam

// Minimal interface for turn completion functions
export interface TurnCompletionClient {
  ws: WebSocket
  logger?: SessionLogger
  turnCompletionTimer?: ReturnType<typeof setTimeout>
}

/**
 * Helper function to send turn completion and clear timer
 */
export function sendTurnComplete(connectionId: string, client: TurnCompletionClient, reason: string): void {
  serverLogger.info('Sending turn_complete', { connectionId, reason })
  safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TURN_COMPLETE, payload: { turnComplete: true } }))
  client.logger?.log('turn_complete_auto', { reason })
  
  // Clear the timer
  if (client.turnCompletionTimer) {
    clearTimeout(client.turnCompletionTimer)
    client.turnCompletionTimer = undefined as any
  }
}

/**
 * Helper function to reset turn completion timer
 */
export function resetTurnCompletionTimer(connectionId: string, client: TurnCompletionClient): void {
  // Clear existing timer
  if (client.turnCompletionTimer) {
    clearTimeout(client.turnCompletionTimer)
  }
  
  // Set new timer
  client.turnCompletionTimer = setTimeout(() => {
    sendTurnComplete(connectionId, client, 'timeout_silence')
  }, TURN_COMPLETION_TIMEOUT_MS)
  
  // Only log timer reset in debug mode (too verbose otherwise)
  if (DEBUG_MODE) {
    serverLogger.debug('Turn completion timer reset', { connectionId, timeout: TURN_COMPLETION_TIMEOUT_MS })
  }
}

