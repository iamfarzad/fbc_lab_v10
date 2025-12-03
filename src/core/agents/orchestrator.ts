import { discoveryAgent } from './discovery-agent'
import { pitchAgent } from './pitch-agent'
import { objectionAgent } from './objection-agent'
import { closerAgent } from './closer-agent'
import { summaryAgent } from './summary-agent'
import { detectObjection } from './utils/detect-objections'
import type { FunnelStage } from 'src/core/types/funnel-stage'
import type { AgentResult, AgentContext, ChatMessage } from './types'
import { GEMINI_MODELS } from 'src/config/constants'

/**
 * Simplified Multi-Agent Orchestrator - Routes conversations to specialized agents
 * 
 * Architecture (2026):
 * - 6 core agents: Discovery, Pitch, Objection, Closer, Summary, Lead Research
 * - 7 funnel stages: DISCOVERY → QUALIFIED → PITCHING → OBJECTION → CLOSING → BOOKED → SUMMARY
 * - Fast-track qualified leads (skip discovery)
 * - Objection override (highest priority)
 * - Stage determination moved to API layer for single source of truth
 */
export async function routeToAgent(params: {
  messages: ChatMessage[]
  sessionId: string
  currentStage: FunnelStage
  intelligenceContext: any
  multimodalContext: any
  trigger?: string
}): Promise<AgentResult> {
  const {
    messages,
    sessionId,
    currentStage,
    intelligenceContext,
    multimodalContext,
    trigger,
  } = params

  const lastMessage = messages[messages.length - 1]?.content || ''

  // === HIGHEST PRIORITY: BOOKING / EXIT / ADMIN ===
  if (trigger === 'booking') {
    return closerAgent(messages, { intelligenceContext, multimodalContext, sessionId })
  }

  if (trigger === 'conversation_end') {
    return summaryAgent(messages, { intelligenceContext, multimodalContext, sessionId })
  }

  if (trigger === 'admin') {
    return { output: 'Admin mode active', agent: 'Admin', model: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW }
  }

  // === OBJECTION OVERRIDE (highest priority) ===
  if (lastMessage) {
    try {
      const objection = await detectObjection(lastMessage)
      if (objection.type && objection.confidence > 0.7) {
        intelligenceContext.currentObjection = objection.type
        const objectionContext: AgentContext = {
          sessionId,
          intelligenceContext,
          multimodalContext
        }
        return objectionAgent(messages, objectionContext)
      }
    } catch (err) {
      // Non-fatal - continue with normal routing
      console.warn('Objection detection failed, continuing with normal routing', err)
    }
  }

  // === FAST-TRACK: QUALIFIED LEADS SKIP DISCOVERY ===
  const seniority = String(intelligenceContext?.person?.seniority || '')
  const isQualified =
    intelligenceContext?.company?.size &&
    intelligenceContext.company.size !== 'unknown' &&
    intelligenceContext?.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes(seniority)

  if (isQualified && currentStage === 'DISCOVERY') {
    intelligenceContext.interestLevel = Math.max(Number(intelligenceContext.interestLevel) || 0.7, 0.9)
    return pitchAgent(messages, { intelligenceContext, multimodalContext, sessionId })
        }

  // === NORMAL FLOW ===
  switch (currentStage) {
    case 'DISCOVERY':
      return discoveryAgent(messages, { intelligenceContext, multimodalContext, sessionId })

    case 'QUALIFIED':
    case 'PITCHING':
      return pitchAgent(messages, { intelligenceContext, multimodalContext, sessionId })

      case 'CLOSING':
      return closerAgent(messages, { intelligenceContext, multimodalContext, sessionId })

      case 'SUMMARY':
      return summaryAgent(messages, { intelligenceContext, multimodalContext, sessionId })

      default:
      // Fallback to pitch for any unknown stage
      return pitchAgent(messages, { intelligenceContext, multimodalContext, sessionId })
  }
}

/**
 * Get current funnel stage for a session (read-only)
 * 
 * Note: Stage determination is now handled in the API layer (api/chat.ts)
 * This function is kept for backward compatibility but should not be used for routing.
 */
export function getCurrentStage(context: AgentContext): FunnelStage {
  // Simple determination based on context
  if (context.stage) {
    return context.stage as FunnelStage
  }

  const intelligenceContext = context.intelligenceContext
  if (!intelligenceContext) {
    return 'DISCOVERY'
  }

  // Check if qualified
  const seniority2 = String(intelligenceContext.person?.seniority || '')
  const isQualified =
    intelligenceContext?.company?.size &&
    intelligenceContext.company.size !== 'unknown' &&
    intelligenceContext?.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes(seniority2)

  return isQualified ? 'QUALIFIED' : 'DISCOVERY'
}
