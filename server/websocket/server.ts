import { WebSocketServer, WebSocket } from 'ws'
import * as https from 'https'
import * as http from 'http'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { serverLogger } from '../utils/env-setup'
import { WEBSOCKET_CONFIG, ALLOWED_ORIGINS, isOriginAllowed } from 'src/config/constants'
import { MESSAGE_TYPES } from '../message-types'

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export interface WebSocketServerOptions {
  port: number
  sslOptions?: { key: Buffer; cert: Buffer }
}

export interface WebSocketServerResult {
  server: http.Server | https.Server
  wss: WebSocketServer
  pingInterval: NodeJS.Timeout
}

/**
 * Create and configure WebSocket server with HTTP/HTTPS support
 * Handles SSL setup, server creation, WebSocketServer initialization, and global heartbeat
 */
export function createWebSocketServer(options: WebSocketServerOptions): WebSocketServerResult {
  const { port, sslOptions } = options
  const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.FLY_APP_NAME

  // Create server based on environment
  const useTls = Boolean(process.env.LIVE_SERVER_TLS) &&
    process.env.LIVE_SERVER_TLS !== 'false' &&
    isLocalDev &&
    sslOptions &&
    Object.keys(sslOptions).length > 0

  const healthServer = useTls
    ? https.createServer(sslOptions, (req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })
    : http.createServer((req, res) => {
      if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('OK')
      } else if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/plain' })
        res.end('WebSocket Server Running - Connect via WebSocket')
      } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' })
        res.end('Not Found')
      }
    })

  const server = healthServer.listen(Number(port), '0.0.0.0', () => {
    const protocol = useTls ? 'HTTPS/WSS' : 'HTTP/WS'
    serverLogger.info('WebSocket server listening', {
      port,
      protocol,
      nodeEnv: process.env.NODE_ENV,
      flyAppName: process.env.FLY_APP_NAME,
      actualPort: healthServer.address()
    })

    // Log health check availability
    serverLogger.info('Health check available at http://0.0.0.0:' + port + '/health')
  })

  // Add error handler for server listen errors
  server.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code === 'EADDRINUSE') {
      serverLogger.error(`Port ${port} is already in use`, err)
      serverLogger.error('Please kill the existing process or use a different port', undefined, {
        suggestion: `Run: lsof -ti :${port} | xargs kill -9`
      })
    } else {
      serverLogger.error('Server error', err instanceof Error ? err : undefined)
    }
    process.exit(1)
  })

  // Initialize WebSocket server bound to the HTTP(S) server
  const wss = new WebSocketServer({
    server,
    perMessageDeflate: false,
    maxPayload: 10 * 1024 * 1024,
    verifyClient: (info: { origin: string; req: http.IncomingMessage; secure: boolean }) => {
      const isProduction = process.env.NODE_ENV === 'production' || process.env.FLY_APP_NAME
      const origin = info.origin || ''

      if (!isProduction) {
        serverLogger.debug('Dev mode: Accepting connection', { origin: origin || 'unknown' })
        return true
      }

      // In production, use the helper function to check origin
      const allowed = isOriginAllowed(origin)

      if (!allowed) {
        serverLogger.warn('Rejected connection from unauthorized origin', { 
          origin: origin || 'empty',
          allowedOrigins: ALLOWED_ORIGINS.slice(0, 5), // Log first 5 for debugging
          requestHeaders: {
            'user-agent': info.req.headers['user-agent'],
            'host': info.req.headers.host
          }
        })
      } else {
        serverLogger.debug('Accepted connection', { 
          origin: origin || 'empty',
          isVercel: origin.includes('.vercel.app'),
          isAllowed: ALLOWED_ORIGINS.includes(origin)
        })
      }

      return allowed
    },
    handleProtocols: (protocols: Set<string>) => {
      // Handle any subprotocols if needed
      return protocols.values().next().value || false
    }
  })

  // Keep connections alive with heartbeat pings
  const pingInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.ping()
          // Also send a lightweight heartbeat message for additional reliability
          ws.send(JSON.stringify({ type: MESSAGE_TYPES.HEARTBEAT, timestamp: Date.now() }))
        } catch (error) {
          serverLogger.warn('Failed to send ping to client', {
            error: error instanceof Error
              ? { name: error.name, message: error.message, stack: error.stack }
              : String(error)
          })
        }
      }
    })
  }, WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL)

  server.on('close', () => clearInterval(pingInterval))

  // Error handlers
  const nodeProcess = (globalThis as any).process as NodeJS.Process | undefined
  nodeProcess?.on('uncaughtException', (err: unknown) => {
    serverLogger.error('UNCAUGHT_EXCEPTION', err instanceof Error ? err : undefined)
  })
  nodeProcess?.on('unhandledRejection', (reason: unknown) => {
    serverLogger.error('UNHANDLED_REJECTION', reason instanceof Error ? reason : undefined)
  })

  return {
    server,
    wss,
    pingInterval
  }
}

/**
 * Load SSL options for local development
 * Returns empty object if SSL certificates not found or not in local dev
 */
export function loadSslOptions(): { key: Buffer; cert: Buffer } | undefined {
  const isLocalDev = process.env.NODE_ENV !== 'production' && !process.env.FLY_APP_NAME

  if (!isLocalDev) {
    return undefined
  }

  try {
    const sslOptions = {
      key: fs.readFileSync(path.join(__dirname, '..', 'localhost-key.pem')),
      cert: fs.readFileSync(path.join(__dirname, '..', 'localhost.pem'))
    }
    serverLogger.info('SSL certificates loaded for local development')
    return sslOptions
  } catch (error) {
    serverLogger.warn('SSL certificates not found', {
      message: 'Run: mkcert localhost',
      fallback: 'Falling back to HTTP for local development',
      error: error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : String(error)
    })
    return undefined
  }
}

