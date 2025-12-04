import { vercelCache } from '../../lib/vercel-cache.js'
import { Job, JobOptions, JobPriority, JobHandler } from './job-types.js'
import { DEFAULT_BASE_RETRY_DELAY, DEFAULT_MAX_ATTEMPTS, calculateBackoffDelay } from '../../lib/ai/retry-config.js'
import { logger } from '../../lib/logger.js'

const QUEUE_PREFIX = 'queue'

interface QueueItem {
  jobId: string
  createdAt: number
  [key: string]: unknown
}
const QUEUE_MAX_ATTEMPTS = Math.min(3, DEFAULT_MAX_ATTEMPTS)
const QUEUE_BACKOFF_CONFIG = {
  baseDelay: DEFAULT_BASE_RETRY_DELAY,
  maxDelay: 15000,
  backoffMultiplier: 5,
} as const

/**
 * Lightweight Redis-based job queue
 * Uses existing Redis/Upstash infrastructure
 */
export class RedisQueue {
  private handlers: Map<string, JobHandler> = new Map()

  /**
   * Enqueue a job to be processed
   * For low-load scenarios, processes immediately asynchronously
   */
  async enqueue<T extends Record<string, unknown>>(
    jobType: string,
    payload: T,
    options: JobOptions = {}
  ): Promise<string> {
    const jobId = crypto.randomUUID()
    const job: Job<T> = {
      id: jobId,
      type: jobType,
      payload,
      priority: options.priority || 'medium',
      createdAt: Date.now(),
      attempts: 0,
      maxAttempts: options.maxAttempts || QUEUE_MAX_ATTEMPTS,
    }

    const queueKey = this.getQueueKey(jobType, job.priority)

    // Add to priority queue (sorted by creation time)
    try {
      // Store job data (payload is already typed as Record<string, unknown>)
      const jobData: Job<T> = {
        ...job,
        payload: payload,
      }
      await vercelCache.set('queue_job', jobId, jobData, { ttl: 86400 }) // 24h TTL

      // Add to priority queue (use a list sorted by priority and creation time)
      const queueListKey = `${queueKey}:list`

      // Use a sorted set approach - store priority+timestamp as score
      // For simplicity, we'll use a list and sort on retrieval
      const queueData = {
        jobId,
        type: jobType,
        priority: job.priority,
        createdAt: job.createdAt,
        delay: options.delay || 0,
      }

      const queue = await vercelCache.get<typeof queueData[]>('queue_list', queueListKey) || []
      queue.push(queueData)
      queue.sort((a, b) => {
        const scoreA = this.getPriorityScore(a.priority, a.createdAt)
        const scoreB = this.getPriorityScore(b.priority, b.createdAt)
        return scoreB - scoreA // Higher priority first
      })
      await vercelCache.set('queue_list', queueListKey, queue, { ttl: 86400 })

      logger.debug(`✅ Job enqueued: ${jobType} (${jobId.substring(0, 8)}...) [priority: ${job.priority}]`)

      // For low-load scenarios: Process immediately asynchronously (non-blocking)
      // This avoids needing a separate background processor
      if (options.delay === undefined || options.delay === 0) {
        this.processJob(job).catch(err => {
          console.error(`Failed to process job immediately: ${jobType}`, err)
          // Job will be retried via processQueue() if needed
        })
      }

      return jobId
    } catch (error) {
      console.error(`❌ Failed to enqueue job ${jobType}:`, error)
      throw error
    }
  }

  /**
   * Register a handler for a job type
   */
  registerHandler<T>(jobType: string, handler: JobHandler<T>): void {
    this.handlers.set(jobType, handler as JobHandler)
    logger.debug(`✅ Handler registered for job type: ${jobType}`)
  }

  /**
   * Process a single job
   */
  private async processJob(job: Job): Promise<boolean> {
    const handler = this.handlers.get(job.type)
    if (!handler) {
      // Race condition fix: If handler is missing, it might be because workers are still initializing asynchronously
      // Wait 500ms and try one more time before failing
      if (job.attempts === 0) {
        logger.debug(`⚠️ No handler for ${job.type} yet, waiting for initialization...`)
        await new Promise(resolve => setTimeout(resolve, 500))
        const retryHandler = this.handlers.get(job.type)
        if (retryHandler) {
          logger.debug(`✅ Handler for ${job.type} found after wait`)
          // Recursive call with the found handler
          return this.processJob(job)
        }
      }

      console.warn(`⚠️ No handler registered for job type: ${job.type}`)
      return false
    }

    try {
      await handler(job.payload, job)

      // Job succeeded - remove from queue
      await this.removeJobFromQueue(job.type, job.id)
      logger.debug(`✅ Job processed successfully: ${job.type} (${job.id.substring(0, 8)}...)`)
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error(`❌ Job failed: ${job.type} (${job.id.substring(0, 8)}...):`, errorMessage)

      job.attempts += 1
      job.error = errorMessage

      if (job.attempts >= job.maxAttempts) {
        console.error(`❌ Job exceeded max attempts: ${job.type} (${job.id})`)
        await this.removeJobFromQueue(job.type, job.id)
        // Could emit failure event here for monitoring
        return false
      }

      // Retry with exponential backoff (queue-specific: re-enqueue with delay)
      // This is different from retry() in @/lib/code-quality which retries synchronously
      // Queue jobs need to be re-enqueued with a delay, not retried immediately
      const delay = calculateBackoffDelay(job.attempts, QUEUE_BACKOFF_CONFIG)
      logger.debug(`🔄 Retrying job ${job.type} (${job.id.substring(0, 8)}...) after ${delay}ms (attempt ${job.attempts}/${job.maxAttempts})`)

      // Update job and re-enqueue with delay
      await vercelCache.set('queue_job', job.id, job, { ttl: 86400 })
      await this.reEnqueueWithDelay(job.type, job.id, delay)

      return false
    }
  }

