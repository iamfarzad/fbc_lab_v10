import { discoveryAgent } from './discovery-agent.js'
import { pitchAgent } from './pitch-agent.js'
import { objectionAgent } from './objection-agent.js'
import { closerAgent } from './closer-agent.js'
import { summaryAgent } from './summary-agent.js'
import { adminAgent } from './admin-agent.js'
import { proposalAgent } from './proposal-agent.js'
import { retargetingAgent } from './retargeting-agent.js'
import { scoringAgent } from './scoring-agent.js'
import { detectObjection } from './utils/detect-objections.js'
import { validateAgentResponse, quickValidate, generateValidationReport } from './response-validator.js'
import type { FunnelStage } from '../types/funnel-stage.js'
import type { AgentResult, AgentContext, ChatMessage } from './types.js'
// GEMINI_MODELS removed as unused
import { logger } from '../../lib/logger.js'
import { agentPersistence } from './agent-persistence.js'

/**
 * Streaming callbacks interface
 */
export interface StreamingCallbacks {
  onChunk: (chunk: string) => void
  onMetadata?: (metadata: any) => void
  onDone: (result: AgentResult) => void
  onError: (error: Error) => void
}

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
  conversationFlow?: any // Added conversationFlow
}): Promise<AgentResult> {
  const {
    messages,
    sessionId,
    currentStage,
    intelligenceContext,
    multimodalContext,
    trigger,
    conversationFlow
  } = params

  const lastMessage = messages[messages.length - 1]?.content || ''

  // === HIGHEST PRIORITY: BOOKING / EXIT / ADMIN ===
  if (trigger === 'booking') {
    return closerAgent(messages, { intelligenceContext, multimodalContext, sessionId })
  }

  if (trigger === 'conversation_end') {
    return summaryAgent(messages, { intelligenceContext, multimodalContext, sessionId, conversationFlow })
  }

  if (trigger === 'admin') {
    return adminAgent(messages, { sessionId })
  }

  if (trigger === 'proposal_request') {
    return proposalAgent(messages, {
      intelligenceContext,
      multimodalContext,
      sessionId,
      conversationFlow
    })
  }

  if (trigger === 'retargeting') {
    // Retargeting agent has a specific signature
    return retargetingAgent({
      leadContext: intelligenceContext,
      conversationSummary: conversationFlow?.summary || 'No summary available',
      scenario: 'no_booking_low_score' // Default scenario, ideally passed in trigger metadata
    })
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

  // === STAGE-BASED ROUTING ===
  logger.info(`[Orchestrator] Routing based on stage: ${currentStage}`)

  let result: AgentResult

  switch (currentStage) {
    case 'DISCOVERY':
      result = await discoveryAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'SCORING':
      // Route to scoring agent to compute lead/fit scores
      result = await scoringAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'QUALIFIED':
      // Qualified leads can move to pitching
      result = await pitchAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'INTELLIGENCE_GATHERING':
      // Continue discovery-style interaction while intel gathers
      result = await discoveryAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'PITCHING':
      // Pitch agent needs to know if it's Workshop or Consulting
      // This logic is inside pitchAgent usually? OR we determine it here
      result = await pitchAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'WORKSHOP_PITCH':
    case 'CONSULTING_PITCH':
      // Unified pitch agent will tailor messaging based on fit scores
      result = await pitchAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'OBJECTION':
      result = await objectionAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'PROPOSAL':
      result = await proposalAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'CLOSING':
      result = await closerAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'BOOKING_REQUESTED':
    case 'BOOKED':
      // Keep momentum by staying in closer flow
      result = await closerAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    case 'SUMMARY':
      result = await summaryAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
      break

    default:
      // Fallback to Discovery
      result = await discoveryAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      })
  }

  // === RESPONSE VALIDATION ===
  const validated = validateAndReturn(result, lastMessage, currentStage, sessionId)

  // === NON-BLOCKING PERSISTENCE ===
  try {
    await agentPersistence.persistAgentResult(sessionId, validated, {
      sessionId,
      intelligenceContext,
      multimodalContext,
      conversationFlow
    })
  } catch (persistErr) {
    logger.debug('[Orchestrator] Persistence failed (non-fatal)', {
      error: persistErr instanceof Error ? persistErr.message : String(persistErr),
      sessionId
    })
  }

  return validated
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

/**
 * Streaming version of routeToAgent - streams agent responses progressively
 * 
 * This function routes to the appropriate agent and streams the response
 * as tokens are generated, rather than waiting for the complete response.
 */
