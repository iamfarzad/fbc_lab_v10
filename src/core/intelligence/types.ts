// Types for intelligence system
import type { ContextSnapshot } from '../context/context-schema.js'

export interface IntentResult {
  type: 'consulting' | 'workshop' | 'other'
  confidence: number
  slots: Record<string, string | number | boolean>
}

export interface Suggestion {
  id: string
  label: string
  capability: string
  action?: 'open_form' | 'upload_prompt' | 'schedule_call' | 'run_audit' | 'run_tool'
  payload?: Record<string, unknown>
  description?: string
  priority?: number
}

export type { ContextSnapshot }

