import type { AgentContext, ChatMessage, AgentResult, FunnelStage, IntelligenceContext } from './types'
import type { ConversationFlowState } from 'src/types/conversation-flow-types'
import { preProcessIntent } from './intent'
import { multimodalContextManager } from 'src/core/context/multimodal-context'
import { usageLimiter } from 'src/lib/usage-limits'
import { discoveryAgent } from './discovery-agent'
import { scoringAgent } from './scoring-agent'
import { workshopSalesAgent } from './workshop-sales-agent'
import { consultingSalesAgent } from './consulting-sales-agent'
import { closerAgent } from './closer-agent'
import { summaryAgent } from './summary-agent'
import { proposalAgent } from './proposal-agent'
import { adminAgent } from './admin-agent'
import { retargetingAgent } from './retargeting-agent'

/**
 * Structured logging helper (currently unused)
 */
// function logOrchestrator(level: 'info' | 'warn' | 'error', message: string, meta?: Record<string, any>) {
//   const prefix = `[Orchestrator] ${level.toUpperCase()}`
//   
//   if (meta) {
//     console.log(`${prefix}: ${message}`, meta)
//   } else {
//     console.log(`${prefix}: ${message}`)
//   }
// }

/**
 * Multi-Agent Orchestrator - Routes conversations to specialized agents
 * 
 * Uses funnel stage determination to select the right agent
 * Preserves full multimodal context across handoffs
 * Tracks usage limits and enforces quotas
 */