export async function routeToAgentStream(
  params: {
    messages: ChatMessage[]
    sessionId: string
    currentStage: FunnelStage
    intelligenceContext: any
    multimodalContext: any
    trigger?: string
    conversationFlow?: any
  },
  callbacks: StreamingCallbacks
): Promise<void> {
  const {
    messages,
    sessionId,
    currentStage,
    intelligenceContext,
    multimodalContext,
    trigger,
    conversationFlow
  } = params

  const { onChunk, onMetadata, onDone, onError } = callbacks
  const lastMessage = messages[messages.length - 1]?.content || ''

  try {
    // === HIGHEST PRIORITY: BOOKING / EXIT / ADMIN ===
    if (trigger === 'booking') {
      const result = await closerAgent(messages, { 
        intelligenceContext, 
        multimodalContext, 
        sessionId, 
        streaming: true, 
        onChunk, 
        ...(onMetadata && { onMetadata })
      })
      onDone(result)
      return
    }

    if (trigger === 'conversation_end') {
      const result = await summaryAgent(messages, { 
        intelligenceContext, 
        multimodalContext, 
        sessionId, 
        conversationFlow, 
        streaming: true, 
        onChunk, 
        ...(onMetadata && { onMetadata })
      })
      onDone(result)
      return
    }

    if (trigger === 'admin') {
      const result = await adminAgent(messages, { 
        sessionId, 
        streaming: true, 
        onChunk, 
        ...(onMetadata && { onMetadata })
      })
      onDone(result)
      return
    }

    if (trigger === 'proposal_request') {
      const result = await proposalAgent(messages, {
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow,
        streaming: true,
        onChunk,
        ...(onMetadata && { onMetadata })
      })
      onDone(result)
      return
    }

    if (trigger === 'retargeting') {
      // Retargeting agent doesn't support streaming yet - fallback to non-streaming
      const result = await retargetingAgent({
        leadContext: intelligenceContext,
        conversationSummary: conversationFlow?.summary || 'No summary available',
        scenario: 'no_booking_low_score'
      })
      onDone(result)
      return
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
          const result = await objectionAgent(messages, { 
            ...objectionContext, 
            streaming: true, 
            onChunk, 
            ...(onMetadata && { onMetadata })
          })
          onDone(result)
          return
        }
      } catch (err) {
        // Non-fatal - continue with normal routing
        console.warn('Objection detection failed, continuing with normal routing', err)
      }
    }

    // === STAGE-BASED ROUTING ===
    logger.info(`[Orchestrator] Streaming routing based on stage: ${currentStage}`)

    let agentResult: AgentResult

    switch (currentStage) {
      case 'DISCOVERY':
        agentResult = await discoveryAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'SCORING':
        agentResult = await scoringAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'QUALIFIED':
        agentResult = await pitchAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'INTELLIGENCE_GATHERING':
        agentResult = await discoveryAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'PITCHING':
        agentResult = await pitchAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'WORKSHOP_PITCH':
      case 'CONSULTING_PITCH':
        agentResult = await pitchAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'OBJECTION':
        agentResult = await objectionAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'PROPOSAL':
        agentResult = await proposalAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'CLOSING':
        agentResult = await closerAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'BOOKING_REQUESTED':
      case 'BOOKED':
        agentResult = await closerAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      case 'SUMMARY':
        agentResult = await summaryAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break

      default:
        // Fallback to Discovery
        agentResult = await discoveryAgent(messages, {
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow,
          streaming: true,
          onChunk,
          ...(onMetadata && { onMetadata })
        })
        break
    }

    // Validate and return result via onDone callback
    const validated = validateAndReturn(agentResult, lastMessage, currentStage, sessionId)
    
    // Non-blocking persistence
    try {
      await agentPersistence.persistAgentResult(sessionId, validated, {
        sessionId,
        intelligenceContext,
        multimodalContext,
        conversationFlow
      })
    } catch (persistErr) {
      logger.debug('[Orchestrator] Persistence failed (non-fatal)', {
        error: persistErr instanceof Error ? persistErr.message : String(persistErr),
        sessionId
      })
    }

    onDone(validated)
  } catch (error) {
    logger.error('[Orchestrator] Streaming error', error instanceof Error ? error : undefined)
    onError(error instanceof Error ? error : new Error(String(error)))
  }
}
