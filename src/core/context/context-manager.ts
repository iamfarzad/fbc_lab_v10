/**
 * Context Manager - Prepares agent context from multimodal and conversation data
 * Extracted from route.ts for better separation of concerns
 */

import { ContextStorage } from './context-storage.js'
import { multimodalContextManager } from './multimodal-context.js'
import type { AgentContext, IntelligenceContext as AgentIntelligenceContext } from '../agents/types.js'
import type { ConversationFlowState } from '../../types/conversation-flow-types.js'
import type { ChatContext } from '../../types/core.js'
import { logger } from '../../lib/logger.js'
import { normalizeFlow } from './flow-sync.js'
import { ContextSnapshotSchema, CompanySchema, PersonSchema, type ContextSnapshot } from './context-schema.js'
import { getSupabaseService } from '../../lib/supabase.js'
import { asJsonObject } from '../../types/json-guards.js'
import type { Json } from '../database.types.js'

const contextStorage = new ContextStorage()

interface MultimodalContextResult {
  multimodalContext: {
    hasRecentImages: boolean
    hasRecentAudio: boolean
    hasRecentUploads: boolean
  }
  systemPrompt: string
}

/**
 * Helper to extract lead info from context
 */
function pickLead(ctx: Record<string, unknown>): { email: string; name: string } | undefined {
  const lead = typeof ctx.lead === 'object' && ctx.lead !== null && !Array.isArray(ctx.lead)
    ? ctx.lead as Record<string, unknown>
    : undefined
  if (!lead) return undefined
  const email = typeof lead.email === 'string' ? lead.email : undefined
  const name = typeof lead.name === 'string' ? lead.name : undefined
  if (email && name) {
    return { email, name }
  }
  return undefined
}

/**
 * Get validated context snapshot for a session
 */
export async function getContextSnapshot(sessionId: string): Promise<ContextSnapshot | null> {
  const supabase = getSupabaseService()
  if (!supabase) {
    logger.warn('Supabase not available, cannot get context snapshot')
    return null
  }

  const { data } = await supabase
    .from('conversation_contexts')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle()

  if (!data) return null

  const { asContext } = await import('src/lib/supabase-parsers')
  const context = asContext(data)
  if (!context) return null

  const capabilities = Array.isArray(context.ai_capabilities_shown)
    ? context.ai_capabilities_shown.filter((c): c is string => typeof c === 'string')
    : []

  // Parse Json fields with type guards
  const companyJson = asJsonObject(context.company_context as Json | undefined)
  const personJson = asJsonObject(context.person_context as Json | undefined)
  const intentJson = asJsonObject(context.intent_data as Json | undefined)

  // Validate and parse company_context
  let company: ContextSnapshot['company'] = undefined
  if (companyJson) {
    const parsed = CompanySchema.safeParse(companyJson)
    if (parsed.success) {
      company = parsed.data
    } else {
      logger.warn('Company context validation failed', { errors: (parsed as any).error?.errors })
    }
  }

  // Validate and parse person_context
  let person: ContextSnapshot['person'] = undefined
  if (personJson) {
    const parsed = PersonSchema.safeParse(personJson)
    if (parsed.success) {
      person = parsed.data
    } else {
      logger.warn('Person context validation failed', { errors: (parsed as any).error?.errors })
    }
  }

  // Validate and parse intent_data
  let intent: ContextSnapshot['intent'] = undefined
  if (intentJson && typeof intentJson === 'object' && 'type' in intentJson && 'confidence' in intentJson) {
    const parsed = ContextSnapshotSchema.shape.intent.safeParse(intentJson)
    if (parsed.success) {
      intent = parsed.data
    }
  }

  const snapshot: ContextSnapshot = {
    lead: pickLead(context as unknown as Record<string, unknown>) || {
      email: context.email || '',
      name: context.name || ''
    },
    company,
    person,
    role: context.role || undefined,
    roleConfidence: context.role_confidence || undefined,
    intent,
    capabilities,
  }

  // Validate the full snapshot
  try {
    return ContextSnapshotSchema.parse(snapshot)
  } catch (error) {
    logger.warn('Context snapshot validation failed', { error, snapshot })
    // Return unvalidated snapshot as fallback
    return snapshot
  }
}

/**
 * Prepare agent context from session data
 */
