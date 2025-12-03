import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { supabaseService } from 'src/core/supabase/client'

interface LogRow {
  id: string
  timestamp: string
  level: string
  message: string
  service?: string
  meta?: Record<string, unknown>
}

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
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

  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'all' // 'all', 'admin', 'production'
    const level = searchParams.get('level') // 'debug', 'info', 'warn', 'error'
    const service = searchParams.get('service')
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    const logs: Array<{
      id: string
      timestamp: string
      level: string
      message: string
      service?: string
      source: 'admin' | 'production'
      metadata?: Record<string, unknown>
    }> = []

    // Get admin logs (in-memory) - NOTE: adminMonitoring is not yet ported, so we skip this part or use a stub if available
    // if (source === 'all' || source === 'admin') {
    //   const adminLogs = adminMonitoring.getRecentLogs(limit)
    //   logs.push(...adminLogs.map((log) => ({
    //     id: log.id,
    //     timestamp: log.timestamp,
    //     level: log.statusCode >= 400 ? 'error' : log.error ? 'warn' : 'info',
    //     message: `${log.method} ${log.action} - ${log.statusCode} (${log.duration}ms)`,
    //     service: 'admin-api',
    //     source: 'admin' as const,
    //     metadata: {
    //       endpoint: log.endpoint,
    //       userEmail: log.userEmail,
    //       ipAddress: log.ipAddress,
    //       error: log.error,
    //     },
    //   })))
    // }

    // Get production logs from database
    if (source === 'all' || source === 'production') {
      const supabase = ensureSupabase()
      let query = supabase
        .from('logs')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limit)

      if (level) {
        query = query.eq('level', level)
      }

      if (service) {
        query = query.eq('service', service)
      }

      const { data: prodLogsRaw, error } = await query

      if (!error && prodLogsRaw && Array.isArray(prodLogsRaw)) {
        const prodLogs = prodLogsRaw as LogRow[]
        logs.push(...prodLogs.map((log) => {
          // Create base object with required properties
          const entry: {
            id: string
            timestamp: string
            level: string
            message: string
            service?: string
            source: 'admin' | 'production'
            metadata?: Record<string, unknown>
          } = {
            id: log.id,
            timestamp: log.timestamp,
            level: log.level,
            message: log.message,
            source: 'production',
          }
          
          // Conditionally add optional properties
          if (log.service) {
            entry.service = log.service
          }
          
          if (log.meta) {
            entry.metadata = log.meta
          }
          
          return entry
        }))
      }
    }

    // Sort by timestamp (newest first) and limit
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    const limitedLogs = logs.slice(0, limit)

    return Response.json({
      logs: limitedLogs,
      total: limitedLogs.length,
      source,
    })
  } catch (error) {
    console.error('Logs API error:', error)
    return Response.json({ error: 'Failed to fetch logs' }, { status: 500 })
  }
}
