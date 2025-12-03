/**
 * Admin Logs Route - Aggregates logs from audit_log table
 * 
 * NOTE: This file is dynamically imported by admin-router.ts
 * It is NOT counted as a separate Serverless Function due to vercel.json redirects
 */

import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { supabaseService } from 'src/core/supabase/client'
import { logger } from 'src/lib/logger'

interface LogEntry {
  id: string
  timestamp: string
  level: string
  message: string
  service?: string
  source: 'admin' | 'production'
  metadata?: Record<string, unknown>
}

function generateRequestId() {
  return crypto.randomUUID()
}

// Map audit_log event to log level
function eventToLevel(event: string): 'error' | 'warn' | 'info' | 'debug' {
  const lower = event.toLowerCase()
  if (lower.includes('error') || lower.includes('fail')) return 'error'
  if (lower.includes('warn') || lower.includes('warning')) return 'warn'
  if (lower.includes('debug')) return 'debug'
  return 'info'
}

// Extract message from details JSONB
function extractMessage(details: unknown): string {
  if (!details || typeof details !== 'object') return 'No message'
  
  const obj = details as Record<string, unknown>
  
  // Try common message fields
  if (typeof obj.message === 'string') return obj.message
  if (typeof obj.error === 'string') return obj.error
  if (typeof obj.description === 'string') return obj.description
  
  // Fallback to event name or JSON string
  return JSON.stringify(details).slice(0, 200)
}

// Determine source from event or details
function determineSource(event: string, details: unknown): 'admin' | 'production' {
  const lower = event.toLowerCase()
  if (lower.includes('admin') || lower.includes('dashboard')) return 'admin'
  
  if (details && typeof details === 'object') {
    const obj = details as Record<string, unknown>
    if (obj.source === 'admin' || obj.source === 'production') {
      return obj.source as 'admin' | 'production'
    }
  }
  
  return 'production'
}

// Extract service name from event or details
function extractService(event: string, details: unknown): string | undefined {
  if (details && typeof details === 'object') {
    const obj = details as Record<string, unknown>
    if (typeof obj.service === 'string') return obj.service
    if (typeof obj.component === 'string') return obj.component
  }
  
  // Try to extract from event name
  const parts = event.split('_')
  if (parts.length > 1) {
    return parts[0]
  }
  
  return undefined
}

export async function GET(request: Request) {
  const hasSupabaseEnv = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  if (!hasSupabaseEnv) {
    return Response.json({ 
      disabled: true, 
      message: 'Admin features require Supabase configuration',
      logs: []
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
    const supabase = supabaseService
    if (!supabase || typeof (supabase as { from?: (table: string) => unknown })?.from !== 'function') {
      return Response.json({
        disabled: true,
        message: 'Supabase service client unavailable',
        logs: []
      }, { status: 503 })
    }

    const { searchParams } = new URL(request.url)
    const sourceFilter = searchParams.get('source') || 'all'
    const levelFilter = searchParams.get('level') || 'all'
    const limit = parseInt(searchParams.get('limit') || '100', 10)

    // Build query
    let query = supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(Math.min(limit, 500)) // Cap at 500 for performance

    // Execute query
    const { data, error } = await query

    if (error) {
      const requestId = request.headers.get('x-request-id') || generateRequestId()
      logger.error('Admin logs Supabase error', error instanceof Error ? error : undefined, { 
        component: 'admin-logs', 
        requestId 
      })
      return Response.json({ 
        error: 'Failed to retrieve logs',
        logs: []
      }, { status: 500 })
    }

    if (!data || !Array.isArray(data)) {
      return Response.json({ logs: [] })
    }

    // Transform audit_log entries to LogEntry format
    const logs: LogEntry[] = data
      .map((row) => {
        const event = typeof row.event === 'string' ? row.event : 'unknown'
        const details = row.details
        const level = eventToLevel(event)
        const source = determineSource(event, details)
        const service = extractService(event, details)
        const message = extractMessage(details) || event

        const logEntry: LogEntry = {
          id: typeof row.id === 'string' ? row.id : crypto.randomUUID(),
          timestamp: row.timestamp 
            ? (typeof row.timestamp === 'string' ? row.timestamp : new Date(row.timestamp).toISOString())
            : new Date().toISOString(),
          level,
          message,
          source,
          metadata: details && typeof details === 'object' 
            ? (details as Record<string, unknown>)
            : { event, raw: details }
        }
        
        // Only include service if defined (exactOptionalPropertyTypes)
        if (service !== undefined) {
          logEntry.service = service
        }
        
        return logEntry
      })
      .filter((log) => {
        // Apply filters
        if (sourceFilter !== 'all' && log.source !== sourceFilter) return false
        if (levelFilter !== 'all' && log.level !== levelFilter) return false
        return true
      })

    return Response.json({ logs })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Admin logs handler error', error instanceof Error ? error : undefined, { 
      component: 'admin-logs', 
      requestId 
    })
    return Response.json({ 
      error: 'Failed to retrieve logs',
      logs: []
    }, { status: 500 })
  }
}
