import { logger } from 'src/lib/logger'

/**
 * CENTRALIZED CONFIGURATION
 * DO NOT HARDCODE THESE VALUES ANYWHERE ELSE
 * 
 * All WebSocket URLs, model names, and other configuration values
 * must be imported from this file.
 */

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const normalizeWebsocketUrl = (
  rawValue: string | undefined,
  {
    fallback,
    enforceSecure = false,
  }: {
    fallback: string
    enforceSecure?: boolean
  }
) => {
  if (!rawValue) {
    return trimTrailingSlash(fallback)
  }

  try {
    const trimmed = rawValue.trim()
    const hasScheme = /^[a-z]+:\/\//i.test(trimmed)
    const baseProtocol = enforceSecure ? 'wss://' : 'ws://'
    const candidate = hasScheme ? trimmed : `${baseProtocol}${trimmed}`
    const url = new URL(candidate)

    if (url.protocol === 'http:') url.protocol = 'ws:'
    if (url.protocol === 'https:') url.protocol = 'wss:'
    if (enforceSecure && url.protocol !== 'wss:') {
      url.protocol = 'wss:'
    }

    const hostname = url.hostname.toLowerCase()
    const isLocalHost =
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.localdomain')

    if (!isLocalHost && url.protocol === 'wss:') {
      if (url.port && url.port !== '443') {
        console.warn(
          `[WEBSOCKET_CONFIG] Stripping unsupported secure port "${url.port}" from ${url.hostname}`
        )
        url.port = ''
      }
    }

    return trimTrailingSlash(url.toString())
  } catch (error) {
    console.warn(
      '[WEBSOCKET_CONFIG] Invalid WebSocket URL provided; falling back to default',
      error
    )
    return trimTrailingSlash(fallback)
  }
}

// WebSocket Configuration
// Check if we're running locally (client-side aware)
const isLocalhostRuntime = () => {
  // Server-side: check NODE_ENV
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV !== 'production'
  }
  
  // Client-side: check hostname to detect localhost
  const hostname = typeof window !== 'undefined' ? window.location.hostname : ''
  return (
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]' ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.localdomain') ||
    hostname.includes('.local')
  )
}

// Check if we're in production at runtime (client-side aware)
export const isProductionRuntime = () => {
  // Always use localhost when running locally, even if LIVE_SERVER_URL is set
  if (isLocalhostRuntime()) {
    return false
  }
  
  // If NEXT_PUBLIC_LIVE_SERVER_URL is explicitly set and we're not on localhost, use it
  if (process.env.NEXT_PUBLIC_LIVE_SERVER_URL) {
    return true
  }
  
  // Server-side: use NODE_ENV
  if (typeof window === 'undefined') {
    return process.env.NODE_ENV === 'production'
  }
  
  // Client-side: production if not localhost (includes vercel.app, custom domains, etc.)
  return true // We already checked for localhost above
}

export const WEBSOCKET_CONFIG = {
  // Distinct envs for prod vs dev to avoid accidental overrides
  // Note: process.env.* is replaced by Vite's define at build time (matches v9 approach)
  PRODUCTION_URL: normalizeWebsocketUrl(process.env.NEXT_PUBLIC_LIVE_SERVER_URL, {
    fallback: 'wss://fb-consulting-websocket.fly.dev',
    enforceSecure: true,
  }),
  DEVELOPMENT_URL: normalizeWebsocketUrl(process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL, {
    fallback: 'ws://localhost:3001',
  }),
  get URL() {
    // Always use localhost when running locally, even if NEXT_PUBLIC_LIVE_SERVER_URL is set
    if (isLocalhostRuntime()) {
      // Prefer explicit dev URL when present
      if (process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL) {
        logger.debug('[WEBSOCKET_CONFIG] Using dev URL from NEXT_PUBLIC_LIVE_SERVER_DEV_URL:', { url: this.DEVELOPMENT_URL })
        return this.DEVELOPMENT_URL
      }
      
      // Derive from current host in the browser for local networks
      if (typeof window !== 'undefined') {
        const host = window.location.hostname
        const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:'
        const protocol = isSecure ? 'wss' : 'ws'
        // WebSocket server runs on 3001, NOT the same port as Vite (3000)
        const port = process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_PORT ?? '3001'
        const portSuffix = port ? `:${port}` : ''
        const devUrl = `${protocol}://${host}${portSuffix}`
        logger.debug('[WEBSOCKET_CONFIG] Using dev URL (local development):', { url: devUrl })
        return devUrl
      }
      
      logger.debug('[WEBSOCKET_CONFIG] Using default dev URL (local development):', { url: this.DEVELOPMENT_URL })
      return this.DEVELOPMENT_URL
    }
    
    // Production mode - use NEXT_PUBLIC_LIVE_SERVER_URL if set, otherwise fallback
    if (process.env.NEXT_PUBLIC_LIVE_SERVER_URL) {
      logger.debug('[WEBSOCKET_CONFIG] Using production URL from NEXT_PUBLIC_LIVE_SERVER_URL:', { url: this.PRODUCTION_URL })
      return this.PRODUCTION_URL
    }
    
    // Production fallback
    logger.debug('[WEBSOCKET_CONFIG] Using production URL (fallback):', { url: this.PRODUCTION_URL })
    return this.PRODUCTION_URL
  },
  RECONNECT_DELAY: 3000,
  MAX_RECONNECT_ATTEMPTS: 5,
  HEARTBEAT_INTERVAL: 30000, // 30 seconds
  MAX_BUFFERED_AMOUNT: 500_000, // 500KB - buffer threshold for client
  HEARTBEAT_TIMEOUT_MS: 45000, // Allow 45 seconds to accommodate server heartbeat interval
  FRAME_QUEUE_MAX_SIZE: 5,
  FRAME_QUEUE_PROCESS_INTERVAL: 500, // ms
  LOW_QUALITY_JPEG: 0.75,
  HIGH_BUFFER_THRESHOLD: 300_000, // 300KB - start reducing quality
} as const

