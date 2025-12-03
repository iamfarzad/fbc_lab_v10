import { agentAnalytics, type SystemHealth } from 'src/core/analytics/agent-analytics'
import { toolAnalytics } from 'src/core/analytics/tool-analytics'
import { parseTimeRange } from 'src/lib/date-utils'
import { logger } from 'src/lib/logger'
import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'

function generateRequestId() {
  return crypto.randomUUID()
}

/**
 * Calculate system health metrics
 */
function calculateSystemHealth(
  agentData: Awaited<ReturnType<typeof agentAnalytics.getAnalytics>>,
  toolData: Awaited<ReturnType<typeof toolAnalytics.getToolAnalytics>>
): SystemHealth {
  const errorRate = 1 - agentData.successRate
  const avgLatency = agentData.averageDuration
  const cacheHitRate = toolData.cacheHitRate
  
  // Estimate total sessions from unique session_ids in agent executions
  // This is approximate - for exact count, would need separate query
  const totalSessions = Math.max(
    agentData.totalExecutions / 3, // Approximate: ~3 executions per session
    Object.keys(agentData.agentBreakdown).length
  )
  
  return {
    errorRate,
    avgLatency,
    cacheHitRate,
    totalSessions: Math.round(totalSessions)
  }
}

/**
 * GET /api/admin/analytics
 * 
 * Returns analytics data for agent performance, tool usage, funnel progression, and system health
 */
export async function GET(request: Request) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return Response.json({ disabled: true, message: 'Admin features require Supabase configuration' })
  }

  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '7d'
    
    const timeRange = parseTimeRange(range)
    
    // Fetch all analytics in parallel
    const [agentData, toolData, stageConversion] = await Promise.all([
      agentAnalytics.getAnalytics(undefined, timeRange),
      toolAnalytics.getToolAnalytics(timeRange),
      agentAnalytics.getStageConversion(timeRange)
    ])
    
    // Calculate system health
    const health = calculateSystemHealth(agentData, toolData)
    
    return Response.json({
      agents: agentData,
      tools: toolData,
      funnel: stageConversion,
      health,
      timeRange: {
        start: timeRange.start.toISOString(),
        end: timeRange.end.toISOString()
      }
    })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Analytics API error', error instanceof Error ? error : undefined, { component: 'admin-analytics', requestId })
    
    return Response.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch analytics' },
      { status: 500 }
    )
  }
}
