import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend } from '../utils/websocket-helpers'
import { checkRateLimit, connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { scheduleDebouncedInjection } from '../context/injection'
import { MESSAGE_TYPES } from '../message-types'
import { VOICE_CONFIG } from 'src/config/constants'
import type { ContextUpdatePayload } from '../message-payload-types'

const VISUAL_PERSIST_THROTTLE_MS = Math.max(VOICE_CONFIG.VISUAL_INJECT_THROTTLE_MS, 3000)
const INJECT_ON_CONTEXT_UPDATE = VOICE_CONFIG.INJECT_ON_CONTEXT_UPDATE

interface Snapshot {
  analysis: string
  capturedAt: number
  imageData?: string
  lastInjected?: number
  lastPersisted?: number
}

export interface ContextUpdateClient {
  ws: WebSocket
  sessionId?: string
  latestContext: {
    screen?: Snapshot
    webcam?: Snapshot
  }
  injectionTimers?: {
    screen?: ReturnType<typeof setTimeout>
    webcam?: ReturnType<typeof setTimeout>
  }
  session: {
    sendRealtimeInput?: (input: { media: { text?: string; mimeType?: string; data?: string } }) => Promise<void>
  }
  logger?: {
    log: (event: string, data?: any) => void
  }
}

/**
 * Handle context update messages from client
 */
export async function handleContextUpdate(
  connectionId: string,
  client: ContextUpdateClient,
  payload: ContextUpdatePayload
): Promise<void> {
  // Check rate limit
  const rateLimit = checkRateLimit(connectionId, client.sessionId, MESSAGE_TYPES.CONTEXT_UPDATE)
  if (!rateLimit.allowed) {
    serverLogger.warn('Rate limit exceeded for CONTEXT_UPDATE', { connectionId })
    safeSend(client.ws, JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      payload: { message: `Rate limit exceeded. Try again in ${rateLimit.remaining}s`, code: 'RATE_LIMIT_EXCEEDED' }
    }))
    return
  }

  // Enforce readiness gate
  const st = connectionStates.get(connectionId)
  if (!st?.isReady) {
    serverLogger.warn('CONTEXT_UPDATE received before session ready', { connectionId })
    safeSend(client.ws, JSON.stringify({
      type: MESSAGE_TYPES.ERROR,
      payload: { message: 'Session not ready', code: 'LIVE_NOT_READY' }
    }))
    return
  }

  const modality = typeof payload?.modality === 'string' ? payload.modality : ''
  if (modality !== 'screen' && modality !== 'webcam' && modality !== 'intelligence') {
    serverLogger.warn('CONTEXT_UPDATE ignored due to invalid modality', { connectionId, modality })
    return
  }

  const analysis = typeof payload.analysis === 'string' ? payload.analysis : ''
  if (!analysis) {
    serverLogger.warn('CONTEXT_UPDATE missing analysis text', { connectionId })
    return
  }

  const capturedAt = typeof payload.capturedAt === 'number' ? payload.capturedAt : Date.now()
  const imageData = typeof payload.imageData === 'string' ? payload.imageData : undefined

  client.latestContext = client.latestContext || {}
  const modalityKey = modality as 'screen' | 'webcam'
  const prev = client.latestContext[modalityKey]
  client.latestContext[modalityKey] = {
    analysis,
    capturedAt,
    ...(imageData !== undefined && { imageData }),
    ...(prev?.lastInjected !== undefined && { lastInjected: prev.lastInjected }),
    ...(prev?.lastPersisted !== undefined && { lastPersisted: prev.lastPersisted })
  }
  client.logger?.log('context_update', { modality, analysis, capturedAt, hasImage: Boolean(imageData), imageBytes: typeof imageData === 'string' ? Math.floor(imageData.length * 0.75) : 0 })

  if (client.sessionId) {
    const snapRef = client.latestContext[modalityKey]
    const now = Date.now()

    // Intelligence updates should always be persisted (no throttle)
    const shouldPersist = modality === 'intelligence' || !snapRef.lastPersisted || now - snapRef.lastPersisted >= VISUAL_PERSIST_THROTTLE_MS

    if (shouldPersist) {
      snapRef.lastPersisted = now
        ; (async () => {
          try {
            const { multimodalContextManager } = await import('src/core/context/multimodal-context')

            if (modality === 'intelligence') {
              // Intelligence context is already saved to DB by the API
              // We just need to inject it into the active session
              // So we don't need to call multimodalContextManager here
              client.logger?.log('context_persisted', { modality, analysisLength: analysis.length })
            } else {
              const imageBytes = typeof imageData === 'string' ? Math.floor(imageData.length * 0.75) : undefined
              await multimodalContextManager.addVisualAnalysis(
                client.sessionId!,
                analysis,
                modalityKey as 'screen' | 'webcam',
                imageBytes,
                imageData
              )
              client.logger?.log('context_persisted', { modality, imageBytes, analysisLength: analysis.length, ownerSessionId: client.sessionId })
            }
          } catch (err) {
            serverLogger.error('Failed to persist context', err instanceof Error ? err : undefined, { connectionId, modality })
            client.logger?.log('error', { where: 'context_persist', modality, message: err instanceof Error ? err.message : String(err) })
          }
        })().catch(() => {
          // handled in logger
        })
    }
  }

  if (!INJECT_ON_CONTEXT_UPDATE) {
    serverLogger.info('CONTEXT_UPDATE received; injection disabled by flag', { connectionId })
    return
  }

  // Schedule debounced injection using context/injection module
  scheduleDebouncedInjection(client, modalityKey, connectionId)
}

