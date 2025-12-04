/**
 * PDF Generator Puppeteer - Re-export from new PDF system
 * This file maintains backward compatibility while using the full PDF system from v8
 */

// Re-export from new PDF system
export { generatePdfWithPuppeteer, buildConversationPairs, extractConversationInsights, generateApproveMailtoLink } from './pdf/generator.js'
export type { SummaryData, Mode, ConversationPair } from './pdf/utils/types.js'

// Legacy type exports for backward compatibility
export interface ConversationInsight {
  category: string
  content: string
  confidence?: number
}

export interface ConversationInsights {
  recommendations: string[]
  nextSteps: string[]
  keyDecisions: string[]
  importantPoints: string[]
}

