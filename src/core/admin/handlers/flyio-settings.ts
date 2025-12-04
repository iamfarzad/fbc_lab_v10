import { logger } from '../../../lib/logger.js'
import { adminAuthMiddleware } from '../../app/api-utils/auth.js'
import { adminRateLimit } from '../../app/api-utils/rate-limiting.js'

function generateRequestId() {
  return crypto.randomUUID()
}

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
    const body = await request.json() as { monthlyBudget?: number; budgetAlertThreshold?: number; isBudgetAlertEnabled?: boolean }
    const { monthlyBudget, budgetAlertThreshold } = body

    // Validate inputs
    if (monthlyBudget !== undefined && (typeof monthlyBudget !== 'number' || monthlyBudget < 0)) {
      return Response.json({ error: 'Invalid budget amount' }, { status: 400 })
    }

    if (budgetAlertThreshold !== undefined && (typeof budgetAlertThreshold !== 'number' || budgetAlertThreshold < 0 || budgetAlertThreshold > 100)) {
      return Response.json({ error: 'Invalid budget alert threshold (must be 0-100)' }, { status: 400 })
    }

    // In production, you would save this to a database
    // await saveFlyIOSettings({ monthlyBudget, budgetAlertThreshold, isBudgetAlertEnabled, userId })

    return Response.json({ success: true })
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Error saving Fly.io settings', error instanceof Error ? error : undefined, { component: 'admin-flyio-settings', requestId })
    return Response.json({ error: 'Internal Error' }, { status: 500 })
  }
}

