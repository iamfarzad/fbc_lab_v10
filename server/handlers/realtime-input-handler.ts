import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend } from '../utils/websocket-helpers'
import { checkRateLimit, connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { MESSAGE_TYPES } from '../message-types'
import type { RealtimeInputPayload } from '../message-payload-types'

export interface RealtimeInputClient {
  ws: WebSocket
  sessionId?: string
  session: {
    sendRealtimeInput?: (input: { media: any }) => Promise<void>
    isOpen?: () => boolean
  }
  logger?: {
    log: (event: string, data?: any) => void
  }
}

export interface ActiveSessionsMap {
  get: (id: string) => RealtimeInputClient | undefined
  delete: (id: string) => void
}

/**
 * Handle realtime input messages from client
 */
export async function handleRealtimeInput(
  connectionId: string,
  client: RealtimeInputClient,
  payload: RealtimeInputPayload,
  activeSessions: ActiveSessionsMap
): Promise<void> {
  // Determine if this is an audio chunk to use appropriate rate limiting
  const chunks = Array.isArray(payload?.chunks) ? payload.chunks : []
  const chunk = chunks[0]
  const mimeType = chunk?.mimeType || ''
  const isAudioChunk = mimeType.startsWith('audio/') || mimeType.includes('pcm') || mimeType.includes('rate=')
  
  // Check rate limit - use audio rate limit for audio chunks, regular limit for others
  const rateLimit = checkRateLimit(
    connectionId, 
    client.sessionId, 
    isAudioChunk ? MESSAGE_TYPES.USER_AUDIO : MESSAGE_TYPES.REALTIME_INPUT
  )
  if (!rateLimit.allowed) {
    serverLogger.warn('Rate limit exceeded for REALTIME_INPUT', { connectionId, isAudioChunk, mimeType })
    safeSend(client.ws, JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      payload: { message: `Rate limit exceeded. Try again in ${rateLimit.remaining}s`, code: 'RATE_LIMIT_EXCEEDED' }
    }))
    return
  }

  // Enforce readiness gate
  const st = connectionStates.get(connectionId)
  if (!st?.isReady) {
    serverLogger.warn('REALTIME_INPUT received before session ready', { connectionId })
    safeSend(client.ws, JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      payload: { message: 'Session not ready', code: 'LIVE_NOT_READY' }
    }))
    return
  }

  if (chunks.length === 0) {
    serverLogger.warn('REALTIME_INPUT received but no chunks', { connectionId })
    return
  }

  try {
    // Check if session still exists and is open
    const currentClient = activeSessions.get(connectionId)
    if (!currentClient || !currentClient.session) {
      serverLogger.warn('REALTIME_INPUT received but session no longer exists', { connectionId })
      safeSend(client.ws, JSON.stringify({
        type: MESSAGE_TYPES.ERROR,
        payload: {
          message: 'Live API session closed. Please restart the session.',
          code: 'SESSION_CLOSED'
        }
      }))
      return
    }

    // Check if session is still open (if it has an isOpen method)
    if (typeof currentClient.session.isOpen === 'function' && !currentClient.session.isOpen()) {
      serverLogger.warn('REALTIME_INPUT received but Live API session is closed', { connectionId })
      safeSend(client.ws, JSON.stringify({
        type: MESSAGE_TYPES.ERROR,
        payload: {
          message: 'Live API session closed. Please restart the session.',
          code: 'SESSION_CLOSED'
        }
      }))
      return
    }

    // Check if this is an image chunk - REJECT immediately to prevent session closure
    const chunk = chunks[0]
    if (!chunk) {
      serverLogger.warn('REALTIME_INPUT chunk is empty', { connectionId })
      return
    }

    const mimeType = chunk.mimeType || ''
    
    // CRITICAL: Validate mimeType is present - Live API requires it
    if (!mimeType) {
      serverLogger.warn('REALTIME_INPUT chunk missing mimeType - rejecting to prevent session closure', { 
        connectionId,
        chunkKeys: Object.keys(chunk)
      })
      return
    }
    
    const isImage = mimeType.startsWith('image/')
    const isText = mimeType === 'text/plain' || mimeType.startsWith('text/')
    
    // CRITICAL FIX: Reject text chunks - Live API's sendRealtimeInput() only accepts audio/video media
    // Sending text via sendRealtimeInput causes error 1007 "Request contains an invalid argument"
    if (isText) {
      serverLogger.warn('REALTIME_INPUT: Rejecting text chunk - Live API does not accept text via sendRealtimeInput (causes 1007 error)', {
        connectionId,
        mimeType: chunk.mimeType
      })
      return
    }

    if (isImage) {
      // Allow image REALTIME_INPUT messages - required for multimodal context
      // The client is responsible for sending correct base64 data
      if (typeof currentClient.session.sendRealtimeInput === 'function') {
        await currentClient.session.sendRealtimeInput({
          media: chunk
        })
        serverLogger.info('REALTIME_INPUT (Image) sent to Live API', {
          connectionId,
          mimeType: chunk.mimeType
        })
        currentClient.logger?.log('realtime_input_sent', { chunks: chunks.length, mimeType: chunk.mimeType, type: 'image' })
        return
      }
    }

    // For audio chunks, process normally (text already rejected above)
    if (typeof currentClient.session.sendRealtimeInput === 'function') {
      // Process audio chunks normally
      await currentClient.session.sendRealtimeInput({
        media: chunk
      })
      serverLogger.info('REALTIME_INPUT (Audio) sent to Live API', {
        connectionId,
        mimeType: chunk.mimeType
      })
      currentClient.logger?.log('realtime_input_sent', { chunks: chunks.length, mimeType: chunk.mimeType })
    } else {
      serverLogger.warn('sendRealtimeInput not available on session', { connectionId })
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    const errorStr = errorMessage.toLowerCase()

    // Check if error indicates session is closed
    const isSessionClosed = errorStr.includes('closed') ||
      errorStr.includes('not open') ||
      errorStr.includes('connection') ||
      errorStr.includes('session')

    serverLogger.error('Failed to send realtime input', err instanceof Error ? err : undefined, {
      connectionId,
      isSessionClosed,
      errorMessage
    })

    // If session is closed, notify client and clean up
    if (isSessionClosed) {
      const currentClient = activeSessions.get(connectionId)
      if (currentClient) {
        // Session is dead, remove it
        activeSessions.delete(connectionId)
        connectionStates.delete(connectionId)
      }

      safeSend(client.ws, JSON.stringify({
        type: MESSAGE_TYPES.ERROR,
        payload: {
          message: 'Live API session closed. Please restart the session.',
          code: 'SESSION_CLOSED'
        }
      }))
    }

    client.logger?.log('error', { where: 'realtime_input', message: errorMessage })
  }
}

