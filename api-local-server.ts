#!/usr/bin/env tsx

/**
 * Local API server to bypass Vercel CLI project name issues
 * Runs the same API handlers as Vercel, but without the CLI overhead
 * Uses Express with an adapter to convert Express req/res to Vercel format
 */

// Load .env.local before anything else (matches server/utils/env-setup.ts pattern)
import * as dotenv from 'dotenv'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get project root (same as server/utils/env-setup.ts)
const projectRoot = path.resolve(__dirname)

// Load ONLY .env.local files (skip .env to prevent old/leaked keys from overwriting)
// Priority: root .env.local loads first
const rootEnvLocal = path.join(projectRoot, '.env.local')

// Load root .env.local (override: true ensures it takes precedence)
dotenv.config({ path: rootEnvLocal, override: true })

// DO NOT load .env file - it may contain outdated credentials
// .env files are for examples/templates only, not actual secrets

import express, { type Request, type Response } from 'express'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { logger } from 'src/lib/logger'

const app = express()
const PORT = process.env.API_PORT || process.env.PORT || 3002

// Middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// CORS middleware
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  next()
})

function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {}
  cookieHeader.split(';').forEach(cookie => {
    const [name, ...rest] = cookie.trim().split('=')
    if (name) {
      cookies[name] = rest.join('=')
    }
  })
  return cookies
}

function toVercelRequest(req: Request): VercelRequest {
  return {
    ...req,
    query: req.query as Record<string, string | string[]>,
    cookies: req.headers.cookie ? parseCookies(req.headers.cookie) : {},
    body: req.body,
    headers: req.headers as Record<string, string | string[] | undefined>,
  } as unknown as VercelRequest
}

function toVercelResponse(res: Response): VercelResponse {
  return res as unknown as VercelResponse
}

/**
 * Wrapper to run Next.js route handler (Web API Request/Response) with Express req/res
 */
async function runNextHandler(
  handler: (req: globalThis.Request) => Promise<globalThis.Response> | globalThis.Response,
  expressReq: Request,
  expressRes: Response
) {
  try {
    const url = `http://localhost:${PORT}${expressReq.url}`
    const init: RequestInit = {
      method: expressReq.method,
      headers: new Headers(expressReq.headers as Record<string, string>),
    }
    if (expressReq.method !== 'GET' && expressReq.method !== 'HEAD' && expressReq.body) {
      init.body = JSON.stringify(expressReq.body)
    }
    const webReq = new globalThis.Request(url, init)
    
    const handlerResult = handler(webReq)
    const webRes = handlerResult instanceof Promise ? await handlerResult : handlerResult
    
    // Copy response back to Express
    expressRes.status(webRes.status)
    webRes.headers.forEach((value: string, key: string) => {
      expressRes.setHeader(key, value)
    })
    const body = await webRes.text()
    expressRes.send(body)
  } catch (error) {
    console.error('[Local API] Handler error:', error)
    if (!expressRes.headersSent) {
      expressRes.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }
}

/**
 * Wrapper to run Vercel handler with Express req/res
 */
async function runVercelHandler(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined> | VercelResponse | undefined,
  expressReq: Request,
  expressRes: Response
) {
  try {
    const vercelReq = toVercelRequest(expressReq)
    const vercelRes = toVercelResponse(expressRes)
    
    const result = handler(vercelReq, vercelRes)
    if (result instanceof Promise) {
      await result
    }
  } catch (error) {
    console.error('[Local API] Handler error:', error)
    if (!expressRes.headersSent) {
      expressRes.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      })
    }
  }
}

/**
 * Wrapper to handle async Express route handlers properly
 */
function asyncHandler(
  handler: (req: Request, res: Response) => Promise<void>
): (req: Request, res: Response) => void {
  return (req, res) => {
    void handler(req, res)
  }
}

