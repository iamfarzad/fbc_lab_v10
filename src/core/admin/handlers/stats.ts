import { asLeadSummaries } from 'src/lib/supabase-parsers'
import { logger } from 'src/lib/logger'
import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { supabaseService } from 'src/core/supabase/client'
// import { z } from 'zod'

// Schema definition inline since '@/schemas/stats-api' might not exist
// const StatsQuery = z.object({
//   period: z.enum(['1d', '7d', '30d', '90d']).optional().default('7d')
// })

interface StatsResponse {
  totalLeads: number
  activeConversations: number
  conversionRate: number
  avgEngagementTime: number
  topAICapabilities: string[]
  recentActivity: number
  totalTokenCost: number
  scheduledMeetings: number
  avgLeadScore: number
  engagementRate: number
}

function generateRequestId() {
  return crypto.randomUUID()
}

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

  const supabase = supabaseService
  if (!supabase || typeof (supabase as { from?: (table: string) => unknown })?.from !== 'function') {
    return Response.json({
      disabled: true,
      message: 'Supabase service client unavailable',
      totals: { totalLeads: 0, conversionRate: 0, engagementRate: 0, avgLeadScore: 0 }
    }, { status: 503 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const period = (searchParams.get('period') || '7d') as '1d' | '7d' | '30d' | '90d'
    
    const now = new Date()
    const daysBack = period === '1d' ? 1 : period === '30d' ? 30 : period === '90d' ? 90 : 7
    const startDate = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000)

    // Use proper Supabase query builder
    const { data, error } = await supabase
      .from('lead_summaries')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (error) {
      const requestId = request.headers.get('x-request-id') || generateRequestId()
      logger.error('Admin stats Supabase error', error instanceof Error ? error : undefined, { component: 'admin-stats', requestId, period })
      return Response.json({ error: 'Failed to retrieve admin statistics' }, { status: 500 })
    }

    // Parse with typed helper - no direct property access
    const leadRows = asLeadSummaries(data)
    const totalLeads = leadRows.length

    // Guard math operations
    const qualifiedLeads = leadRows.filter((lead) => {
      const score = lead.lead_score
      const n = typeof score === 'number' ? score : Number(score)
      return Number.isFinite(n) && n >= 7
    }).length
    
    const conversionRate = totalLeads > 0 ? Math.round((qualifiedLeads / totalLeads) * 100) : 0

    const leadsWithAI = leadRows.filter(
      (lead) => Array.isArray(lead.ai_capabilities_shown) && lead.ai_capabilities_shown.length > 0
    ).length
    const engagementRate = totalLeads > 0 ? Math.round((leadsWithAI / totalLeads) * 100) : 0

    // Guard math for average calculation
    let sumScore = 0
    let validScores = 0
    for (const lead of leadRows) {
      const score = lead.lead_score
      const n = typeof score === 'number' ? score : Number(score)
      if (Number.isFinite(n)) {
        sumScore += n
        validScores++
      }
    }
    const avgLeadScore = validScores > 0 ? Math.round((sumScore / validScores) * 10) / 10 : 0

    // Typed record for capability counts
    const capabilityCounts = new Map<string, number>()
    for (const lead of leadRows) {
      const capabilities = lead.ai_capabilities_shown
      if (Array.isArray(capabilities)) {
        for (const capability of capabilities) {
          if (typeof capability === 'string') {
            capabilityCounts.set(capability, (capabilityCounts.get(capability) || 0) + 1)
          }
        }
      }
    }

    const topAICapabilities = Array.from(capabilityCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([capability]) => capability)

    const response: StatsResponse = {
      totalLeads,
      activeConversations: 0,
      conversionRate,
      avgEngagementTime: Math.round(avgLeadScore * 2),
      topAICapabilities,
      recentActivity: totalLeads,
      totalTokenCost: 0,
      scheduledMeetings: 0,
      avgLeadScore,
      engagementRate
    }

    return Response.json(response)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Admin stats handler error', error instanceof Error ? error : undefined, { component: 'admin-stats', requestId })
    return Response.json({ error: 'Failed to retrieve admin statistics' }, { status: 500 })
  }
}

