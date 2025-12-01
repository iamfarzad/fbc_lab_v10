// import { respond } from 'src/core/lib/api/response' // Not used
import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { adminChatService } from 'src/core/admin/admin-chat-service'
import { supabaseService } from 'src/core/supabase/client'
// TODO: Import parseJsonRequest when available
// import { parseJsonRequest } from 'src/lib/json'
import { z } from 'zod'
// TODO: Import asAdminSession when supabase-parsers is available
// import { asAdminSession } from 'src/lib/supabase-parsers'
// TODO: Import schemas when available
// import type { AdminSessionRow } from 'src/schemas/supabase'
// import { SessionsQuerySchema, SessionsPostBodySchema } from 'src/schemas/admin'
import { logger } from 'src/lib/logger'
import type { Database } from 'src/core/database.types'

// Use generated Database types for admin schema
type AdminSessionUpdate = Database['admin']['Tables']['admin_sessions']['Update']

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof (supabase as { from?: (table: string) => unknown })?.from !== 'function') {
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
    ensureSupabase()
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const adminId = searchParams.get('adminId') ?? undefined
    // Note: adminChatService is a stub, returns empty array
    const sessionsRaw = await adminChatService.getAdminSessions(adminId)
    const sessions = Array.isArray(sessionsRaw) ? sessionsRaw.slice(0, limit) : []
    return new Response(JSON.stringify({ sessions }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Admin sessions GET error', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Failed to retrieve sessions' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function POST(request: Request) {
  const rateLimitResult = adminRateLimit(request)
  if (rateLimitResult) {
    return rateLimitResult
  }

  const authResult = await adminAuthMiddleware(request)
  if (authResult) {
    return authResult
  }

  try {
    ensureSupabase()
    const body = await request.json() as { sessionId?: string; adminId?: string; sessionName?: string }

    // Note: adminChatService is a stub, will throw error
    try {
      const session = await adminChatService.getOrCreateSession(body.sessionId || `session-${Date.now()}`, body.adminId, body.sessionName)
      return new Response(JSON.stringify({ session }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      // Stub implementation throws error - return placeholder
      const session = { id: body.sessionId || `session-${Date.now()}`, adminId: body.adminId, name: body.sessionName }
      return new Response(JSON.stringify({ session, note: 'Stub implementation - not fully functional' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ error: `Invalid request: ${error.issues.map((e: z.ZodIssue) => e.message).join(', ')}` }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }
    logger.error('Admin sessions POST error', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Failed to create session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

export async function DELETE(request: Request) {
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
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('sessionId')

    if (!sessionId) {
      return new Response(JSON.stringify({ error: 'sessionId is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // Use proper Supabase types
    const updateData: AdminSessionUpdate = { is_active: false }
    await supabase
      .schema('admin')
      .from('admin_sessions')
      .update(updateData)
      .eq('id', sessionId)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    logger.error('Admin sessions DELETE error', error instanceof Error ? error : undefined)
    return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
