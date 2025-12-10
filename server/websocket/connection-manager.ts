import { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { v4 as uuidv4 } from 'uuid'
import { Buffer } from 'buffer'
import { SessionLogger } from '../session-logger'
import { handleClose, type CloseClient } from '../handlers/close-handler'
import { connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { safeSend } from '../utils/websocket-helpers'
import { MESSAGE_TYPES } from '../message-types'
import { serverLogger } from '../utils/env-setup'
import type { ActiveSessionRecord } from '../handlers/start-handler'

export interface ConnectionManagerState {
  activeSessions: Map<string, ActiveSessionRecord>
  noSessionWarned: Set<string>
  sessionStarting: Set<string>
  closingForRestart: Set<string>
}

export interface ConnectionManager extends ConnectionManagerState {
  initializeConnection(ws: WebSocket, req: IncomingMessage): string
  cleanupConnection(connectionId: string, code: number, reason: Buffer, heartbeatTimer: NodeJS.Timeout | null, heartbeatInterval: NodeJS.Timeout): void
  handleConnectionError(connectionId: string, err: Error, heartbeatTimer: NodeJS.Timeout | null, heartbeatInterval: NodeJS.Timeout): void
}

/**
 * Create connection manager with session state maps and lifecycle methods
 */
export function createConnectionManager(): ConnectionManager {
  const activeSessions = new Map<string, ActiveSessionRecord>()
  const noSessionWarned = new Set<string>()
  const sessionStarting = new Set<string>()
  const closingForRestart = new Set<string>()

  return {
    activeSessions,
    noSessionWarned,
    sessionStarting,
    closingForRestart,

    /**
     * Initialize a new WebSocket connection
     * Returns the connectionId
     */
    initializeConnection(ws: WebSocket, req: IncomingMessage): string {
      const connectionId = uuidv4()
      serverLogger.info('Client connected', { connectionId })

      // Init per-connection state
      connectionStates.set(connectionId, {
        isReady: false,
        lastPing: Date.now(),
        messageCount: 0,
        lastMessageAt: Date.now(),
        audioCount: 0,
        audioLastAt: Date.now(),
        mediaCount: 0,
        mediaLastAt: Date.now()
      })

      // Keep ws-alive flag in sync
      ;(ws as any).isAlive = true

      // Disable socket delay to improve performance
      try {
        (req.socket as any)?.setNoDelay?.(true)
      } catch (error) {
        serverLogger.warn('Unable to disable socket delay', {
          connectionId,
          error: error instanceof Error
            ? { name: error.name, message: error.message, stack: error.stack }
            : String(error)
        })
      }

      // Acknowledge connection
      const connectedMessage = JSON.stringify({
        type: MESSAGE_TYPES.CONNECTED,
        payload: { connectionId }
      })
      serverLogger.info('Sending connected event to client', { connectionId })
      safeSend(ws, connectedMessage)

      // Initialize session logger asynchronously to not block message handling
      void Promise.resolve().then(() => {
        try {
          const logger = new SessionLogger(connectionId)
          logger.log('connected')
          // Update or seed the active session record with logger
          const existing = activeSessions.get(connectionId)
          if (existing) {
            existing.logger = logger
          } else {
            activeSessions.set(connectionId, {
              ws,
              session: undefined as any,
              latestContext: {},
              logger
            })
          }
        } catch (e) {
          serverLogger.warn('Failed to initialize session logger', {
            connectionId,
            error: e instanceof Error
              ? { name: e.name, message: e.message, stack: e.stack }
              : String(e)
          })
        }
      })

      return connectionId
    },

    /**
     * Cleanup connection on close
     */
    cleanupConnection(
      connectionId: string,
      code: number,
      reason: Buffer,
      heartbeatTimer: NodeJS.Timeout | null,
      heartbeatInterval: NodeJS.Timeout
    ): void {
      serverLogger.info('WebSocket closed', {
        connectionId,
        code,
        reason: reason?.toString() || 'N/A'
      })

      if (code !== 1000 && code !== 1001) {
        serverLogger.warn('CLOSED early', {
          connectionId,
          code,
          reason: reason?.toString()
        })
      }

      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
      }
      clearInterval(heartbeatInterval)
      connectionStates.delete(connectionId)

      const rec = activeSessions.get(connectionId)
      try {
        rec?.logger?.log('session_closed', {
          source: 'websocket',
          code,
          reason: reason?.toString?.()
        })
      } catch {
        // Ignore errors when closing logger
      }
      try {
        rec?.logger?.close()
      } catch {
        // Ignore errors when closing logger
      }

      if (rec) {
        void handleClose(
          connectionId,
          {
            get: (id: string) => {
              const r = activeSessions.get(id)
              if (!r) return undefined
              return {
                ws: r.ws,
                ...(r.sessionId ? { sessionId: r.sessionId } : {}),
                ...(r.userTurnCount ? { userTurnCount: r.userTurnCount } : {}),
                ...(r.turnCompletionTimer ? { turnCompletionTimer: r.turnCompletionTimer } : {}),
                ...(r.session ? { session: r.session } : {})
              } as CloseClient
            },
            delete: (id: string) => activeSessions.delete(id)
          },
          noSessionWarned
        )
      }
    },

    /**
     * Handle connection errors
     */
    handleConnectionError(
      connectionId: string,
      err: Error,
      heartbeatTimer: NodeJS.Timeout | null,
      heartbeatInterval: NodeJS.Timeout
    ): void {
      serverLogger.error('WebSocket error', err instanceof Error ? err : undefined, {
        connectionId
      })
      try {
        activeSessions.get(connectionId)?.logger?.log('error', {
          where: 'websocket',
          message: err instanceof Error ? err.message : String(err)
        })
      } catch {
        // Ignore errors when sending heartbeat
      }
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
      }
      clearInterval(heartbeatInterval)
      connectionStates.delete(connectionId)

      const rec = activeSessions.get(connectionId)
      if (rec) {
        void handleClose(
          connectionId,
          {
            get: (id: string) => {
              const r = activeSessions.get(id)
              if (!r) return undefined
              return {
                ws: r.ws,
                ...(r.sessionId ? { sessionId: r.sessionId } : {}),
                ...(r.userTurnCount ? { userTurnCount: r.userTurnCount } : {}),
                ...(r.turnCompletionTimer ? { turnCompletionTimer: r.turnCompletionTimer } : {}),
                ...(r.session ? { session: r.session } : {})
              } as CloseClient
            },
            delete: (id: string) => activeSessions.delete(id)
          },
          noSessionWarned
        )
      }
    }
  }
}

