import { getSupabaseService } from 'src/lib/supabase'
import type { Json } from 'src/core/database.types'
import { JobType } from './job-types'
import { redisQueue } from './redis-queue'
import { vercelCache } from 'src/lib/vercel-cache'
import { DEFAULT_BACKOFF_MULTIPLIER, DEFAULT_BASE_RETRY_DELAY, DEFAULT_MAX_ATTEMPTS, calculateBackoffDelay } from 'src/lib/ai/retry-config'
import { EmailService } from 'src/core/email-service'

const MAX_RETRIES = DEFAULT_MAX_ATTEMPTS
const DEAD_LETTER_QUEUE = 'dead-letter-agent-persistence'
const PERSISTENCE_BACKOFF_CONFIG = {
  baseDelay: DEFAULT_BASE_RETRY_DELAY,
  maxDelay: 300000,
  backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER
}

/**
 * Check if an event has already been processed (for idempotency)
 */
async function checkEventProcessed(eventId: string): Promise<boolean> {
  try {
    const key = `processed-event:${eventId}`
    const exists = await vercelCache.get('processed-events', key)
    return !!exists
  } catch {
    return false
  }
}

/**
 * Mark an event as processed (for idempotency)
 */
async function markEventProcessed(eventId: string): Promise<void> {
  const key = `processed-event:${eventId}`
  await vercelCache.set('processed-events', key, { processedAt: Date.now() }, {
    ttl: 604800, // 7 days
    tags: ['processed-events']
  })
}

/**
 * Register all job handlers
 * Handlers are automatically invoked when jobs are enqueued (low-load processing)
 */
interface WALSyncPayload {
  sessionId: string
  entryId: string
  operation: string
  payload: unknown
  timestamp: string
}

interface RetryAgentPersistencePayload {
  sessionId: string
  eventId: string
  data: unknown
  retryCount: number
}

interface AgentAnalyticsPayload {
  sessionId: string
  eventId: string
  agent: string
  stage: string
  timestamp: string
  leadScore?: number
  fitScore?: number
  multimodalUsed?: boolean
  hasEmail?: boolean
}

