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

const app = express()
const PORT = process.env.PORT || 3002

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
  handler: (req: globalThis.Request) => Promise<globalThis.Response>,
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
    
    const webRes = await handler(webReq)
    
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
  handler: (req: VercelRequest, res: VercelResponse) => Promise<VercelResponse | undefined> | VercelResponse,
  expressReq: Request,
  expressRes: Response
) {
  try {
    const vercelReq = toVercelRequest(expressReq)
    const vercelRes = toVercelResponse(expressRes)
    
    await handler(vercelReq, vercelRes)
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

// API Routes
app.post('/api/chat', async (req, res) => {
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
})

app.post('/api/chat/persist-message', async (req, res) => {
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
})

app.post('/api/chat/persist-batch', async (req, res) => {
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
})

// Admin routes
app.get('/api/admin/sessions', async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/sessions/route')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions GET error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
})

app.post('/api/admin/sessions', async (req, res) => {
  try {
    const { POST: handler } = await import('./api/admin/sessions/route')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions POST error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
})

app.delete('/api/admin/sessions', async (req, res) => {
  try {
    const { DELETE: handler } = await import('./api/admin/sessions/route')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/sessions DELETE error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
})

app.get('/api/admin/token-costs', async (req, res) => {
  try {
    const { GET: handler } = await import('./api/admin/token-costs/route')
    await runNextHandler(handler, req, res)
  } catch (error) {
    console.error('[Local API] /api/admin/token-costs error:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to load handler'
    })
  }
})

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'local-api-server', port: PORT })
})

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Local API server running on http://localhost:${PORT}`)
  console.log(`   Endpoints:`)
  console.log(`   - POST /api/chat`)
  console.log(`   - POST /api/chat/persist-message`)
  console.log(`   - POST /api/chat/persist-batch`)
  console.log(`   - GET /api/admin/sessions`)
  console.log(`   - POST /api/admin/sessions`)
  console.log(`   - DELETE /api/admin/sessions`)
  console.log(`   - GET /api/admin/token-costs`)
  console.log(`   - GET /health`)
})

