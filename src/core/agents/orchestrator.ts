import { discoveryAgent } from './discovery-agent.js'
import { pitchAgent } from './pitch-agent.js'
import { objectionAgent } from './objection-agent.js'
import { closerAgent } from './closer-agent.js'
import { summaryAgent } from './summary-agent.js'
import { detectObjection } from './utils/detect-objections.js'
import { validateAgentResponse, quickValidate, generateValidationReport } from './response-validator.js'
import type { FunnelStage } from '../types/funnel-stage.js'
import type { AgentResult, AgentContext, ChatMessage } from './types.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { logger } from '../../lib/logger.js'

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
    return { output: 'Admin mode active', agent: 'Admin', model: GEMINI_MODELS.DEFAULT_CHAT }
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
  let result: AgentResult

  switch (currentStage) {
    case 'DISCOVERY':
      result = await discoveryAgent(messages, { intelligenceContext, multimodalContext, sessionId })
      break

    case 'SCORING':
    case 'PITCHING':
      result = await pitchAgent(messages, { intelligenceContext, multimodalContext, sessionId })
      break

    case 'CLOSING':
      result = await closerAgent(messages, { intelligenceContext, multimodalContext, sessionId })
      break

    case 'SUMMARY':
      result = await summaryAgent(messages, { intelligenceContext, multimodalContext, sessionId })
      break

    default:
      // Fallback to pitch for any unknown stage
      result = await pitchAgent(messages, { intelligenceContext, multimodalContext, sessionId })
  }

  // === RESPONSE VALIDATION ===
  return validateAndReturn(result, lastMessage, currentStage, sessionId)
}

/**
 * Validate agent response and handle critical issues
 */
function validateAndReturn(
  result: AgentResult,
  userMessage: string,
  stage: FunnelStage,
  sessionId: string
): AgentResult {
  // Extract tools used from metadata (ensure it's an array)
  const rawToolsUsed = result.metadata?.toolsUsed
  const toolsUsed: string[] = Array.isArray(rawToolsUsed) ? rawToolsUsed : []

  // Quick validation for performance
  const quickCheck = quickValidate(result.output, toolsUsed)

  if (quickCheck.hasCriticalIssue) {
    logger.warn('Critical validation issue detected', {
      agent: result.agent,
      stage,
      issue: quickCheck.issue,
      sessionId
    })

    // Full validation for detailed report
    const fullValidation = validateAgentResponse(result.output, {
      toolsUsed,
      userQuestion: userMessage,
      agentName: result.agent,
      stage
    })

    logger.debug(generateValidationReport(fullValidation, {
      toolsUsed,
      userQuestion: userMessage,
      agentName: result.agent,
      stage
    }))

    // Add warning to metadata but don't block response
    // (Blocking can cause bad UX - better to log and improve prompts)
    return {
      ...result,
      metadata: {
        ...result.metadata,
        validationIssues: fullValidation.issues.map(i => ({
          type: i.type,
          severity: i.severity
        })),
        validationPassed: false
      }
    }
  }

  return {
    ...result,
    metadata: {
      ...result.metadata,
      validationPassed: true
    }
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
    return context.stage
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
