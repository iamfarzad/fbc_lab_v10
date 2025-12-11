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
import { generateSystemPromptSupplement } from './utils/context-briefing.js'
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

  // #region agent log
  void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sessionId: 'debug-session',
      runId: 'initial',
      hypothesisId: 'H1',
      location: 'src/core/agents/orchestrator.ts:60',
      message: 'routeToAgent entry',
      data: {
        stage: currentStage,
        trigger: trigger || 'none',
        lastMsgLen: lastMessage.length,
        hasIntel: !!intelligenceContext
      },
      timestamp: Date.now()
    })
  }).catch(() => {})
  // #endregion

  // Will be set after correction detection
  let correctedIntelligenceContext: typeof intelligenceContext = intelligenceContext

  // Generate system prompt supplement from intelligence context (will be updated if corrections detected)
  const systemPromptSupplement = generateSystemPromptSupplement(intelligenceContext)

  // Helper function to add briefing to context
  // Note: correctedIntelligenceContext is set after correction detection
  const addBriefingToContext = (baseContext: Partial<AgentContext>): AgentContext => ({
    ...baseContext,
    systemPromptSupplement,
    sessionId: baseContext.sessionId || sessionId,
    intelligenceContext: baseContext.intelligenceContext || (correctedIntelligenceContext || intelligenceContext),
    multimodalContext: baseContext.multimodalContext || multimodalContext,
    conversationFlow: baseContext.conversationFlow || conversationFlow
  } as AgentContext)

  // === HIGHEST PRIORITY: BOOKING / EXIT / ADMIN ===
  if (trigger === 'booking') {
    return closerAgent(messages, addBriefingToContext({ intelligenceContext, multimodalContext, sessionId }))
  }

  if (trigger === 'conversation_end') {
    return summaryAgent(messages, addBriefingToContext({ intelligenceContext, multimodalContext, sessionId, conversationFlow }))
  }

  if (trigger === 'admin') {
    // Admin agent may not need context, but include it for consistency
    return adminAgent(messages, addBriefingToContext({ sessionId }))
  }

  if (trigger === 'proposal_request') {
    return proposalAgent(messages, addBriefingToContext({
      intelligenceContext,
      multimodalContext,
      sessionId,
      conversationFlow
    }))
  }

  if (trigger === 'retargeting') {
    // Retargeting agent has a specific signature - it doesn't use AgentContext
    // We'll need to handle this separately or update retargeting agent signature
    return retargetingAgent({
      leadContext: intelligenceContext,
      conversationSummary: conversationFlow?.summary || 'No summary available',
      scenario: 'no_booking_low_score' // Default scenario, ideally passed in trigger metadata
    })
  }

  // === EXIT INTENT DETECTION (before correction/objection) ===
  if (lastMessage) {
    try {
      const { detectExitIntent } = await import('../../lib/exit-detection.js')
      const exitIntent = detectExitIntent(lastMessage)
      
      if (exitIntent === 'WRAP_UP' || exitIntent === 'FRUSTRATION') {
        logger.info('[Orchestrator] Exit intent detected', { exitIntent, sessionId })
        return summaryAgent(messages, addBriefingToContext({
          intelligenceContext: correctedIntelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
      }
    } catch (err) {
      logger.warn('[Orchestrator] Exit intent detection failed', {
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // === CORRECTION DETECTION (before objection, update context immediately) ===
  if (lastMessage && intelligenceContext) {
    try {
      const { detectAndExtractCorrections, applyCorrectionsToContext } = await import('./utils/detect-corrections.js')
      const corrections = await detectAndExtractCorrections(lastMessage, intelligenceContext)
      
      // #region agent log
      void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: 'debug-session',
          runId: 'initial',
          hypothesisId: 'H2',
          location: 'src/core/agents/orchestrator.ts:137',
          message: 'correction detection result',
          data: {
            hasCorrections: !!corrections,
            confidence: corrections?.confidence ?? 0,
            correctedName: corrections?.name || null,
            correctedCompany: corrections?.company?.name || null,
            correctedRole: corrections?.role || corrections?.person?.role || null
          },
          timestamp: Date.now()
        })
      }).catch(() => {})
      // #endregion

      if (corrections && corrections.confidence >= 0.3) {
        logger.info('[Orchestrator] User correction detected', {
          sessionId,
          corrections: {
            name: corrections.name,
            company: corrections.company?.name,
            role: corrections.role
          },
          confidence: corrections.confidence
        })
        
        // Apply corrections to context
        correctedIntelligenceContext = applyCorrectionsToContext(intelligenceContext, corrections)
        
        // #region agent log
        void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: 'debug-session',
            runId: 'initial',
            hypothesisId: 'H3',
            location: 'src/core/agents/orchestrator.ts:151',
            message: 'context after correction applied',
            data: {
              name: correctedIntelligenceContext?.name || null,
              company: correctedIntelligenceContext?.company?.name || null,
              role: correctedIntelligenceContext?.role || correctedIntelligenceContext?.person?.role || null
            },
            timestamp: Date.now()
          })
        }).catch(() => {})
        // #endregion

        // Persist corrected context immediately (non-blocking)
        if (sessionId && sessionId !== 'anonymous') {
          try {
            const { ContextStorage } = await import('../context/context-storage.js')
            const storage = new ContextStorage()
            await storage.updateWithVersionCheck(
              sessionId,
              {
                intelligence_context: correctedIntelligenceContext as any,
                name: correctedIntelligenceContext.name,
                role: correctedIntelligenceContext.role || correctedIntelligenceContext.person?.role,
              },
              { attempts: 1, backoff: 0 }
            )
            logger.debug('[Orchestrator] Corrected intelligence context persisted', { sessionId })
            // #region agent log
            void fetch('http://127.0.0.1:7242/ingest/6378de97-2617-4621-b4d2-3d0f07a3e0c3', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sessionId: 'debug-session',
                runId: 'initial',
                hypothesisId: 'H4',
                location: 'src/core/agents/orchestrator.ts:165',
                message: 'context persisted',
                data: { sessionId },
                timestamp: Date.now()
              })
            }).catch(() => {})
            // #endregion
          } catch (persistErr) {
            logger.warn('[Orchestrator] Failed to persist corrected context', {
              error: persistErr instanceof Error ? persistErr.message : String(persistErr),
              sessionId
            })
          }
        }
        
        // Update the context used for this request (reassign the variable)
        // Note: We can't reassign the const parameter, so we update correctedIntelligenceContext
        // and use it in addBriefingToContext
      }
    } catch (err) {
      // Non-fatal - continue with normal routing
      logger.warn('[Orchestrator] Correction detection failed, continuing with normal routing', {
        error: err instanceof Error ? err.message : String(err)
      })
    }
  }

  // === OBJECTION OVERRIDE (highest priority) ===
  if (lastMessage) {
    try {
      const objection = await detectObjection(lastMessage)
      if (objection.type && objection.confidence > 0.7) {
        intelligenceContext.currentObjection = objection.type
        const objectionContext = addBriefingToContext({
          sessionId,
          intelligenceContext,
          multimodalContext
        })
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
      result = await discoveryAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'SCORING':
      // Route to scoring agent to compute lead/fit scores
      result = await scoringAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'QUALIFIED':
      // Qualified leads can move to pitching
      result = await pitchAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'INTELLIGENCE_GATHERING':
      // Continue discovery-style interaction while intel gathers
      result = await discoveryAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'PITCHING':
      // Pitch agent needs to know if it's Workshop or Consulting
      // This logic is inside pitchAgent usually? OR we determine it here
      result = await pitchAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'WORKSHOP_PITCH':
    case 'CONSULTING_PITCH':
      // Unified pitch agent will tailor messaging based on fit scores
      result = await pitchAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'OBJECTION':
      result = await objectionAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'PROPOSAL':
      result = await proposalAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'CLOSING':
      result = await closerAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'BOOKING_REQUESTED':
    case 'BOOKED':
      // Keep momentum by staying in closer flow
      result = await closerAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    case 'SUMMARY':
      result = await summaryAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
      break

    default:
      // Fallback to Discovery
      result = await discoveryAgent(messages, addBriefingToContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
  }

  // === RESPONSE VALIDATION ===
  const validated = validateAndReturn(result, lastMessage, currentStage, sessionId)

  // === NON-BLOCKING PERSISTENCE ===
  try {
    await agentPersistence.persistAgentResult(sessionId, validated, {
      sessionId,
      intelligenceContext: correctedIntelligenceContext, // Use corrected context
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

  // Check for CLOSING: pitch delivered but no booking
  if (intelligenceContext.pitchDelivered === true && intelligenceContext.calendarBooked === false) {
    return 'CLOSING'
  }

  // Check for pitch stages based on fit scores
  const fitScore = intelligenceContext.fitScore
  if (fitScore) {
    if (fitScore.workshop && fitScore.workshop > 0.7) {
      return 'WORKSHOP_PITCH'
    }
    if (fitScore.consulting && fitScore.consulting > 0.7) {
      return 'CONSULTING_PITCH'
    }
  }

  // Check for SCORING: 4+ categories covered in conversation flow
  const conversationFlow = context.conversationFlow
  if (conversationFlow?.covered) {
    const coveredCount = Object.values(conversationFlow.covered).filter(Boolean).length
    if (coveredCount >= 4) {
      return 'SCORING'
    }
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

  // Generate system prompt supplement from intelligence context
  const systemPromptSupplement = generateSystemPromptSupplement(intelligenceContext)

  // Helper function to add briefing to context (for streaming)
  const addBriefingToStreamingContext = (baseContext: Partial<AgentContext>): AgentContext => ({
    ...baseContext,
    systemPromptSupplement,
    sessionId: baseContext.sessionId || sessionId,
    intelligenceContext: baseContext.intelligenceContext || intelligenceContext,
    multimodalContext: baseContext.multimodalContext || multimodalContext,
    conversationFlow: baseContext.conversationFlow || conversationFlow,
    streaming: true,
    onChunk,
    ...(onMetadata && { onMetadata })
  } as AgentContext)

  try {
    // === HIGHEST PRIORITY: BOOKING / EXIT / ADMIN ===
    if (trigger === 'booking') {
      const result = await closerAgent(messages, addBriefingToStreamingContext({ 
        intelligenceContext, 
        multimodalContext, 
        sessionId
      }))
      onDone(result)
      return
    }

    if (trigger === 'conversation_end') {
      const result = await summaryAgent(messages, addBriefingToStreamingContext({ 
        intelligenceContext, 
        multimodalContext, 
        sessionId, 
        conversationFlow
      }))
      onDone(result)
      return
    }

    if (trigger === 'admin') {
      const result = await adminAgent(messages, addBriefingToStreamingContext({ 
        sessionId
      }))
      onDone(result)
      return
    }

    if (trigger === 'proposal_request') {
      const result = await proposalAgent(messages, addBriefingToStreamingContext({
        intelligenceContext,
        multimodalContext,
        sessionId,
        conversationFlow
      }))
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
          const objectionContext = addBriefingToStreamingContext({
            sessionId,
            intelligenceContext,
            multimodalContext
          })
          const result = await objectionAgent(messages, objectionContext)
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
        agentResult = await discoveryAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'SCORING':
        agentResult = await scoringAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'QUALIFIED':
        agentResult = await pitchAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'INTELLIGENCE_GATHERING':
        agentResult = await discoveryAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'PITCHING':
        agentResult = await pitchAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'WORKSHOP_PITCH':
      case 'CONSULTING_PITCH':
        agentResult = await pitchAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'OBJECTION':
        agentResult = await objectionAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'PROPOSAL':
        agentResult = await proposalAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'CLOSING':
        agentResult = await closerAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'BOOKING_REQUESTED':
      case 'BOOKED':
        agentResult = await closerAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      case 'SUMMARY':
        agentResult = await summaryAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
        break

      default:
        // Fallback to Discovery
        agentResult = await discoveryAgent(messages, addBriefingToStreamingContext({
          intelligenceContext,
          multimodalContext,
          sessionId,
          conversationFlow
        }))
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
