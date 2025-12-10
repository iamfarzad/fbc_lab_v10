import { WebSocket } from 'ws'
import type { RawData } from 'ws'
import { Buffer } from 'buffer'
import { handleStart } from '../handlers/start-handler'
import { handleClose, type CloseClient } from '../handlers/close-handler'
import { handleUserMessage } from '../handlers/audio-handler'
import { handleToolResult } from '../handlers/tool-result-handler'
import { handleRealtimeInput } from '../handlers/realtime-input-handler'
import { handleContextUpdate } from '../handlers/context-update-handler'
import { safeSend, safeSendPriority, decodeRawMessage } from '../utils/websocket-helpers'
import { DEBUG_MODE } from '../utils/turn-completion'
import { connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { MESSAGE_TYPES } from '../message-types'
import { WEBSOCKET_CONFIG } from 'src/config/constants'
import { serverLogger } from '../utils/env-setup'
import type { ConnectionManagerState } from './connection-manager'
import { parseError, toWsErrorPayload } from '../utils/errors'
import { safeParseJson } from '../utils/json'
import type {
  StartPayload,
  UserAudioPayload,
  ToolResultPayload,
  RealtimeInputPayload,
  ContextUpdatePayload
} from '../message-payload-types'

type ParsedMessage = Record<string, unknown> & {
  type?: string
  payload?: unknown
}

export interface MessageRouterHandlers {
  handleStart: typeof handleStart
  handleClose: typeof handleClose
  handleUserMessage: typeof handleUserMessage
  handleToolResult: typeof handleToolResult
  handleRealtimeInput: typeof handleRealtimeInput
  handleContextUpdate: typeof handleContextUpdate
}

export interface MessageRouterResult {
  heartbeatTimer: NodeJS.Timeout | null
  heartbeatInterval: NodeJS.Timeout
}

/**
 * Setup message router for a WebSocket connection
 * Handles ping/pong, message routing, and per-connection heartbeat
 */
export function setupMessageRouter(
  ws: WebSocket,
  connectionId: string,
  connectionManager: ConnectionManagerState,
  handlers: MessageRouterHandlers
): MessageRouterResult {
  const { activeSessions, noSessionWarned, sessionStarting, closingForRestart } =
    connectionManager

  let heartbeatTimer: NodeJS.Timeout | null = null

  // Register message handler IMMEDIATELY (before any other operations)
  // This ensures we capture ALL messages regardless of timing
  ws.on('message', (message: RawData) => {
    void (async () => {
    // --- client ping -> server pong ---
    try {
      const asString = typeof message === 'string' ? message : String(message)
      // Try to parse as JSON first for more reliable detection
      const parsed = safeParseJson<{ type?: string } | null>(asString, null)
      if (parsed?.type === 'ping') {
        const pongResponse = JSON.stringify({ type: 'pong', timestamp: Date.now() })
        const sent = safeSendPriority(ws, pongResponse)
        const st = connectionStates.get(connectionId)
        if (st) st.lastPing = Date.now()
        void serverLogger.info('Responded to client ping with pong', {
          connectionId,
          sent,
          bufferedAmount: ws.bufferedAmount,
          readyState: ws.readyState
        })
        return // heartbeat only - don't process further
      }

      if (!parsed && (
        asString.includes('"type":"ping"') ||
        asString.includes("'type':'ping'") ||
        asString.includes('type":"ping')
      )) {
        const pongResponse = JSON.stringify({ type: 'pong', timestamp: Date.now() })
        const sent = safeSendPriority(ws, pongResponse)
        const st = connectionStates.get(connectionId)
        if (st) st.lastPing = Date.now()
        void serverLogger.info('Responded to client ping with pong (string match)', {
          connectionId,
          sent,
          bufferedAmount: ws.bufferedAmount,
          readyState: ws.readyState
        })
        return
      }
    } catch (err) {
      // ignore malformed heartbeat
      if (DEBUG_MODE) {
        serverLogger.debug('Failed to parse ping message', {
          connectionId,
          error: err instanceof Error ? err.message : String(err)
        })
      }
    }

    // Start heartbeat only after first message
    if (!heartbeatTimer) {
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT, timestamp: Date.now() }))
        }
      }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)
    }

    try {
      const rawString = decodeRawMessage(message)
      const parsedMessage = rawString
        ? safeParseJson<ParsedMessage | null>(
          rawString,
          null,
          {
            onError: (err) => {
              void serverLogger.warn('Failed to parse websocket message payload', {
                connectionId,
                error: err instanceof Error ? err.message : String(err),
                preview: rawString?.substring(0, 100) || ''
              })
            }
          }
        )
        : null

      if (!parsedMessage) {
        return
      }

      const messageType =
        typeof parsedMessage.type === 'string' ? parsedMessage.type : 'unknown'
      const payloadRecord =
        parsedMessage.payload && typeof parsedMessage.payload === 'object' && !Array.isArray(parsedMessage.payload)
          ? parsedMessage.payload as Record<string, unknown>
          : null

      // Only log raw/parsed messages in debug mode (too verbose for production)
      // Consolidated single log instead of 3 separate logs (per duplicate prevention rules)
      if (DEBUG_MODE) {
        void serverLogger.debug('Message received', {
          connectionId,
          messageType: messageType.toUpperCase(),
          rawSize: Buffer.isBuffer(message) ? message.length : 'unknown',
          payloadSize: rawString?.length || 0,
          hasPayload: payloadRecord !== null,
          preview: rawString?.substring(0, 100) || 'null'
        })
      }

      switch (messageType) {
        case MESSAGE_TYPES.START: {
          void serverLogger.info('Handling start message', { connectionId })
          const startPayloadRecord = payloadRecord as Partial<StartPayload> | null
          try {
            activeSessions.get(connectionId)?.logger?.log('client_start', {
              payload: {
                languageCode: startPayloadRecord?.languageCode,
                voiceName: startPayloadRecord?.voiceName,
                sessionId: startPayloadRecord?.sessionId
              }
            })
          } catch {
            // Ignore errors when handling start
          }
          await handlers.handleStart(
            connectionId,
            ws,
            (startPayloadRecord ?? {}) as StartPayload,
            {
              activeSessions,
              sessionStarting,
              closingForRestart,
              noSessionWarned
            }
          )
          break
        }

        case MESSAGE_TYPES.STOP: {
          void serverLogger.info('Handling stop message', { connectionId })
          const client = activeSessions.get(connectionId)
          if (client) {
            await handlers.handleClose(
              connectionId,
              {
                get: (id: string) => {
                  const rec = activeSessions.get(id)
                  if (!rec) return undefined
                  return {
                    ws: rec.ws,
                    ...(rec.sessionId ? { sessionId: rec.sessionId } : {}),
                    ...(rec.userTurnCount ? { userTurnCount: rec.userTurnCount } : {}),
                    ...(rec.turnCompletionTimer ? { turnCompletionTimer: rec.turnCompletionTimer } : {}),
                    ...(rec.session ? { session: rec.session } : {})
                  } as CloseClient
                },
                delete: (id: string) => activeSessions.delete(id)
              },
              noSessionWarned
            )
          }
          // Acknowledge stop
          safeSend(
            ws,
            JSON.stringify({
              type: MESSAGE_TYPES.SESSION_CLOSED,
              payload: { reason: 'client_stop' }
            })
          )
          break
        }

        case MESSAGE_TYPES.USER_AUDIO:
          // No redundant log - switch case already shows we're handling user_audio
          await handlers.handleUserMessage(
            connectionId,
            ws,
            (parsedMessage.payload ?? {}) as UserAudioPayload,
            activeSessions,
            noSessionWarned
          )
          break

        case MESSAGE_TYPES.TOOL_RESULT: {
          const client = activeSessions.get(connectionId)
          if (!client) {
            void serverLogger.warn('TOOL_RESULT received but no active session', { connectionId })
            break
          }
          await handlers.handleToolResult(
            connectionId,
            client,
            (parsedMessage.payload ?? {}) as ToolResultPayload
          )
          break
        }

        case MESSAGE_TYPES.REALTIME_INPUT: {
          serverLogger.info('Handling REALTIME_INPUT message', { connectionId })
          let client = activeSessions.get(connectionId)
          
          // Check if session is starting or ready (race condition fix)
          const connectionState = connectionStates.get(connectionId)
          const isSessionStarting = sessionStarting.has(connectionId)
          const isSessionReady = connectionState?.isReady === true
          
          if (!client) {
            // If session is ready but not in activeSessions yet, wait briefly for it to be added
            if (isSessionReady && !isSessionStarting) {
              // Session is marked ready but not yet in activeSessions - race condition
              // Wait briefly for session to be added (should happen immediately after isReady is set)
              serverLogger.debug('REALTIME_INPUT: Session ready but not in activeSessions yet - waiting', { connectionId })
              // Try a few times with small delays
              for (let i = 0; i < 10 && !client; i++) {
                await new Promise(resolve => setTimeout(resolve, 50))
                client = activeSessions.get(connectionId)
              }
              if (!client) {
                serverLogger.warn('REALTIME_INPUT: Session ready but still not in activeSessions after retries', { connectionId })
              }
            }
            
            if (!client) {
              if (isSessionStarting) {
                serverLogger.debug('REALTIME_INPUT received while session starting - should be queued on client', { connectionId })
                break
              }
              serverLogger.warn('REALTIME_INPUT received but no active session', { 
                connectionId,
                isSessionReady,
                isSessionStarting,
                hasConnectionState: !!connectionState
              })
              break
            }
          }
          
          await handlers.handleRealtimeInput(
            connectionId,
            client,
            (parsedMessage.payload ?? {}) as RealtimeInputPayload,
            activeSessions
          )
          break
        }

        case MESSAGE_TYPES.CONTEXT_UPDATE: {
          serverLogger.info('Handling CONTEXT_UPDATE message', { connectionId })
          const client = activeSessions.get(connectionId)
          if (!client) {
            serverLogger.warn('CONTEXT_UPDATE received but no active session', { connectionId })
            break
          }
          void handlers.handleContextUpdate(
            connectionId,
            client,
            (parsedMessage.payload ?? {}) as ContextUpdatePayload
          )
          break
        }

        case MESSAGE_TYPES.HEARTBEAT_ACK: {
          // Client acknowledged heartbeat - connection is healthy
          const st = connectionStates.get(connectionId)
          if (st) {
            st.lastPing = Date.now()
          }
          if (DEBUG_MODE) {
            serverLogger.debug('Heartbeat acknowledged by client', { connectionId })
          }
          break
        }

        default:
          serverLogger.warn('Unknown message type', {
            connectionId,
            messageType
          })
      }
    } catch (error) {
      const appError = parseError(error, {
        context: { connectionId, phase: 'message_router' }
      })

      const logMethod = appError.statusCode >= 500 ? 'error' : 'warn'
      const logPayload: Record<string, unknown> = { connectionId, code: appError.code, statusCode: appError.statusCode }
      if (appError.details) {
        logPayload.details = appError.details
      }

      const logError =
        error instanceof Error
          ? Object.assign(new Error(error.message), logPayload, {
            stack: error.stack,
            originalError: error
          })
          : Object.assign(new Error(appError.message), logPayload, {
            originalError: error
          })

      void serverLogger[logMethod]('Error processing message', logError)

      safeSend(
        ws,
        JSON.stringify(toWsErrorPayload(appError, { requestId: connectionId }))
      )
    }
    })()
  })

  // Per-connection heartbeat interval for connection health monitoring
  const heartbeatInterval = setInterval(() => {
    const st = connectionStates.get(connectionId)
    if (!st) return

    // if no ping for 60s -> kill
    if (Date.now() - st.lastPing > 60000) {
      serverLogger.warn('No heartbeat for 60s. Terminating socket', { connectionId })
      clearInterval(heartbeatInterval)
      connectionStates.delete(connectionId)
      try {
        ws.terminate()
      } catch {
        // ignore
      }
      return
    }

    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping()
        ws.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT, timestamp: Date.now() }))
      } catch {
        // ignore
      }
    }
  }, 25000)

  return {
    heartbeatTimer,
    heartbeatInterval
  }
}
