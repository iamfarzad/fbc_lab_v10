/**
 * AdminChatPanel Utilities
 * Helpers and constants extracted from AdminChatPanel.tsx
 */

import { useCallback, useRef } from 'react'
import { GEMINI_MODELS } from 'src/config/constants'
import { isRecord, getString, getRecord } from 'src/lib/guards'

export const MODELS = [
  { id: GEMINI_MODELS.FLASH_LATEST || GEMINI_MODELS.FLASH_2025_09, name: 'Gemini 2.5 Flash' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
] as const

/**
 * Typed union for tool types
 */
export type ToolType = 'web_search' | 'function' | 'code_interpreter' | 'file_search' | 'unknown'

/**
 * Typed union for tool states
 */
export type ToolState = 'running' | 'completed' | 'error' | 'unknown'

/**
 * Parse webcam response
 */
export interface WebcamResponse {
  analysis?: string
  output?: {
    analysis?: string
  }
}

export function parseWebcamResponse(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined
  
  const analysis = getString(data, 'analysis')
  if (analysis) return analysis
  
  const output = getRecord(data, 'output')
  if (output) {
    const outputAnalysis = getString(output, 'analysis')
    if (outputAnalysis) return outputAnalysis
  }
  
  return undefined
}

/**
 * Parse screen response
 */
export interface ScreenResponse {
  analysis?: string
  output?: {
    analysis?: string
  }
}

export function parseScreenResponse(data: unknown): string | undefined {
  if (!isRecord(data)) return undefined
  
  const output = getRecord(data, 'output')
  if (output) {
    const outputAnalysis = getString(output, 'analysis')
    if (outputAnalysis) return outputAnalysis
  }
  
  const analysis = getString(data, 'analysis')
  if (analysis) return analysis
  
  return undefined
}

/**
 * useEvent helper for stable callbacks
 */
export function useEvent<T extends (...a: unknown[]) => unknown>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
   
  return useCallback(((...a) => ref.current(...a)) as T, [])
}

