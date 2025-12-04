/**
 * Admin Sessions Route Handler
 * 
 * NOTE: This file is still used but NOT counted as a separate Serverless Function.
 * It's dynamically imported by api/admin/route.ts via the admin router.
 * 
 * Do NOT delete this file - it's required for dynamic imports.
 * See: api/admin/README.md for architecture details
 */

// import { respond } from '../../lib/api/response' // Not used
import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { adminChatService } from '../admin-chat-service.js'
import { supabaseService } from '../../supabase/client.js'
// TODO: Import parseJsonRequest when available
// import { parseJsonRequest } from '../../../lib/json'
import { z } from 'zod'
// TODO: Import asAdminSession when supabase-parsers is available
// import { asAdminSession } from '../../../lib/supabase-parsers'
// TODO: Import schemas when available
// import type { AdminSessionRow } from '../../../schemas/supabase'
// import { SessionsQuerySchema, SessionsPostBodySchema } from '../../../schemas/admin'
import { logger } from '../../../lib/logger.js'
import type { Database } from '../../database.types.js'

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
