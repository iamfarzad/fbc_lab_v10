import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend, ensureConnectionState } from '../utils/websocket-helpers'
import { checkRateLimit } from '../rate-limiting/websocket-rate-limiter'
import { resetTurnCompletionTimer, DEBUG_MODE, AUDIO_LOG_INTERVAL, type TurnCompletionClient } from '../utils/turn-completion'
import { MESSAGE_TYPES } from '../message-types'
import type { UserAudioPayload } from '../message-payload-types'

export interface UserMessageClient {
  ws: WebSocket
  sessionId?: string
  session: {
    sendRealtimeInput?: (input: { media: { mimeType: string; data: string } }) => Promise<void>
  }
  audioChunkCount?: number
  lastAudioActivity?: number
  logger?: {
    log: (event: string, data?: any) => void
  }
  turnCompletionTimer?: ReturnType<typeof setTimeout>
}

export interface ActiveSessionsMap {
  get: (id: string) => UserMessageClient | undefined
}

export interface NoSessionWarnedSet {
  has: (id: string) => boolean
  add: (id: string) => void
}

/**
 * Handle user audio messages
 */
export async function handleUserMessage(
  connectionId: string,
  ws: WebSocket,
  payload: UserAudioPayload,
  activeSessions: ActiveSessionsMap,
  noSessionWarned: NoSessionWarnedSet
): Promise<void> {
  // Always use Live API in this configuration
  
  const client = activeSessions.get(connectionId)
  
  // Verify connectionState exists before checking rate limit
  const st = ensureConnectionState(connectionId, {
    handler: 'handleUserMessage',
    phase: 'rate_limit_check',
    additionalContext: {
      hasClient: !!client,
      hasSession: !!client?.session,
      sessionId: client?.sessionId
    }
  })

  // Check rate limit
  const rateLimit = checkRateLimit(connectionId, client?.sessionId, MESSAGE_TYPES.USER_AUDIO)
  if (!rateLimit.allowed) {
    serverLogger.warn('Rate limit exceeded for USER_AUDIO', { 
      connectionId,
      remaining: rateLimit.remaining,
      audioCount: st.audioCount,
      audioLastAt: st.audioLastAt
    })
    safeSend(ws, JSON.stringify({ 
      type: MESSAGE_TYPES.ERROR, 
      payload: { message: `Rate limit exceeded. Try again in ${rateLimit.remaining}s`, code: 'RATE_LIMIT_EXCEEDED' } 
    }))
    return
  }
  
  // Enforce readiness gate
  if (!st.isReady) {
    serverLogger.warn('USER_AUDIO received before session ready', { 
      connectionId,
      isReady: st.isReady,
      hasClient: !!client,
      hasSession: !!client?.session
    })
    safeSend(ws, JSON.stringify({ 
      type: MESSAGE_TYPES.ERROR, 
      payload: { message: 'Session not ready', code: 'LIVE_NOT_READY' } 
    }))
    return
  }

  if (payload.audioData && payload.mimeType) {
    if (!client || !client.session) {
      // Only log once per connection to avoid spam
      if (!noSessionWarned.has(connectionId)) {
        serverLogger.warn('No active session to send audio to - session may not be initialized yet', { connectionId })
        noSessionWarned.add(connectionId)
      }
      safeSend(ws, JSON.stringify({ 
        type: MESSAGE_TYPES.ERROR, 
        payload: { message: 'No active session', code: 'AUDIO_BEFORE_SESSION' } 
      }))
      return
    }

    const audioData: string = String(payload.audioData || '')
    const mimeType: string = String(payload.mimeType || 'audio/pcm;rate=16000')

    // Light base64 sanity check
    const padding = audioData.endsWith('==') ? 2 : audioData.endsWith('=') ? 1 : 0
    const approxBytes = Math.max(0, Math.floor((audioData.length * 3) / 4) - padding)
    if (approxBytes === 0) {
      serverLogger.warn('Audio payload appears empty after base64 calc', { connectionId })
    }

    try {
      // Track audio chunk count for periodic logging
      client.audioChunkCount = (client.audioChunkCount || 0) + 1
      
      client.logger?.log('audio_chunk', { direction: 'client_to_server', bytes: approxBytes, mimeType })
      
      // Update last audio activity time and reset turn completion timer
      client.lastAudioActivity = Date.now()
      // Create a compatible client object for turn completion
      const turnClient = {
        ws: client.ws,
        ...(client.logger ? {
          logger: {
            log: client.logger.log.bind(client.logger)
          }
        } : {}),
        ...(client.turnCompletionTimer ? {
          turnCompletionTimer: client.turnCompletionTimer
        } : {})
      } as TurnCompletionClient
      resetTurnCompletionTimer(connectionId, turnClient)
      client.turnCompletionTimer = turnClient.turnCompletionTimer
      
      // Only log session methods in debug mode (too verbose)
      if (DEBUG_MODE) {
        serverLogger.debug('Session methods', {
          connectionId,
          hasSendRealtimeInput: typeof client.session.sendRealtimeInput,
          sessionKeys: Object.keys(client.session),
        })
      }
      
      if (typeof client.session.sendRealtimeInput === 'function') {
        await client.session.sendRealtimeInput({ media: { mimeType, data: audioData } })
        
        // Log audio stats periodically instead of every chunk
        if (DEBUG_MODE || (client.audioChunkCount && client.audioChunkCount % AUDIO_LOG_INTERVAL === 0)) {
          serverLogger.info('Audio chunks processed', { 
            connectionId, 
            chunkCount: client.audioChunkCount, 
            audioDataLength: audioData.length, 
            mimeType 
          })
        }
      } else {
        serverLogger.error('sendRealtimeInput method not available on session', undefined, { connectionId })
        safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: 'Live session cannot accept audio (no sendRealtimeInput method)' } }))
      }
    } catch (e: any) {
      const msg = e?.message || String(e)
      const stack = e?.stack || 'No stack trace'
      serverLogger.error('Failed to send audio to Live API', e instanceof Error ? e : undefined, { 
        connectionId,
        error: msg, 
        stack,
        hasRealtimeMethod: typeof client.session.sendRealtimeInput === 'function'
      })
      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: `Failed to send audio to Live API: ${msg}` } }))
    }
    return
  }

  // Handle text messages if needed in the future
}

