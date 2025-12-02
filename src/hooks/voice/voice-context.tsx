/**
 * Stub implementation of voice context
 * Provides shared voice instance for multiple components
 */

import { createContext, useContext } from 'react'
import type { UseVoiceReturn } from './useVoice'

const VoiceContext = createContext<UseVoiceReturn | null>(null)

export function useVoiceContext(): UseVoiceReturn | null {
  return useContext(VoiceContext)
}

export { VoiceContext }

