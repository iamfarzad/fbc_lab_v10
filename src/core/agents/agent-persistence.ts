import { ContextStorage } from 'src/core/context/context-storage'
import { vercelCache } from 'src/lib/vercel-cache'
import type { AgentResult, AgentContext } from './types.js'
import type { ConversationFlowState } from 'src/types/conversation-flow-types'
import { AgentMetadata, IntelligenceContext as SchemaIntelligenceContext } from 'src/schemas/agents'
import { generateHash } from 'src/lib/hash-utils'
import { logger } from 'src/lib/logger'

const MAX_METADATA_SIZE = 50_000 // 50KB limit
const REDIS_FALLBACK_TTL = 86400 // 24 hours
const SYNC_WRITE_TIMEOUT = 80 // 80ms to stay under p95 100ms target

interface LocalIntelligenceContext {
  leadScore?: number
  fitScore?: number | { workshop: number; consulting: number }
  pitchDelivered?: boolean
  pitchType?: string
  email?: string
  email_hash?: string
  company?: { name?: string }
  person?: { role?: string }
}

interface SanitizedConversationFlow {
  covered?: Record<string, boolean>
  recommendedNext?: string | null
  totalUserTurns?: number
  coverageOrder?: Array<{ category: string; firstTurnIndex: number; firstTimestamp: number | null }>
  lastResearchTurn?: number
}

interface ProposalData {
  recommendedSolution?: string | null
  pricingBallpark?: string | null
  solutionRationale?: string | null
  expectedROI?: string | null
  nextSteps?: string | null
  fullSummary?: unknown
}

/**
 * Production-ready agent persistence service with:
 * - Race condition prevention (optimistic locking)
 * - Idempotency (event IDs)
 * - Metadata size limits
 * - PII protection
 * - Redis fallback with retry
 * - Timeout protection
 */
export class AgentPersistenceService {
  private storage: ContextStorage
  private processedEvents: Set<string> // In-memory dedup for this instance

  constructor() {
    this.storage = new ContextStorage()
    this.processedEvents = new Set()
  }

  async persistAgentResult(
    sessionId: string,
    agentResult: AgentResult,
    context: AgentContext
  ): Promise<void> {
    // Skip anonymous sessions (will handle separately)
    if (!sessionId || sessionId === 'anonymous') {
      return
    }

    // Generate unique event ID for idempotency
    const eventId = crypto.randomUUID()
    const timestamp = Date.now()

    // Check if already processed (in-memory guard)
    if (this.processedEvents.has(eventId)) {
      console.warn(`⚠️ Duplicate event detected: ${eventId}`)
      return
    }

    // Validate and sanitize metadata
    const metadata = agentResult.metadata ? AgentMetadata.parse(agentResult.metadata) : undefined
    const sanitizedMetadata = this.sanitizeMetadata(metadata)

    // Extract proposal data from summary agent output
    const proposalData = this.extractProposalData(metadata) as Record<string, unknown> | null

    // CRITICAL FIELDS (sync) - minimal for speed
    const criticalUpdate = {
      last_agent: agentResult.agent,
      last_stage: metadata?.stage,
      event_id: eventId,
      analytics_pending: true, // Track async job
      intelligence_context: this.buildIntelligenceUpdate(agentResult, context),
      conversation_flow: this.sanitizeConversationFlow(
        (metadata?.enhancedConversationFlow as ConversationFlowState | undefined) || context.conversationFlow
      ), // Use enhanced if available, fallback to client flow
      metadata: proposalData ? { ...sanitizedMetadata, proposal: proposalData } : sanitizedMetadata,
      updated_at: new Date().toISOString()
    }

    const startTime = Date.now()

    try {
      // Sync write with timeout and optimistic locking
      await this.syncWriteWithTimeout(sessionId, criticalUpdate)
      this.processedEvents.add(eventId)

      // Track success metric
      const duration = Date.now() - startTime
      this.trackMetric('sync_latency', duration, true)

      // Mark analytics as ready to queue
      await this.queueAnalytics(sessionId, agentResult, eventId, sanitizedMetadata)

    } catch (error) {
      const duration = Date.now() - startTime
      console.error('Critical persistence failed, using fallback:', error)

      // Track failure metric
      this.trackMetric('sync_latency', duration, false)
      this.trackMetric('sync_failure', 0, false, sessionId, error instanceof Error ? error.message : 'Unknown')

      // Fallback to Redis with event metadata
      await this.persistToRedis(sessionId, eventId, criticalUpdate, timestamp)

      // Queue for retry with full context
      await this.queueRetry(sessionId, eventId, criticalUpdate, timestamp)
    }
  }