export function registerWorkers(): void {
  // WAL Sync Worker
  redisQueue.registerHandler(JobType.WAL_SYNC, async (payload: unknown) => {
    const walPayload = payload as WALSyncPayload
    const { sessionId, entryId, operation, payload: entryPayload, timestamp } = walPayload

    const supabase = getSupabaseService()
    if (!supabase) {
      throw new Error('Supabase not configured')
    }

    // Store in Supabase wal_log table
    // Serialize payload to Json format
    const payloadJson: Json = JSON.parse(JSON.stringify(entryPayload)) as Json
    const { error } = await supabase.from('wal_log').insert({
      id: entryId,
      session_id: sessionId,
      operation,
      payload: payloadJson,
      timestamp,
      synced_at: new Date().toISOString()
    })

    if (error) {
      throw new Error(`WAL sync failed: ${error.message}`)
    }

    console.log(`✅ WAL synced to Supabase via queue: ${entryId}`)
  })

  // PDF Generation Worker (placeholder for future)
  redisQueue.registerHandler(JobType.GENERATE_PDF, async (payload: unknown) => {
    // TODO: Implement PDF generation
    console.log('PDF generation job received:', payload)
    throw new Error('PDF generation not yet implemented')
  })

  // Email Sending Worker
  redisQueue.registerHandler(JobType.SEND_EMAIL, async (payload: unknown) => {
    const emailPayload = payload as { to: string; subject: string; body: string; attachments?: Array<{ filename: string; url: string }> }
    const { to, subject, body, attachments } = emailPayload

    if (!to || !subject || !body) {
      throw new Error('Missing required email fields: to, subject, body')
    }

    try {
      // Convert attachments if provided (from URL to content)
      const emailAttachments = attachments
        ? await Promise.all(
            attachments.map(async (att) => {
              try {
                const response = await fetch(att.url)
                if (!response.ok) {
                  throw new Error(`Failed to fetch attachment: ${att.url}`)
                }
                const buffer = await response.arrayBuffer()
                return {
                  filename: att.filename,
                  content: Buffer.from(buffer),
                  contentType: response.headers.get('content-type') || 'application/octet-stream'
                }
              } catch (error) {
                console.error(`Failed to fetch attachment ${att.filename}:`, error)
                throw error
              }
            })
          )
        : undefined

      const result = await EmailService.sendEmail({
        to,
        subject,
        html: body,
        attachments: emailAttachments
      })

      console.log(`✅ Email sent successfully: ${to} (${result.emailId || 'no-id'})`)
    } catch (error) {
      console.error('Failed to send email:', error)
      throw error
    }
  })

  // Embedding Processing Worker (placeholder for future)
  redisQueue.registerHandler(JobType.PROCESS_EMBEDDING, async (payload: unknown) => {
    // TODO: Implement background embedding processing
    console.log('Embedding processing job received:', payload)
    throw new Error('Embedding processing not yet implemented')
  })

  // Retry Agent Persistence Worker
  redisQueue.registerHandler(JobType.RETRY_AGENT_PERSISTENCE, async (payload: unknown) => {
    const retryPayload = payload as RetryAgentPersistencePayload
    const { sessionId, eventId, data, retryCount } = retryPayload
    
    // Check if already processed (idempotency)
    const processed = await checkEventProcessed(eventId)
    if (processed) {
      console.log(`✅ Event already processed: ${eventId}`)
      return
    }
    
    if (retryCount >= MAX_RETRIES) {
      console.error(`❌ Max retries (${MAX_RETRIES}) reached for ${sessionId}/${eventId}`)
      
      // Move to dead letter queue for human review
      await redisQueue.enqueue(DEAD_LETTER_QUEUE, {
        ...retryPayload,
        failedAt: Date.now(),
        reason: 'max_retries_exceeded'
      }, { priority: 'high' })
      
      // Track dead letter metric
      console.error(`[METRIC] dead_letter session=${sessionId} event=${eventId} reason=max_retries_exceeded`)
      return
    }
    
    try {
      const { ContextStorage } = await import('../context/context-storage')
      const storage = new ContextStorage()
      
      // Type guard: ensure data is a valid partial context  
      // DatabaseConversationContext is an interface, import as type
      const contextData = data as unknown as Partial<import('../context/context-types').DatabaseConversationContext>
      
      // Attempt with version check
      await storage.updateWithVersionCheck(sessionId, contextData, {
        attempts: 2,
        backoff: 100
      })
      
      console.log(`✅ Retry ${retryCount + 1} successful for ${sessionId}/${eventId}`)
      
      // Mark event as processed in Redis
      await markEventProcessed(eventId)
      
      // Clear fallback from Redis
      await vercelCache.delete('agent-fallback', `${sessionId}:${eventId}`)
      
      // Clear analytics_pending flag
      await storage.update(sessionId, { analytics_pending: false })
      
    } catch (error) {
      console.error(`Retry ${retryCount + 1} failed for ${eventId}:`, error)

      const delay = calculateBackoffDelay(retryCount + 2, PERSISTENCE_BACKOFF_CONFIG)

      await redisQueue.enqueue(JobType.RETRY_AGENT_PERSISTENCE, {
        ...retryPayload,
        retryCount: retryCount + 1,
        lastError: error instanceof Error ? error.message : 'Unknown error'
      }, {
        priority: 'high',
        delay
      })

      console.log(`[METRIC] retry_queued session=${sessionId} event=${eventId} attempt=${retryCount + 1}`)
    }
  })

  // Agent Analytics Worker
  redisQueue.registerHandler(JobType.AGENT_ANALYTICS, async (payload: unknown) => {
    const analyticsPayload = payload as AgentAnalyticsPayload
    const { sessionId, eventId, agent, stage, timestamp, leadScore, fitScore, multimodalUsed, hasEmail } = analyticsPayload
    
    try {
      // Log to analytics (could be Supabase audit_log or external service)
      const supabase = getSupabaseService()
      if (supabase) {
        // Try to log to audit_log if table exists
        let error: { message?: string; code?: string } | null = null
        try {
          const result = await supabase.from('audit_log').insert({
            event: 'agent_executed',
            session_id: sessionId,
            details: {
              eventId,
              agent,
              stage,
              timestamp,
              leadScore,
              fitScore,
              multimodalUsed,
              hasEmail
            },
            created_at: new Date().toISOString()
          })
          error = result.error
        } catch {
          // Table might not exist, that's ok
          error = null
        }
        
        if (error) {
          console.warn('Failed to log to audit_log (non-fatal):', error)
        }
      }
      
      // Also mark analytics as complete in context
      const { ContextStorage } = await import('../context/context-storage')
      const storage = new ContextStorage()
      await storage.update(sessionId, { analytics_pending: false })
      
      console.log(`📊 Analytics logged: ${agent} at ${stage} for session ${sessionId}`)
    } catch (error) {
      console.error('Analytics logging failed (non-fatal):', error)
    }
  })
}

/**
 * Initialize workers (call this once on app startup)
 * For low-load scenarios, jobs process immediately when enqueued
 * No separate background processor needed
 */
export function initializeWorkers(): void {
  registerWorkers()
  console.log('✅ Queue workers initialized (immediate processing mode)')
}

/**
 * Start background queue processing (OPTIONAL - only needed for high-load scenarios)
 * For low-load, jobs process immediately when enqueued, so this is not required
 * 
 * @deprecated For low-load scenarios, use initializeWorkers() instead
 */
export async function startQueueProcessor(): Promise<void> {
  // Register all workers
  registerWorkers()

  // Process queue every 5 seconds
  const interval = setInterval(async () => {
    try {
      const processed = await redisQueue.processQueue(undefined, 10)
      if (processed > 0) {
        console.log(`🔄 Processed ${processed} jobs from queue`)
      }
    } catch (error) {
      console.error('Queue processor error:', error)
    }
  }, 5000)

  // Store interval ID for cleanup (if needed)
  const globalWithInterval = globalThis as { __queueProcessorInterval?: NodeJS.Timeout }
  globalWithInterval.__queueProcessorInterval = interval

  console.log('✅ Queue processor started (background mode)')
}

/**
 * Stop queue processing (for testing or graceful shutdown)
 */
export function stopQueueProcessor(): void {
  const globalWithInterval = globalThis as { __queueProcessorInterval?: NodeJS.Timeout }
  const interval = globalWithInterval.__queueProcessorInterval
  if (interval) {
    clearInterval(interval)
    delete globalWithInterval.__queueProcessorInterval
    console.log('🛑 Queue processor stopped')
  }
}