// Gemini Model Names
export const GEMINI_MODELS = {
  // NEW: Google's latest models (auto-update to newest)
  FLASH_LATEST: 'gemini-2.5-flash',              // Auto-updates to latest Flash
  FLASH_LITE_LATEST: 'gemini-2.5-flash-lite',    // Auto-updates to latest Lite

  // NEW: Specific versions (predictable behavior)
  FLASH_2025_09: 'gemini-2.5-flash',
  FLASH_LITE_2025_09: 'gemini-2.5-flash-lite',
  AUDIO_2025_09: 'gemini-2.5-flash-native-audio-preview-09-2025', // Live API native audio model

  // NEW: Gemini 3.0
  GEMINI_3_PRO_PREVIEW: 'gemini-3-pro-preview',

  // LEGACY: For backward compatibility (deprecated models)

  FLASH_EXP: 'gemini-2.0-flash-exp',                // Old experimental

  // DEFAULTS: What each use case should use
  DEFAULT_CHAT: 'gemini-3-pro-preview',               // Standard Chat
  DEFAULT_LIVE: 'gemini-3-pro-preview',               // Live sessions
  DEFAULT_VISION: 'gemini-2.5-flash',                 // Vision/Webcam analysis
  DEFAULT_AUDIO: 'gemini-2.5-flash',                  // Audio processing
  DEFAULT_VOICE: 'gemini-2.5-flash-native-audio-preview-09-2025', // Live Voice
  DEFAULT_MULTIMODAL: 'gemini-3-pro-preview',         // Vision
  DEFAULT_WEBCAM: 'gemini-3-pro-preview',             // Webcam analysis
  FALLBACK: 'gemini-2.5-flash',                       // Fallback model
  DEFAULT_SCREEN: 'gemini-3-pro-preview',             // Screen capture
  DEFAULT_FAST: 'gemini-2.5-flash-lite',          // Quick Edit
  DEFAULT_RELIABLE: 'gemini-2.5-flash', // Research
} as const

// Gemini API Endpoints
export const GEMINI_ENDPOINTS = {
  LIVE_API: 'generativelanguage.googleapis.com/v1beta/models',
  STANDARD_API: 'generativelanguage.googleapis.com/v1/models',
  STREAMING_API: 'generativelanguage.googleapis.com/v1beta/models',
  V1_ALPHA_API: 'generativelanguage.googleapis.com/v1alpha/models', // Required for Gemini 3 features like media_resolution
} as const

// Embedding Models
export const EMBEDDING_MODELS = {
  DEFAULT: 'text-embedding-004',
  TEXT_EMBEDDING_004: 'text-embedding-004',
} as const

// Gemini 3.0 Specific Configurations
export const THINKING_LEVELS = {
  LOW: 'low',
  HIGH: 'high', // Default for Gemini 3
} as const

export const MEDIA_RESOLUTIONS = {
  LOW: 'media_resolution_low',
  MEDIUM: 'media_resolution_medium',
  HIGH: 'media_resolution_high',
} as const

// Gemini Live API Configuration
export const LIVE_API_CONFIG = {
  // Use sendRealtimeInput(), NOT session.send()
  METHOD_NAME: 'sendRealtimeInput',
  AUDIO_ENCODING: 'pcm_s16le',
  SAMPLE_RATE: 24000,
  CHANNELS: 1,
} as const

