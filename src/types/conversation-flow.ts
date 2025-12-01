// TODO: Import when components are imported (Phase 5+)
// import type { CategoryInsight } from 'components/chat/hooks/useConversationFlow'

// Temporary type until component is imported
export type CategoryInsight = any

export interface ConversationFlowSnapshot {
  covered?: Record<string, boolean>
  recommendedNext?: string | null
  evidence?: Record<string, string[]>
  coverageOrder?: Array<{
    category: string
    firstTurnIndex: number
    firstMessageId: string
    firstTimestamp: number | null
  }>
  totalUserTurns?: number
  shouldOfferRecap?: boolean
  lastResearchTurn?: number
  exitAttempts?: number
  shouldForceExit?: boolean
  steps?: string[]
  stage?: string
  insights?: Record<string, CategoryInsight>
}

export type ConversationFlowLike = ConversationFlowSnapshot | Record<string, unknown>
