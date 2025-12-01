import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend } from '../utils/websocket-helpers'
import { checkRateLimit, connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { MESSAGE_TYPES } from '../message-types'
import type { ToolResultPayload } from '../message-payload-types'

export interface ToolResultClient {
  ws: WebSocket
  sessionId?: string
  session: {
    sendToolResponse: (response: { functionResponses: any[] }) => Promise<void>
  }
  logger?: {
    log: (event: string, data?: any) => void
  }
}

/**
 * Handle tool result messages from client
 */
export async function handleToolResult(
  connectionId: string,
  client: ToolResultClient,
  payload: ToolResultPayload
): Promise<void> {
  // Check rate limit
  const rateLimit = checkRateLimit(connectionId, client.sessionId, MESSAGE_TYPES.TOOL_RESULT)
  if (!rateLimit.allowed) {
    serverLogger.warn('Rate limit exceeded for TOOL_RESULT', { connectionId })
    safeSend(client.ws, JSON.stringify({ 
      type: MESSAGE_TYPES.ERROR, 
      payload: { message: `Rate limit exceeded. Try again in ${rateLimit.remaining}s`, code: 'RATE_LIMIT_EXCEEDED' } 
    }))
    return
  }
  
  // Enforce readiness gate
  const st = connectionStates.get(connectionId)
  if (!st?.isReady) {
    serverLogger.warn('TOOL_RESULT received before session ready', { connectionId })
    safeSend(client.ws, JSON.stringify({ 
      type: MESSAGE_TYPES.ERROR, 
      payload: { message: 'Session not ready', code: 'LIVE_NOT_READY' } 
    }))
    return
  }
  
  const responses = payload?.responses
  if (!Array.isArray(responses) || responses.length === 0) {
    serverLogger.warn('TOOL_RESULT missing responses', { connectionId })
    return
  }
  
  try {
    client.logger?.log('tool_result_client', { responsesCount: responses.length })
    await client.session.sendToolResponse({ functionResponses: responses })
    safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: { responses } }))
    client.logger?.log('tool_result_forwarded', { responsesCount: responses.length })
  } catch (err) {
    serverLogger.error('Failed to forward tool responses to Live API', err instanceof Error ? err : undefined, { connectionId })
    safeSend(client.ws, JSON.stringify({ type: MESSAGE_TYPES.TOOL_CALL, payload: { error: err instanceof Error ? err.message : 'Tool response failed' } }))
    client.logger?.log('error', { where: 'tool_result_forward', message: err instanceof Error ? err.message : String(err) })
  }
}

