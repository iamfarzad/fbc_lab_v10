import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LiveClientWS } from '../src/core/live/client'
import WebSocket from 'ws'

// Target selection: local by default; opt-in to prod by setting USE_PROD_VOICE_TESTS=1
const USE_PROD = process.env.USE_PROD_VOICE_TESTS === '1'
const WS_URL = USE_PROD
  ? process.env.PROD_WS_URL || 'wss://fb-consulting-websocket.fly.dev'
  : process.env.LOCAL_WS_URL || 'ws://localhost:3001'
const API_URL = USE_PROD
  ? process.env.PROD_API_URL || 'https://fbc-ai-agent.vercel.app/api/chat'
  : process.env.LOCAL_API_URL || 'http://localhost:3002/api/chat'
const API_AUTH_HEADER = process.env.PROD_API_AUTH || ''
// Skip integration tests by default - they require a real WebSocket server running
// Only run if explicitly enabled via USE_PROD_VOICE_TESTS=1
const shouldRunIntegrationTests = process.env.USE_PROD_VOICE_TESTS === '1'

// Use describe.skip to skip these tests by default (they require real server)
const describeIntegration = shouldRunIntegrationTests ? describe : describe.skip

describeIntegration('Real-World Production Voice Testing', () => {
  let client: LiveClientWS
  let realWebSocket: WebSocket | null = null

  beforeEach(() => {
    client = new LiveClientWS()
  })

  afterEach(async () => {
    if (client) {
      client.disconnect()
    }
    if (realWebSocket) {
      realWebSocket.close()
      realWebSocket = null
    }
  })

  describe('Real WebSocket Connection Tests', () => {
    it('should connect to real Fly.io WebSocket server', async () => {
      const connectionPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timeout after 10 seconds'))
        }, 10000)

        try {
          realWebSocket = new WebSocket(WS_URL)

          realWebSocket.on('open', () => {
            clearTimeout(timeout)
            resolve(true)
          })

          realWebSocket.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })

      await expect(connectionPromise).resolves.toBe(true)
      expect(realWebSocket?.readyState).toBe(WebSocket.OPEN)
    }, 15000)

    it('should handle real WebSocket message exchange', async () => {
      const messagePromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Message exchange timeout'))
        }, 10000)

        try {
          realWebSocket = new WebSocket(WS_URL)

          realWebSocket.on('open', () => {
            // Send a real session start message
            const startMessage = {
              type: 'start',
              sessionId: 'test-real-session-' + Date.now(),
              config: {
                languageCode: 'en-US',
                voiceName: 'Kore'
              }
            }

            realWebSocket!.send(JSON.stringify(startMessage))
          })

          realWebSocket.on('message', (data) => {
            try {
              const message = JSON.parse(data.toString())
              clearTimeout(timeout)
              resolve(message)
            } catch (error) {
              clearTimeout(timeout)
              reject(error)
            }
          })

          realWebSocket.on('error', (error) => {
            clearTimeout(timeout)
            reject(error)
          })
        } catch (error) {
          clearTimeout(timeout)
          reject(error)
        }
      })

      const response = await messagePromise
      expect(response).toBeDefined()
      expect(typeof response).toBe('object')
    }, 15000)
  })
})

