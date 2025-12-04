import { logger } from '../../../lib/logger.js'
import { generateRequestId } from '../../lib/api-middleware.js'

export function POST(request: Request) {
  try {
    const response = new Response(JSON.stringify({ success: true, message: 'Logged out successfully' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': `adminToken=; HttpOnly; ${process.env.NODE_ENV === 'production' ? 'Secure;' : ''} SameSite=Strict; Max-Age=0; Path=/`
      },
    })

    return response
  } catch (error) {
    const requestId = request.headers.get('x-request-id') || generateRequestId()
    logger.error('Admin logout error', error instanceof Error ? error : undefined, { component: 'admin-logout', requestId })
    return new Response(JSON.stringify({ error: 'Logout failed' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}
