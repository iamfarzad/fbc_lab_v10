import type { ChatMessage } from '../core/agents/types.js'
import type { AgentContext } from '../core/agents/types.js'
import type { GeminiModelSettings } from './ai-client.js'

/**
 * Check if messages contain multimodal content (attachments)
 */
export function hasMultimodalContent(messages: ChatMessage[]): boolean {
  return messages.some(msg => 
    (msg as any).attachments && 
    Array.isArray((msg as any).attachments) && 
    (msg as any).attachments.length > 0
  )
}

/**
 * Determine appropriate media resolution based on context and use case
 * 
 * Strategy:
 * - low: real-time (webcam, screen streaming)
 * - medium: general analysis (default)
 * - high: detailed analysis (OCR, complex visual tasks)
 */
export function determineMediaResolution(
  context: AgentContext,
  hasMultimodal: boolean
): 'media_resolution_low' | 'media_resolution_medium' | 'media_resolution_high' | undefined {
  if (!hasMultimodal) return undefined
  
  // Use context.mediaResolution if provided
  if (context.mediaResolution) return context.mediaResolution
  
  // Default strategy: medium for general analysis
  return 'media_resolution_medium'
}

/**
 * Build model settings with thinking_level and media_resolution
 */
export function buildModelSettings(
  context: AgentContext,
  messages: ChatMessage[],
  options?: {
    thinkingLevel?: 'low' | 'high'
    defaultMediaResolution?: 'media_resolution_low' | 'media_resolution_medium' | 'media_resolution_high'
  }
): GeminiModelSettings {
  const hasMultimodal = hasMultimodalContent(messages)
  const mediaResolution = hasMultimodal 
    ? (context.mediaResolution || options?.defaultMediaResolution || 'media_resolution_medium')
    : undefined

  const settings: GeminiModelSettings = {
    thinking_level: options?.thinkingLevel || context.thinkingLevel || 'high',
    ...(mediaResolution && { media_resolution: mediaResolution })
  }

  return settings
}

