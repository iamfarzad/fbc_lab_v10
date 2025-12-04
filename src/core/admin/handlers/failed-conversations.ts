import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'
import { getFailedConversations } from '../../db/conversations.js'
import { logger } from '../../../lib/logger.js'

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
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const minScore = searchParams.get('minScore')
    
    const failedConversations = await getFailedConversations(limit)
    
    // Filter by minScore if provided
    let filtered = failedConversations
    if (minScore !== null) {
      const minScoreNum = parseFloat(minScore)
      filtered = failedConversations.filter((fc: any) => {
        const leadScore = (fc && typeof fc === 'object' && 'lead_score' in fc) ? fc.lead_score : null
        return leadScore !== null && typeof leadScore === 'number' && leadScore >= minScoreNum
      })
    }

    return Response.json(filtered)
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Admin failed conversations error', error instanceof Error ? error : undefined, { component: 'admin-failed-conversations', requestId })
    return Response.json({ error: 'Failed to fetch failed conversations' }, { status: 500 })
  }
}
