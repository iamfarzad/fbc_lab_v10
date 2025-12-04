import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { supabaseService } from '../../supabase/client.js'
import { logger } from '../../../lib/logger.js'

// Type definitions for API response
interface ConversationResponse {
  id: string
  name: string | null
  email: string | null
  summary: string | null
  leadScore: number | null
  researchJson: Record<string, unknown> | null
  pdfUrl: string | null
  emailStatus: string | null
  emailRetries: number | null
  createdAt: string
  proposal?: {
    recommendedSolution?: string
    pricingBallpark?: string
    solutionRationale?: string
    expectedROI?: string
    nextSteps?: string
  } | undefined // Explicitly allow undefined for exactOptionalPropertyTypes
}

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
    const search = searchParams.get('search') ?? ''
    const period = searchParams.get('period') ?? 'last_30_days'

    const now = new Date()
    let startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    if (period === 'last_7_days') {
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    } else if (period === 'last_90_days') {
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000)
    }

    let query = supabase
      .from('conversations')
      .select('*')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: false })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,summary.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      const requestId = request.headers.get('x-request-id') || generateRequestId()
      logger.error('Admin conversations fetch error', error instanceof Error ? error : undefined, { component: 'admin-conversations', requestId, search, period })
      return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 })
    }

    const conversations: ConversationResponse[] = (data ?? []).map((conv: any) => {
      // Extract proposal data from metadata
      const metadataRecord = conv.metadata as Record<string, unknown> | null
      const proposalData = metadataRecord?.proposal as {
        recommendedSolution?: string
        pricingBallpark?: string
        solutionRationale?: string
        expectedROI?: string
        nextSteps?: string
      } | undefined || null
      
      const proposal = proposalData ? {
        ...(proposalData.recommendedSolution !== undefined && { recommendedSolution: proposalData.recommendedSolution }),
        ...(proposalData.pricingBallpark !== undefined && { pricingBallpark: proposalData.pricingBallpark }),
        ...(proposalData.solutionRationale !== undefined && { solutionRationale: proposalData.solutionRationale }),
        ...(proposalData.expectedROI !== undefined && { expectedROI: proposalData.expectedROI }),
        ...(proposalData.nextSteps !== undefined && { nextSteps: proposalData.nextSteps })
      } : undefined;

      return {
        id: conv.id,
        name: conv.name,
        email: conv.email,
        summary: conv.summary,
        leadScore: conv.lead_score,
        researchJson: conv.research_json,
        pdfUrl: conv.pdf_url,
        emailStatus: conv.email_status,
        emailRetries: conv.email_retries,
        createdAt: conv.created_at,
        proposal: proposal
      }
    })

    return Response.json(conversations)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Admin conversations error', error instanceof Error ? error : undefined, { component: 'admin-conversations', requestId })
    return Response.json({ error: 'Failed to fetch conversations' }, { status: 500 })
  }
}
