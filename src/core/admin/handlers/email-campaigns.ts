import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { supabaseService } from '../../supabase/client.js'
import { parseJsonRequest } from '../../../lib/json.js'
import { EmailCampaignList, EmailCampaignPostBody, EmailCampaignPatchBody } from '../../../schemas/admin.js'
import { logger } from '../../../lib/logger.js'

function ensureSupabase() {
  const supabase = supabaseService
  if (!supabase) {
    throw new Error('Supabase service client unavailable. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.')
  }
  return supabase
}

function generateRequestId() {
  return crypto.randomUUID()
}

// GET: List all campaigns
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const supabase = ensureSupabase()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('email_campaigns')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data: dataRaw, error } = await query

    if (error) {
      logger.error('Error fetching email campaigns', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId, status })
      return Response.json({ error: 'Failed to fetch email campaigns' }, { status: 500 })
    }

    // Parse with schema - no direct property access before parse
    const campaigns = EmailCampaignList.parse(dataRaw ?? [])

    // Get recipient counts for each campaign
    const campaignsWithStats = await Promise.all(
      campaigns.map(async (campaign) => {
        const { count } = await supabase
          .from('campaign_recipients')
          .select('*', { count: 'exact', head: true })
          .eq('campaign_id', campaign.id || '')

        return {
          ...campaign,
          total_recipients: count || 0,
        }
      })
    )

    return Response.json(campaignsWithStats)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Email campaigns GET error', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId })
    return Response.json({ error: 'Failed to fetch email campaigns' }, { status: 500 })
  }
}

// POST: Create new campaign
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const body = await parseJsonRequest(request, EmailCampaignPostBody)

    const supabase = ensureSupabase()
    const { data, error } = await supabase
      .from('email_campaigns')
      .insert({
        name: body.name,
        subject: body.subject,
        template: body.template,
        target_segment: body.target_segment || null,
        status: body.scheduled_at ? 'scheduled' : 'draft',
        scheduled_at: body.scheduled_at || null,
        sent_count: 0,
        total_recipients: 0,
      })
      .select()
      .single()

    if (error) {
      logger.error('Error creating email campaign', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId, campaignName: body.name })
      return Response.json({ error: 'Failed to create email campaign' }, { status: 500 })
    }

    // Parse response with schema
    const campaign = EmailCampaignList.parse(data ? [data] : [])[0]
    return Response.json({ success: true, campaign })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Email campaigns POST error', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId })
    return Response.json({ error: 'Failed to create email campaign' }, { status: 500 })
  }
}

// PATCH: Update campaign
export async function PATCH(request: Request) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const body = await parseJsonRequest(request, EmailCampaignPatchBody)

    const supabase = ensureSupabase()
    const { id, ...updates } = body
    
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }
    
    // Only include defined fields
    if (updates.name !== undefined) updateData.name = updates.name
    if (updates.subject !== undefined) updateData.subject = updates.subject
    if (updates.template !== undefined) updateData.template = updates.template
    if (updates.target_segment !== undefined) updateData.target_segment = updates.target_segment
    if (updates.scheduled_at !== undefined) updateData.scheduled_at = updates.scheduled_at
    if (updates.status !== undefined) updateData.status = updates.status

    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      logger.error('Error updating email campaign', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId, campaignId: id })
      return Response.json({ error: 'Failed to update email campaign' }, { status: 500 })
    }

    // Parse response with schema
    const campaign = EmailCampaignList.parse(data ? [data] : [])[0]
    return Response.json({ success: true, campaign })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Email campaigns PATCH error', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId })
    return Response.json({ error: 'Failed to update email campaign' }, { status: 500 })
  }
}

// DELETE: Delete campaign
export async function DELETE(request: Request) {
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
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return Response.json({ error: 'Missing campaign ID' }, { status: 400 })
    }

    const supabase = ensureSupabase()
    const { error } = await supabase
      .from('email_campaigns')
      .delete()
      .eq('id', id)

    if (error) {
      logger.error('Error deleting email campaign', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId, campaignId: id })
      return Response.json({ error: 'Failed to delete email campaign' }, { status: 500 })
    }

    return Response.json({ success: true })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Email campaigns DELETE error', error instanceof Error ? error : undefined, { component: 'admin-email-campaigns', requestId })
    return Response.json({ error: 'Failed to delete email campaign' }, { status: 500 })
  }
}
