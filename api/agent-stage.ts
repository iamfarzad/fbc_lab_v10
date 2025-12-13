import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FunnelStage } from '../src/core/types/funnel-stage.js';
import { ContextStorage } from '../src/core/context/context-storage.js';
import { logger } from '../src/lib/logger.js';
import {
  CONVERSATION_CATEGORIES,
  type ConversationCategory,
  type ConversationFlowState,
} from '../src/types/conversation-flow-types.js';

const contextStorage = new ContextStorage();

interface IncomingMessage {
  id?: string;
  timestamp?: string | number | Date;
  role?: string;
  content?: string;
  attachments?: unknown;
  [key: string]: unknown;
}

/**
 * Determine current funnel stage based on intelligence context and triggers
 * (Same logic as /api/chat for consistency)
 */
function determineCurrentStage(
  intelligenceContext: any,
  trigger?: string
): FunnelStage {
  if (trigger === 'conversation_end') return 'SUMMARY'
  if (trigger === 'booking') return 'CLOSING'
  if (trigger === 'admin') return 'PITCHING'

  const isFullyQualified =
    intelligenceContext?.company?.size &&
    intelligenceContext.company.size !== 'unknown' &&
    intelligenceContext?.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes((intelligenceContext?.person?.seniority || '') as string)

  return isFullyQualified ? 'SCORING' : 'DISCOVERY'
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }
  if (value instanceof Date) {
    const ms = value.getTime()
    return Number.isFinite(ms) ? ms : null
  }
  return null
}

function ensureConversationFlowState(flow: unknown): ConversationFlowState {
  const covered: Record<ConversationCategory, boolean> = {
    goals: false,
    pain: false,
    data: false,
    readiness: false,
    budget: false,
    success: false,
  }

  const base: ConversationFlowState = {
    covered,
    recommendedNext: 'goals',
    evidence: {},
    insights: {},
    coverageOrder: [],
    totalUserTurns: 0,
    firstUserTimestamp: null,
    latestUserTimestamp: null,
    shouldOfferRecap: false,
  }

  if (!flow || typeof flow !== 'object') return base
  const obj = flow as Partial<ConversationFlowState>

  const mergedCovered = { ...covered, ...(obj.covered || {}) }
  const merged: ConversationFlowState = {
    ...base,
    ...obj,
    covered: mergedCovered,
    evidence: obj.evidence || {},
    insights: obj.insights || {},
    coverageOrder: Array.isArray(obj.coverageOrder) ? obj.coverageOrder : [],
    recommendedNext: (obj.recommendedNext as ConversationCategory | null) ?? base.recommendedNext,
    totalUserTurns: typeof obj.totalUserTurns === 'number' ? obj.totalUserTurns : 0,
    firstUserTimestamp: typeof obj.firstUserTimestamp === 'number' || obj.firstUserTimestamp === null ? obj.firstUserTimestamp : null,
    latestUserTimestamp: typeof obj.latestUserTimestamp === 'number' || obj.latestUserTimestamp === null ? obj.latestUserTimestamp : null,
    shouldOfferRecap: typeof obj.shouldOfferRecap === 'boolean' ? obj.shouldOfferRecap : false,
  }

  return merged
}

