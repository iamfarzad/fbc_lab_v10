import { useCallback } from 'react'
import { useRealtimeVoice, type UseRealtimeVoiceOptions } from './useRealtimeVoice'
import type { VoiceContextUpdate } from 'src/types/voice'
import type { LiveClientWS } from 'src/core/live/client'
import type { AttachmentUploadResponse } from 'src/types/api-responses'
import type { ScreenAnalysisResponse, WebcamAnalysisResponse } from 'src/types/api-responses'
import type { MediaAnalysisResult } from 'src/types/media-analysis'
import { useVoiceContext } from './voice-context'
import { parseJsonResponse } from 'src/lib/json'

export type UseVoiceOptions = UseRealtimeVoiceOptions & {
  liveClient?: LiveClientWS
  sessionId?: string
}

export type UseVoiceReturn = ReturnType<typeof useRealtimeVoice> & {
  sendScreenShareMessage: (
    imageBase64: string,
    prompt: string,
    opts?: { sessionId?: string; voiceConnectionId?: string; type?: 'screen' | 'document' }
  ) => Promise<{ analysis?: string; ok: boolean }>
  sendWebcamAnalyze: (
    blob: Blob,
    opts?: { sessionId?: string; voiceConnectionId?: string }
  ) => Promise<{ analysis?: string; ok: boolean }>
  uploadAttachments: (files: File[], sessionId: string) => Promise<AttachmentUploadResponse>
  sendRealtimeInput: (chunks: Array<{ mimeType: string; data: string }>) => void
  sendContextUpdate: (update: VoiceContextUpdate) => void
}

