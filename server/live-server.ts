import type { WebSocket } from 'ws'
import type { IncomingMessage } from 'http'
import { PORT, serverLogger } from './utils/env-setup'
import { createWebSocketServer, loadSslOptions } from './websocket/server'
import { createConnectionManager } from './websocket/connection-manager'
import { setupMessageRouter } from './websocket/message-router'
import { handleStart } from './handlers/start-handler'
import { handleClose } from './handlers/close-handler'
import { handleUserMessage } from './handlers/audio-handler'
import { handleToolResult } from './handlers/tool-result-handler'
import { handleRealtimeInput } from './handlers/realtime-input-handler'
import { handleContextUpdate } from './handlers/context-update-handler'

/**
 * Main server initialization
 * Orchestrates WebSocket server setup, connection management, and message routing
 */
console.log('DEBUG: Starting live-server.ts script')

async function startServer(): Promise<void> {
  console.log('DEBUG: Inside startServer()')
  // Load SSL options for local development
  const sslOptions = loadSslOptions()

  // Create WebSocket server with HTTP/HTTPS support
  console.log('DEBUG: Calling createWebSocketServer...')
  const { server, wss, pingInterval } = createWebSocketServer({
    port: Number(PORT),
    ...(sslOptions ? { sslOptions } : {})
  })
  console.log('DEBUG: createWebSocketServer returned')

  // Create connection manager for session state
  const connectionManager = createConnectionManager()

  // Setup connection handler
  wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    // Initialize connection and get connectionId
    const connectionId = connectionManager.initializeConnection(ws, req)

    // Setup message router with all handlers
    const { heartbeatTimer, heartbeatInterval } = setupMessageRouter(
      ws,
      connectionId,
      connectionManager,
      {
        handleStart,
        handleClose,
        handleUserMessage,
        handleToolResult,
        handleRealtimeInput,
        handleContextUpdate
      }
    )

    // Register close handler
    ws.on('close', (code: number, reason: Buffer) => {
      connectionManager.cleanupConnection(
        connectionId,
        code,
        reason,
        heartbeatTimer,
        heartbeatInterval
      )
    })

    // Register error handler
    ws.on('error', (err: Error) => {
      connectionManager.handleConnectionError(
        connectionId,
        err,
        heartbeatTimer,
        heartbeatInterval
      )
    })
  })

  // Cleanup on server close
  server.on('close', () => {
    clearInterval(pingInterval)
  })

  serverLogger.info('Server setup complete')
}

// Start server
startServer().catch((err) => {
  serverLogger.error('Failed to start server', err instanceof Error ? err : undefined)
  process.exit(1)
})