export async function prepareAgentContext(params: {
  sessionId: string
  context: ChatContext
  conversationFlow: Record<string, unknown> | null
  routeLogger?: typeof logger
}): Promise<{
  agentContext: AgentContext
  multimodalContext: MultimodalContextResult | null
}> {
  const { sessionId, context, conversationFlow, routeLogger = logger } = params

  // CRITICAL FIX: Load conversationFlow from database before stage determination
  const dbContext = sessionId && sessionId !== 'anonymous'
    ? await contextStorage.get(sessionId)
    : null
  const persistedFlow = dbContext?.conversation_flow || conversationFlow

  // Map conversationFlow to ConversationFlowState format
  // persistedFlow is Json type, need to extract as object first
  const flowObj = persistedFlow && typeof persistedFlow === 'object' && !Array.isArray(persistedFlow)
    ? persistedFlow
    : null

  const conversationFlowState: ConversationFlowState | undefined = flowObj
    ? normalizeFlow(flowObj)
    : undefined

  // CRITICAL: Load intelligence context from storage if not provided in request
  let intelligenceContextRaw = context?.intelligenceContext
  if (!intelligenceContextRaw && sessionId !== 'anonymous') {
    try {
      const stored = await contextStorage.get(sessionId)
      // Use the entire stored context as intelligence context
      // Research data is stored at root level (company_context, professional_profile, etc.)
      intelligenceContextRaw = stored
      routeLogger.debug('Intelligence context loaded from storage', {
        hasStoredContext: !!stored,
        hasEmail: !!(stored && 'email' in stored),
        hasResearchStatus: !!(stored && 'research_status' in stored)
      })
    } catch (error) {
      routeLogger.warn('Failed to load intelligence context from storage', { error })
    }
  }

  // Map intelligenceContext to AgentContext format
  const agentIntelligenceContext: AgentIntelligenceContext | undefined = intelligenceContextRaw && typeof intelligenceContextRaw === 'object'
    ? {
      email: ('email' in intelligenceContextRaw && typeof intelligenceContextRaw.email === 'string') ? intelligenceContextRaw.email : '',
      name: ('name' in intelligenceContextRaw && typeof intelligenceContextRaw.name === 'string') ? intelligenceContextRaw.name : '',
      // Map other fields if present
      lead: ('lead' in intelligenceContextRaw) ? intelligenceContextRaw.lead as { name: string; email: string } : undefined,
      company: ('company' in intelligenceContextRaw) ? intelligenceContextRaw.company as { name: string; domain?: string; industry?: string; size?: string; summary?: string } : undefined,
      person: ('person' in intelligenceContextRaw) ? intelligenceContextRaw.person as { fullName: string; role?: string; seniority?: string; profileUrl?: string } : undefined,
      role: ('role' in intelligenceContextRaw && typeof intelligenceContextRaw.role === 'string') ? intelligenceContextRaw.role : undefined,
      roleConfidence: ('roleConfidence' in intelligenceContextRaw && typeof intelligenceContextRaw.roleConfidence === 'number') ? intelligenceContextRaw.roleConfidence : undefined,
      fitScore: ('fitScore' in intelligenceContextRaw) ? intelligenceContextRaw.fitScore as { workshop: number; consulting: number } : undefined,
      leadScore: ('leadScore' in intelligenceContextRaw && typeof intelligenceContextRaw.leadScore === 'number') ? intelligenceContextRaw.leadScore : undefined,
      pitchDelivered: ('pitchDelivered' in intelligenceContextRaw && typeof intelligenceContextRaw.pitchDelivered === 'boolean') ? intelligenceContextRaw.pitchDelivered : undefined,
      calendarBooked: ('calendarBooked' in intelligenceContextRaw && typeof intelligenceContextRaw.calendarBooked === 'boolean') ? intelligenceContextRaw.calendarBooked : undefined,
      // Map profile if present (from Lead Intelligence Agent)
      profile: ('profile' in intelligenceContextRaw && intelligenceContextRaw.profile && typeof intelligenceContextRaw.profile === 'object') 
        ? intelligenceContextRaw.profile as AgentIntelligenceContext['profile']
        : undefined,
      // Map strategicContext if present (from Lead Intelligence Agent)
      strategicContext: ('strategicContext' in intelligenceContextRaw && intelligenceContextRaw.strategicContext && typeof intelligenceContextRaw.strategicContext === 'object')
        ? intelligenceContextRaw.strategicContext as AgentIntelligenceContext['strategicContext']
        : undefined
    } as AgentIntelligenceContext
    : undefined

  const agentContext: AgentContext = {
    sessionId,
    // mode removed - transport determined by connection type
    voiceActive: Boolean(context?.voiceActive),
  }

  if (conversationFlowState) {
    agentContext.conversationFlow = conversationFlowState
  }

  if (agentIntelligenceContext) {
    agentContext.intelligenceContext = agentIntelligenceContext
  }

  if (context?.thinkingLevel) {
    agentContext.thinkingLevel = context.thinkingLevel as 'low' | 'high'
  }

  if (context?.mediaResolution) {
    agentContext.mediaResolution = context.mediaResolution as 'media_resolution_low' | 'media_resolution_medium' | 'media_resolution_high'
  }


  // Load multimodal context in parallel (non-blocking optimization)
  const query = undefined // Will be passed from route if needed

  // Start loading multimodal context but don't wait for it yet
  const multimodalContextPromise = sessionId !== 'anonymous'
    ? multimodalContextManager.prepareChatContext(sessionId, true, true, query).catch((err: unknown) => {
      routeLogger.warn('Multimodal context load failed (non-fatal)', { error: err instanceof Error ? err.message : String(err) })
      return null
    })
    : Promise.resolve(null)

  const multimodalContext: MultimodalContextResult | null = await multimodalContextPromise

  routeLogger.debug('Loaded conversationFlow from DB', {
    hasPersistedFlow: !!dbContext?.conversation_flow,
    coveredCount: flowObj && 'covered' in flowObj && flowObj.covered ? Object.values(flowObj.covered as Record<string, boolean>).filter(Boolean).length : 0,
    recommendedNext: flowObj && 'recommendedNext' in flowObj ? flowObj.recommendedNext : undefined,
    type: 'multi-agent'
  })

  return {
    agentContext,
    multimodalContext
  }
}