function useVoiceInstance(options: UseVoiceOptions = {}): UseVoiceReturn {
  const { sessionId, ...realtimeOptions } = options
  
  const realtime = useRealtimeVoice({ 
    ...realtimeOptions, 
    ...(sessionId ? { sessionId } : {}),
  })

  const sendScreenShareMessage = useCallback(
    async (
      imageBase64: string,
      prompt: string,
      opts?: { sessionId?: string; voiceConnectionId?: string; type?: 'screen' | 'document' }
    ): Promise<{ analysis?: string; ok: boolean }> => {
      try {
        const { routeImageAnalysis } = await import('src/lib/services/router-helpers')
        const normalizedImage = imageBase64.startsWith('data:')
          ? imageBase64
          : `data:image/jpeg;base64,${imageBase64}`

        const { response } = await routeImageAnalysis(normalizedImage, {
          modality: opts?.type === 'document' ? 'image' : (opts?.type ?? 'screen'),
          userIntent: prompt,
          ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
        })

        const data = response as MediaAnalysisResult
        const analysis = data?.analysis || data?.summary
        
        if (analysis) {
          return { ok: true, analysis }
        }
        return { ok: true }
      } catch (error) {
        console.error('Router-based screen analysis failed, falling back to direct call', error)
        const body = {
          image: imageBase64.startsWith('data:')
            ? imageBase64
            : `data:image/jpeg;base64,${imageBase64}`,
          type: opts?.type ?? 'screen',
          context: {
            prompt,
            trigger: realtime.isSessionActive ? 'voice' : 'manual',
          },
        }

        const response = await fetch('/api/tools/screen', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(opts?.sessionId ? { 'x-intelligence-session-id': opts.sessionId } : {}),
            ...(opts?.voiceConnectionId ? { 'x-voice-connection-id': opts.voiceConnectionId } : {}),
          },
          body: JSON.stringify(body),
        })

        if (!response.ok) {
          return { ok: false }
        }
        const data = await parseJsonResponse<ScreenAnalysisResponse>(
          response,
          {} as ScreenAnalysisResponse
        )
        const analysis = data?.output?.analysis || data?.analysis
        if (analysis) {
          return { ok: true, analysis }
        }
        return { ok: true }
      }
    },
    [realtime.isSessionActive]
  )

  const sendWebcamAnalyze = useCallback(
    async (
      blob: Blob,
      opts?: { sessionId?: string; voiceConnectionId?: string; userIntent?: string }
    ): Promise<{ analysis?: string; ok: boolean }> => {
      try {
        const imageBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            resolve(result)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })

        const { routeImageAnalysis } = await import('src/lib/services/router-helpers')
        const { response } = await routeImageAnalysis(imageBase64, {
          modality: 'webcam',
          ...(opts?.userIntent ? { userIntent: opts.userIntent } : {}),
          previousRoute: 'webcam',
          ...(opts?.sessionId ? { sessionId: opts.sessionId } : {}),
        })

        const data = response as MediaAnalysisResult
        const analysis = data?.analysis || data?.summary
        
        if (analysis) {
          return { ok: true, analysis }
        }
        return { ok: true }
      } catch (error) {
        console.error('Router-based webcam analysis failed, falling back to direct call', error)
        const formData = new FormData()
        formData.append('webcamCapture', blob, `webcam-${Date.now()}.jpg`)
        const response = await fetch('/api/tools/webcam', {
          method: 'POST',
          headers: {
            ...(opts?.sessionId ? { 'x-intelligence-session-id': opts.sessionId } : {}),
            ...(opts?.voiceConnectionId ? { 'x-voice-connection-id': opts.voiceConnectionId } : {}),
          },
          body: formData,
        })
        if (!response.ok) return { ok: false }
        const data = await parseJsonResponse<WebcamAnalysisResponse>(
          response,
          {} as WebcamAnalysisResponse
        )
        const analysis = data?.analysis || data?.output?.analysis
        if (analysis) {
          return { ok: true, analysis }
        }
        return { ok: true }
      }
    },
    []
  )

  const uploadAttachments = useCallback(
    async (files: File[], sessionId: string): Promise<AttachmentUploadResponse> => {
      const formData = new FormData()
      formData.append('sessionId', sessionId)
      files.forEach((file) => formData.append('files', file, file.name))

      const response = await fetch('/api/chat/attachments', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) return { ok: false, attachments: [], error: 'Upload failed' }
      const data = await parseJsonResponse<AttachmentUploadResponse>(
        response,
        { ok: false, attachments: [], error: 'Upload failed' }
      )
      if (!data?.ok) return { ok: false, attachments: [], error: data?.error || 'Upload error' }
      const result: AttachmentUploadResponse = { ok: true, attachments: data.attachments }
      if (data.prompt) {
        result.prompt = data.prompt
      }
      return result
    },
    []
  )

  const directSendRealtimeInput = useCallback(
    (chunks: Array<{ mimeType: string; data: string }>) => {
      if (options?.liveClient) {
        options.liveClient.sendRealtimeInput(chunks)
      } else {
        realtime.sendRealtimeInput(chunks)
      }
    },
    [options?.liveClient, realtime]
  )

  const directSendContextUpdate = useCallback(
    (update: VoiceContextUpdate) => {
      if (options?.liveClient) {
        const contextUpdate: {
          modality: 'webcam' | 'screen' | 'intelligence'
          analysis: string
          imageData?: string
          capturedAt?: number
          sessionId?: string
        } = {
          modality: update.modality,
          analysis: update.analysis as string,
        }
        if (update.imageData) {
          contextUpdate.imageData = update.imageData
        }
        if (update.capturedAt) {
          contextUpdate.capturedAt = update.capturedAt
        }
        if (update.sessionId) {
          contextUpdate.sessionId = update.sessionId
        }
        options.liveClient.sendContextUpdate(contextUpdate)
      } else {
        realtime.sendContextUpdate(update)
      }
    },
    [options?.liveClient, realtime]
  )

  return {
    ...realtime,
    sendScreenShareMessage,
    sendWebcamAnalyze,
    uploadAttachments,
    sendRealtimeInput: directSendRealtimeInput,
    sendContextUpdate: directSendContextUpdate,
  }
}

export function useVoice(options: UseVoiceOptions = {}): UseVoiceReturn {
  const shared = useVoiceContext()
  
  const shouldSkipAudioPlayer = Boolean(shared)
  const instance = useVoiceInstance({
    ...options,
    skipAudioPlayer: options.skipAudioPlayer ?? shouldSkipAudioPlayer,
  })
  
  return shared ?? instance
}

export function useVoiceProviderValue(options: UseVoiceOptions = {}): UseVoiceReturn {
  return useVoiceInstance(options)
}