export async function routeToAgent({
  messages,
  context,
  trigger = 'chat'
}: {
  messages: ChatMessage[]
  context: AgentContext
  trigger?: 'chat' | 'voice' | 'conversation_end' | 'admin' | 'proposal_request'
}): Promise<AgentResult> {

  // CRITICAL FIX: Pre-process intent before routing
  const intentSignal = preProcessIntent(messages);
  if (intentSignal === 'BOOKING') {
    const immediate: AgentResult = {
      output: "Absolutely! I'll send you our calendar link. What time zone are you in?",
      agent: 'Discovery Agent (Booking Mode)',
      metadata: {
        stage: 'BOOKING_REQUESTED' as FunnelStage,
        triggerBooking: true,
        action: 'show_calendar_widget',
      },
    }
    return immediate
  }

  if (intentSignal === 'EXIT') {
    context.stage = 'FORCE_EXIT' as FunnelStage;
    return summaryAgent(messages, context);
  }

  // Handle conversation end (archive before generating summary)
  if (trigger === 'conversation_end' && context.sessionId) {
    try {
      console.log(`🏁 Conversation end triggered for ${context.sessionId}`)

      // 1. Archive multimodal context to Supabase (critical for PDF)
      await multimodalContextManager.archiveConversation(context.sessionId)
      console.log('✅ Context archived before summary generation')

      // 2. Generate summary with full context (will load from Supabase)
      const multimodalData = await multimodalContextManager.prepareChatContext(
        context.sessionId,
        true, // include visual
        true  // include audio
      )

      const enhancedContext: AgentContext = {
        ...context,
        multimodalContext: multimodalData.multimodalContext,
        stage: 'SUMMARY'
      }

      const result = await summaryAgent(messages, enhancedContext)

      console.log('✅ Summary generated - client will generate PDF')
      return result
    } catch (error) {
      console.error('Conversation end handling failed:', error)
      throw error
    }
  }

  // Check usage limits first (except for summary/admin)
  if (trigger === 'chat' || trigger === 'voice') {
    if (context.sessionId) {
      const limitCheck = await usageLimiter.checkLimit(context.sessionId, 'message')
      if (!limitCheck.allowed) {
        return {
          output: `I've reached the conversation limit for this session. ${limitCheck.reason}\n\nLet me send you a summary of what we discussed so far.`,
          agent: 'System',
          metadata: {
            type: 'limit_reached',
            reason: limitCheck.reason
          }
        }
      }
    }
  }

  // Get multimodal context
  let multimodalContext
  if (context.sessionId) {
    try {
      const multimodalData = await multimodalContextManager.prepareChatContext(
        context.sessionId,
        true, // include visual
        trigger === 'voice' // include audio if voice
      )
      multimodalContext = multimodalData.multimodalContext
    } catch (error) {
      console.warn('Failed to load multimodal context:', error)
      multimodalContext = {
        hasRecentImages: false,
        hasRecentAudio: false,
        hasRecentUploads: false,
        recentAnalyses: [],
        recentUploads: []
      }
    }
  }

  // Merge provided multimodalContext from incoming request context when present.
  // This ensures E2E runs (and clients) can supply context even if storage misses.
  if (context.multimodalContext) {
    const provided = context.multimodalContext
    multimodalContext = {
      hasRecentImages: Boolean((multimodalContext?.hasRecentImages || provided.hasRecentImages)),
      hasRecentAudio: Boolean((multimodalContext?.hasRecentAudio || provided.hasRecentAudio)),
      hasRecentUploads: Boolean((multimodalContext?.hasRecentUploads || provided.hasRecentUploads)),
      recentAnalyses: [
        ...(multimodalContext?.recentAnalyses ?? []),
        ...(provided.recentAnalyses ?? []),
      ],
      recentUploads: [
        ...(multimodalContext?.recentUploads ?? []),
        ...(provided.recentUploads ?? []),
      ],
    }
  }

  // Determine funnel stage
  const stage = determineFunnelStage({
    ...(context.conversationFlow !== undefined && { conversationFlow: context.conversationFlow }),
    ...(context.intelligenceContext !== undefined && { intelligenceContext: context.intelligenceContext }),
    ...(trigger !== undefined && { trigger }),
    // override is not provided, so omit it
  })

  // Build enhanced context for agent
  const enhancedContext: AgentContext = {
    sessionId: context.sessionId,
    ...(context.intelligenceContext !== undefined && { intelligenceContext: context.intelligenceContext }),
    ...(context.conversationFlow !== undefined && { conversationFlow: context.conversationFlow }),
    ...(multimodalContext !== undefined && { multimodalContext }),
    ...(context.voiceActive !== undefined && { voiceActive: context.voiceActive }),
    stage,
    ...(context.thinkingLevel !== undefined && { thinkingLevel: context.thinkingLevel }),
    ...(context.mediaResolution !== undefined && { mediaResolution: context.mediaResolution })
  }

  // NEW: Log routing decision
  console.log(`[Orchestrator] Routing to ${stage} agent (trigger: ${trigger})`)
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AGENT_AUDIT === 'true') {
    try {
      const { auditLog } = await import('src/core/security/audit-logger')
      await auditLog.logAgentRouted(
        context.sessionId || 'anonymous',
        `${stage}_agent`,
        stage,
        trigger,
        {
          ...(context.conversationFlow !== undefined && { conversationFlow: context.conversationFlow as unknown as Record<string, unknown> }),
          ...(context.intelligenceContext !== undefined && {
            intelligenceContext: {
              ...(context.intelligenceContext.leadScore !== undefined && { leadScore: context.intelligenceContext.leadScore }),
              ...(context.intelligenceContext.fitScore !== undefined && { fitScore: context.intelligenceContext.fitScore }),
              hasEmail: Boolean(context.intelligenceContext?.email)
            }
          }),
          routingReason: `Determined via determineFunnelStage based on ${context.conversationFlow ? 'conversation flow' : 'default logic'}`
        }
      )
    } catch (err) {
      console.warn('Agent routing audit log failed (non-fatal):', err)
    }
  }

  // Route to appropriate agent
  let result: AgentResult
  const startTime = Date.now()

  try {
    switch (stage) {
      case 'DISCOVERY':
        result = await discoveryAgent(messages, enhancedContext)
        break

      case 'SCORING':
        result = await scoringAgent(messages, enhancedContext)
        // Update intelligence context with scores
        if (result.metadata?.leadScore && context.intelligenceContext) {
          context.intelligenceContext.leadScore = result.metadata.leadScore
          if (result.metadata.fitScore !== undefined) {
            context.intelligenceContext.fitScore = result.metadata.fitScore
          }
        }
        // After scoring, immediately route to sales
        const nextStage = determineFunnelStage({
          conversationFlow: context.conversationFlow,
          intelligenceContext: context.intelligenceContext,
          trigger
        })
        if (nextStage !== 'SCORING') {
          // Re-route to sales agent
          return routeToAgent({ messages, context: { ...context, stage: nextStage }, trigger })
        }
        break

      case 'WORKSHOP_PITCH':
        result = await workshopSalesAgent(messages, enhancedContext)
        break

      case 'CONSULTING_PITCH':
        result = await consultingSalesAgent(messages, enhancedContext)
        break

      case 'CLOSING':
        result = await closerAgent(messages, enhancedContext)
        break

      case 'SUMMARY':
        result = await summaryAgent(messages, enhancedContext)
        break

      case 'PROPOSAL':
        result = await proposalAgent(messages, enhancedContext)
        break

      case 'ADMIN':
        result = await adminAgent(messages, {
          sessionId: context.sessionId || 'admin',
          ...(context.intelligenceContext?.email !== undefined && { adminId: context.intelligenceContext.email })
        })
        break

      case 'RETARGETING':
        // Retargeting is typically triggered by scheduled jobs, not chat
        // But we support it here for completeness
        const leadContextPayload = context.intelligenceContext
          ? {
            ...context.intelligenceContext,
            company: context.intelligenceContext.company?.name ?? context.intelligenceContext.company?.domain,
            companyDetails: context.intelligenceContext.company,
          }
          : {}
        result = await retargetingAgent({
          leadContext: leadContextPayload,
          conversationSummary: messages.map(m => m.content).join('\n'),
          scenario: 'no_booking_high_score'
        })
        break

      case 'BOOKING_REQUESTED':
        {
          const booking: AgentResult = {
            output: "Perfect! I'll open our calendar. Pick a time that works for you.",
            agent: 'Booking Agent',
            metadata: {
              stage: 'BOOKING_REQUESTED' as FunnelStage,
              triggerBooking: true,
              action: 'show_calendar_widget',
            },
          }
          result = booking
        }
        break

      case 'FORCE_EXIT':
        result = await summaryAgent(messages, enhancedContext)
        break

      default:
        // Fallback to discovery
        result = await discoveryAgent(messages, enhancedContext)
    }

    // Track usage
    if (context.sessionId && (trigger === 'chat' || trigger === 'voice')) {
      await usageLimiter.trackUsage(context.sessionId, 'message')
    }

    // Add metadata
    result.metadata = {
      ...result.metadata,
      stage,
      multimodalUsed: multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio || false
    }

    // Update context with enhanced flow for next turn (sync, before return)
    const enhancedFlow = result.metadata?.enhancedConversationFlow
    if (enhancedFlow && typeof enhancedFlow === 'object' && enhancedFlow !== null) {
      context.conversationFlow = enhancedFlow as ConversationFlowState
      enhancedContext.conversationFlow = enhancedFlow as ConversationFlowState
    }

    // Log performance metrics (sync, before return)
    const endTime = Date.now()
    const duration = endTime - startTime
    console.log(`[Orchestrator] ${result.agent} executed in ${duration}ms`)

    // PERSIST AGENT RESULTS (NON-BLOCKING - fire and forget)
    if (context.sessionId && context.sessionId !== 'anonymous') {
      // Fire persistence and analytics asynchronously without blocking response
      ;(async () => {
        try {
          const { agentPersistence } = await import('./agent-persistence')
          await agentPersistence.persistAgentResult(
            context.sessionId!,
            result,
            enhancedContext
          )
        } catch (persistErr) {
          console.error('Agent persistence error (non-fatal):', persistErr)
        }

        // Log analytics (non-blocking)
        if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AGENT_AUDIT === 'true') {
          try {
            const { auditLog } = await import('src/core/security/audit-logger')
            await auditLog.logAgentExecution(
              context.sessionId!,
              result.agent,
              result.metadata?.stage || stage,
              {
                startTime,
                endTime,
                duration,
                success: true
              },
              {
                multimodalUsed: result.metadata?.multimodalUsed,
                toolsUsed: result.metadata?.tools?.length || 0,
                outputLength: result.output.length
              }
            )

            // Log analytics directly to Supabase (no queue)
            try {
              const { agentAnalytics } = await import('src/core/analytics/agent-analytics')
              await agentAnalytics.logExecution({
                sessionId: context.sessionId!,
                agent: result.agent,
                stage: result.metadata?.stage || stage,
                duration,
                success: true,
                ...(result.metadata?.multimodalUsed !== undefined && { multimodalUsed: result.metadata.multimodalUsed })
              })
            } catch (analyticsErr) {
              console.warn('Analytics logging failed (non-fatal):', analyticsErr)
            }
          } catch (auditErr) {
            console.warn('Agent execution audit log failed:', auditErr)
          }
        }
      })().catch(err => console.error('Background persistence failed:', err))
    }

    return result

  } catch (error) {
    console.error('[Orchestrator] Agent execution failed:', error)

    // Standardized error response
    const errorResponse: AgentResult = {
      output: 'I apologize, but I encountered an error processing your request. Please try again, or contact support if the issue persists.',
      agent: 'Error Handler',
      metadata: {
        error: error instanceof Error ? error.message : 'Unknown error',
        errorType: error instanceof Error ? error.name : 'UnknownError',
        stage,
        timestamp: new Date().toISOString(),
        retryable: true
      }
    }

    // Log error for monitoring
    if (process.env.NODE_ENV === 'production' || process.env.ENABLE_AGENT_AUDIT === 'true') {
      try {
        const { auditLog } = await import('src/core/security/audit-logger')
        await auditLog.logAgentExecution(
          context.sessionId || 'anonymous',
          'Error Handler',
          stage,
          {
            startTime,
            endTime: Date.now(),
            duration: Date.now() - startTime,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        )
      } catch (auditErr) {
        console.warn('Error audit logging failed:', auditErr)
      }
    }

    return errorResponse
  }
}