// Type safety
export type GeminiModel = typeof GEMINI_MODELS[keyof typeof GEMINI_MODELS]
export type GeminiEndpoint = typeof GEMINI_ENDPOINTS[keyof typeof GEMINI_ENDPOINTS]

// API Rate Limits
export const RATE_LIMITS = {
  WEBCAM_CAPTURE_INTERVAL: 2000, // 2 seconds (for analysis, not streaming)
  SCREEN_CAPTURE_INTERVAL: 2000, // 2 seconds (for analysis, not streaming)
  // Live API streaming intervals - much longer to avoid overwhelming the API
  WEBCAM_STREAM_INTERVAL: 1000, // 1 second - faster for real-time feel
  SCREEN_STREAM_INTERVAL: 1000, // 1 second - faster for real-time feel
} as const

// Context Configuration
export const CONTEXT_CONFIG = {
  REDIS_TTL: 3600, // 1 hour for active sessions
  ARCHIVE_ON_DISCONNECT: true,
  AUTO_GENERATE_PDF: true,
  MIN_MESSAGES_FOR_ARCHIVE: 3, // Don't archive test conversations
  SUMMARIZE_THRESHOLD: 50, // Summarize every 50 messages
} as const

// Security Configuration
export const SECURITY_CONFIG = {
  ENABLE_PII_DETECTION: process.env.NODE_ENV === 'production',
  ENABLE_PII_REDACTION: process.env.NODE_ENV === 'production',
  ENABLE_AUDIT_LOGGING: true,
  DATA_RETENTION_DAYS: 90, // GDPR compliance
  ENABLE_ENCRYPTION_AT_REST: true, // For Supabase
} as const

// Session Configuration
export const SESSION_CONFIG = {
  TIMEOUT: 30 * 60 * 1000, // 30 minutes
  WARNING_THRESHOLD: 25 * 60 * 1000, // 25 minutes
  HEARTBEAT_INTERVAL: 60 * 1000, // 1 minute
} as const

// Audio Configuration
export const AUDIO_CONFIG = {
  SAMPLE_RATE: 24000,
  CHANNELS: 1,
  BIT_DEPTH: 16,
  CHUNK_SIZE: 4096,
  NOISE_GATE_THRESHOLD: -50, // dB
} as const

// Security / CORS
export const ALLOWED_ORIGINS = (
  process.env.NEXT_PUBLIC_ALLOWED_ORIGINS ||
  [
    'https://fbcai.com',
    'https://farzadbayat.com',
    'https://www.farzadbayat.com',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:3001',
  ].join(',')
)
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

// Third-party API endpoints
export const EXTERNAL_ENDPOINTS = {
  RESEND_EMAIL: process.env.NEXT_PUBLIC_RESEND_API_ENDPOINT || 'https://api.resend.com/emails',
  PERPLEXITY_CHAT_COMPLETIONS:
    process.env.NEXT_PUBLIC_PERPLEXITY_API_ENDPOINT || 'https://api.perplexity.ai/chat/completions',
} as const

// Contact details & scheduling configuration
const schedulingUsername = process.env.NEXT_PUBLIC_SCHEDULING_USERNAME || 'farzad-bayat'
const schedulingEvent = process.env.NEXT_PUBLIC_SCHEDULING_EVENT || '30min'
const schedulingBaseUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SCHEDULING_BASE_URL || 'https://cal.com',
)
const schedulingEmbedBaseUrl = trimTrailingSlash(
  process.env.NEXT_PUBLIC_SCHEDULING_EMBED_BASE_URL || 'https://app.cal.com',
)
const schedulingEmbedScript =
  process.env.NEXT_PUBLIC_SCHEDULING_EMBED_SCRIPT || 'https://app.cal.com/embed/embed.js'

export const CONTACT_CONFIG = {
  SUPPORT_EMAIL: process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'farzad@fbc.ai',
  WEBSITE_URL: process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://fbc.ai',
  DEFAULT_FROM_EMAIL: process.env.RESEND_FROM_EMAIL || 'F.B/c <contact@farzadbayat.com>',
  SCHEDULING: {
    USERNAME: schedulingUsername,
    EVENT: schedulingEvent,
    BOOKING_URL: `${schedulingBaseUrl}/${schedulingUsername}/${schedulingEvent}`,
    EMBED_URL: `${schedulingEmbedBaseUrl}/${schedulingUsername}/${schedulingEvent}?embed=true`,
    EMBED_SCRIPT_SRC: schedulingEmbedScript,
    BASE_URL: schedulingBaseUrl,
    EMBED_BASE_URL: schedulingEmbedBaseUrl,
  },
} as const

