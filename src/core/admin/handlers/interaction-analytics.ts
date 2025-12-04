import { asConversations, asMeetings } from '../../../lib/supabase-parsers.js'
import type { ConversationRow } from '../../../schemas/supabase.js'
import { logger } from '../../../lib/logger.js'
import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { supabaseService } from '../../supabase/client.js'

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
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || '30d'

    // Calculate date range
    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    if (period === '7d') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === '90d') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    } else if (period === '1y') {
      startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000)
    }

    // Get conversations data
    const { data: conversationsRaw, error: convError } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', startDate.toISOString())

    if (convError) {
      const requestId = request.headers.get('x-request-id') || generateRequestId()
      logger.error('Error fetching conversations', convError instanceof Error ? convError : undefined, { component: 'admin-interaction-analytics', requestId, period })
      return Response.json({ error: 'Failed to fetch interaction analytics' }, { status: 500 })
    }

    // Parse with schema
    const conversations = asConversations(conversationsRaw)

    // Calculate business metrics
    const totalConversations = conversations.length
    const totalLeads = new Set(conversations.map((c) => c.email).filter((email): email is string => typeof email === 'string' && email.length > 0)).size
    
    // Lead score distribution
    const leadScores = conversations.map((c) => c.lead_score).filter((score): score is number => typeof score === 'number')
    const avgLeadScore = leadScores.length > 0
      ? leadScores.reduce((sum: number, score: number) => sum + score, 0) / leadScores.length
      : 0

    const highScoreLeads = leadScores.filter((score: number) => score >= 70).length
    const mediumScoreLeads = leadScores.filter((score: number) => score >= 50 && score < 70).length
    const lowScoreLeads = leadScores.filter((score: number) => score < 50).length

    // Conversion metrics (meetings booked, emails sent)
    const { count: meetingsCount } = await supabase
      .from('meetings')
      .select('*', { count: 'exact', head: true })
      .gte('scheduled_at', startDate.toISOString())
      .eq('status', 'scheduled')

    const { count: emailsSent } = await supabase
      .from('email_campaigns')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate.toISOString())
      .eq('status', 'sent')

    // Daily trends
    const dailyTrends: Record<string, { conversations: number; leads: number; avgScore: number }> = {}
    conversations.forEach((conv: ConversationRow) => {
      const date = conv.created_at ? new Date(conv.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]
      // Ensure date is defined before using as index
      if (date) {
        if (!dailyTrends[date]) {
          dailyTrends[date] = { conversations: 0, leads: 0, avgScore: 0 }
        }
        dailyTrends[date].conversations += 1
        if (typeof conv.lead_score === 'number') {
          dailyTrends[date].avgScore = (dailyTrends[date].avgScore + conv.lead_score) / 2
        }
      }
    })

    // Engagement by channel (multimodal)
    const emailEngagements = conversations.filter((c) => c.email_status === 'sent').length

    // Time to conversion (if meetings exist)
    let avgTimeToConversion = 0
    if (meetingsCount && meetingsCount > 0) {
      const { data: meetings } = await supabase
        .from('meetings')
        .select('scheduled_at, conversation_id')
        .gte('scheduled_at', startDate.toISOString())
      
      const meetingsParsed = asMeetings(meetings)
      if (meetingsParsed.length > 0) {
        const conversionTimes: number[] = []
        for (const meeting of meetingsParsed) {
          if (meeting.conversation_id) {
            const { data: convRaw } = await supabase
              .from('conversations')
              .select('created_at')
              .eq('id', meeting.conversation_id)
              .single()
            
            const conv = asConversations(convRaw ? [convRaw] : [])[0]
            if (conv?.created_at && meeting.scheduled_at) {
              const timeDiff = new Date(meeting.scheduled_at).getTime() - new Date(conv.created_at).getTime()
              conversionTimes.push(timeDiff / (1000 * 60 * 60)) // Convert to hours
            }
          }
        }
        
        if (conversionTimes.length > 0) {
          avgTimeToConversion = conversionTimes.reduce((a, b) => a + b, 0) / conversionTimes.length
        }
      }
    }

    return Response.json({
      period,
      start_date: startDate.toISOString(),
      end_date: now.toISOString(),
      summary: {
        total_conversations: totalConversations,
        total_leads: totalLeads,
        avg_lead_score: Math.round(avgLeadScore * 10) / 10,
        high_score_leads: highScoreLeads,
        medium_score_leads: mediumScoreLeads,
        low_score_leads: lowScoreLeads,
        meetings_booked: meetingsCount || 0,
        emails_sent: emailsSent || 0,
        conversion_rate: totalConversations > 0 ? ((meetingsCount || 0) / totalConversations) * 100 : 0,
        avg_time_to_conversion_hours: Math.round(avgTimeToConversion * 10) / 10,
      },
      daily_trends: Object.entries(dailyTrends)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, metrics]) => ({
          date,
          ...metrics,
        })),
      engagement: {
        email_engagements: emailEngagements,
        meeting_bookings: meetingsCount || 0,
        high_intent_leads: highScoreLeads,
      },
    })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Interaction analytics error', error instanceof Error ? error : undefined, { component: 'admin-interaction-analytics', requestId })
    return Response.json({ error: 'Failed to fetch interaction analytics' }, { status: 500 })
  }
}

