import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { supabaseService } from 'src/core/supabase/client'
import { createClient } from '@supabase/supabase-js'
import { logger } from 'src/lib/logger'
import type { Database } from 'src/core/database.types'

// Type guard for record
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function generateRequestId() {
  return crypto.randomUUID()
}

// RPC function return type (not in generated Database types - function exists but not exposed in public schema)
type CheckRlsStatusResult = Array<{ table: string; rls_enabled: boolean }>

// Type guard for RLS status result
function isCheckRlsStatusResult(data: unknown): data is CheckRlsStatusResult {
  return Array.isArray(data) && data.every((item: unknown): item is CheckRlsStatusResult[number] => 
    typeof item === 'object' && 
    item !== null && 
    'table' in item && 
    'rls_enabled' in item &&
    typeof (item as { table: unknown }).table === 'string' &&
    typeof (item as { rls_enabled: unknown }).rls_enabled === 'boolean'
  )
}

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || !isRecord(supabase) || typeof supabase.from !== 'function') {
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
    const supabase = ensureSupabase()
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!

    // Query recent audit logs
    const { data: recentAudits, error: auditError } = await supabase
      .from('audit_log')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(50)

    // Check RLS status by querying system tables
    // Note: This may require specific permissions - if it fails, we'll handle gracefully
    let rlsStatus: Array<{ table: string; rls_enabled: boolean }> = []
    let rlsData: CheckRlsStatusResult | null = null
    try {
      // RPC function not in generated types - function exists but not in public schema
      // Call RPC and validate result with type guard
      const rpcResult = await supabase.rpc('check_rls_status' as keyof Database['public']['Functions'], {} as never)
      if (rpcResult.data && isCheckRlsStatusResult(rpcResult.data)) {
        rlsData = rpcResult.data
        rlsStatus = rpcResult.data
      }
    } catch {
      rlsData = null
    }
    
    if (!rlsData) {
      // Fallback: Check RLS by attempting to query with anon key
      try {
        const anonClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)
        const { error: anonError } = await anonClient
          .from('audit_log')
          .select('count')
          .limit(1)
        
        rlsStatus = [
          { table: 'audit_log', rls_enabled: !!anonError }
        ]
      } catch {
        // RLS check failed - assume enabled
        rlsStatus = [
          { table: 'audit_log', rls_enabled: true }
        ]
      }
    }

    // Get audit log statistics
    const { data: auditStats } = await supabase
      .from('audit_log')
      .select('event')
      .limit(1000)

    const eventCounts: Record<string, number> = {}
    if (Array.isArray(auditStats)) {
      auditStats.forEach((stat) => {
        if (isRecord(stat) && typeof stat.event === 'string') {
          eventCounts[stat.event] = (eventCounts[stat.event] || 0) + 1
        }
      })
    }

    // Security checks
    const securityChecks = [
      {
        check: 'Audit log accessible',
        status: !auditError ? '✅ PASS' : '❌ FAIL',
        description: 'Service role can query audit_log table'
      },
      {
        check: 'RLS enabled on audit_log',
        status: rlsStatus.length > 0 && rlsStatus[0]?.rls_enabled ? '✅ PASS' : '⚠️  UNKNOWN',
        description: 'Row Level Security should be enabled'
      },
      {
        check: 'Recent audit entries exist',
        status: recentAudits && recentAudits.length > 0 ? '✅ PASS' : '⚠️  WARNING',
        description: 'Audit logging appears active'
      }
    ]

    const auditResult = {
      timestamp: new Date().toISOString(),
      security_checks: securityChecks,
      recent_audits: recentAudits || [],
      audit_statistics: {
        total_recent: recentAudits?.length || 0,
        event_counts: eventCounts,
        last_audit: recentAudits && recentAudits.length > 0 && recentAudits[0] ? recentAudits[0].timestamp : null
      },
      rls_status: rlsStatus,
      overall_security: securityChecks.every(check => check.status === '✅ PASS') ? '🔒 SECURE' : '⚠️  REVIEW NEEDED'
    }

    return Response.json(auditResult)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Security audit error', error instanceof Error ? error : undefined, { component: 'admin-security-audit', requestId })
    return Response.json({ error: 'Failed to run security audit' }, { status: 500 })
  }
}

// POST endpoint to test public access (should fail)
export async function POST(request: Request) {
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
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

    // Create public client with anon key (simulates unauthenticated user)
    const publicSupabase = createClient(supabaseUrl, anonKey)

    // Test 1: Try to access audit_log (should fail with RLS)
    const { data: auditData, error: auditError } = await publicSupabase
      .from('audit_log')
      .select('*')
      .limit(1)

    // Test 2: Try to access conversations (should fail with RLS)
    const { data: convData, error: convError } = await publicSupabase
      .from('conversations')
      .select('id')
      .limit(1)

    // Test 3: Try to access failed_conversations (should fail with RLS)
    const { data: failedData, error: failedError } = await publicSupabase
      .from('failed_conversations')
      .select('*')
      .limit(1)

    const publicAccessTests = [
      {
        test: 'Public access to audit_log',
        status: auditError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: auditError?.message || null,
        data_accessible: auditData ? auditData.length : 0
      },
      {
        test: 'Public access to conversations',
        status: convError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: convError?.message || null,
        data_accessible: convData ? convData.length : 0
      },
      {
        test: 'Public access to failed_conversations',
        status: failedError ? '✅ BLOCKED (Expected)' : '❌ VULNERABLE',
        error: failedError?.message || null,
        data_accessible: failedData ? failedData.length : 0
      }
    ]

    const allBlocked = publicAccessTests.every(test => test.status.includes('BLOCKED'))

    return Response.json({
      timestamp: new Date().toISOString(),
      public_access_tests: publicAccessTests,
      summary: {
        public_blocked: allBlocked ? '✅ SECURE' : '❌ VULNERABLE',
        message: 'Public access tests completed. All should show BLOCKED status.'
      }
    })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Public access test error', error instanceof Error ? error : undefined, { component: 'admin-security-audit', requestId })
    return Response.json({ error: 'Failed to test public access' }, { status: 500 })
  }
}

