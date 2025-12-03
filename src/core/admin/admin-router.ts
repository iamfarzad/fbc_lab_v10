// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
// TypeScript cannot resolve dynamic App Router imports in Vercel builds sometimes.
// This is a known limitation - dynamic import() with App Router routes requires
// runtime resolution that TypeScript cannot statically analyze.

/**
 * Admin Router - Consolidates 19 admin routes into a single Serverless Function
 *
 * IMPORTANT: This router dynamically imports handlers from src/core/admin/handlers/.
 * This prevents Vercel from counting each handler as a separate Serverless Function
 * (which happens if they live in the api/ directory).
 *
 * See: api/admin/README.md for full architecture documentation
 */

type Handler = (request: Request) => Promise<Response>

/**
 * Handler map - dynamically imports route handlers from src/core/admin/handlers/
 */
const handlers = {
  GET: {
    'analytics': () => import('./handlers/analytics').then(m => m.GET),
    'sessions': () => import('./handlers/sessions').then(m => m.GET),
    'conversations': () => import('./handlers/conversations').then(m => m.GET),
    'logs': () => import('./handlers/logs').then(m => m.GET),
    'stats': () => import('./handlers/stats').then(m => m.GET),
    'meetings': () => import('./handlers/meetings').then(m => m.GET),
    'system-health': () => import('./handlers/system-health').then(m => m.GET),
    'ai-performance': () => import('./handlers/ai-performance').then(m => m.GET),
    'interaction-analytics': () => import('./handlers/interaction-analytics').then(m => m.GET),
    'real-time-activity': () => import('./handlers/real-time-activity').then(m => m.GET),
    'security-audit': () => import('./handlers/security-audit').then(m => m.GET),
    'token-costs': () => import('./handlers/token-costs').then(m => m.GET),
    'email-campaigns': () => import('./handlers/email-campaigns').then(m => m.GET),
    'failed-conversations': () => import('./handlers/failed-conversations').then(m => m.GET),
    'flyio-usage': () => import('./handlers/flyio-usage').then(m => m.GET),
  },
  POST: {
    'login': () => import('./handlers/login').then(m => m.POST),
    'logout': () => import('./handlers/logout').then(m => m.POST),
    'sessions': () => import('./handlers/sessions').then(m => m.POST),
    'meetings': () => import('./handlers/meetings').then(m => m.POST),
    'email-campaigns': () => import('./handlers/email-campaigns').then(m => m.POST),
    'security-audit': () => import('./handlers/security-audit').then(m => m.POST),
    'flyio-settings': () => import('./handlers/flyio-settings').then(m => m.POST),
  },
  DELETE: {
    'sessions': () => import('./handlers/sessions').then(m => m.DELETE),
    'meetings': () => import('./handlers/meetings').then(m => m.DELETE),
    'email-campaigns': () => import('./handlers/email-campaigns').then(m => m.DELETE),
  },
  PATCH: {
    'meetings': () => import('./handlers/meetings').then(m => m.PATCH),
    'email-campaigns': () => import('./handlers/email-campaigns').then(m => m.PATCH),
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