function shouldCoverCategory(category: ConversationCategory, userText: string, assistantText: string): boolean {
  switch (category) {
    case 'goals':
      return (
        assistantText.includes('your goal') ||
        assistantText.includes('trying to achieve') ||
        (assistantText.includes('what are you') && (assistantText.includes('looking') || assistantText.includes('hoping'))) ||
        userText.includes('want to') ||
        userText.includes('trying to') ||
        userText.includes('looking to') ||
        userText.includes('hoping to') ||
        userText.includes('aim to') ||
        userText.includes('plan to')
      )
    case 'pain':
      return (
        assistantText.includes('struggling') ||
        assistantText.includes('challenge') ||
        assistantText.includes('problem') ||
        assistantText.includes('pain point') ||
        assistantText.includes('frustrating') ||
        userText.includes('struggl') ||
        userText.includes('problem') ||
        userText.includes('issue') ||
        userText.includes('challenge') ||
        userText.includes('frustrat') ||
        userText.includes('bottleneck') ||
        userText.includes('difficult')
      )
    case 'data':
      return (
        assistantText.includes('your data') ||
        (assistantText.includes('where is') && (assistantText.includes('data') || assistantText.includes('information'))) ||
        assistantText.includes('stored') ||
        assistantText.includes('crm') ||
        assistantText.includes('spreadsheet') ||
        userText.includes('data') ||
        userText.includes('spreadsheet') ||
        userText.includes('csv') ||
        userText.includes('crm') ||
        userText.includes('database') ||
        userText.includes('excel') ||
        userText.includes('stored') ||
        userText.includes('files')
      )
    case 'readiness':
      return (
        assistantText.includes('your team') ||
        assistantText.includes('buy-in') ||
        assistantText.includes('adoption') ||
        assistantText.includes('change management') ||
        assistantText.includes('champion') ||
        userText.includes('team') ||
        userText.includes('buy-in') ||
        userText.includes('adopt') ||
        userText.includes('workflow') ||
        userText.includes('change') ||
        userText.includes('champion') ||
        userText.includes('stakeholder')
      )
    case 'budget':
      return (
        assistantText.includes('budget') ||
        assistantText.includes('investment') ||
        assistantText.includes('timeline') ||
        ((assistantText.includes('when') && (assistantText.includes('need') || assistantText.includes('start')))) ||
        assistantText.includes('quarter') ||
        userText.includes('budget') ||
        userText.includes('cost') ||
        userText.includes('price') ||
        userText.includes('invest') ||
        userText.includes('spend') ||
        userText.includes('timeline') ||
        userText.includes('quarter') ||
        userText.includes('q1') ||
        userText.includes('q2') ||
        userText.includes('q3') ||
        userText.includes('q4') ||
        (userText.includes('by ') && (userText.includes('202') || userText.includes('jan') || userText.includes('feb')))
      )
    case 'success':
      return (
        assistantText.includes('success') ||
        assistantText.includes('metric') ||
        assistantText.includes('measure') ||
        assistantText.includes('roi') ||
        assistantText.includes('kpi') ||
        assistantText.includes('outcome') ||
        userText.includes('success') ||
        userText.includes('metric') ||
        userText.includes('measure') ||
        userText.includes('roi') ||
        userText.includes('kpi') ||
        userText.includes('result') ||
        userText.includes('outcome') ||
        userText.includes('expect')
      )
  }
}

function updateConversationFlowFromMessages(
  flowInput: unknown,
  messages: Array<{ role: 'user' | 'assistant'; content: string; id?: string; timestamp?: unknown }>
): ConversationFlowState {
  const flow = ensureConversationFlowState(flowInput)

  const lastUser = [...messages].reverse().find(m => m.role === 'user')
  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')

  const userText = (lastUser?.content || '').toLowerCase()
  const assistantText = (lastAssistant?.content || '').toLowerCase()

  const userTurns = messages.filter(m => m.role === 'user')
  flow.totalUserTurns = userTurns.length

  const firstUser = userTurns[0]
  const latestUser = userTurns[userTurns.length - 1]
  flow.firstUserTimestamp = firstUser ? parseTimestamp(firstUser.timestamp) : null
  flow.latestUserTimestamp = latestUser ? parseTimestamp(latestUser.timestamp) : null
  flow.shouldOfferRecap = flow.totalUserTurns >= 6

  const markCovered = (category: ConversationCategory) => {
    if (flow.covered[category]) return
    flow.covered[category] = true

    if (lastUser?.content) {
      if (!flow.evidence[category]) flow.evidence[category] = []
      flow.evidence[category] = [...(flow.evidence[category] || []), lastUser.content].slice(-6)
    }

    if (!flow.insights[category]) {
      flow.insights[category] = {
        firstTurnIndex: Math.max(0, flow.totalUserTurns - 1),
        firstMessageId: lastUser?.id || lastAssistant?.id || '',
        firstTimestamp: parseTimestamp(lastUser?.timestamp ?? lastAssistant?.timestamp) ?? null,
      }
      flow.coverageOrder = [
        ...flow.coverageOrder,
        { category, ...(flow.insights[category] as any) },
      ]
    }
  }

  for (const category of CONVERSATION_CATEGORIES) {
    if (!flow.covered[category] && shouldCoverCategory(category, userText, assistantText)) {
      markCovered(category)
    }
  }

  const next = CONVERSATION_CATEGORIES.find(category => !flow.covered[category]) || null
  flow.recommendedNext = next

  return flow
}