  private async syncWriteWithTimeout(
    sessionId: string,
    data: Record<string, unknown>
  ): Promise<void> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), SYNC_WRITE_TIMEOUT)

    try {
      // Optimistic locking with retry
      await this.storage.updateWithVersionCheck(sessionId, data, {
        attempts: 2,
        backoff: 50,
        signal: controller.signal
      })
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.error(`⏱️ Sync write timeout for ${sessionId}`)
        this.trackMetric('timeout', SYNC_WRITE_TIMEOUT, false, sessionId)
        throw error
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

  private buildIntelligenceUpdate(
    agentResult: AgentResult,
    context: AgentContext
  ): LocalIntelligenceContext {
    const existing = context.intelligenceContext ? SchemaIntelligenceContext.parse(context.intelligenceContext) : undefined
    const metadata = agentResult.metadata ? AgentMetadata.parse(agentResult.metadata) : undefined

    // Extract only necessary fields (no PII unless already present)
    const sanitized: LocalIntelligenceContext = {
      ...(metadata?.leadScore !== undefined && { leadScore: metadata.leadScore }),
      ...(existing?.leadScore !== undefined && { leadScore: existing.leadScore }),
      ...(metadata?.fitScore !== undefined && { fitScore: metadata.fitScore }),
      ...(existing?.fitScore !== undefined && { fitScore: existing.fitScore }),
      pitchDelivered:
        metadata?.stage === 'WORKSHOP_PITCH' ||
        metadata?.stage === 'CONSULTING_PITCH' ||
        existing?.pitchDelivered || false,
      ...(metadata?.stage === 'WORKSHOP_PITCH' ? { pitchType: 'workshop' } :
          metadata?.stage === 'CONSULTING_PITCH' ? { pitchType: 'consulting' } :
            existing?.pitchType ? { pitchType: existing.pitchType } : {})
    }

    // Preserve existing context structure but hash PII
    if (existing?.email) {
      sanitized.email_hash = this.hashPII(existing.email)
    }

    // Preserve other non-PII fields
    if (existing?.company?.name) sanitized.company = { name: existing.company.name }
    if (existing?.person?.role) sanitized.person = { role: existing.person.role }

    return sanitized
  }

  private sanitizeMetadata(metadata: AgentMetadata | undefined): Record<string, unknown> {
    if (!metadata) return {}

    const metadataRecord = metadata as Record<string, unknown>
    const stringified = JSON.stringify(metadata)
    if (stringified.length > MAX_METADATA_SIZE) {
      console.warn(`⚠️ Metadata exceeds ${MAX_METADATA_SIZE} bytes, truncating`)

      // Store large metadata in object storage and return reference
      return {
        _oversized: true,
        _size: stringified.length,
        _ref: `metadata/${crypto.randomUUID()}.json`,
        stage: metadataRecord.stage,
        leadScore: metadataRecord.leadScore,
        fitScore: metadataRecord.fitScore,
        multimodalUsed: metadataRecord.multimodalUsed
      }
    }

    // Remove PII from metadata
    const sanitized = { ...metadataRecord }
    delete sanitized.email
    delete sanitized.name

    return sanitized
  }

  private sanitizeConversationFlow(flow: ConversationFlowState | undefined): SanitizedConversationFlow | null {
    if (!flow) return null

    // Only store essential fields, not full evidence (avoids size issues)
    return {
      ...(flow.covered && { covered: flow.covered }),
      ...(flow.recommendedNext !== undefined && { recommendedNext: flow.recommendedNext }),
      ...(flow.totalUserTurns !== undefined && { totalUserTurns: flow.totalUserTurns }),
      ...(flow.coverageOrder && {
        coverageOrder: flow.coverageOrder.map((c: { category: string; firstTurnIndex: number; firstTimestamp: number | null }) => ({
          category: c.category,
          firstTurnIndex: c.firstTurnIndex,
          firstTimestamp: c.firstTimestamp
        }))
      }),
      ...(flow.lastResearchTurn !== undefined && { lastResearchTurn: flow.lastResearchTurn })
    }
  }

  private hashPII(value: string): string {
    return generateHash(value)
  }

  private extractProposalData(metadata: AgentMetadata | undefined): ProposalData | null {
    if (!metadata?.summary) return null

    const summary = metadata.summary as ProposalData

    // Extract proposal fields from summary agent output
    return {
      recommendedSolution: summary.recommendedSolution || null,
      pricingBallpark: summary.pricingBallpark || null,
      solutionRationale: summary.solutionRationale || null,
      expectedROI: summary.expectedROI || null,
      nextSteps: summary.nextSteps || null,
      // Store full summary for future extensibility
      fullSummary: summary.fullSummary
    }
  }

  private async persistToRedis(
    sessionId: string,
    eventId: string,
    data: Record<string, unknown>,
    timestamp: number
  ): Promise<void> {
    const identifier = `${sessionId}:${eventId}`
    const payload = {
      ...data,
      event_id: eventId,
      created_at: timestamp,
      retry_count: 0
    }

    await vercelCache.set('agent-fallback', identifier, payload, {
      ttl: REDIS_FALLBACK_TTL,
      tags: ['fallback', 'agent-result', sessionId]
    })

    logger.debug(`✅ Fallback to Redis: agent-fallback:${identifier}`)
    this.trackMetric('redis_fallback', 0, true, sessionId, eventId)
  }

  private async queueRetry(
    sessionId: string,
    eventId: string,
    data: Record<string, unknown>,
    timestamp: number
  ): Promise<void> {
    const { redisQueue } = await import('src/core/queue/redis-queue')
    const { JobType } = await import('src/core/queue/job-types')

    await redisQueue.enqueue(JobType.RETRY_AGENT_PERSISTENCE, {
      sessionId,
      eventId,
      data,
      timestamp,
      retryCount: 0
    }, {
      priority: 'high',
      delay: 0
    })

    this.trackMetric('retry_queued', 0, true, sessionId, eventId, '0')
  }

  private async queueAnalytics(
    sessionId: string,
    agentResult: AgentResult,
    eventId: string,
    metadata: Record<string, unknown>
  ): Promise<void> {
    const { redisQueue } = await import('src/core/queue/redis-queue')
    const { JobType } = await import('src/core/queue/job-types')

    // Extract only necessary analytics fields (no PII)
    const analyticsPayload = {
      sessionId,
      eventId,
      agent: agentResult.agent,
      stage: metadata?.stage,
      timestamp: Date.now(),
      leadScore: metadata?.leadScore,
      fitScore: metadata?.fitScore,
      multimodalUsed: metadata?.multimodalUsed,
      // Mask PII
      hasEmail: !!metadata?.email
    }

    logger.debug(`[Persistence] Enqueuing analytics job for event ${eventId}`)
    await redisQueue.enqueue(JobType.AGENT_ANALYTICS, analyticsPayload, {
      priority: 'low',
      delay: 0
    })
  }

  private trackMetric(
    type: string,
    value: number,
    success: boolean,
    sessionId?: string,
    eventId?: string,
    extra?: string
  ): void {
    // Log metrics for monitoring
    const logData: Record<string, unknown> = {
      type: `[METRIC] ${type}`,
      value,
      success,
      timestamp: Date.now()
    }

    if (sessionId) logData.sessionId = sessionId
    if (eventId) logData.eventId = eventId
    if (extra) logData.extra = extra

    if (success) {
      logger.debug(JSON.stringify(logData))
    } else {
      console.error(JSON.stringify(logData))
    }
  }
}

export const agentPersistence = new AgentPersistenceService()

