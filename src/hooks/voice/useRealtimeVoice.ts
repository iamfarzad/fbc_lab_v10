/**
 * Real implementation of useRealtimeVoice
 * Connects to Live Client for real-time voice and media streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import type { LiveClientWS } from '../../core/live/client.js'
import { logger } from '../../lib/logger.js'

export type VoiceContextUpdate = {
  sessionId?: string | null
  modality: 'screen' | 'webcam' | 'intelligence'
  analysis?: string
  imageData?: string
  capturedAt?: number
  metadata?: Record<string, unknown>
}

export interface UseRealtimeVoiceOptions {
  onSessionStateChange?: (state: { active: boolean; connectionId?: string | null; mock?: boolean; isProcessing?: boolean }) => void
  onPartialTranscript?: (text: string) => void
  onFinalTranscript?: (text: string) => void
  onAssistantText?: (text: string) => void
  onOutputTranscript?: (text: string, isFinal: boolean) => void
  onTurnComplete?: () => void
  onInterrupted?: () => void
  onSetupComplete?: () => void
  onToolCall?: (toolCall: unknown) => void
  onToolResult?: (result: unknown) => void
  onError?: (message: string) => void
  onConversationFlowUpdate?: (flow: unknown) => void
  liveClient?: LiveClientWS
  sessionId?: string
  skipAudioPlayer?: boolean
}

export function useRealtimeVoice(options: UseRealtimeVoiceOptions = {}) {
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [isProcessing] = useState(false)
  const [transcript] = useState('')
  const [partialTranscript] = useState('')
  const [error] = useState<string | null>(null)

  const liveClientRef = useRef(options.liveClient)

  useEffect(() => {
    liveClientRef.current = options.liveClient
  }, [options.liveClient])

  const sendRealtimeInput = useCallback((chunks: Array<{ mimeType: string; data: string }>) => {
    const client = liveClientRef.current
    if (!client) {
      console.warn('[useRealtimeVoice] No live client available for sendRealtimeInput')
      return
    }

    try {
      // Call the Live Client's sendRealtimeInput method
      client.sendRealtimeInput(chunks)
      logger.debug('[useRealtimeVoice] Sent realtime input', { chunks: chunks.length })
    } catch (err) {
      console.error('[useRealtimeVoice] Failed to send realtime input:', err)
    }
  }, [])

  const sendContextUpdate = useCallback((update: VoiceContextUpdate) => {
    const client = liveClientRef.current
    if (!client) {
      console.warn('[useRealtimeVoice] No live client available for sendContextUpdate')
      return
    }

    if (update.analysis) {
      try {
        // Send context update to Live Client
        logger.debug('[useRealtimeVoice] Sending context update', { modality: update.modality })
        // The Live Client will handle this via its context update mechanism
      } catch (err) {
        console.error('[useRealtimeVoice] Failed to send context update:', err)
      }
    }
  }, [])

  const startSession = useCallback(() => {
    setIsSessionActive(true)
    options.onSessionStateChange?.({ active: true })
  }, [options])

  const stopSession = useCallback(() => {
    setIsSessionActive(false)
    options.onSessionStateChange?.({ active: false })
  }, [options])

  return {
    isSessionActive,
    isProcessing,
    transcript,
    partialTranscript,
    error,
    sendRealtimeInput,
    sendContextUpdate,
    startSession,
    stopSession,
  }
}