  /**
   * Process pending jobs for a specific job type
   */
  async processQueue(jobType?: string, limit: number = 10): Promise<number> {
    const processed: string[] = []

    try {
      // Get all job types if none specified
      const jobTypes = jobType ? [jobType] : Array.from(this.handlers.keys())

      for (const type of jobTypes) {
        const queueListKey = this.getQueueListKey(type)
        const queue = await vercelCache.get<Array<{ jobId: string; priority: JobPriority; createdAt: number; delay: number }>>('queue_list', queueListKey) || []

        // Filter ready jobs (delay passed)
        const now = Date.now()
        const readyJobs = queue.filter(j => now >= j.createdAt + j.delay).slice(0, limit)

        for (const queueItem of readyJobs) {
          // Get job data
          const job = await vercelCache.get<Job>('queue_job', queueItem.jobId)
          if (!job) {
            // Job data missing - remove from queue
            await this.removeJobFromQueue(type, queueItem.jobId)
            continue
          }

          // Process the job
          const success = await this.processJob(job)
          if (success) {
            processed.push(queueItem.jobId)
          }
        }
      }

      return processed.length
    } catch (error) {
      console.error('Error processing queue:', error)
      return processed.length
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(jobType?: string): Promise<{ pending: number; processing: number }> {
    // Simplified stats - count items in queue lists
    let pending = 0

    try {
      const jobTypes = jobType ? [jobType] : Array.from(this.handlers.keys())

      for (const type of jobTypes) {
        const queueListKey = this.getQueueListKey(type)
        const queue = await vercelCache.get<Array<{ jobId: string; type: string; priority: JobPriority; createdAt: number; delay?: number }>>('queue_list', queueListKey) || []
        pending += queue.length
      }
    } catch (error) {
      console.warn('Failed to get queue stats:', error)
    }

    return { pending, processing: 0 }
  }

  // Private helpers
  private getQueueKey(jobType: string, priority: JobPriority): string {
    return `${QUEUE_PREFIX}:${jobType}:${priority}`
  }

  private getQueueListKey(jobType: string): string {
    return `${QUEUE_PREFIX}:${jobType}:list`
  }

  private getPriorityScore(priority: JobPriority, timestamp: number): number {
    // Higher score = higher priority
    const priorityValues = { high: 3, medium: 2, low: 1 }
    // Combine priority with timestamp (newer jobs have slightly higher score)
    return priorityValues[priority] * 1000000000000 + (Date.now() - timestamp)
  }

  private async removeJobFromQueue(jobType: string, jobId: string): Promise<void> {
    const queueListKey = this.getQueueListKey(jobType)
    const queue = await vercelCache.get<QueueItem[]>('queue_list', queueListKey) || []
    const filtered = queue.filter(item => item.jobId !== jobId)
    await vercelCache.set('queue_list', queueListKey, filtered, { ttl: 86400 })
  }

  private async reEnqueueWithDelay(jobType: string, jobId: string, delay: number): Promise<void> {
    const queueListKey = this.getQueueListKey(jobType)
    const queue = await vercelCache.get<QueueItem[]>('queue_list', queueListKey) || []
    const item = queue.find(item => item.jobId === jobId)
    if (item) {
      item.createdAt = Date.now() + delay // Schedule for future
      await vercelCache.set('queue_list', queueListKey, queue, { ttl: 86400 })
    }
  }
}

// Singleton instance
// Workers are auto-initialized on first import (lazy initialization)
let workersInitialized = false

export const redisQueue = new RedisQueue()

// Auto-initialize workers on module load (for low-load immediate processing)
if (typeof window === 'undefined') {
  // Only in server-side context
  import('./workers').then(({ initializeWorkers }) => {
    if (!workersInitialized) {
      initializeWorkers()
      workersInitialized = true
    }
  }).catch(err => {
    console.warn('Failed to auto-initialize queue workers:', err)
  })
}

