import { WEBSOCKET_CONFIG } from '../../config/constants.js'
import { calculateBackoffDelay, DEFAULT_BACKOFF_MULTIPLIER } from '../../lib/ai/retry-config.js'
import { safeParseJson } from '../../lib/json.js'
import type { LiveServerEvent, LiveClientEventMap } from './types.js'
import { logger } from '../../lib/logger.js'
type ToolResponse = { functionResponses?: unknown[] }

/**
 * LiveClientWS — Evented client for the server-managed Live WebSocket.
 * No API key in browser; connects to WEBSOCKET_CONFIG.URL and speaks
 * the unified message protocol used in server/live-server.ts.
 */
export class LiveClientWS {
  private socket: WebSocket | null = null;
  private listeners = new Map<keyof LiveClientEventMap, Set<(...args: unknown[]) => void>>();
  private connectionId: string | null = null;
  private pendingStartOpts: { languageCode?: string; voiceName?: string; sessionId?: string; userContext?: { name?: string; email?: string }; locationData?: { latitude: number; longitude: number; city?: string; country?: string } } | null = null;
  private lastStartOptions: { languageCode?: string; voiceName?: string; sessionId?: string; userContext?: { name?: string; email?: string }; locationData?: { latitude: number; longitude: number; city?: string; country?: string } } | null = null;
  private sessionActive = false;
  private lastSessionStartedPayload: { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } | null = null;
  private devLogEnabled = (typeof process !== 'undefined' && (process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG === '1' || (process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG !== '0')));
  private lastLogTime = 0;
  private connectStartTime: number | null = null;
  private connectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;
  private heartbeatCheckIntervalId: ReturnType<typeof setInterval> | null = null;
  private reconnectAttempts = 0;
  private isManuallyClosed = false;
  private isConnecting = false; // Lock to prevent simultaneous connection attempts
  private reconnectTimerId: ReturnType<typeof setTimeout> | null = null;

  // Configuration
  private readonly CONNECT_TIMEOUT_MS = 10000; // 10 seconds (increased to improve initial connection reliability)
  private readonly MAX_RECONNECT_ATTEMPTS = WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS;
  private readonly RECONNECT_DELAY_MS = WEBSOCKET_CONFIG.RECONNECT_DELAY;
  private readonly HEARTBEAT_INTERVAL_MS = WEBSOCKET_CONFIG.HEARTBEAT_INTERVAL;
  private readonly HEARTBEAT_TIMEOUT_MS = WEBSOCKET_CONFIG.HEARTBEAT_TIMEOUT_MS; // 15 seconds
  private readonly MAX_BUFFERED_AMOUNT = WEBSOCKET_CONFIG.MAX_BUFFERED_AMOUNT; // 500KB
  private lastPongTime: number | null = null;

  // Connection health tracking
  private bufferedAmountHistory: number[] = [];
  private heartbeatSuccessCount = 0;
  private heartbeatFailureCount = 0;
  private lastHealthLogTime = 0;
  private readonly HEALTH_LOG_INTERVAL = 30000; // 30 seconds
  private startAckReceived = false;
  private startSendAttempts = 0;
  private startRetryTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly MAX_START_RETRIES = 3;
  private readonly START_RETRY_DELAY_MS = 1500;

