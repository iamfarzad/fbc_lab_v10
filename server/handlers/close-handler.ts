import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { syncVoiceToOrchestrator } from '../context/orchestrator-sync'
import { DEBUG_MODE } from '../utils/turn-completion'
import { CONTEXT_CONFIG } from 'src/config/constants'

export interface CloseClient {
  ws: WebSocket
  sessionId?: string
  userTurnCount?: number
  turnCompletionTimer?: ReturnType<typeof setTimeout>
  session?: {
    close?: () => void
  }
}

export interface ActiveSessionsMap {
  get: (id: string) => CloseClient | undefined
  delete: (id: string) => void
}

export interface NoSessionWarnedSet {
  delete: (id: string) => void
}

/**
 * Handle session close/cleanup
 */
export async function handleClose(
  connectionId: string,
  activeSessions: ActiveSessionsMap,
  noSessionWarned: NoSessionWarnedSet
): Promise<void> {
  const client = activeSessions.get(connectionId)
  if (client) {
    // Clear turn completion timer
    if (client.turnCompletionTimer) {
      clearTimeout(client.turnCompletionTimer)
      client.turnCompletionTimer = undefined as any
      serverLogger.info('Cleared turn completion timer (session closing)', { connectionId })
    }

    // Archive conversation if it has meaningful content
    if (client.sessionId && CONTEXT_CONFIG.ARCHIVE_ON_DISCONNECT) {
      try {
        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
        const context = await multimodalContextManager.getContext(client.sessionId)

        if (context && context.conversationHistory.length >= CONTEXT_CONFIG.MIN_MESSAGES_FOR_ARCHIVE) {
          serverLogger.info('Archiving conversation for session', { connectionId, sessionId: client.sessionId })
          await multimodalContextManager.archiveConversation(client.sessionId)
          serverLogger.info('Conversation archived on disconnect', { connectionId })
        } else {
          if (DEBUG_MODE) {
            serverLogger.debug('Skipping archive: no meaningful content', { connectionId })
          }
        }
      } catch (err) {
        serverLogger.error('Failed to archive on disconnect', err instanceof Error ? err : undefined, { connectionId })
        // Non-fatal - continue with cleanup
      }
    }

    // NEW: Final orchestrator sync before closing
    if (client.sessionId && client.userTurnCount && client.userTurnCount > 0) {
      if (DEBUG_MODE) {
        serverLogger.debug('Final orchestrator sync before session end', { connectionId })
      }
      await syncVoiceToOrchestrator(client.sessionId, connectionId, client)
        .catch(err => serverLogger.error('Final orchestrator sync failed', err instanceof Error ? err : undefined))
    }

    try { client.session?.close?.() } catch (error) {
      serverLogger.warn('Failed to close session', { connectionId, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
    }
    activeSessions.delete(connectionId)
    noSessionWarned.delete(connectionId)
  }
  serverLogger.info('Session removed', { connectionId })
}

