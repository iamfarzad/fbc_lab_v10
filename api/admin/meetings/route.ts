import { asMeetings } from 'src/lib/supabase-parsers'
import { logger } from 'src/lib/logger'
import { adminAuthMiddleware } from 'src/core/app/api-utils/auth'
import { adminRateLimit } from 'src/core/app/api-utils/rate-limiting'
import { supabaseService } from 'src/core/supabase/client'

function isSupabaseConfigured() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
}

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase || typeof supabase.from !== 'function') {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

function generateRequestId() {
  return crypto.randomUUID()
}

// GET: List all meetings
export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const supabase = ensureSupabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const startDate = searchParams.get('start_date')
    const endDate = searchParams.get('end_date')

    let query = supabase
      .from('meetings')
      .select('*')
      .order('scheduled_at', { ascending: true })

    if (status) {
      query = query.eq('status', status)
    }

    if (startDate) {
      query = query.gte('scheduled_at', startDate)
    }

    if (endDate) {
      query = query.lte('scheduled_at', endDate)
    }

    const { data: dataRaw, error } = await query

    if (error) {
      logger.error('Error fetching meetings', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId, status, startDate, endDate })
      return Response.json({ error: 'Failed to fetch meetings' }, { status: 500 })
    }

    // Parse with schema
    const meetings = asMeetings(dataRaw)

    // Get participant counts for each meeting
    if (meetings.length === 0) {
      return Response.json([])
    }

    const meetingIds = Array.from(
      new Set(meetings.map((meeting) => meeting.id).filter((id): id is string => Boolean(id)))
    )

    let participantCountByMeeting: Record<string, number> = {}
    if (meetingIds.length > 0) {
      const { data: participantsRaw, error: participantsError } = await supabase
        .from('meeting_participants')
        .select('meeting_id')
        .in('meeting_id', meetingIds)

      if (participantsError) {
        logger.error('Error fetching participant counts', participantsError instanceof Error ? participantsError : undefined, { component: 'admin-meetings', requestId, meetingIds })
        return Response.json({ error: 'Failed to fetch meetings' }, { status: 500 })
      }

      participantCountByMeeting = (participantsRaw || []).reduce<Record<string, number>>((acc: Record<string, number>, participant: { meeting_id?: string | null }) => {
        const meetingId = participant?.meeting_id
        if (typeof meetingId === 'string' && meetingId.length > 0) {
          acc[meetingId] = (acc[meetingId] ?? 0) + 1
        }
        return acc
      }, {})
    }

    const meetingsWithParticipants = meetings.map((meeting) => ({
      ...meeting,
      participant_count: meeting.id ? participantCountByMeeting[meeting.id] ?? 0 : 0,
    }))

    return Response.json(meetingsWithParticipants)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Meetings GET error', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId })
    return Response.json({ error: 'Failed to fetch meetings' }, { status: 500 })
  }
}

// POST: Create new meeting
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const body = await request.json() as {
      conversation_id?: string
      lead_email?: string
      lead_name?: string
      title?: string
      description?: string
      scheduled_at?: string
      duration_minutes?: number
      meeting_link?: string
      location?: string
      timezone?: string
      participants?: Array<{ email: string; name?: string; role?: string }>
    }
    const { conversation_id, lead_email, lead_name, title, description, scheduled_at, duration_minutes, meeting_link, location, timezone, participants } = body

    if (!lead_email || !title || !scheduled_at) {
      return Response.json({ error: 'Missing required fields: lead_email, title, scheduled_at' }, { status: 400 })
    }

    const supabase = ensureSupabase()
    // Extract date and time from scheduled_at ISO string
    const scheduledDate = new Date(scheduled_at)
    const meeting_date = scheduledDate.toISOString().split('T')[0] // YYYY-MM-DD
    const meeting_time = scheduledDate.toTimeString().split(' ')[0] // HH:MM:SS
    
    const { data: meetingRaw, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        conversation_id: conversation_id || null,
        lead_email,
        lead_name: lead_name || null,
        title,
        description: description || null,
        scheduled_at,
        meeting_date,
        meeting_time,
        duration_minutes: duration_minutes || 30,
        meeting_link: meeting_link || null,
        location: location || null,
        timezone: timezone || 'UTC',
        status: 'scheduled',
      } as any)
      .select()
      .single()

    if (meetingError) {
      logger.error('Error creating meeting', meetingError instanceof Error ? meetingError : undefined, { component: 'admin-meetings', requestId, leadEmail: lead_email, title })
      return Response.json({ error: 'Failed to create meeting' }, { status: 500 })
    }

    const meeting = asMeetings(meetingRaw ? [meetingRaw] : [])[0]
    if (!meeting) {
      return Response.json({ error: 'Failed to create meeting' }, { status: 500 })
    }

    // Add participants if provided
    if (participants && Array.isArray(participants) && participants.length > 0 && meeting.id) {
      const meetingId = meeting.id // Extract to ensure type narrowing
      const participantInserts = participants.map((p) => ({
        meeting_id: meetingId,
        email: p.email,
        name: p.name || null,
        role: p.role || 'attendee',
        status: 'pending',
      }))

      await supabase.from('meeting_participants').insert(participantInserts)
    }

    return Response.json({ success: true, meeting })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Meetings POST error', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId })
    return Response.json({ error: 'Failed to create meeting' }, { status: 500 })
  }
}

// PATCH: Update meeting
export async function PATCH(request: Request) {
  if (!isSupabaseConfigured()) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const body = await request.json() as { id?: string; [key: string]: unknown }
    const { id, ...updates } = body

    if (!id) {
      return Response.json({ error: 'Missing meeting ID' }, { status: 400 })
    }

    const supabase = ensureSupabase()
    const { data: dataRaw, error } = await supabase
      .from('meetings')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating meeting', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId, meetingId: id })
      return Response.json({ error: 'Failed to update meeting' }, { status: 500 })
    }

    const meeting = asMeetings(dataRaw ? [dataRaw] : [])[0]
    return Response.json({ success: true, meeting })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Meetings PATCH error', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId })
    return Response.json({ error: 'Failed to update meeting' }, { status: 500 })
  }
}

// DELETE: Delete meeting
export async function DELETE(request: Request) {
  if (!isSupabaseConfigured()) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Missing meeting ID' }, { status: 400 })
    }

    const supabase = ensureSupabase()
    const { error } = await supabase
      .from('meetings')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting meeting', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId, meetingId: id })
      return Response.json({ error: 'Failed to delete meeting' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Meetings DELETE error', error instanceof Error ? error : undefined, { component: 'admin-meetings', requestId })
    return Response.json({ error: 'Failed to delete meeting' }, { status: 500 })
  }
}

