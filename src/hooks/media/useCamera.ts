/**
 * Unified Camera Hook
 * Consolidates camera capture logic for both mobile and desktop
 * Fixes black frame issue with proper readyState checking
 * Implements resource management and memory optimization
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'
import { blobToBase64 } from '../../lib/utils.js'
import { getLiveClientSingleton } from '../../core/live/client.js'
import { WEBSOCKET_CONFIG, RATE_LIMITS } from '../../config/constants.js'
import type { LiveClient } from '../../types/media-analysis.js'
import { parseJsonResponse } from '../../lib/json.js'
import { logger } from '../../lib/logger.js'

export interface UseCameraOptions {
  onCapture?: (blob: Blob, imageData?: string) => void
  onAnalysis?: (analysis: string, imageData: string, capturedAt: number) => void
  captureInterval?: number
  enableAutoCapture?: boolean
  maxDimension?: number
  quality?: number
  sessionId?: string
  voiceConnectionId?: string
  requireVoiceSession?: boolean
  sendRealtimeInput?: (chunks: Array<{ mimeType: string; data: string }>) => void
  sendContextUpdate?: (update: {
    sessionId?: string | null
    modality: 'screen' | 'webcam'
    analysis: string
    imageData?: string
    capturedAt?: number
    metadata?: Record<string, unknown>
  }) => void
}

export interface CameraCapture {
  blob: Blob
  imageData?: string
  timestamp: number
  metadata?: {
    width: number
    height: number
    deviceId?: string
  }
}

interface CameraMetrics {
  captureCount: number
  failedCaptures: number
  avgCaptureTime: number
}

export function useCamera(options: UseCameraOptions = {}) {
  const {
    onCapture,
    onAnalysis,
    captureInterval = 12000,
    enableAutoCapture = false,
    maxDimension = 1280,
    quality = 0.7,
    sessionId,
    voiceConnectionId,
    requireVoiceSession = false,
    sendRealtimeInput,
    sendContextUpdate,
  } = options

  const [isActive, setIsActive] = useState(false)
  const [isInitializing, setIsInitializing] = useState(false)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [availableDevices, setAvailableDevices] = useState<MediaDeviceInfo[]>([])
  const [currentDeviceId, setCurrentDeviceId] = useState<string | undefined>()
  const facingModeRef = useRef<'user' | 'environment'>('user')

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const autoCaptureTimerRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const metricsRef = useRef<CameraMetrics>({
    captureCount: 0,
    failedCaptures: 0,
    avgCaptureTime: 0,
  })
  const lastAnalysisAtRef = useRef(0)
  const ANALYSIS_INTERVAL_MS = 4000

  /**
   * Validate frame quality (brightness, contrast, blur)
   * Returns quality score 0-1, where 1 is perfect quality
   */
  const validateFrameQuality = useCallback((imageData: string): Promise<number> => {
    return new Promise<number>((resolve) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          resolve(0.5) // Default quality if can't analyze
          return
        }
        
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data
        
        // Calculate brightness (average of RGB values)
        let brightnessSum = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0
          const g = data[i + 1] ?? 0
          const b = data[i + 2] ?? 0
          brightnessSum += (r + g + b) / 3
        }
        const avgBrightness = brightnessSum / (data.length / 4)
        const brightnessScore = 1 - Math.abs(avgBrightness - 128) / 128 // Optimal is 128
        
        // Calculate contrast (standard deviation of brightness)
        let variance = 0
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i] ?? 0
          const g = data[i + 1] ?? 0
          const b = data[i + 2] ?? 0
          const brightness = (r + g + b) / 3
          variance += Math.pow(brightness - avgBrightness, 2)
        }
        const stdDev = Math.sqrt(variance / (data.length / 4))
        const contrastScore = Math.min(stdDev / 50, 1) // Higher stdDev = better contrast
        
        // Simple blur detection (Laplacian variance - lower variance = more blur)
        let laplacianSum = 0
        for (let y = 1; y < canvas.height - 1; y++) {
          for (let x = 1; x < canvas.width - 1; x++) {
            const idx = (y * canvas.width + x) * 4
            const center = ((data[idx] ?? 0) + (data[idx + 1] ?? 0) + (data[idx + 2] ?? 0)) / 3
            const right = ((data[idx + 4] ?? 0) + (data[idx + 5] ?? 0) + (data[idx + 6] ?? 0)) / 3
            const bottomIdx = idx + canvas.width * 4
            const bottom = ((data[bottomIdx] ?? 0) + (data[bottomIdx + 1] ?? 0) + (data[bottomIdx + 2] ?? 0)) / 3
            laplacianSum += Math.abs(center * 2 - right - bottom)
          }
        }
        const laplacianVariance = laplacianSum / ((canvas.width - 2) * (canvas.height - 2))
        const blurScore = Math.min(laplacianVariance / 100, 1) // Higher variance = less blur
        
        // Combined quality score (weighted average)
        const qualityScore = (brightnessScore * 0.3 + contrastScore * 0.4 + blurScore * 0.3)
        resolve(qualityScore)
      }
      img.onerror = () => resolve(0.5) // Default if image fails to load
      img.src = imageData
    })
  }, [])
  
  const frameQueueRef = useRef<Array<{ mimeType: string; data: string }>>([])
  const queueProcessTimerRef = useRef<number | null>(null)
  const currentQualityRef = useRef<number>(quality)
  const isStreamingActiveRef = useRef<boolean>(false)
  const sendRealtimeInputRef = useRef(sendRealtimeInput)
  // Frame buffer for quality selection (last 3-5 frames)
  const frameBufferRef = useRef<Array<{ imageData: string; quality: number; timestamp: number }>>([])
  const MAX_BUFFER_SIZE = 5
  
  useEffect(() => {
    sendRealtimeInputRef.current = sendRealtimeInput
  }, [sendRealtimeInput])

  useEffect(() => {
    if (typeof document !== 'undefined' && !canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    return () => {
      canvasRef.current = null
    }
  }, [])

  const enumerateDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const videoDevices = devices.filter(device => device.kind === 'videoinput')
      setAvailableDevices(videoDevices)
      return videoDevices
    } catch (err) {
      console.error('Failed to enumerate devices:', err)
      return []
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (autoCaptureTimerRef.current) {
      clearInterval(autoCaptureTimerRef.current)
      autoCaptureTimerRef.current = null
    }
    
    if (queueProcessTimerRef.current) {
      clearInterval(queueProcessTimerRef.current)
      queueProcessTimerRef.current = null
    }
    
    frameQueueRef.current = []
    currentQualityRef.current = quality
    isStreamingActiveRef.current = false

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      try {
        videoRef.current.pause?.()
      } catch (pauseError) {
        console.debug('📷 [useCamera] Unable to pause preview element', pauseError)
      }
      videoRef.current.srcObject = null
    }
    videoRef.current = null

    setStream(null)
    setIsActive(false)
    setError(null)
    setCurrentDeviceId(undefined)
  }, [quality])

  const startCamera = useCallback(async (deviceId?: string, facingOverride?: 'user' | 'environment') => {
    if (isInitializing) {
      logger.debug('Camera initialization already in progress')
      return
    }

    setIsInitializing(true)
    setError(null)

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => {
          track.stop()
        })
        streamRef.current = null
      }

      const desiredFacing = facingOverride || facingModeRef.current || 'user'
      const constraints: MediaStreamConstraints = {
        video: deviceId
          ? { deviceId: { exact: deviceId } }
          : {
              facingMode: desiredFacing,
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
        audio: false,
      }

      logger.debug('📷 [useCamera] Requesting getUserMedia with constraints:', constraints)
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints)
      logger.debug('📷 [useCamera] getUserMedia success, stream tracks:', { tracks: mediaStream.getTracks().length })
      
      const videoTrack = mediaStream.getVideoTracks()[0]
      if (!videoTrack) {
        throw new Error('No video track available')
      }
      const settings = videoTrack.getSettings()
      setCurrentDeviceId(settings.deviceId)
      try {
        interface MediaStreamTrackWithLabel {
          label?: string
          getSettings(): MediaTrackSettings
        }
        interface MediaTrackSettingsWithLabel extends MediaTrackSettings {
          label?: string
        }
        const settings = videoTrack.getSettings() as MediaTrackSettingsWithLabel
        const trackWithLabel = videoTrack as MediaStreamTrackWithLabel
        const label = settings?.label || trackWithLabel.label || ''
        if (/back|rear|environment/i.test(label)) facingModeRef.current = 'environment'
        else if (/front|user|face/i.test(label)) facingModeRef.current = 'user'
      } catch (labelError) {
        console.debug('📷 [useCamera] Unable to infer facing mode from label', labelError)
      }

      videoTrack.addEventListener('ended', () => {
        logger.debug('Camera track ended')
        stopCamera()
      })

      streamRef.current = mediaStream
      setStream(mediaStream)
      setIsActive(true)
      setIsInitializing(false)
      logger.debug('📷 [useCamera] Camera started successfully')

      if (!videoRef.current) {
        try {
          const internalVideo = document.createElement('video')
          internalVideo.srcObject = mediaStream
          internalVideo.muted = true
          internalVideo.playsInline = true
          await internalVideo.play().catch(() => undefined)
          videoRef.current = internalVideo
        } catch (internalErr) {
          console.debug('📷 [useCamera] Unable to prime internal video element', internalErr)
        }
      }

      await enumerateDevices()

      return mediaStream
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to access camera'
      
      setError(message)
      setIsActive(false)
      setIsInitializing(false)
      toast.error(message)
      throw err
    }
  }, [enumerateDevices, isInitializing, stopCamera])

  const toggleCamera = useCallback(async () => {
    logger.debug('📷 [useCamera] toggleCamera called', { isActive, currentDeviceId, isInitializing })
    if (isInitializing) {
      logger.debug('📷 [useCamera] Initialization in progress, ignoring toggle request.')
      return
    }
    if (isActive) {
      logger.debug('📷 [useCamera] Camera is active, stopping...')
      stopCamera()
    } else {
      logger.debug('📷 [useCamera] Camera is inactive, starting...')
      await startCamera(currentDeviceId)
    }
  }, [isActive, currentDeviceId, isInitializing, startCamera, stopCamera])

  const switchCamera = useCallback(async () => {
    if (!isActive) return
    if (availableDevices.length > 1) {
      const currentIndex = availableDevices.findIndex(
        device => device.deviceId === currentDeviceId
      )
      const nextIndex = (currentIndex + 1) % availableDevices.length
      const nextDevice = availableDevices[nextIndex]
      if (nextDevice?.deviceId) {
        await startCamera(nextDevice.deviceId)
      }
      return
    }
    const nextFacing: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user'
    facingModeRef.current = nextFacing
    await startCamera(undefined, nextFacing)
  }, [isActive, availableDevices, currentDeviceId, startCamera])

  const flipFacingMode = useCallback(async () => {
    if (!isActive) return
    const nextFacing: 'user' | 'environment' = facingModeRef.current === 'user' ? 'environment' : 'user'
    facingModeRef.current = nextFacing
    await startCamera(undefined, nextFacing)
  }, [isActive, startCamera])

  const uploadToBackend = useCallback(async (
    blob: Blob,
    _imageData: string,
    sessionId: string,
    voiceConnectionId?: string
  ): Promise<{ analysis?: string; confidence?: number } | null> => {
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
      const { response } = routeImageAnalysis(imageBase64, {
        modality: 'webcam',
        previousRoute: 'webcam',
        sessionId
      })

      const data = response
      const analysis = data?.analysis
      const confidence = typeof data?.confidence === 'number' ? data.confidence : undefined
      const normalized =
        typeof analysis === 'string'
          ? { analysis, ...(confidence !== undefined && { confidence }) }
          : analysis === undefined || analysis === null
            ? {}
            : { analysis: typeof analysis === 'object' && analysis !== null ? JSON.stringify(analysis) : (typeof analysis === 'string' || typeof analysis === 'number' || typeof analysis === 'boolean' ? String(analysis) : JSON.stringify(analysis)), ...(confidence !== undefined && { confidence }) }
      return normalized
    } catch (err) {
      console.error('Router-based webcam analysis failed, falling back to direct call', err)
      try {
        const response = await fetch('/api/tools/webcam', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: _imageData,
          prompt: 'Analyze this webcam frame for sales context (facial expressions, environment, engagement).',
          sessionId,
          voiceConnectionId
        }),
      })
        if (response.ok) {
          const raw = await parseJsonResponse<unknown>(response, null)
          if (raw && typeof raw === 'object') {
            const { analysis, confidence } = raw as { analysis?: unknown; confidence?: number }
            const normalized =
              typeof analysis === 'string'
                ? { analysis, ...(typeof confidence === 'number' && { confidence }) }
                : analysis === undefined || analysis === null
                  ? {}
                  : { analysis: typeof analysis === 'object' && analysis !== null ? JSON.stringify(analysis) : (typeof analysis === 'string' || typeof analysis === 'number' || typeof analysis === 'boolean' ? String(analysis) : JSON.stringify(analysis)), ...(typeof confidence === 'number' && { confidence }) }
            return normalized
          }
          return {}
        }
        return null
      } catch (fallbackErr) {
        console.error('Webcam upload failed:', fallbackErr)
        return null
      }
    }
  }, [])

  const captureFrame = useCallback(async (
    videoElement?: HTMLVideoElement
  ): Promise<CameraCapture | null> => {
    const video = videoElement || videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas) {
      metricsRef.current.failedCaptures++
      return null
    }

    if (video.readyState < 2) {
      console.debug('Video not ready for capture (readyState:', video.readyState, ')')
      metricsRef.current.failedCaptures++
      return null
    }

    const startTime = performance.now()

    try {
      const videoWidth = video.videoWidth
      const videoHeight = video.videoHeight

      if (videoWidth === 0 || videoHeight === 0) {
        console.warn('Video dimensions are zero')
        metricsRef.current.failedCaptures++
        return null
      }

      let width = videoWidth
      let height = videoHeight
      
      if (maxDimension && (width > maxDimension || height > maxDimension)) {
        const scale = maxDimension / Math.max(width, height)
        width = Math.round(width * scale)
        height = Math.round(height * scale)
      }

      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d', { alpha: false })
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }

      ctx.drawImage(video, 0, 0, width, height)

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', currentQualityRef.current)
      })

      if (!blob) {
        throw new Error('Failed to create blob from canvas')
      }

      const imageData = canvas.toDataURL('image/jpeg', currentQualityRef.current)

      // Validate frame quality (async)
      const qualityScore = await validateFrameQuality(imageData)
      const QUALITY_THRESHOLD = 0.4 // Minimum quality score to send frame
      
      // Add to frame buffer
      frameBufferRef.current.push({
        imageData,
        quality: qualityScore,
        timestamp: Date.now()
      })
      
      // Keep only last MAX_BUFFER_SIZE frames
      if (frameBufferRef.current.length > MAX_BUFFER_SIZE) {
        frameBufferRef.current.shift()
      }

      const captureTime = performance.now() - startTime
      const metrics = metricsRef.current
      metrics.captureCount++
      metrics.avgCaptureTime = 
        (metrics.avgCaptureTime * (metrics.captureCount - 1) + captureTime) / 
        metrics.captureCount

      const capture: CameraCapture = {
        blob,
        imageData,
        timestamp: Date.now(),
        metadata: {
          width,
          height,
          ...(currentDeviceId ? { deviceId: currentDeviceId } : {}),
        },
      }

      onCapture?.(blob, imageData)
      
      // Skip low-quality frames
      if (qualityScore < QUALITY_THRESHOLD) {
        logger.debug('📷 Frame quality too low, skipping', { qualityScore, threshold: QUALITY_THRESHOLD })
        return capture // Return capture but don't send it
      }

      let analysisText: string | null = null
      const now = Date.now()
      const shouldAnalyze = Boolean(sessionId) && (now - lastAnalysisAtRef.current >= ANALYSIS_INTERVAL_MS)

      if (sendRealtimeInputRef.current) {
        try {
          // Select best quality frame from buffer when gesture/question detected
          // For now, use current frame if quality is good, otherwise use best from buffer
          let frameToSend = imageData
          let frameBlob = blob
          
          if (frameBufferRef.current.length > 1) {
            // Find best quality frame in buffer
            const bestFrame = frameBufferRef.current.reduce((best, current) => 
              current.quality > best.quality ? current : best
            )
            
            // Use best frame if it's significantly better (10% threshold)
            if (bestFrame.quality > qualityScore + 0.1) {
              frameToSend = bestFrame.imageData
              // Convert imageData back to blob for sending
              const response = await fetch(frameToSend)
              frameBlob = await response.blob()
              logger.debug('📹 Using best quality frame from buffer', {
                bufferSize: frameBufferRef.current.length,
                bestQuality: bestFrame.quality,
                currentQuality: qualityScore
              })
            }
          }
          
          const base64Data = await blobToBase64(frameBlob)
          
          const client = getLiveClientSingleton() as unknown as LiveClient
          const socket = client.socket
          const bufferedAmount = socket?.bufferedAmount ?? 0
          
          // Quality adjustment logic...
          if (bufferedAmount > WEBSOCKET_CONFIG.HIGH_BUFFER_THRESHOLD) {
             if (currentQualityRef.current > WEBSOCKET_CONFIG.LOW_QUALITY_JPEG) {
               currentQualityRef.current = WEBSOCKET_CONFIG.LOW_QUALITY_JPEG
             }
          } else {
             currentQualityRef.current = quality
          }
          
          const frame = {
            mimeType: 'image/jpeg',
            data: base64Data,
          }
          
          // Send to Live API
          sendRealtimeInputRef.current([frame])
          logger.debug('📹 Webcam frame streamed to Live API', {
              bufferedAmount,
              quality: currentQualityRef.current,
              qualityScore,
              size: base64Data.length
          })

        } catch (err) {
          console.error('❌ Failed to stream webcam frame:', err)
        }
      }

      if (sessionId && shouldAnalyze) {
        const result = await uploadToBackend(blob, imageData, sessionId, voiceConnectionId)
        if (result?.analysis) {
          lastAnalysisAtRef.current = now
          analysisText = result.analysis
          const confidence = result.confidence ?? 0.9 // Use confidence from analysis or default
          onAnalysis?.(result.analysis, imageData, capture.timestamp)
          
          // Log confidence for debugging
          logger.debug('📷 Vision analysis confidence', {
            confidence,
            analysisLength: result.analysis.length,
            qualityScore
          })
          
          // Send context update with confidence
          if (typeof sendContextUpdate === 'function') {
            try {
              sendContextUpdate({
                sessionId: sessionId ?? null,
                modality: 'webcam',
                analysis: analysisText,
                imageData,
                capturedAt: capture.timestamp,
                metadata: {
                  source: sendRealtimeInputRef.current ? 'webcam_stream' : 'webcam_capture',
                  confidence: confidence,
                  qualityScore: qualityScore,
                  ...(voiceConnectionId ? { connectionId: voiceConnectionId } : {}),
                },
              })
            } catch (contextErr) {
              console.warn('⚠️ Failed to push webcam context update:', contextErr)
            }
          }
        }
      }

      logger.debug('📷 Camera capture:', {
        dimensions: `${capture.metadata?.width ?? 0}x${capture.metadata?.height ?? 0}`,
        blobSize: `${Math.round(capture.blob.size / 1024)}KB`,
        deviceId: capture.metadata?.deviceId ?? 'unknown',
        timestamp: capture.timestamp,
      })

      return capture
    } catch (err) {
      console.error('Frame capture failed:', err)
      metricsRef.current.failedCaptures++
      return null
    }
  }, [
    currentDeviceId,
    maxDimension,
    quality,
    onCapture,
    sessionId,
    voiceConnectionId,
    onAnalysis,
    uploadToBackend,
    sendContextUpdate,
  ])

  const attachVideoElement = useCallback((element: HTMLVideoElement | null) => {
    videoRef.current = element
    
    if (element && streamRef.current) {
      element.srcObject = streamRef.current
    }
  }, [])

  useEffect(() => {
    if (!sendRealtimeInputRef.current) return
    
    const processQueue = () => {
      if (frameQueueRef.current.length === 0) return
      
      const client = getLiveClientSingleton() as unknown as LiveClient
      const socket = client.socket
      const bufferedAmount = socket?.bufferedAmount ?? 0
      
      if (bufferedAmount < WEBSOCKET_CONFIG.MAX_BUFFERED_AMOUNT) {
        const frame = frameQueueRef.current.shift()
        if (frame && sendRealtimeInputRef.current) {
          try {
            sendRealtimeInputRef.current([frame])
            logger.debug('📹 Processed queued frame', {
              bufferedAmount,
              remainingQueue: frameQueueRef.current.length
            })
          } catch (err) {
            console.error('❌ Failed to send queued frame:', err)
          }
        }
      }
    }
    
    queueProcessTimerRef.current = window.setInterval(processQueue, WEBSOCKET_CONFIG.FRAME_QUEUE_PROCESS_INTERVAL)
    
    return () => {
      if (queueProcessTimerRef.current) {
        clearInterval(queueProcessTimerRef.current)
        queueProcessTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const shouldCapture = enableAutoCapture && isActive && 
      (!requireVoiceSession || (sessionId && voiceConnectionId))
    
    if (shouldCapture && (autoCaptureTimerRef.current || isStreamingActiveRef.current)) {
      return
    }
    
    if (!shouldCapture) {
      if (autoCaptureTimerRef.current) {
        clearInterval(autoCaptureTimerRef.current)
        autoCaptureTimerRef.current = null
      }
      isStreamingActiveRef.current = false
      return
    }
    
    if (shouldCapture && sendRealtimeInputRef.current) {
      isStreamingActiveRef.current = true
      
      const STREAM_INTERVAL = RATE_LIMITS.WEBCAM_STREAM_INTERVAL
      logger.debug(`Starting webcam streaming at ${1000 / STREAM_INTERVAL} FPS (every ${STREAM_INTERVAL}ms)`)

      const startDelay = setTimeout(() => {
        if (!autoCaptureTimerRef.current && isStreamingActiveRef.current) {
          autoCaptureTimerRef.current = window.setInterval(() => {
            void captureFrame()
          }, STREAM_INTERVAL)
        }
      }, 1000)
      
      return () => {
        clearTimeout(startDelay)
      }
    } else if (shouldCapture && !autoCaptureTimerRef.current && !isStreamingActiveRef.current) {
      logger.debug(`Starting auto-capture every ${captureInterval}ms`)
      
      const startDelay = setTimeout(() => {
        if (!autoCaptureTimerRef.current) {
          autoCaptureTimerRef.current = window.setInterval(() => {
            void captureFrame()
          }, captureInterval)
        }
      }, 1000)
      
      return () => {
        clearTimeout(startDelay)
      }
    }
    
    return undefined
  }, [enableAutoCapture, isActive, captureInterval, captureFrame, requireVoiceSession, sessionId, voiceConnectionId])

  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  const getMetrics = useCallback(() => {
    return {
      ...metricsRef.current,
      avgCaptureTime: Math.round(metricsRef.current.avgCaptureTime * 10) / 10,
    }
  }, [])

  return {
    isActive,
    isInitializing,
    stream,
    error,
    availableDevices,
    currentDeviceId,
    availableCameraCount: availableDevices.length,
    startCamera,
    stopCamera,
    toggleCamera,
    switchCamera,
    flipFacingMode,
    captureFrame,
    attachVideoElement,
    uploadToBackend,
    getMetrics,
  }
}

