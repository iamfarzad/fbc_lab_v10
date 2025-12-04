// import { respond } from '../../lib/api/response.js' // Not used
import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { getTokenUsageByDateRange } from '../../token-usage-logger.js'
import { supabaseService } from '../../supabase/client.js'
import type { Database } from '../../database.types.js'
import { logger } from '../../../lib/logger.js'

type TokenUsageLogRow = Database['public']['Tables']['token_usage_log']['Row']
// Type for the selected fields only (matches the .select() query)
type TokenUsageSummary = Pick<TokenUsageLogRow, 'total_tokens' | 'cost' | 'model' | 'input_tokens' | 'output_tokens'>

function ensureSupabase() {
  const supabase = supabaseService
  const supabaseRecord = supabase as { from?: (table: string) => unknown } | null
  if (!supabase || typeof supabaseRecord?.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

export async function GET(request: Request) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return new Response(JSON.stringify({ disabled: true, message: 'Admin features require Supabase configuration' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
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
    const period = searchParams.get('period') || '30d'
    const model = searchParams.get('model') || undefined

    // Calculate date range
    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) // Default 30 days

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (period === '1y') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    const dailyUsage = await getTokenUsageByDateRange(startDate, now, model)

    // Get summary statistics
    const supabase = ensureSupabase()

    let summaryQuery = supabase
      .from('token_usage_log')
      .select('total_tokens, cost, model, input_tokens, output_tokens')
      .gte('timestamp', startDate.toISOString())

    if (model) {
      summaryQuery = summaryQuery.eq('model', model)
    }

    const { data: allEntries, error } = await summaryQuery

    if (error) {
      logger.error('Error fetching token usage summary', error instanceof Error ? error : undefined, { period, model })
      return new Response(JSON.stringify({
        dailyUsage,
        summary: {
          total_tokens: 0,
          total_cost: 0,
          total_sessions: 0,
          avg_cost_per_session: 0,
          by_model: {}
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Calculate summary
    const summary = {
      total_tokens: 0,
      total_cost: 0,
      total_sessions: new Set<string>(),
      avg_cost_per_session: 0,
      by_model: {} as Record<string, { tokens: number; cost: number; count: number }>
    }

    allEntries?.forEach((entry: TokenUsageSummary) => {
      const tokens = entry.total_tokens || 0
      const cost = Number(entry.cost || 0)

      summary.total_tokens += tokens
      summary.total_cost += cost

      if (entry.model) {
        if (!summary.by_model[entry.model]) {
          summary.by_model[entry.model] = { tokens: 0, cost: 0, count: 0 }
        }
        const modelEntry = summary.by_model[entry.model]
        if (modelEntry) {
          modelEntry.tokens += tokens
          modelEntry.cost += cost
          modelEntry.count += 1
        }
      }
    })

    summary.avg_cost_per_session = summary.total_cost / Math.max(1, allEntries?.length || 1)

    return new Response(JSON.stringify({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      dailyUsage,
      summary: {
        total_tokens: summary.total_tokens,
        total_cost: summary.total_cost,
        total_entries: allEntries?.length || 0,
        avg_cost_per_entry: summary.avg_cost_per_session,
        by_model: summary.by_model
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Token costs error', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Failed to fetch token costs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

