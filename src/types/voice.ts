export type VoiceContextUpdate = {
  sessionId?: string | null
  modality: 'screen' | 'webcam' | 'intelligence'
  analysis?: string
  imageData?: string
  capturedAt?: number
  metadata?: Record<string, unknown>
}