/**
 * Retry wrapper for agent execution with exponential backoff
 * @deprecated Not currently used - kept for future retry logic
 * @internal
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
// @ts-expect-error - Unused but kept for future retry logic
async function _executeAgentWithRetry(
  agentFn: (messages: ChatMessage[], context: AgentContext) => Promise<AgentResult>,
  messages: ChatMessage[],
  context: AgentContext,
  maxRetries: number = 2
): Promise<AgentResult> {
  let lastError: Error | unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await agentFn(messages, context)
    } catch (error) {
      lastError = error

      // Don't retry on last attempt
      if (attempt === maxRetries) {
        throw error
      }

      // Exponential backoff: 1s, 2s, 4s...
      const delay = Math.pow(2, attempt) * 1000
      console.warn(`[Orchestrator] Agent attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error)

      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

/**
 * Pre-process user intent before routing
 */
// preProcessIntent moved to './intent' for testability

/**
 * Type guards for conversation flow and intelligence context
 */
function isConversationFlow(value: unknown): value is ConversationFlowState {
  return typeof value === 'object' && value !== null && 'covered' in value
}

function isIntelligenceContext(value: unknown): value is IntelligenceContext {
  return typeof value === 'object' && value !== null && 'email' in value
}

/**
 * Determine which funnel stage the conversation is in
 */
