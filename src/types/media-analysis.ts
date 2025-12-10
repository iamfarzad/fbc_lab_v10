/**
 * Shared types for AI analysis results across media hooks
 * Eliminates unsafe any usage in camera/screen share/voice analysis
 */

export interface MediaAnalysisResult {
  confidence?: number
  analysis?: string
  summary?: string
  // Add more fields as needed based on actual API responses
}

export interface VoiceSummaryResult {
  summary?: string
  // Add more fields as needed for voice-specific analysis
}

// Router payload for intelligent routing
export interface RouterPayload {
  text?: string
  imageUrl?: string
  imageData?: string
  type?: string
  // Add more fields as needed based on router usage
}

// Live client interface for WebSocket access
export interface LiveClient {
  socket?: WebSocket | null
}

