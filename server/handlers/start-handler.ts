import { WebSocket } from 'ws'
import { serverLogger } from '../utils/env-setup'
import { safeSend, ensureConnectionState } from '../utils/websocket-helpers'
import { DEBUG_MODE } from '../utils/turn-completion'
import { connectionStates } from '../rate-limiting/websocket-rate-limiter'
import { loadConversationHistory } from '../context/conversation-history'
import { syncVoiceToOrchestrator } from '../context/orchestrator-sync'
import { buildLiveConfig } from '../live-api/config-builder'
import { createLiveApiClient, getLiveApiModel } from '../live-api/session-manager'
import { processToolCall } from '../live-api/tool-processor'
import { MESSAGE_TYPES } from '../message-types'
import { VOICE_CONFIG } from 'src/config/constants'
import { normalizeSessionId } from 'src/core/session/session-coordinator'
import type { StartPayload } from '../message-payload-types'
import type { SessionLogger } from '../session-logger'
import { logger } from 'src/lib/logger'

// Visual trigger + throttle configuration
const VISUAL_TRIGGER_WORDS = VOICE_CONFIG.VISUAL_TRIGGERS
const VISUAL_INJECT_THROTTLE_MS = VOICE_CONFIG.VISUAL_INJECT_THROTTLE_MS

// Helper function for BCP47 language code validation
function isBcp47(s?: string): boolean {
  return typeof s === 'string' && /^[A-Za-z]{2,3}(-[A-Za-z]{2}|-[A-Za-z]{4})?(-[A-Za-z]{2}|-[0-9]{3})?$/.test(s)
}

// Active session record type
type Snapshot = {
  analysis: string
  capturedAt: number
  imageData?: string
  lastInjected?: number
  lastPersisted?: number
}

export type ActiveSessionRecord = {
  ws: WebSocket
  session: any
  sessionId?: string
  latestContext: {
    screen?: Snapshot
    webcam?: Snapshot
  }
  injectionTimers?: {
    screen?: ReturnType<typeof setTimeout>
    webcam?: ReturnType<typeof setTimeout>
  }
  logger?: SessionLogger
  turnCompletionTimer?: ReturnType<typeof setTimeout>
  lastAudioActivity?: number
  audioChunkCount?: number
  userTurnCount?: number
  lastAssistantText?: string
  lastInputTranscript?: string
  lastOutputTranscript?: string
  orchestratorSyncInFlight?: boolean
  lastOrchestratorSyncTurn?: number
}

export interface StartHandlerDependencies {
  activeSessions: Map<string, ActiveSessionRecord>
  sessionStarting: Set<string>
  closingForRestart: Set<string>
  noSessionWarned: Set<string>
}

async function triggerOrchestratorSync(
  client: ActiveSessionRecord | undefined,
  connectionId: string,
  reason: string,
  turnCount?: number
): Promise<void> {
  if (!client?.sessionId) {
    return
  }

  if (typeof turnCount === 'number') {
    if (client.lastOrchestratorSyncTurn === turnCount) {
      return
    }
    client.lastOrchestratorSyncTurn = turnCount
  }

  if (client.orchestratorSyncInFlight) {
    serverLogger.debug('Skipping orchestrator sync; already in flight', { connectionId, reason })
    return
  }

  client.orchestratorSyncInFlight = true
  try {
    await syncVoiceToOrchestrator(client.sessionId, connectionId, client)
  } catch (error) {
    serverLogger.warn('Orchestrator sync failed', {
      connectionId,
      reason,
      error: error instanceof Error ? { name: error.name, message: error.message } : String(error)
    })
  } finally {
    client.orchestratorSyncInFlight = false
  }
}

/**
 * Handle START message - initialize Live API session
 */
