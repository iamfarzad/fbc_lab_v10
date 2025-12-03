/**
 * Admin Router - Consolidates 19 admin routes into a single Serverless Function
 *
 * IMPORTANT: This router dynamically imports handlers from the old route files
 * (api/admin/[any]/route.ts). Those files are NOT deleted because:
 *
 * 1. Dynamic imports require the files to exist at runtime
 * 2. Vercel redirects in vercel.json prevent counting them as separate functions
 * 3. The actual handler logic lives in those files - we just route through here
 *
 * See: api/admin/README.md for full architecture documentation
 */

type Handler = (request: Request) => Promise<Response>

/**
 * Handler map - dynamically imports route handlers from old route files
 *
 * NOTE: The old route files (api/admin/[any]/route.ts) still exist and are used.
 * They are NOT counted as separate Serverless Functions due to vercel.json redirects.
 */
const handlers = {
  GET: {
    'analytics': () => import('../../../api/admin/analytics/route.js').then(m => m.GET),
    'sessions': () => import('../../../api/admin/sessions/route.js').then(m => m.GET),
    'conversations': () => import('../../../api/admin/conversations/route.js').then(m => m.GET),
    'logs': () => import('../../../api/admin/logs/route.js').then(m => m.GET),
    'stats': () => import('../../../api/admin/stats/route.js').then(m => m.GET),
    'meetings': () => import('../../../api/admin/meetings/route.js').then(m => m.GET),
    'system-health': () => import('../../../api/admin/system-health/route.js').then(m => m.GET),
    'ai-performance': () => import('../../../api/admin/ai-performance/route.js').then(m => m.GET),
    'interaction-analytics': () => import('../../../api/admin/interaction-analytics/route.js').then(m => m.GET),
    'real-time-activity': () => import('../../../api/admin/real-time-activity/route.js').then(m => m.GET),
    'security-audit': () => import('../../../api/admin/security-audit/route.js').then(m => m.GET),
    'token-costs': () => import('../../../api/admin/token-costs/route.js').then(m => m.GET),
    'email-campaigns': () => import('../../../api/admin/email-campaigns/route.js').then(m => m.GET),
    'failed-conversations': () => import('../../../api/admin/failed-conversations/route.js').then(m => m.GET),
    'flyio-usage': () => import('../../../api/admin/flyio/usage/route.js').then(m => m.GET),
  },
  POST: {
    'login': () => import('../../../api/admin/login/route.js').then(m => m.POST),
    'logout': () => import('../../../api/admin/logout/route.js').then(m => m.POST),
    'sessions': () => import('../../../api/admin/sessions/route.js').then(m => m.POST),
    'meetings': () => import('../../../api/admin/meetings/route.js').then(m => m.POST),
    'email-campaigns': () => import('../../../api/admin/email-campaigns/route.js').then(m => m.POST),
    'security-audit': () => import('../../../api/admin/security-audit/route.js').then(m => m.POST),
    'flyio-settings': () => import('../../../api/admin/flyio/settings/route.js').then(m => m.POST),
  },
  DELETE: {
    'sessions': () => import('../../../api/admin/sessions/route.js').then(m => m.DELETE),
    'meetings': () => import('../../../api/admin/meetings/route.js').then(m => m.DELETE),
    'email-campaigns': () => import('../../../api/admin/email-campaigns/route.js').then(m => m.DELETE),
  },
  PATCH: {
    'meetings': () => import('../../../api/admin/meetings/route.js').then(m => m.PATCH),
    'email-campaigns': () => import('../../../api/admin/email-campaigns/route.js').then(m => m.PATCH),
  }
} as const

export function getAdminHandler(method: 'GET' | 'POST' | 'DELETE' | 'PATCH'): Handler {
  return async (request: Request) => {
    const url = new URL(request.url)
    const path = url.searchParams.get('path')

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing ?path= parameter' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const handlerMap = handlers[method]
    if (!handlerMap) {
      return new Response(JSON.stringify({ error: `Method ${method} not supported` }), {
        status: 405,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    const handlerLoader = handlerMap[path as keyof typeof handlerMap]
    if (!handlerLoader) {
      return new Response(JSON.stringify({ error: `Path '${path}' not found for ${method}` }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    try {
      const handler = await handlerLoader()
      return handler(request)
    } catch (err) {
      console.error(`Admin handler failed for ${method} ${path}:`, err)
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: err instanceof Error ? err.message : 'Unknown error'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }
  }
}