function determineFunnelStage({
  conversationFlow,
  intelligenceContext,
  trigger,
  override
}: {
  conversationFlow?: ConversationFlowState | undefined
  intelligenceContext?: IntelligenceContext | undefined
  trigger?: string
  override?: FunnelStage
}): FunnelStage {
  // Store previous stage for transition logging
  const currentStage = isIntelligenceContext(intelligenceContext) && 'currentStage' in intelligenceContext && typeof intelligenceContext.currentStage === 'string'
    ? intelligenceContext.currentStage
    : undefined
  const previousStage = currentStage || 'NONE'

  // Override takes precedence
  if (override) {
    console.log(`[Stage] Override: ${previousStage} → ${override}`)
    return override
  }
  // Admin queries
  if (trigger === 'admin') return 'ADMIN'

  // Conversation ended
  if (trigger === 'conversation_end') return 'SUMMARY'

  // Explicit proposal request
  if (trigger === 'proposal_request') return 'PROPOSAL'

  // Scheduled retargeting
  if (trigger === 'retargeting') return 'RETARGETING'

  // Discovery phase - if less than 4 categories covered
  if (!isConversationFlow(conversationFlow)) {
    const newStage = 'DISCOVERY'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  const coveredCount = typeof conversationFlow.covered === 'object' && conversationFlow.covered !== null
    ? Object.values(conversationFlow.covered).filter(Boolean).length
    : 0

  if (coveredCount < 4) {
    const newStage = 'DISCOVERY'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  // Scoring phase - 4+ categories covered, but no fit score yet
  if (!isIntelligenceContext(intelligenceContext) || !intelligenceContext.fitScore) {
    const newStage = 'SCORING'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  // Closing phase - pitch delivered but no booking (check this FIRST)
  if (intelligenceContext.pitchDelivered && !intelligenceContext.calendarBooked) {
    const newStage = 'CLOSING'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  // Sales pitch phase - fit determined
  const fitScore = intelligenceContext.fitScore
  if (!fitScore || typeof fitScore !== 'object' || !('workshop' in fitScore) || !('consulting' in fitScore)) {
    const newStage = 'DISCOVERY'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  const workshop = typeof fitScore.workshop === 'number' ? fitScore.workshop : 0
  const consulting = typeof fitScore.consulting === 'number' ? fitScore.consulting : 0
  if (workshop > consulting && workshop > 0.7) {
    const newStage = 'WORKSHOP_PITCH'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }
  if (consulting > workshop && consulting > 0.7) {
    const newStage = 'CONSULTING_PITCH'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  // If fit scores are low or equal, stay in discovery
  if (workshop < 0.7 && consulting < 0.7) {
    const newStage = 'DISCOVERY'
    if (newStage !== previousStage) {
      console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
    }
    return newStage
  }

  // Default back to discovery
  const newStage = 'DISCOVERY'
  if (newStage !== previousStage) {
    console.log(`[Stage] Transition: ${previousStage} → ${newStage}`)
  }
  return newStage
}

/**
 * Get current funnel stage for a session (read-only)
 */
export function getCurrentStage(context: AgentContext): FunnelStage {
  return determineFunnelStage({
    conversationFlow: context.conversationFlow,
    intelligenceContext: context.intelligenceContext
  })
}