export async function handleStart(
  connectionId: string,
  ws: WebSocket,
  payload: StartPayload,
  deps: StartHandlerDependencies
): Promise<void> {
  const { activeSessions, sessionStarting, closingForRestart, noSessionWarned } = deps

  serverLogger.info('handleStart called', { connectionId, payload: JSON.stringify(payload) })

  const st = connectionStates.get(connectionId)
  if (st) st.isReady = false

  // client gone already
  if (ws.readyState !== WebSocket.OPEN) {
    serverLogger.warn('Client socket not open when handleStart triggered', { connectionId })
    return
  }

  // Acknowledge start immediately so client doesn't timeout
  safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.START_ACK, payload: { connectionId } }))

  // Prevent concurrent starts
  if (sessionStarting.has(connectionId)) {
    serverLogger.info('start() already in progress; skipping duplicate call', { connectionId })
    return
  }
  sessionStarting.add(connectionId)

  // Close existing session if any
  if (activeSessions.has(connectionId) && !closingForRestart.has(connectionId) && !sessionStarting.has(connectionId)) {
    serverLogger.info('Session already exists. Closing old one', { connectionId })
    try {
      closingForRestart.add(connectionId)
      activeSessions.get(connectionId)?.session?.close?.()
    } catch (error) {
      serverLogger.warn('Failed to close previous session', { connectionId, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
    }
  }

  // Mock disabled: always use Live API

  try {
    const { getResolvedGeminiApiKey } = await import('../../src/config/env')
    getResolvedGeminiApiKey()
  } catch {
    serverLogger.error('FATAL: Gemini API key not configured', undefined, { connectionId })
    safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message: 'Gemini API key not configured on server.' } }))
    sessionStarting.delete(connectionId)
    return
  }

  try {
    const requestedLang = isBcp47(payload?.languageCode) ? payload.languageCode : undefined
    const lang = requestedLang || 'en-US'
    const requestedVoice = typeof payload?.voiceName === 'string' ? payload.voiceName : undefined
    const voiceName = requestedVoice || VOICE_CONFIG.BY_LANG[lang as keyof typeof VOICE_CONFIG.BY_LANG] || VOICE_CONFIG.DEFAULT_VOICE
    const sessionId = normalizeSessionId(payload?.sessionId)

    // DEBUG: Log voice selection for production debugging
    serverLogger.info('Voice selection', {
      connectionId,
      requestedLang,
      lang,
      requestedVoice,
      selectedVoice: voiceName,
      defaultVoice: VOICE_CONFIG.DEFAULT_VOICE,
      byLangFallback: VOICE_CONFIG.BY_LANG[lang as keyof typeof VOICE_CONFIG.BY_LANG]
    })

    const priorChatContext = await loadConversationHistory(sessionId, connectionId)

    // Create Live API client with proper credential handling
    const ai = await createLiveApiClient(connectionId)
    const model = getLiveApiModel()

    // Check if we have credentials (either API key or service account)
    const hasApiKey = !!process.env.GEMINI_API_KEY || !!process.env.GOOGLE_GENERATIVE_AI_API_KEY || !!process.env.GOOGLE_API_KEY
    const hasServiceAccount = !!process.env.GOOGLE_APPLICATION_CREDENTIALS

    serverLogger.info('Connecting to Live API with model', {
      connectionId,
      model,
      hasApiKey,
      hasServiceAccount,
      usingServiceAccount: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
    })

    let isOpen = false

    // Build Live API configuration (now async with sessionId)
    serverLogger.info('Building Live API config...', { connectionId, hasLocation: Boolean(payload.locationData) })
    const liveConfig = await buildLiveConfig(sessionId, priorChatContext, voiceName, payload.userContext, payload.locationData)
    serverLogger.info('Live API config built', { connectionId, hasConfig: !!liveConfig, responseModalities: liveConfig?.responseModalities })

    // Add connection timeout to prevent infinite hangs
    const connectTimeout = new Promise<never>((_, reject) => {
      setTimeout(() => {
        serverLogger.error('Live API connection timeout after 30s', undefined, { connectionId, model })
        reject(new Error('Live API connection timeout after 30s'))
      }, 30000)
      // Store timeout ID for potential cleanup (though we can't access it after Promise.race)
    })

    let session: any
    const connectStartTime = Date.now()
    try {
      serverLogger.info('Calling ai.live.connect()...', { connectionId, model, configKeys: Object.keys((liveConfig || {}) as Record<string, unknown>) })
      session = await Promise.race([
        ai.live.connect({
          model,
          config: liveConfig,
          callbacks: {
            onopen: () => {
              isOpen = true
              serverLogger.info('Live API session opened', { connectionId })
              activeSessions.get(connectionId)?.logger?.log('live_open')
            },
            onmessage: (message: any) => {
              void (async () => {
                try {
                // Log EVERY message from Gemini for comprehensive debugging
                if (DEBUG_MODE) {
                  serverLogger.debug('GEMINI MESSAGE', { connectionId, message: JSON.stringify(message, null, 2) })
                }

                // Setup complete
                if (message?.setupComplete) {
                  if (DEBUG_MODE) {
                    serverLogger.debug('SETUP COMPLETE', { connectionId, details: JSON.stringify(message.setupComplete, null, 2) })
                  }
                  safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SETUP_COMPLETE, payload: { setupComplete: true } }))
                  activeSessions.get(connectionId)?.logger?.log('setup_complete')

                  // Setup completion confirms readiness - ensure isReady is set
                  // (It should already be true from session_started, but confirm here)
                  const state = ensureConnectionState(connectionId, {
                    handler: 'handleStart',
                    phase: 'setup_complete',
                    additionalContext: {
                      sessionId: sessionId || 'anonymous',
                      hasActiveSession: !!activeSessions.get(connectionId)
                    }
                  })
                  
                  if (!state.isReady) {
                    // Should already be true, but ensure it's set
                    state.isReady = true
                    serverLogger.info('Marked session as ready during setup_complete', { connectionId })
                  }
                  
                  const now = Date.now()

                  // Send session_ready event (already marked ready, but confirm with client)
                  const sessionReadyPayload = JSON.stringify({
                    type: 'session_ready',
                    data: { sessionId, timestamp: now }
                  })
                  serverLogger.info('Sending session_ready event after setup completion', {
                    connectionId,
                    sessionId: sessionId || 'anonymous',
                    isReady: connectionStates.get(connectionId)?.isReady
                  })
                  safeSend(ws, sessionReadyPayload)
                  activeSessions.get(connectionId)?.logger?.log('session_ready')
                }

                // Tool calls
                if (message?.toolCall) {
                  const handled = await processToolCall(connectionId, ws, message.toolCall, activeSessions)
                  if (handled) {
                    return // Tool call handled by processor, exit early
                  }
                }

                const serverContent = message?.serverContent
                if (!serverContent) {
                  // Log what we received if no serverContent
                  if (DEBUG_MODE) {
                    serverLogger.debug('NO SERVER CONTENT', { connectionId, messageKeys: Object.keys((message || {}) as Record<string, unknown>) })
                  }
                  return
                }

                // Log server content structure for debugging (only key info, not full JSON)
                const hasModelTurn = !!serverContent.modelTurn
                const partsCount = serverContent.modelTurn?.parts?.length || 0
                const hasAudioParts = serverContent.modelTurn?.parts?.some((p: any) => p.inlineData?.data) || false
                if (DEBUG_MODE) {
                  serverLogger.debug('SERVER CONTENT', {
                    connectionId,
                    hasModelTurn,
                    partsCount,
                    hasAudioParts
                  })
                }

                if (serverContent.modelTurn && DEBUG_MODE) {
                  serverLogger.debug('MODEL TURN', {
                    connectionId,
                    hasparts: !!serverContent.modelTurn.parts,
                    partsLength: serverContent.modelTurn.parts?.length,
                    partTypes: serverContent.modelTurn.parts?.map((p: any) => ({
                      hasText: !!p.text,
                      hasInlineData: !!p.inlineData,
                      inlineDataKeys: p.inlineData ? Object.keys(p.inlineData as Record<string, unknown>) : []
                    }))
                  })
                }

                // Transcriptions
                if (serverContent.inputTranscription) {
                  const text = serverContent.inputTranscription.text
                  const isFinal = (serverContent.inputTranscription).isFinal ?? false

                  // Track latest transcript for persistence on turn_complete
                  const client = activeSessions.get(connectionId)
                  if (client && text && text.trim().length > 0) {
                    client.lastInputTranscript = text
                  }

                  // Filter out noise and garbage
                  if (text.includes('<noise>') || text.trim().length <= 1) {
                    if (DEBUG_MODE) {
                      serverLogger.debug('Ignored noise/garbage transcript', { connectionId, text })
                    }
                    return
                  }

                  // Compat: include both isFinal and final to support older clients
                  safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.INPUT_TRANSCRIPT, payload: { text, isFinal, final: isFinal } }))
                  activeSessions.get(connectionId)?.logger?.log('input_transcript', { text, isFinal })

                  // Track conversation turn for export (when final)
                  if (isFinal) {
                    const sessionClient = activeSessions.get(connectionId)
                    let turnCount: number | undefined
                    if (sessionClient?.sessionId) {
                      try {
                        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
                        await multimodalContextManager.addConversationTurn(sessionClient.sessionId, {
                          role: 'user',
                          text,
                          isFinal: true,
                          modality: 'voice'
                        })
                        if (text && text.trim().length > 0) {
                          await multimodalContextManager.addVoiceTranscript(
                            sessionClient.sessionId,
                            text as string,
                            'user',
                            true
                          )
                        }

                        sessionClient.userTurnCount = (sessionClient.userTurnCount || 0) + 1
                        turnCount = sessionClient.userTurnCount
                      } catch (err) {
                        serverLogger.warn('Failed to track user voice turn', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
                      }
                    }

                    await triggerOrchestratorSync(sessionClient, connectionId, 'final_user_transcript', turnCount)
                  }

                  // Heuristic: if the user explicitly references visual context, inject latest snapshot
                  if (isFinal) {
                    try {
                      const transcript = String(text || '').toLowerCase()
                      const visualTriggers = VISUAL_TRIGGER_WORDS
                      if (visualTriggers.some((w: string) => transcript.includes(w))) {
                        const clientRec = activeSessions.get(connectionId)
                        const snap = clientRec?.latestContext?.screen || clientRec?.latestContext?.webcam
                        if (clientRec && snap) {
                          const now = Date.now()
                          if (typeof snap.lastInjected === 'number' && snap.lastInjected > now - VISUAL_INJECT_THROTTLE_MS) {
                            serverLogger.info('Visual trigger detected but recent injection exists; skipping', { connectionId })
                            clientRec.logger?.log('context_injection_skipped', { reason: 'recent_injection', throttleMs: VISUAL_INJECT_THROTTLE_MS })
                          } else {
                            // Use sendRealtimeInput for visual context injection
                            if (typeof clientRec.session.sendRealtimeInput === 'function') {
                              // Send image first if available
                              if (snap.imageData) {
                                const base64Data = snap.imageData.replace(/^data:image\/\w+;base64,/, '')
                                await clientRec.session.sendRealtimeInput({
                                  media: { mimeType: 'image/jpeg', data: base64Data }
                                })
                              }
                              // CRITICAL: sendRealtimeInput() does NOT accept text - only audio/video media
                              // Sending text causes error 1007. Text context should be in systemInstruction.
                              // Skip text injection here - it's already included in the session config
                              // Only send image if available
                            } else {
                              throw new Error('sendRealtimeInput not available')
                            }
                            snap.lastInjected = now
                            serverLogger.info('Injected visual context due to transcript trigger', { connectionId })
                            clientRec.logger?.log('context_injected', { modality: clientRec.latestContext?.screen ? 'screen' : 'webcam', hadImage: Boolean(snap.imageData), analysisSnippet: snap.analysis?.slice(0, 200) })
                          }
                        } else {
                          serverLogger.info('Visual trigger detected but no latestContext available', { connectionId })
                          clientRec?.logger?.log('context_injection_skipped', { reason: 'no_latest_context' })
                        }
                      }
                    } catch (err) {
                      serverLogger.error('Visual trigger injection failed', err instanceof Error ? err : undefined, { connectionId })
                      activeSessions.get(connectionId)?.logger?.log('error', { where: 'visual_trigger_injection', message: err instanceof Error ? err.message : String(err) })
                    }
                  }
                }
                if (serverContent.outputTranscription) {
                  const text = serverContent.outputTranscription.text
                  const isFinal = (serverContent.outputTranscription).isFinal ?? false

                  // Track latest transcript for persistence on turn_complete
                  const client = activeSessions.get(connectionId)
                  if (client && text && text.trim().length > 0) {
                    client.lastOutputTranscript = text
                  }

                  // Compat: include both isFinal and final to support older clients
                  safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.OUTPUT_TRANSCRIPT, payload: { text, isFinal, final: isFinal } }))
                  activeSessions.get(connectionId)?.logger?.log('output_transcript', { text, isFinal })

                  // Track conversation turn for export (when final)
                  if (isFinal) {
                    const sessionClient = activeSessions.get(connectionId)
                    if (sessionClient?.sessionId) {
                      try {
                        const { multimodalContextManager } = await import('src/core/context/multimodal-context')
                        await multimodalContextManager.addConversationTurn(sessionClient.sessionId, {
                          role: 'agent',
                          text,
                          isFinal: true,
                          modality: 'voice'
                        })
                        if (text && text.trim().length > 0) {
                          await multimodalContextManager.addVoiceTranscript(
                            sessionClient.sessionId,
                            text as string,
                            'assistant',
                            true
                          )
                        }
                      } catch (err) {
                        serverLogger.warn('Failed to track AI voice turn', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
                      }
                    }
                  }
                }

                // Text + audio parts
                if (serverContent.modelTurn?.parts) {
                  for (const part of serverContent.modelTurn.parts) {
                    // Skip internal thoughts - these are not meant for the user
                    if (part.thought === true) {
                      if (DEBUG_MODE) {
                        serverLogger.debug('MODEL THOUGHT - Skipping internal thought', {
                          connectionId,
                          textPreview: part.text?.substring(0, 100)
                        })
                      }
                      activeSessions.get(connectionId)?.logger?.log('model_thought_skipped', { textPreview: part.text?.substring(0, 100) })
                      continue
                    }

                    if (part.text) {
                      if (DEBUG_MODE) {
                        serverLogger.debug('MODEL TEXT - Received text', { connectionId, text: part.text })
                      }
                      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TEXT, payload: { content: part.text } }))
                      activeSessions.get(connectionId)?.logger?.log('model_text', { text: part.text })
                    }
                    if (part.inlineData?.data) {
                      const audioBase64 = part.inlineData.data
                      const audioBytes = Math.floor((audioBase64.length || 0) * 0.75)
                      if (DEBUG_MODE) {
                        serverLogger.debug('MODEL AUDIO - Received audio chunk', {
                          connectionId,
                          size: audioBytes,
                          base64Length: audioBase64.length
                        })
                      }

                      // Forward audio to client
                      safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.AUDIO, payload: { audioData: audioBase64, mimeType: 'audio/pcm;rate=24000' } }))
                      activeSessions.get(connectionId)?.logger?.log('audio_chunk', { direction: 'server_to_client', bytes: audioBytes, mimeType: 'audio/pcm;rate=24000' })

                      // Log success
                      if (DEBUG_MODE) {
                        serverLogger.debug('Audio chunk forwarded to client via WebSocket', { connectionId })
                      }
                    } else if (part.inlineData) {
                      // Has inlineData but no data field - log structure for debugging
                      if (DEBUG_MODE) {
                        serverLogger.debug('MODEL PART - Has inlineData but no data field', {
                          connectionId,
                          keys: Object.keys((part.inlineData || {}) as Record<string, unknown>)
                        })
                      }
                    }
                  }
                }

                if (serverContent.turnComplete) {
                  safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.TURN_COMPLETE, payload: { turnComplete: true } }))
                  activeSessions.get(connectionId)?.logger?.log('turn_complete')
                  // Clear any pending turn completion timer since we received a real one
                  const client = activeSessions.get(connectionId)
                  if (client?.turnCompletionTimer) {
                    clearTimeout(client.turnCompletionTimer)
                    delete client.turnCompletionTimer
                    serverLogger.info('Cleared turn completion timer (received from Live API)', { connectionId })
                  }

                  // Persist last input transcript as final (when turn_complete fires)
                  if (client?.lastInputTranscript && client.sessionId) {
                    try {
                      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context')
                      await multimodalContextManager.addVoiceTranscript(
                        client.sessionId,
                        client.lastInputTranscript,
                        'user',
                        true
                      )
                      await multimodalContextManager.addConversationTurn(client.sessionId, {
                        role: 'user',
                        text: client.lastInputTranscript,
                        isFinal: true,
                        modality: 'voice'
                      })
                      delete client.lastInputTranscript // Clear after persisting
                    } catch (err) {
                      serverLogger.warn('Failed to persist final input transcript', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
                    }
                  }

                  // Persist last output transcript as final (when turn_complete fires)
                  if (client?.lastOutputTranscript && client.sessionId) {
                    try {
                      const { multimodalContextManager } = await import('../../src/core/context/multimodal-context')
                      await multimodalContextManager.addVoiceTranscript(
                        client.sessionId,
                        client.lastOutputTranscript,
                        'assistant',
                        true
                      )
                      await multimodalContextManager.addConversationTurn(client.sessionId, {
                        role: 'agent',
                        text: client.lastOutputTranscript,
                        isFinal: true,
                        modality: 'voice'
                      })
                      delete client.lastOutputTranscript // Clear after persisting
                    } catch (err) {
                      serverLogger.warn('Failed to persist final output transcript', { connectionId, error: err instanceof Error ? { name: err.name, message: err.message, stack: err.stack } : String(err) })
                    }
                  }

                  // No additional milestone tracking here; sync handled during final transcript events
                }
              } catch (err) {
                serverLogger.error('Live message handler error', err instanceof Error ? err : undefined, { connectionId })
                activeSessions.get(connectionId)?.logger?.log('error', { where: 'live_onmessage', message: err instanceof Error ? err.message : String(err) })
              }
            })();
            },
            onerror: (error: any) => {
              const message = error?.message || (error instanceof Error ? error.message : 'Live API error')
              const code = (error && (error.code || error.status)) || undefined
              serverLogger.error('Live API error', error instanceof Error ? error : undefined, { connectionId, message, code })
              safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.ERROR, payload: { message, code } }))
              activeSessions.get(connectionId)?.logger?.log('error', { where: 'live_api', message, code })
            },
            onclose: (event: any) => {
              isOpen = false
              const closeDetails = {
                code: event?.code,
                reason: event?.reason,
                wasClean: event?.wasClean,
                timestamp: new Date().toISOString(),
                hadError: Boolean(event?.error)
              }
              serverLogger.error('Live API session closed', undefined, { connectionId, ...closeDetails })
              const rec = activeSessions.get(connectionId)
              rec?.logger?.log('session_closed', { source: 'live_api', ...closeDetails })
              rec?.logger?.close()
              activeSessions.delete(connectionId)
              noSessionWarned.delete(connectionId)
              // If we're intentionally restarting a session, don't emit session_closed to the client
              if (closingForRestart.has(connectionId)) {
                closingForRestart.delete(connectionId)
              } else {
                safeSend(ws, JSON.stringify({ type: MESSAGE_TYPES.SESSION_CLOSED, payload: { reason: 'live_api_closed' } }))
              }
            }
          }
        }),
        connectTimeout
      ])
      const connectDuration = Date.now() - connectStartTime
      serverLogger.info('Live API connect() completed', { connectionId, durationMs: connectDuration, isOpen })
    } catch (connectError) {
      const connectDuration = Date.now() - connectStartTime
      serverLogger.error('Live API connection failed', connectError instanceof Error ? connectError : undefined, {
        connectionId,
        model,
        durationMs: connectDuration,
        errorMessage: connectError instanceof Error ? connectError.message : String(connectError),
        errorStack: connectError instanceof Error ? connectError.stack : undefined
      })
      throw connectError
    }

    // Apply compatibility shim for session.start() method
    // Gemini Live API session is already active on connect(), but some code expects a start() method
    if (typeof session.start !== 'function') {
      session.start = () => {
        // No-op. Session is already active on connect.
        // Removed async/await as it's not needed for a no-op
      }
    }

    // Convenience helpers
    session.isOpen = () => isOpen
    session.waitUntilOpen = async (retries = 50, delayMs = 50) => {
      for (let i = 0; i < retries; i++) {
        if (isOpen) return
        await new Promise((r) => setTimeout(r, delayMs))
      }
      if (!isOpen) throw new Error('Live session failed to open in time')
    }

    serverLogger.info('Live API session established and ready', { connectionId })

    // If the client WebSocket closed while we were connecting to the Live API,
    // do not proceed. Close the Live session to avoid orphaned sessions and bail.
    if (ws.readyState !== WebSocket.OPEN) {
      serverLogger.warn('Client socket closed before session ready; closing Live session', { connectionId })
      try { (session)?.close?.() } catch {
        // Ignore errors when closing session
      }
      activeSessions.delete(connectionId)
      sessionStarting.delete(connectionId)
      return
    }

    {
      const prev = activeSessions.get(connectionId)
      activeSessions.set(connectionId, { 
        ws, 
        session, 
        sessionId, 
        latestContext: prev?.latestContext || {}, 
        ...(prev?.injectionTimers ? { injectionTimers: prev.injectionTimers } : {}),
        ...(prev?.logger ? { logger: prev.logger } : {})
      })
    }
    serverLogger.info('Live API session established for sessionId', { connectionId, sessionId: sessionId || 'anonymous' })

    // Set isReady to true BEFORE sending session_started to avoid race condition
    // The session is effectively ready once the Live API connection is established
    const state = ensureConnectionState(connectionId, {
      handler: 'handleStart',
      phase: 'session_started',
      additionalContext: {
        sessionId: sessionId || 'anonymous',
        model,
        hasActiveSession: !!activeSessions.get(connectionId),
        isOpen
      }
    })
    
    state.isReady = true
    serverLogger.info('Session marked as ready before session_started event', { connectionId })

    // Send session started message to client
    const sessionStartedPayload = JSON.stringify({ type: MESSAGE_TYPES.SESSION_STARTED, payload: { connectionId, languageCode: lang, voiceName } })
    logger.debug('[SERVER] Sending session_started event', {
      connectionId,
      languageCode: lang,
      voiceName,
      wsReadyState: ws.readyState,
      isOpen: ws.readyState === WebSocket.OPEN,
      isReady: state?.isReady ?? true,
      payload: sessionStartedPayload
    })
    safeSend(ws, sessionStartedPayload)
    activeSessions.get(connectionId)?.logger?.log('session_started', { languageCode: lang, voiceName })

    // Note: setup_complete will still arrive later, but we mark ready now to prevent race conditions
  } catch (error) {
    let message = error instanceof Error ? error.message : 'Failed to start session'
    let errorCode = 'SESSION_START_FAILED'

    // Detect common API errors and provide better error messages
    const errorStr = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

    if (errorStr.includes('api key') || errorStr.includes('authentication') || errorStr.includes('unauthorized') || errorStr.includes('401')) {
      message = 'API key authentication failed. Please check your Gemini API key configuration.'
      errorCode = 'API_KEY_INVALID'
    } else if (errorStr.includes('quota') || errorStr.includes('429') || errorStr.includes('rate limit')) {
      message = 'API quota exceeded or rate limited. Please try again later.'
      errorCode = 'QUOTA_EXCEEDED'
    } else if (errorStr.includes('timeout') || errorStr.includes('timed out')) {
      message = 'Connection to Gemini API timed out. The service may be slow or unavailable.'
      errorCode = 'CONNECTION_TIMEOUT'
    } else if (errorStr.includes('expired') || errorStr.includes('expire')) {
      message = 'API key has expired. Please renew your Gemini API key.'
      errorCode = 'API_KEY_EXPIRED'
    }

    serverLogger.error('Failed to start Live API session', error instanceof Error ? error : undefined, {
      connectionId,
      errorCode,
      errorMessage: message,
      originalError: error instanceof Error ? error.message : String(error)
    })

    // Always try to send error if WebSocket is still open
    if (ws.readyState === WebSocket.OPEN) {
      try {
        safeSend(ws, JSON.stringify({
          type: MESSAGE_TYPES.ERROR,
          payload: { message, code: errorCode }
        }))
        serverLogger.info('Error message sent to client', { connectionId, errorCode, message })
      } catch (sendError) {
        serverLogger.error('Failed to send error to client', sendError instanceof Error ? sendError : undefined, { connectionId })
      }
    } else {
      serverLogger.warn('Cannot send error to client - WebSocket not open', { connectionId, wsState: ws.readyState })
    }
    activeSessions.get(connectionId)?.logger?.log('error', { where: 'handleStart', message, errorCode })
  } finally {
    sessionStarting.delete(connectionId)
  }
}
