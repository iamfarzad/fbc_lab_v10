import { getSupabaseService } from '../../lib/supabase.js'
import type { ToolAnalytics } from './agent-analytics.js'
import { asJsonObject } from '../../types/json-guards.js'
import type { Json } from '../database.types.js'

const DEFAULT_TOOL_ANALYTICS: ToolAnalytics = {
  totalExecutions: 0,
  successRate: 0,
  averageDuration: 0,
  cacheHitRate: 0,
  toolBreakdown: {}
}

interface AuditLogDetails {
  toolName?: string
  cached?: boolean
  performance?: {
    success?: boolean
    duration?: number
  }
}

export class ToolAnalyticsService {
  async getToolAnalytics(
    timeRange?: { start: Date; end: Date }
  ): Promise<ToolAnalytics> {
    const supabase = getSupabaseService()
    if (!supabase) {
      console.warn('Supabase service unavailable - returning default tool analytics')
      return DEFAULT_TOOL_ANALYTICS
    }
    
    let query = supabase
      .from('audit_log')
      .select('*')
      .eq('event', 'tool_executed')
    
    if (timeRange) {
      query = query
        .gte('timestamp', timeRange.start.toISOString())
        .lte('timestamp', timeRange.end.toISOString())
    }
    
    const { data, error } = await query
    
    if (error || !data) {
      throw new Error(`Failed to fetch tool analytics: ${error?.message}`)
    }
    
    const totalExecutions = data.length
    const successCount = data.filter((log: { details: Json | null | undefined }) => {
      const details = asJsonObject(log.details) as AuditLogDetails | undefined
      return details?.performance?.success === true
    }).length
    const successRate = totalExecutions > 0 ? successCount / totalExecutions : 0
    
    const durations = data
      .map((log: { details: Json | null | undefined }) => {
        const details = asJsonObject(log.details) as AuditLogDetails | undefined
        return details?.performance?.duration
      })
      .filter((d: unknown): d is number => typeof d === 'number')
    const averageDuration = durations.length > 0 
      ? durations.reduce((a: number, b: number) => a + b, 0) / durations.length 
      : 0
    
    const cachedCount = data.filter((log: { details: Json | null | undefined }) => {
      const details = asJsonObject(log.details) as AuditLogDetails | undefined
      return details?.cached === true
    }).length
    const cacheHitRate = totalExecutions > 0 ? cachedCount / totalExecutions : 0
    
    // Tool breakdown
    const toolBreakdown: Record<string, {
      count: number
      successes: number
      durations: number[]
    }> = {}
    
    data.forEach((log: { details: Json | null | undefined }) => {
      const details = asJsonObject(log.details) as AuditLogDetails | undefined
      const toolName = details?.toolName
      if (toolName) {
        const tool = toolBreakdown[toolName] ?? (toolBreakdown[toolName] = { count: 0, successes: 0, durations: [] })
        tool.count++
        
        if (details?.performance?.success === true) {
          tool.successes++
        }
        
        const duration = details?.performance?.duration
        if (typeof duration === 'number') {
          tool.durations.push(duration)
        }
      }
    })
    
    // Calculate per-tool metrics
    const toolMetrics: Record<string, {
      count: number
      successRate: number
      averageDuration: number
    }> = {}
    
    Object.entries(toolBreakdown).forEach(([toolName, data]) => {
      toolMetrics[toolName] = {
        count: data.count,
        successRate: data.count > 0 ? data.successes / data.count : 0,
        averageDuration: data.durations.length > 0
          ? data.durations.reduce((a, b) => a + b, 0) / data.durations.length
          : 0
      }
    })
    
    return {
      totalExecutions,
      successRate,
      averageDuration,
      cacheHitRate,
      toolBreakdown: toolMetrics
    }
  }
}

export const toolAnalytics = new ToolAnalyticsService()