function agentNameForStage(stage: FunnelStage): string {
  switch (stage) {
    case 'SCORING':
      return 'Scoring Agent'
    case 'CLOSING':
    case 'BOOKING_REQUESTED':
    case 'BOOKED':
      return 'Closer Agent'
    case 'SUMMARY':
      return 'Summary Agent'
    case 'PROPOSAL':
      return 'Proposal Agent'
    case 'WORKSHOP_PITCH':
      return 'Workshop Sales Agent'
    case 'CONSULTING_PITCH':
      return 'Consulting Sales Agent'
    case 'RETARGETING':
      return 'Retargeting Agent'
    case 'DISCOVERY':
    case 'QUALIFIED':
    case 'PITCHING':
    case 'INTELLIGENCE_GATHERING':
    default:
      return 'Discovery Agent'
  }
}

/**
 * Metadata-only Agent Stage Endpoint
 * 
 * Purpose: Returns agent routing metadata WITHOUT generating text response.
 * Used by voice mode to sync with orchestrator without duplicate responses.
 * 
 * Returns: { stage, agent, conversationFlow, recommendedNext, metadata }
 * Does NOT return: output text (prevents "two voices" issue)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  logger.debug('[API /agent-stage] Request received', { method: req.method });

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { messages, sessionId, intelligenceContext, conversationFlow, trigger } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate and normalize messages (strip attachments; keep id/timestamp for flow tracking)
    const validMessages = (messages as IncomingMessage[])
      .filter((m) => m?.role && (m?.content || m?.attachments))
      .map((m) => ({
        id: typeof m.id === 'string' ? m.id : undefined,
        timestamp: m.timestamp,
        role: m.role === 'model' ? 'assistant' : m.role,
        content: typeof m.content === 'string' ? m.content : '',
      }))
      .filter((m) => m.role === 'user' || m.role === 'assistant');

    if (validMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages found' });
    }

    // Determine stage
    const currentStage = determineCurrentStage(intelligenceContext, trigger);

    // Metadata-only: update conversation flow heuristically from transcript messages.
    // This keeps voice sessions in sync without generating a second text response.
    const enhancedFlow = updateConversationFlowFromMessages(
      conversationFlow,
      validMessages as Array<{ role: 'user' | 'assistant'; content: string; id?: string; timestamp?: unknown }>
    )
    const recommendedNext = enhancedFlow.recommendedNext || null

    // Persist stage and flow to database (non-blocking)
    try {
      const agent = agentNameForStage(currentStage)
      await contextStorage.update(sessionId, {
        last_agent: agent,
        last_stage: currentStage,
        conversation_flow: enhancedFlow as any,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      logger.debug('[agent-stage] Context persistence failed (non-fatal)', { error: err });
    }

    const duration = Date.now() - startTime;
    const categoriesCovered = CONVERSATION_CATEGORIES.filter(cat => enhancedFlow.covered?.[cat]).length
    const agent = agentNameForStage(currentStage)

    logger.info('[API /agent-stage] Metadata returned', {
      sessionId,
      stage: currentStage,
      agent,
      duration,
      recommendedNext
    });

    // Return metadata only - NO output text
    return res.status(200).json({
      success: true,
      stage: currentStage,
      agent,
      conversationFlow: enhancedFlow,
      recommendedNext,
      metadata: {
        // Include useful metadata for client
        leadScore: intelligenceContext?.leadScore,
        fitScore: intelligenceContext?.fitScore,
        categoriesCovered,
        multimodalUsed: false,
        triggerBooking: false,
        // Performance tracking
        processingTime: duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[API /agent-stage] Error:', error instanceof Error ? error : undefined);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      processingTime: duration
    });
  }
}