  on<K extends keyof LiveClientEventMap>(event: K, cb: LiveClientEventMap[K]) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    const listeners = this.listeners.get(event)
    if (listeners) listeners.add(cb as (...args: unknown[]) => void)
    logger.debug('[LIVE_CLIENT] listener added', {
      event,
      listenerCount: this.listenerCount(event),
    });
    if (event === 'session_started') {
      logger.debug('[LIVE_CLIENT] session_started listener added - checking replay conditions', {
        sessionActive: this.sessionActive,
        hasCachedPayload: !!this.lastSessionStartedPayload,
        cachedConnectionId: this.lastSessionStartedPayload?.connectionId
      })
    }
    // Replay cached payload if available (even if sessionActive is false, the payload might be from a recent session_started event)
    // This handles the race condition where session_started arrives before listeners are re-added after cleanup
    if (event === 'session_started' && this.lastSessionStartedPayload) {
      logger.debug('[LIVE_CLIENT] Replaying cached session_started payload to new listener', {
        connectionId: this.lastSessionStartedPayload.connectionId,
        sessionActive: this.sessionActive,
        listenerCount: this.listenerCount(event)
      })
      queueMicrotask(() => {
        try {
          (cb as LiveClientEventMap['session_started'])(this.lastSessionStartedPayload as {
            connectionId: string
            languageCode?: string
            voiceName?: string
            mock?: boolean
          })
          logger.debug('[LIVE_CLIENT] Cached session_started payload replayed successfully')
        } catch (error) {
          console.error('[LIVE_CLIENT] Error replaying cached session_started payload', error)
        }
      })
    }
    return () => this.off(event, cb)
  }

  off<K extends keyof LiveClientEventMap>(event: K, cb: LiveClientEventMap[K]) {
    this.listeners.get(event)?.delete(cb as (...args: unknown[]) => void)
    logger.debug('[LIVE_CLIENT] listener removed', {
      event,
      listenerCount: this.listenerCount(event),
    })
  }

  /**
   * Check if the WebSocket is currently connected or connecting
   */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN || this.socket?.readyState === WebSocket.CONNECTING
  }

  /**
   * Get the current connection state
   */
  getConnectionState(): 'connecting' | 'open' | 'closing' | 'closed' | null {
    if (!this.socket) return null
    const state = this.socket.readyState
    if (state === WebSocket.CONNECTING) return 'connecting'
    if (state === WebSocket.OPEN) return 'open'
    if (state === WebSocket.CLOSING) return 'closing'
    if (state === WebSocket.CLOSED) return 'closed'
    return null
  }

  listenerCount<K extends keyof LiveClientEventMap>(event: K): number {
    return this.listeners.get(event)?.size ?? 0
  }

  getSessionActive(): boolean {
    return this.sessionActive
  }

  getConnectionId(): string | null {
    return this.connectionId
  }

  getCachedSessionStartedPayload(): { connectionId: string; languageCode?: string; voiceName?: string; mock?: boolean } | null {
    return this.lastSessionStartedPayload
  }

  private emit<K extends keyof LiveClientEventMap>(event: K, ...args: Parameters<LiveClientEventMap[K]>) {
    const eventListeners = this.listeners.get(event);
    logger.debug('[LIVE_CLIENT] emit called', {
      event,
      listenerCount: eventListeners?.size ?? 0,
      hasListeners: (eventListeners?.size ?? 0) > 0
    });
    eventListeners?.forEach((fn) => {
      try {
        (fn as (...args: unknown[]) => void)(...args)
      } catch (error) {
        console.error('[LIVE_CLIENT] Error in event handler', { event, error });
      }
    })
  }

  private setupHeartbeat() {
    this.clearHeartbeat();

    // Check for missed pongs more frequently (every 5 seconds) to detect issues sooner
    const checkInterval = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN && this.lastPongTime) {
        const timeSinceLastPong = Date.now() - this.lastPongTime;
        if (timeSinceLastPong > this.HEARTBEAT_TIMEOUT_MS) {
          this.heartbeatFailureCount++;
          console.warn('[LiveClient] Heartbeat timeout, reconnecting...', {
            timeSinceLastPong,
            timeout: this.HEARTBEAT_TIMEOUT_MS,
            bufferedAmount: this.socket.bufferedAmount,
            consecutiveFailures: this.heartbeatFailureCount
          });
          this.reconnect();
          return;
        }
      }
    }, 5000); // Check every 5 seconds

    // Send pings at the configured interval using priority send
    this.heartbeatIntervalId = setInterval(() => {
      if (this.socket?.readyState === WebSocket.OPEN) {
        // Use priority send for heartbeat to bypass buffer check
        this.sendPriority(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
      }
    }, this.HEARTBEAT_INTERVAL_MS);

    // Store check interval for cleanup
    this.heartbeatCheckIntervalId = checkInterval;
  }

  private clearHeartbeat() {
    if (this.heartbeatIntervalId) {
      clearInterval(this.heartbeatIntervalId);
      this.heartbeatIntervalId = null;
    }
    // Clear the check interval if it exists
    if (this.heartbeatCheckIntervalId) {
      clearInterval(this.heartbeatCheckIntervalId);
      this.heartbeatCheckIntervalId = null;
    }
  }

  private reconnect() {
    if (this.isManuallyClosed) {
      return;
    }

    if (this.reconnectAttempts >= this.MAX_RECONNECT_ATTEMPTS) {
      console.error(`[LiveClient] Max reconnection attempts (${this.MAX_RECONNECT_ATTEMPTS}) reached`);
      this.emit('error', 'Max reconnection attempts reached');
      return;
    }

    // Prevent multiple reconnect timers
    if (this.reconnectTimerId) {
      return;
    }

    // Exponential backoff with max delay cap
    const delay = calculateBackoffDelay(this.reconnectAttempts + 1, {
      baseDelay: this.RECONNECT_DELAY_MS,
      maxDelay: 30000,
      backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER
    });
    logger.debug(`[LiveClient] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.MAX_RECONNECT_ATTEMPTS})`);

    this.reconnectTimerId = setTimeout(() => {
      this.reconnectTimerId = null;
      if (!this.isManuallyClosed && !this.isConnecting) {
        this.reconnectAttempts++;
        this.connect();
      }
    }, delay);
  }

  connect() {
    // Prevent multiple simultaneous connection attempts - check AND set atomically
    if (this.isConnecting) {
      logger.debug('[LiveClient] Connection already in progress, skipping');
      return;
    }

    // If socket is already open, skip
    if (this.socket?.readyState === WebSocket.OPEN) {
      logger.debug('[LiveClient] Socket already open, skipping connect');
      return;
    }

    // Set connecting flag FIRST to prevent race conditions
    this.isConnecting = true;

    // Clean up any existing connection (without calling disconnect() which sets isManuallyClosed)
    // Check for stuck CONNECTING sockets BEFORE cleaning up
    if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
      const stuck = this.connectStartTime &&
        (Date.now() - this.connectStartTime) > this.CONNECT_TIMEOUT_MS;
      if (stuck) {
        console.warn('[LiveClient] Connection stuck in CONNECTING, forcing cleanup');
        try { this.socket.close() } catch { /* ignore */ }
        this.socket = null
        this.connectStartTime = null
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId)
          this.connectTimeoutId = null
        }
      } else {
        // Still connecting within timeout, skip
        logger.debug('[LiveClient] Socket already exists and is connecting, skipping connect');
        this.isConnecting = false;
        return
      }
    }

    // Clean up failed/closed sockets before reconnecting
    if (this.socket) {
      const readyState = this.socket.readyState
      if (readyState === WebSocket.CLOSED || readyState === WebSocket.CLOSING) {
        // Socket is closed/closing, clean it up
        this.socket = null
      } else {
        // Socket exists but not in expected state, close it
        try { this.socket.close() } catch { /* ignore close errors */ }
        this.socket = null
      }
    }

    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId)
      this.connectTimeoutId = null
    }
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId)
      this.reconnectTimerId = null
    }
    this.connectStartTime = null
    this.clearHeartbeat()
    this.isManuallyClosed = false;

    // Track connection start
    this.connectStartTime = Date.now()

    // Add timeout for stuck connections
    this.connectTimeoutId = setTimeout(() => {
      if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
        console.warn('[LiveClient] Connection timeout, aborting stuck connection');
        try { this.socket.close() } catch { /* ignore */ }
        this.socket = null
        this.emit('error', 'Connection timeout')
        this.connectStartTime = null
        this.connectTimeoutId = null
      }
    }, this.CONNECT_TIMEOUT_MS)

    const url = WEBSOCKET_CONFIG.URL
    logger.debug('[LiveClient] Connecting to:', { url });
    const ws = new WebSocket(url)
    this.socket = ws

    ws.onopen = () => {
      logger.debug('[LiveClient] WebSocket opened successfully');
      this.isConnecting = false;
      this.onOpen();
    }
    ws.onclose = (event) => {
      this.isConnecting = false;
      this.onClose(event)
    }
    ws.onerror = (error) => {
      const socketState = this.socket?.readyState
      if (this.isManuallyClosed && (socketState === WebSocket.CLOSING || socketState === WebSocket.CLOSED)) {
        return
      }
      // Extract error details - handle Event objects that have no enumerable properties
      let errorMessage = ''
      let hasUsefulError = false
      let errorDetails: Record<string, unknown> = {}

      if (error instanceof ErrorEvent) {
        errorMessage = error.message || ''
        hasUsefulError = !!error.message
        errorDetails = {
          message: error.message,
          filename: error.filename,
          lineno: error.lineno,
          colno: error.colno,
          error: error.error
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
        hasUsefulError = true
        errorDetails = { message: error.message, stack: error.stack }
      } else if (error && typeof error === 'object') {
        // Handle Event objects - try to extract what we can
        // Event objects don't have enumerable properties, so Object.keys() returns []
        const event = error
        errorDetails = {
          type: event.type,
          target: (event.target as WebSocket)?.readyState,
          isTrusted: event.isTrusted,
          currentTarget: (event.currentTarget as WebSocket)?.readyState
        }
        // Browser WebSocket errors often have no message but indicate connection issues
        const wsTarget = event.target as WebSocket
        if (wsTarget && wsTarget.readyState !== WebSocket.OPEN) {
          errorMessage = `WebSocket connection error (state: ${wsTarget.readyState === WebSocket.CONNECTING ? 'CONNECTING' : wsTarget.readyState === WebSocket.CLOSING ? 'CLOSING' : 'CLOSED'})`
          hasUsefulError = true
        } else if (event.type === 'error') {
          errorMessage = 'WebSocket error event'
          hasUsefulError = true
        }
      }

      const isOpen = socketState === WebSocket.OPEN
      const isConnecting = socketState === WebSocket.CONNECTING
      const isBadState = !isOpen && !isConnecting

      const errorContext = {
        url: this.socket?.url || url,
        readyState: socketState,
        readyStateName: socketState === WebSocket.CONNECTING ? 'CONNECTING'
          : socketState === WebSocket.OPEN ? 'OPEN'
            : socketState === WebSocket.CLOSING ? 'CLOSING'
              : socketState === WebSocket.CLOSED ? 'CLOSED'
                : 'UNKNOWN',
        connectionId: this.connectionId,
        timestamp: new Date().toISOString(),
        ...errorDetails
      }

      // Always log errors with full context
      if (hasUsefulError) {
        console.error('[LiveClient] WebSocket error:', {
          ...errorContext,
          errorMessage,
        })
      } else if (isBadState) {
        // Bad state with no error message - this is concerning
        console.warn('[LiveClient] WebSocket error (socket in bad state):', errorContext)
      } else {
        // Transient error on open/connecting socket - log at debug level
        console.debug('[LiveClient] WebSocket error (transient):', errorContext)
      }

      // Always log the raw error object for debugging (even if empty)
      console.error('[LiveClient] Raw WebSocket error event:', {
        error,
        errorType: error?.constructor?.name,
        errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
        errorString: error instanceof Error ? error.message : (typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error)),
      })

      // Check if this might be related to API errors (429, etc.)
      if (errorMessage.includes('429') || errorMessage.includes('quota') || errorMessage.includes('rate limit')) {
        console.warn('[LiveClient] WebSocket error may be related to API rate limiting. Check Google Gemini API quota.')
      }

      // Always emit error event so hooks can handle it
      this.emit('error', errorMessage || 'WebSocket error')

      // Only force close if socket is in bad state
      if (isBadState) {
        this.isConnecting = false;
        if (this.connectTimeoutId) {
          clearTimeout(this.connectTimeoutId)
          this.connectTimeoutId = null
        }
        try {
          if (this.socket) {
            this.socket.close()
          }
        } catch { /* ignore close errors */ }
        this.socket = null
        this.connectStartTime = null
      }
    }
    ws.onmessage = (event) => {
      this.onMessage(event)
    }
  }

  private onOpen() {
    this.isConnecting = false;
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
    }
    this.connectStartTime = null;
    this.reconnectAttempts = 0; // Reset reconnect attempts on successful connection
    this.lastPongTime = Date.now();

    // Reset health metrics on new connection
    this.bufferedAmountHistory = [];
    this.heartbeatSuccessCount = 0;
    this.heartbeatFailureCount = 0;
    this.lastHealthLogTime = Date.now();

    // Clear any pending reconnect timer
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId);
      this.reconnectTimerId = null;
    }

    // Set up heartbeat
    this.setupHeartbeat();

    this.emit('open');
    this.devLog('Connected to WebSocket server');

    // Don't send start here - wait for 'connected' event with connectionId
    // The start will be sent when 'connected' event fires (see case 'connected' handler)
  }

  private onClose(event: CloseEvent) {
    this.isConnecting = false;
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId);
    }
    this.connectStartTime = null;
    this.clearHeartbeat();
    this.socket = null;
    this.connectionId = null;
    this.clearStartRetryTimer();
    this.startSendAttempts = 0;
    this.startAckReceived = false;

    // Don't attempt to reconnect if we closed intentionally
    if (!this.isManuallyClosed) {
      // Clear any pending reconnect timer
      if (this.reconnectTimerId) {
        clearTimeout(this.reconnectTimerId);
        this.reconnectTimerId = null;
      }
      this.reconnect();
    }

    this.emit('close', event.reason);
    this.devLog('Disconnected from WebSocket server', { code: event.code, reason: event.reason });
  }

  private onMessage(event: MessageEvent) {
    try {
      const parsed = safeParseJson<{ type: string;[key: string]: unknown } | null>(
        typeof event.data === 'string' ? event.data : String(event.data),
        null,
        {
          onError: (err) => {
            console.error('Error parsing WebSocket message:', err, event.data)
          }
        }
      )
      if (!parsed) {
        return
      }

      type ParsedMessage = { type: string; payload?: unknown; data?: unknown;[key: string]: unknown }
      const typedParsed = parsed as ParsedMessage

      logger.debug('[LIVE_CLIENT] WebSocket message received', {
        type: parsed.type,
        hasPayload: Boolean(typedParsed.payload),
        hasData: Boolean(typedParsed.data),
        preview: typeof event.data === 'string' ? event.data.slice(0, 200) : 'non-string'
      })

      // Handle heartbeat pong (not in LiveServerEvent type but sent by server)
      if (parsed.type === 'pong') {
        this.lastPongTime = Date.now();
        this.heartbeatSuccessCount++;
        this.devLog('Received pong', { timestamp: parsed.timestamp });
        return;
      }

      // Also treat server heartbeat messages as valid connection health indicators
      // Server sends heartbeat messages periodically, which indicates connection is alive
      if (parsed.type === 'heartbeat') {
        // Update lastPongTime when receiving heartbeat - server is alive and responding
        this.lastPongTime = Date.now();
        this.heartbeatSuccessCount++;
        this.devLog('Received heartbeat', { timestamp: parsed.timestamp });
        // Continue processing as heartbeat event too
      }

      if (parsed.type === 'session_ready') {
        const readyData = (parsed as { type: string; data?: { sessionId?: string; timestamp?: number } })
        logger.debug('[LIVE_CLIENT] session_ready event received', {
          sessionId: readyData.data?.sessionId,
          timestamp: readyData.data?.timestamp,
          sessionActive: this.sessionActive
        })
        if (!this.sessionActive) {
          const fallbackPayload = {
            connectionId: this.connectionId ?? 'unknown',
            languageCode: this.lastStartOptions?.languageCode,
            voiceName: this.lastStartOptions?.voiceName
          }
          logger.debug('[LIVE_CLIENT] Synthesizing session_started from session_ready', fallbackPayload)
          this.routeEvent({ type: 'session_started', payload: fallbackPayload } as LiveServerEvent)
        }
        return;
      }

      this.routeEvent(parsed as LiveServerEvent);
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private routeEvent(msg: LiveServerEvent) {
    this.devLog('event', { type: msg.type })
    type MessageWithPayload = { type: string; payload?: unknown }
    const typedMsg = msg as MessageWithPayload
    logger.debug('[LIVE_CLIENT] routeEvent called', {
      type: msg.type,
      hasPayload: Boolean(typedMsg.payload)
    })
    switch (msg.type) {
      case 'connected':
        if (!msg.payload) return
        this.connectionId = msg.payload.connectionId
        this.emit('connected', this.connectionId)
        // Send queued start message if it exists
        if (this.pendingStartOpts) {
          const opts = this.pendingStartOpts
          this.pendingStartOpts = null
          this.lastStartOptions = opts
          const sent = this.send({ type: 'start', payload: opts })
          logger.debug('[LIVE_CLIENT] Sent queued start after connected', {
            sent,
            connectionId: this.connectionId
          })
          if (!sent) {
            this.pendingStartOpts = opts
            this.scheduleStartRetry()
          } else {
            this.armStartRetry()
          }
        }
        break
      case 'start_ack': {
        if (!msg.payload) return
        logger.debug('[LIVE_CLIENT] start_ack received', {
          connectionId: msg.payload.connectionId,
          pendingStart: Boolean(this.pendingStartOpts),
          lastStartOptions: this.lastStartOptions
        })
        this.startAckReceived = true
        this.clearStartRetryTimer()
        this.startSendAttempts = 0
        this.emit('start_ack', { connectionId: msg.payload.connectionId })
        break
      }
      case 'session_started': {
        if (!msg.payload) return
        this.sessionActive = true
        this.lastSessionStartedPayload = msg.payload
        // Set connectionId if provided in session_started payload
        if (msg.payload.connectionId) {
          this.connectionId = msg.payload.connectionId
        }
        logger.debug('[LIVE_CLIENT] session_started event received', {
          connectionId: msg.payload.connectionId,
          languageCode: msg.payload.languageCode,
          voiceName: msg.payload.voiceName
        })
        this.startAckReceived = true
        this.clearStartRetryTimer()
        this.startSendAttempts = 0
        const listenerCount = this.listenerCount('session_started');
        logger.debug('[LIVE_CLIENT] Emitting session_started event', {
          listenerCount,
          hasListeners: listenerCount > 0,
          connectionId: msg.payload.connectionId
        });
        this.emit('session_started', msg.payload)
        break
      }
      case 'session_closed': {
        this.sessionActive = false
        this.lastSessionStartedPayload = null
        this.emit('session_closed', msg.payload?.reason)
        break
      }
      case 'input_transcript':
        if (!msg.payload) {
          console.warn('[LiveClient] INPUT_TRANSCRIPT message has no payload');
          return
        }
        logger.debug('[LiveClient] Received INPUT_TRANSCRIPT', {
          text: msg.payload.text?.substring(0, 50),
          isFinal: msg.payload.isFinal,
          fullLength: msg.payload.text?.length
        });
        this.emit('input_transcript', msg.payload.text, Boolean(msg.payload.isFinal))
        break
      case 'output_transcript':
        if (!msg.payload) {
          console.warn('[LiveClient] OUTPUT_TRANSCRIPT message has no payload');
          return
        }
        logger.debug('[LiveClient] Received OUTPUT_TRANSCRIPT', {
          text: msg.payload.text?.substring(0, 50),
          isFinal: msg.payload.isFinal,
          fullLength: msg.payload.text?.length
        });
        this.emit('output_transcript', msg.payload.text, Boolean(msg.payload.isFinal))
        break
      case 'text':
        if (!msg.payload) return
        this.emit('text', msg.payload.content)
        break
      case 'audio':
        if (!msg.payload) return
        this.emit('audio', msg.payload.audioData, msg.payload.mimeType)
        break
      case 'turn_complete':
        this.emit('turn_complete')
        break
      case 'setup_complete':
        this.emit('setup_complete')
        break
      case 'interrupted':
        this.emit('interrupted')
        break
      case 'tool_call':
        if (!msg.payload) return
        this.emit('tool_call', msg.payload)
        break
      case 'tool_result':
        if (!msg.payload) return
        this.emit('tool_result', msg.payload)
        break
      case 'stage_update':
        if (!msg.payload) return
        this.emit('stage_update', msg.payload)
        break
      case 'heartbeat': {
        // Auto-ack heartbeat to keep server's lastPing fresh
        try { this.ackHeartbeat() } catch { /* ignore */ }
        const heartbeatPayload = msg.payload as { timestamp?: number } | undefined
        this.emit('heartbeat', heartbeatPayload?.timestamp ?? Date.now())
        break
      }
      case 'error':
        this.emit('error', msg.payload?.message || 'Unknown error')
        break
      default: {
        type UnknownMessage = { type?: string;[key: string]: unknown }
        const unknownMsg = msg as UnknownMessage
        console.warn('[LIVE_CLIENT] Unhandled event type in routeEvent', {
          type: unknownMsg.type,
          msg
        })
        break
      }
    }
  }

  start(opts?: { languageCode?: string; voiceName?: string; sessionId?: string; userContext?: { name?: string; email?: string }; locationData?: { latitude: number; longitude: number; city?: string; country?: string } }) {
    const startOptions = opts || {}
    this.lastStartOptions = startOptions
    this.startAckReceived = false

    // Always queue the start message until we receive 'connected' from server
    if (!this.connectionId) {
      logger.debug('[LiveClient] Queueing start message until server sends connected event');
      this.pendingStartOpts = startOptions
      this.startSendAttempts = 0
      this.scheduleStartRetry()
      return
    }

    // If socket is not open yet, queue it anyway (will be sent when socket opens)
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      logger.debug('[LiveClient] Queueing start message until socket is OPEN');
      this.pendingStartOpts = startOptions
      this.startSendAttempts = 0
      this.scheduleStartRetry()
      return
    }

    // If already connected and socket is open, send immediately
    this.startSendAttempts += 1
    const sent = this.send({ type: 'start', payload: startOptions })

    if (!sent) {
      this.pendingStartOpts = startOptions
      this.scheduleStartRetry()
      return
    }
    this.pendingStartOpts = null
    this.armStartRetry()
  }

  private clearStartRetryTimer() {
    if (this.startRetryTimer) {
      clearTimeout(this.startRetryTimer)
      this.startRetryTimer = null
    }
  }

  private armStartRetry() {
    this.clearStartRetryTimer()
    if (this.startAckReceived) return
    if (this.startSendAttempts >= this.MAX_START_RETRIES) return

    this.startRetryTimer = setTimeout(() => {
      this.startRetryTimer = null
      if (this.startAckReceived) return
      const opts = this.pendingStartOpts || this.lastStartOptions
      if (!opts) return
      console.warn('[LIVE_CLIENT] start_ack not received, retrying start', {
        attempt: this.startSendAttempts + 1,
        connectionId: this.connectionId
      })
      this.start(opts)
    }, this.START_RETRY_DELAY_MS)
  }

  private scheduleStartRetry(opts?: { languageCode?: string; voiceName?: string; sessionId?: string; userContext?: { name?: string; email?: string }; locationData?: { latitude: number; longitude: number; city?: string; country?: string } }) {
    if (this.startAckReceived) return
    if (this.startSendAttempts >= this.MAX_START_RETRIES) return
    if (this.startRetryTimer) return

    this.startRetryTimer = setTimeout(() => {
      this.startRetryTimer = null
      const nextOpts = opts || this.pendingStartOpts || this.lastStartOptions
      if (!nextOpts) return
      console.warn('[LIVE_CLIENT] Retrying queued start message', {
        attempt: this.startSendAttempts + 1,
        connectionId: this.connectionId,
        readyState: this.socket?.readyState
      })
      this.start(nextOpts)
    }, this.START_RETRY_DELAY_MS)
  }

  stop() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    // Client should not emit TURN_COMPLETE (server -> client event)
    this.send({ type: 'stop' })
  }

  sendText(_text: string) {
    // CRITICAL FIX: Live API's sendRealtimeInput() only accepts audio/video media, NOT text
    // Sending text via sendRealtimeInput causes error 1007 "Request contains an invalid argument"
    // Text should be sent via systemInstruction during session setup, not via realtime input
    // This method is disabled to prevent 1007 errors
    console.warn('[LiveClientWS] sendText() called but disabled - text cannot be sent via sendRealtimeInput (causes 1007 error)')
    return
    // DISABLED: this.send({ type: 'REALTIME_INPUT', payload: { chunks: [{ text, mimeType: 'text/plain' }] } })
  }

  sendAudioBase64PCM16(base64: string, mimeType = 'audio/pcm;rate=24000') {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'user_audio', payload: { audioData: base64, mimeType } })
  }

  sendRealtimeInput(chunks: Array<{ mimeType: string; data: string }>) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    if (!this.sessionActive) {
      // Session not started yet - audio will be queued by the service layer
      return
    }
    this.send({ type: 'REALTIME_INPUT', payload: { chunks } })
  }

  sendContextUpdate(update: { sessionId?: string; modality: 'screen' | 'webcam' | 'intelligence'; analysis: string; imageData?: string; capturedAt?: number; metadata?: any }) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'CONTEXT_UPDATE', payload: update })
  }

  sendToolResponse(responses: ToolResponse['functionResponses']) {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    if (!responses || responses.length === 0) return
    this.send({ type: 'TOOL_RESULT', payload: { responses } })
  }

  ackHeartbeat() {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) return
    this.send({ type: 'heartbeat_ack', timestamp: Date.now() })
  }

  disconnect() {
    this.isManuallyClosed = true
    this.isConnecting = false
    if (this.connectTimeoutId) {
      clearTimeout(this.connectTimeoutId)
      this.connectTimeoutId = null
    }
    if (this.reconnectTimerId) {
      clearTimeout(this.reconnectTimerId)
      this.reconnectTimerId = null
    }
    this.connectStartTime = null
    this.reconnectAttempts = 0
    try { this.socket?.close(1000, 'Manual disconnect') } catch { /* ignore close errors */ }
    this.socket = null
    this.clearHeartbeat()
  }

  private send(message: Record<string, unknown>): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    // Check buffer before sending non-priority messages
    if (this.socket.bufferedAmount > this.MAX_BUFFERED_AMOUNT) {
      console.warn('[LiveClient] Buffer full, dropping message', {
        bufferedAmount: this.socket.bufferedAmount,
        threshold: this.MAX_BUFFERED_AMOUNT,
        messageType: (message as { type?: string }).type
      });

      // Track buffer levels for health monitoring
      this.trackBufferHealth();
      return false;
    }

    try {
      const messageStr = JSON.stringify(message);
      this.socket.send(messageStr);

      // Track buffer levels for health monitoring
      this.trackBufferHealth();
      return true;
    } catch (err) {
      console.error('[LIVE_CLIENT] socket.send() failed', err);
      return false;
    }
  }

  /**
   * Send priority message (heartbeat) - bypasses buffer check
   */
  private sendPriority(data: string): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      this.socket.send(data);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Track buffer health metrics
   */
  private trackBufferHealth() {
    if (!this.socket) return;

    const bufferedAmount = this.socket.bufferedAmount;
    this.bufferedAmountHistory.push(bufferedAmount);

    // Keep only last 60 samples (30 seconds at 500ms intervals)
    if (this.bufferedAmountHistory.length > 60) {
      this.bufferedAmountHistory.shift();
    }

    // Log health metrics every 30 seconds
    const now = Date.now();
    if (now - this.lastHealthLogTime >= this.HEALTH_LOG_INTERVAL) {
      this.lastHealthLogTime = now;
      const avgBuffer = this.bufferedAmountHistory.reduce((a, b) => a + b, 0) / this.bufferedAmountHistory.length;
      const maxBuffer = Math.max(...this.bufferedAmountHistory);
      const heartbeatSuccessRate = this.heartbeatSuccessCount + this.heartbeatFailureCount > 0
        ? (this.heartbeatSuccessCount / (this.heartbeatSuccessCount + this.heartbeatFailureCount)) * 100
        : 100;

      logger.debug('[LiveClient] Connection health metrics', {
        avgBufferedAmount: Math.round(avgBuffer),
        maxBufferedAmount: maxBuffer,
        currentBufferedAmount: bufferedAmount,
        heartbeatSuccessRate: `${heartbeatSuccessRate.toFixed(1)}%`,
        heartbeatSuccessCount: this.heartbeatSuccessCount,
        heartbeatFailureCount: this.heartbeatFailureCount
      });
    }
  }

  private devLog(event: string, data?: unknown) {
    if (!this.devLogEnabled) return
    try {
      // Throttle dev logging to prevent resource exhaustion
      const now = Date.now()
      if (this.lastLogTime && now - this.lastLogTime < 100) { // Max 10 logs per second
        return
      }
      this.lastLogTime = now

      const payload = { category: 'client-live', event, data, ts: now }
      if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' })
        navigator.sendBeacon('/api/dev/log', blob)
      } else if (typeof fetch !== 'undefined') {
        fetch('/api/dev/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }).catch(() => { })
      }
    } catch { /* ignore dev log errors */ }
  }
}

// Backward-compat no-op export (previous prototype-based connect)
export function connectLive(): Promise<LiveClientWS> {
  const client = new LiveClientWS()
  client.connect()
  return Promise.resolve(client)
}

// Browser-global singleton to survive HMR/fast refresh in dev and avoid
// creating multiple WebSocket connections. Always prefer this when not
// explicitly injecting a client instance.
declare global {
  interface Window { __fbc_liveClient?: LiveClientWS }
}

export function getLiveClientSingleton(): LiveClientWS {
  // Only create one instance per-window. For SSR, fall back to a new instance.
  if (typeof window !== 'undefined') {
    if (!window.__fbc_liveClient) {
      window.__fbc_liveClient = new LiveClientWS()
    }
    return window.__fbc_liveClient
  }
  // Non-browser environments shouldn't leak a global; return a fresh instance
  return new LiveClientWS()
}
