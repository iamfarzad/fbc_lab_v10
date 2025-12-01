/**
 * Conversation Flow Types
 * Shared types for conversation flow state management
 * Extracted from frontend hooks to avoid cross-directory dependencies
 */

export type ConversationCategory =
  | 'goals'
  | 'pain'
  | 'data'
  | 'readiness'
  | 'budget'
  | 'success'

export interface CategoryInsight {
  firstTurnIndex: number
  firstMessageId: string
  firstTimestamp: number | null
}

export interface ConversationFlowState {
  covered: Record<ConversationCategory, boolean>
  recommendedNext: ConversationCategory | null
  evidence: Partial<Record<ConversationCategory, string[]>>
  insights: Partial<Record<ConversationCategory, CategoryInsight>>
  coverageOrder: Array<CategoryInsight & { category: ConversationCategory }>
  totalUserTurns: number
  firstUserTimestamp: number | null
  latestUserTimestamp: number | null
  shouldOfferRecap: boolean
  lastResearchTurn?: number // Track when research last ran
}

export const CONVERSATION_CATEGORIES: ConversationCategory[] = [
  'goals',
  'pain',
  'data',
  'readiness',
  'budget',
  'success',
]

