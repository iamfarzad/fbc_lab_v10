import { serverLogger } from '../utils/env-setup'
import { VOICE_CONFIG } from 'src/config/constants'
import { handleContextUpdate, type ContextUpdateClient } from '../handlers/context-update-handler.js'

const INJECT_ON_CONTEXT_UPDATE = VOICE_CONFIG.INJECT_ON_CONTEXT_UPDATE
const CONTEXT_INJECT_DEBOUNCE_MS = VOICE_CONFIG.CONTEXT_INJECT_DEBOUNCE_MS
const VISUAL_INJECT_THROTTLE_MS = VOICE_CONFIG.VISUAL_INJECT_THROTTLE_MS

interface Snapshot {
  analysis: string
  capturedAt: number
  imageData?: string
  lastInjected?: number
  lastPersisted?: number
}

interface InjectionClient {
  ws?: any // WebSocket - optional for compatibility
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
 * Schedule debounced context injection
 * This function sets up a debounced timer to inject visual context into the Live API session
 */
export function scheduleDebouncedInjection(
  client: InjectionClient,
  modality: 'screen' | 'webcam',
  connectionId: string
): void {
  if (!INJECT_ON_CONTEXT_UPDATE) {
    serverLogger.info('CONTEXT_UPDATE received; injection disabled by flag', { connectionId })
    return
  }

  // Debounce injection per-modality to avoid spamming the Live API
  client.injectionTimers = client.injectionTimers || {}
  const timers = client.injectionTimers
  const modalityKey = modality
  
  if (timers[modalityKey]) {
    clearTimeout(timers[modalityKey])
  }

  timers[modalityKey] = setTimeout(() => {
    void (async () => {
      try {
        const snap = client.latestContext[modalityKey]
        if (!snap) return
      const now = Date.now()
      if (typeof snap.lastInjected === 'number' && snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) {
        serverLogger.info('Context injection skipped (recently injected)', { connectionId, modality })
        client.logger?.log('context_injection_skipped', { modality, reason: 'debounce_throttle', throttleMs: CONTEXT_INJECT_DEBOUNCE_MS })
        return
      }

      // CRITICAL FIX: sendRealtimeInput() only accepts audio/video media, NOT text
      // Sending text via sendRealtimeInput causes error 1007 "Request contains an invalid argument"
      // Text context should be included in systemInstruction during session setup instead
      // For now, we'll only send image data if available, and skip text injection
      
      if (typeof client.session.sendRealtimeInput === 'function') {
        // Only send image if available - images work with sendRealtimeInput
        if (snap.imageData) {
          try {
            const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '')
        await client.session.sendRealtimeInput({ 
              media: { mimeType: 'image/jpeg', data: base64Data }
        })
            serverLogger.info('Context image injected to Live API', { 
              connectionId, 
              modality,
              analysisLength: snap.analysis.length
            })
            
            // After image is sent, trigger context update to inject analysis text into systemInstruction
            if (snap.analysis && snap.analysis.length > 0) {
              try {
                // Create a compatible client object for handleContextUpdate
                const contextUpdateClient = {
                  ws: (client as any).ws,
                  sessionId: (client as any).sessionId,
                  latestContext: client.latestContext,
                  intelligenceData: (client as any).intelligenceData,
                  injectionTimers: client.injectionTimers,
                  session: client.session,
                  logger: client.logger
                } as ContextUpdateClient
                
                await handleContextUpdate(connectionId, contextUpdateClient, {
                  analysis: snap.analysis,
                  modality: modality,
                  capturedAt: snap.capturedAt,
                  imageData: snap.imageData
                })
                serverLogger.info('Analysis text triggered context update for systemInstruction', {
                  connectionId,
                  modality,
                  analysisLength: snap.analysis.length
                })
              } catch (ctxErr) {
                serverLogger.warn('Failed to trigger context update for analysis', {
                  connectionId,
                  modality,
                  error: ctxErr instanceof Error ? ctxErr.message : String(ctxErr)
                })
              }
            }
          } catch (imgErr) {
            serverLogger.warn('Failed to send context image', { 
              connectionId, 
              modality,
              error: imgErr instanceof Error ? imgErr.message : String(imgErr)
            })
          }
        } else {
          // No image available - skip injection
          // Text context cannot be sent via sendRealtimeInput (causes error 1007)
          serverLogger.debug('Context injection skipped - no image and text not supported via sendRealtimeInput', { 
          connectionId, 
          modality,
          analysisLength: snap.analysis.length
        })
        }
      } else {
        throw new Error('sendRealtimeInput not available')
      }
      snap.lastInjected = now
      client.logger?.log('context_injected', { modality, hadImage: Boolean(snap.imageData), analysisSnippet: snap.analysis?.slice(0, 500), imageSendingDisabled: true })
    } catch (err) {
      serverLogger.error('Failed debounced inject', err instanceof Error ? err : undefined, { connectionId, modality })
      client.logger?.log('error', { where: 'debounced_inject', modality, message: err instanceof Error ? err.message : String(err) })
    } finally {
      delete timers[modalityKey]
    }
    })()
  }, CONTEXT_INJECT_DEBOUNCE_MS)
}