// Voice System Configuration
export const VOICE_CONFIG = {
  BY_LANG: {
    'en-US': 'Puck',
    'en-GB': 'Puck',
    'nb-NO': 'Puck',
    'sv-SE': 'Puck',
    'de-DE': 'Puck',
    'es-ES': 'Puck',
  } as const,
  DEFAULT_VOICE: 'Puck',
  VISUAL_TRIGGERS: (process.env.LIVE_SERVER_VISUAL_TRIGGERS || 'screen,showing,look at,see this,dashboard,workflow')
    .split(',')
    .map(s => s.trim().toLowerCase())
    .filter(Boolean),
  VISUAL_INJECT_THROTTLE_MS: Math.max(
    0,
    Number.parseInt(process.env.LIVE_SERVER_VISUAL_INJECT_THROTTLE_MS || '8000', 10) || 8000
  ),
  CONTEXT_INJECT_DEBOUNCE_MS: Math.max(
    0,
    Number.parseInt(process.env.LIVE_SERVER_CONTEXT_INJECT_DEBOUNCE_MS || '600', 10) || 600
  ),
  INJECT_ON_CONTEXT_UPDATE: process.env.LIVE_SERVER_INJECT_ON_CONTEXT_UPDATE === '0' ? false : true,
} as const

// Gemini Configuration
export const GEMINI_CONFIG = {
  DEFAULT_TEMPERATURE: 0.7,
  MAX_TOKENS: 8192,
  SYSTEM_PROMPT: `You are F.B/c, Farzad Bayat's sharp, friendly consulting assistant.
- Speak concisely (2 sentences max by default).
- Ask one focused question when you need more context.
- Keep a natural voice tone; avoid lists unless asked.
- You have VISUAL CAPABILITIES: You can see webcam and screen share video frames in real-time.
- When you receive video input, acknowledge what you see and provide relevant insights.
Pronunciation: "Farzad Bayat" ~ "Fahr–zahd Bye–yaht" (soft 'a' in Farzad).`,
} as const

// Feature Flags
export const FEATURE_FLAGS = {
  REASONING_STREAMING:
    (process.env.NEXT_PUBLIC_FEATURE_REASONING_STREAMING || '0').toLowerCase() === '1' ||
    (process.env.NEXT_PUBLIC_FEATURE_REASONING_STREAMING || '').toLowerCase() === 'true',
  SHOW_VOICE_OVERLAY:
    (process.env.NEXT_PUBLIC_FEATURE_VOICE_OVERLAY || '1').toLowerCase() === '1' ||
    (process.env.NEXT_PUBLIC_FEATURE_VOICE_OVERLAY || '').toLowerCase() === 'true',
  SHOW_USAGE_CARD:
    (process.env.NEXT_PUBLIC_FEATURE_SHOW_USAGE_CARD || '0').toLowerCase() === '1' ||
    (process.env.NEXT_PUBLIC_FEATURE_SHOW_USAGE_CARD || '').toLowerCase() === 'true',
  // Controls whether the primary chat experience is the dedicated /live page
} as const

// Agent Stage Configuration - User-friendly stage descriptions
export const AGENT_STAGE_CONFIG = {
  DISCOVERY: {
    label: "Discovery",
    description: "Understanding your business needs and goals",
    order: 1
  },
  SCORING: {
    label: "Analysis",
    description: "Evaluating solution fit for your situation",
    order: 2
  },
  WORKSHOP_PITCH: {
    label: "Workshop Solution",
    description: "Designing training approach for your team",
    order: 3
  },
  CONSULTING_PITCH: {
    label: "Custom Solution",
    description: "Architecting enterprise AI implementation",
    order: 3
  },
  CLOSING: {
    label: "Proposal",
    description: "Finalizing next steps and addressing questions",
    order: 4
  },
  SUMMARY: {
    label: "Summary",
    description: "Preparing your personalized strategy report",
    order: 5
  }
} as const

// Agent UI Configuration (canonical)
export const AGENT_UI_CONFIG = {
  websocketUrl: WEBSOCKET_CONFIG.URL,
  features: {
    voice: true,
    video: true,
    screenShare: true,
    chat: true,
    transcripts: true,
  },
  reconnectAttempts: WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS,
  reconnectDelay: WEBSOCKET_CONFIG.RECONNECT_DELAY,
  isPreConnectBufferEnabled: true,
  agentName: 'fbc-agent',
  model: GEMINI_MODELS.DEFAULT_VOICE,
} as const

// Admin Configuration
export const ADMIN_CONFIG = {
  ADMIN_ID: 'farzad',
  ADMIN_EMAIL: 'farzad@bayatconsulting.com',
} as const