// API Routes
app.post('/api/chat', asyncHandler(async (req, res) => {
  try {
    const { default: handler } = await import('./api/chat')
    await runVercelHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/chat error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/chat/persist-message', asyncHandler(async (req, res) => {
  try {
    const { default: handler } = await import('./api/chat/persist-message')
    await runVercelHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/chat/persist-message error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/chat/persist-batch', asyncHandler(async (req, res) => {
  try {
    const { default: handler } = await import('./api/chat/persist-batch')
    await runVercelHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/chat/persist-batch error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin routes
app.get('/api/admin/sessions', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/sessions/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions GET error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/sessions', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/sessions/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions POST error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.delete('/api/admin/sessions', asyncHandler(async (req, res) => {
  try {
    const { DELETE: handler } = await import('./api/admin/sessions/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions DELETE error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.get('/api/admin/token-costs', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/token-costs/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/token-costs error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin authentication routes
app.post('/api/admin/login', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/login/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/login error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/logout', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/logout/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/logout error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin analytics routes
app.get('/api/admin/stats', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/stats/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/stats error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.get('/api/admin/analytics', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/analytics/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/analytics error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.get('/api/admin/interaction-analytics', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/interaction-analytics/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/interaction-analytics error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.get('/api/admin/ai-performance', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/ai-performance/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/ai-performance error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin monitoring routes
app.get('/api/admin/system-health', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/system-health/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/system-health error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.get('/api/admin/real-time-activity', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/real-time-activity/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/real-time-activity error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin data routes
app.get('/api/admin/conversations', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/conversations/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/conversations error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin meetings routes (GET, POST, PATCH, DELETE)
app.get('/api/admin/meetings', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/meetings/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/meetings GET error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/meetings', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/meetings/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/meetings POST error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.patch('/api/admin/meetings', asyncHandler(async (req, res) => {
  try {
    const { PATCH: handler } = await import('./api/admin/meetings/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/meetings PATCH error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.delete('/api/admin/meetings', asyncHandler(async (req, res) => {
  try {
    const { DELETE: handler } = await import('./api/admin/meetings/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/meetings DELETE error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin email campaigns routes (GET, POST, PATCH, DELETE)
app.get('/api/admin/email-campaigns', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/email-campaigns/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/email-campaigns GET error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/email-campaigns', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/email-campaigns/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/email-campaigns POST error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.patch('/api/admin/email-campaigns', asyncHandler(async (req, res) => {
  try {
    const { PATCH: handler } = await import('./api/admin/email-campaigns/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/email-campaigns PATCH error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.delete('/api/admin/email-campaigns', asyncHandler(async (req, res) => {
  try {
    const { DELETE: handler } = await import('./api/admin/email-campaigns/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/email-campaigns DELETE error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin failed conversations routes (GET only)
app.get('/api/admin/failed-conversations', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/failed-conversations/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/failed-conversations error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin security routes (GET, POST)
app.get('/api/admin/security-audit', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/security-audit/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/security-audit GET error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/security-audit', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/security-audit/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/security-audit POST error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin logs route
app.get('/api/admin/logs', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/logs/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/logs error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Admin Fly.io routes
app.get('/api/admin/flyio/usage', asyncHandler(async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/flyio/usage/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/flyio/usage error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/admin/flyio/settings', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/flyio/settings/route.js')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/flyio/settings error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Other API routes
app.post('/api/live', asyncHandler(async (req, res) => {
  try {
    const { default: handler } = await import('./api/live')
    await runVercelHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/live error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/send-pdf-summary', asyncHandler(async (req, res) => {
  try {
    const { POST: handler } = await import('./api/send-pdf-summary/route')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/send-pdf-summary error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

app.post('/api/tools/webcam', asyncHandler(async (req, res) => {
  try {
    const { default: handler } = await import('./api/tools/webcam')
    // Handle body parsing config if needed, but for now just run handler
    // Note: formidable in the handler might conflict with express body parser if not handled carefully.
    // However, since we are using runVercelHandler or similar, let's see.
    // Actually, express.json() and urlencoded() are already applied globally in this file.
    // Formidable might fail if body is already consumed.
    // For local dev, we might need a workaround or disable express body parser for this route.
    // But let's try standard registration first.
    await runVercelHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/tools/webcam error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
}))

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'local-api-server', port: PORT })
})

// Start server
app.listen(PORT, () => {
  logger.debug(`🚀 Local API server running on http://localhost:${PORT}`)
  logger.debug(`   Endpoints registered:`)
  logger.debug(`   Chat:`)
  logger.debug(`   - POST /api/chat`)
  logger.debug(`   - POST /api/chat/persist-message`)
  logger.debug(`   - POST /api/chat/persist-batch`)
  logger.debug(`   - POST /api/live`)
  logger.debug(`   - POST /api/send-pdf-summary`)
  logger.debug(`   Admin Auth:`)
  logger.debug(`   - POST /api/admin/login`)
  logger.debug(`   - POST /api/admin/logout`)
  logger.debug(`   Admin Sessions:`)
  logger.debug(`   - GET /api/admin/sessions`)
  logger.debug(`   - POST /api/admin/sessions`)
  logger.debug(`   - DELETE /api/admin/sessions`)
  logger.debug(`   Admin Analytics:`)
  logger.debug(`   - GET /api/admin/stats`)
  logger.debug(`   - GET /api/admin/analytics`)
  logger.debug(`   - GET /api/admin/interaction-analytics`)
  logger.debug(`   - GET /api/admin/ai-performance`)
  logger.debug(`   - GET /api/admin/token-costs`)
  logger.debug(`   Admin Monitoring:`)
  logger.debug(`   - GET /api/admin/system-health`)
  logger.debug(`   - GET /api/admin/real-time-activity`)
  logger.debug(`   - GET /api/admin/logs`)
  logger.debug(`   Admin Data:`)
  logger.debug(`   - GET /api/admin/conversations`)
  logger.debug(`   - GET /api/admin/meetings (GET, POST, PATCH, DELETE)`)
  logger.debug(`   - GET /api/admin/email-campaigns (GET, POST, PATCH, DELETE)`)
  logger.debug(`   - GET /api/admin/failed-conversations`)
  logger.debug(`   Admin Security:`)
  logger.debug(`   - GET /api/admin/security-audit (GET, POST)`)
  logger.debug(`   Admin Infrastructure:`)
  logger.debug(`   - GET /api/admin/flyio/usage`)
  logger.debug(`   - POST /api/admin/flyio/settings`)
  logger.debug(`   System:`)
  logger.debug(`   - GET /health`)
})

