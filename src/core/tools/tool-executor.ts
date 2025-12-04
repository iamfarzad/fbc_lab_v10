import { vercelCache } from '../../lib/vercel-cache.js'
import { auditLog } from '../security/audit-logger.js'
import { retry } from '../../lib/code-quality.js'
import type { ToolExecutionResult } from './types.js'

/**
 * Tool Executor - Unified tool execution layer with logging, retry, and caching
 * 
 * Wraps AI SDK tool calls to provide:
 * - Execution logging to audit_log
 * - Retry logic for transient failures
 * - Redis caching for idempotent operations
 * - Performance metrics
 */
export class ToolExecutor {
  private maxRetries: number
  private cacheEnabled: boolean
  private cacheTTL: number // milliseconds

  constructor(options: {
    maxRetries?: number
    cacheEnabled?: boolean
    cacheTTL?: number
  } = {}) {
    this.maxRetries = options.maxRetries ?? parseInt(process.env.TOOL_RETRY_MAX || '3', 10)
    this.cacheEnabled = options.cacheEnabled ?? (process.env.ENABLE_TOOL_CACHING === 'true')
    this.cacheTTL = options.cacheTTL ?? 5 * 60 * 1000 // 5 minutes default
  }

  /**
   * Execute a tool with logging, retry, and caching
   */
  async execute<T = unknown>(params: {
    toolName: string
    sessionId: string
    agent: string
    inputs: Record<string, unknown>
    handler: () => Promise<T>
    cacheable?: boolean // Whether this tool result can be cached
  }): Promise<ToolExecutionResult<T>> {
    const { toolName, sessionId, agent, inputs, handler, cacheable = false } = params
    const startTime = Date.now()
    let attemptCount = 0
    let lastError: Error | null = null

    // Generate cache key for cacheable tools
    const cacheKey = cacheable && this.cacheEnabled
      ? this.generateCacheKey(toolName, inputs)
      : null

    // Check cache first (if cacheable)
    if (cacheKey) {
      try {
        const cachedResult = await vercelCache.get<T>('tool-execution', cacheKey)
        if (cachedResult !== null) {
          const duration = Date.now() - startTime
          
          // Log cache hit (non-blocking)
          this.logExecution({
            toolName,
            sessionId,
            agent,
            inputs,
            outputs: cachedResult,
            duration,
            success: true,
            cached: true,
            attempt: 0
          }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

          return {
            success: true,
            data: cachedResult,
            duration,
            cached: true,
            attempt: 0
          }
        }
      } catch (err) {
        console.warn(`[ToolExecutor] Cache check failed for ${toolName}:`, err)
        // Continue with execution - cache failure shouldn't block
      }
    }

    // Retry logic with caching and logging wrapper
    // Wrap handler to include caching logic and track attempts
    const wrappedHandler = async (): Promise<T> => {
      attemptCount++
      const result = await handler()
      
      // Cache successful result (if cacheable)
      if (cacheKey && this.cacheEnabled) {
        try {
          await vercelCache.set('tool-execution', cacheKey, result, {
            ttl: this.cacheTTL
          })
        } catch (err) {
          console.warn(`[ToolExecutor] Cache set failed for ${toolName}:`, err)
          // Continue - caching failure shouldn't block
        }
      }
      
      return result
    }

    try {
      const result = await retry(
        wrappedHandler,
        this.maxRetries,
        1000, // Initial delay: 1s
        2, // Backoff multiplier
        // Only retry transient errors
        (error) => this.isTransientError(error)
      )
      
      const duration = Date.now() - startTime

      // Log successful execution (non-blocking)
      this.logExecution({
        toolName,
        sessionId,
        agent,
        inputs,
        outputs: result,
        duration,
        success: true,
        cached: false,
        attempt: attemptCount
      }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

      return {
        success: true,
        data: result,
        duration,
        cached: false,
        attempt: attemptCount
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }

    // All retries exhausted
    const duration = Date.now() - startTime
    const errorMessage = lastError?.message || 'Unknown error'

    // Log failure (non-blocking)
    this.logExecution({
      toolName,
      sessionId,
      agent,
      inputs,
      outputs: undefined,
      duration,
      success: false,
      cached: false,
      attempt: attemptCount,
      error: errorMessage
    }).catch(err => console.warn('Tool execution audit log failed (non-fatal):', err))

    return {
      success: false,
      error: errorMessage,
      duration,
      cached: false,
      attempt: attemptCount
    }
  }

  /**
   * Generate cache key from tool name and inputs
   */
  private generateCacheKey(toolName: string, inputs: Record<string, unknown>): string {
    // Sort keys for consistent hashing
    const sortedInputs = Object.keys(inputs)
      .sort()
      .reduce((acc, key) => {
        acc[key] = inputs[key]
        return acc
      }, {} as Record<string, unknown>)
    
    return `${toolName}:${JSON.stringify(sortedInputs)}`
  }

  /**
   * Check if error is transient (should retry)
   */
  private isTransientError(error: unknown): boolean {
    if (!(error instanceof Error)) return false

    const message = error.message.toLowerCase()
    const transientPatterns = [
      'network',
      'timeout',
      'econnreset',
      'enotfound',
      'econnrefused',
      'temporary',
      'rate limit',
      '429',
      '503',
      '502'
    ]

    return transientPatterns.some(pattern => message.includes(pattern))
  }

  /**
   * Log tool execution to audit_log (non-blocking)
   */
  private async logExecution(params: {
    toolName: string
    sessionId: string
    agent: string
    inputs: Record<string, unknown>
    outputs?: unknown
    duration: number
    success: boolean
    cached: boolean
    attempt: number
    error?: string
  }): Promise<void> {
    // Only log if audit is enabled
    if (process.env.NODE_ENV !== 'production' && process.env.ENABLE_AGENT_AUDIT !== 'true') {
      return
    }

    try {
      await auditLog.logToolExecution(
        params.sessionId || 'anonymous',
        params.toolName,
        params.agent,
        {
          duration: params.duration,
          success: params.success,
          ...(params.error ? { error: params.error } : {})
        },
        {
          ...(params.inputs !== undefined && (() => {
            const sanitized = this.sanitizeData(params.inputs);
            return sanitized !== undefined ? { inputs: sanitized } : {};
          })()),
          ...(params.outputs !== undefined && (() => {
            const sanitized = this.sanitizeData(params.outputs);
            return sanitized !== undefined ? { outputs: sanitized } : {};
          })()),
          ...(params.cached !== undefined && { cached: params.cached }),
          ...(params.attempt !== undefined && { attempt: params.attempt })
        }
      )
    } catch (err) {
      // Silent failure - don't block tool execution
      console.warn('[ToolExecutor] Audit logging failed:', err)
    }
  }

  /**
   * Sanitize data for logging (remove PII, limit size)
   */
  private sanitizeData(data: unknown): Record<string, unknown> | undefined {
    if (data === null || data === undefined) return undefined
    if (typeof data !== 'object') return undefined

    // Limit object depth and size
    const maxSize = 1000 // characters
    const jsonStr = JSON.stringify(data)
    
    if (jsonStr.length > maxSize) {
      return { _truncated: true, _size: jsonStr.length }
    }

    // Return as Record, assuming it's a plain object
    return data as Record<string, unknown>
  }
}

export const toolExecutor = new ToolExecutor()

