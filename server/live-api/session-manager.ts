import { GoogleGenAI } from '@google/genai'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { serverLogger } from '../utils/env-setup.js'
import { GEMINI_MODELS } from 'src/config/constants'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

/**
 * Create GoogleGenAI instance with proper credential handling
 * Tries service account first, falls back to API key
 */
export async function createLiveApiClient(connectionId: string): Promise<GoogleGenAI> {
  // Try service account first (for Live API), fallback to API key
  // Service accounts work with regular Gemini API (not just Vertex AI)
  let ai: GoogleGenAI
  const credsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS

  if (credsPath) {
    // Resolve relative paths relative to project root (server's parent directory)
    const resolvedPath = path.isAbsolute(credsPath)
      ? credsPath
      : path.resolve(__dirname, '..', '..', credsPath)

    if (fs.existsSync(resolvedPath)) {
      // CRITICAL: Delete API key env vars before SDK init to prevent SDK from using them
      // Even though we're using service account, SDK might check these env vars internally
      const originalGeminiKey = process.env.GEMINI_API_KEY
      const originalGoogleGeminiKey = process.env.GOOGLE_GEMINI_API_KEY
      const originalGenerativeAiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const originalGoogleKey = process.env.GOOGLE_API_KEY

      // Log environment state before deletion (for debugging)
      serverLogger.debug('Environment before SDK init', {
        connectionId,
        hasGEMINI_API_KEY: !!originalGeminiKey,
        hasGOOGLE_GEMINI_API_KEY: !!originalGoogleGeminiKey,
        hasGOOGLE_GENERATIVE_AI_API_KEY: !!originalGenerativeAiKey,
        hasGOOGLE_API_KEY: !!originalGoogleKey,
        hasGOOGLE_APPLICATION_CREDENTIALS: !!process.env.GOOGLE_APPLICATION_CREDENTIALS
      })

      try {
        // Delete API key env vars to ensure SDK only uses service account
        delete process.env.GEMINI_API_KEY
        delete process.env.GOOGLE_GEMINI_API_KEY
        delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
        delete process.env.GOOGLE_API_KEY

        // Temporarily set env var to resolved path for SDK
        const originalPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
        process.env.GOOGLE_APPLICATION_CREDENTIALS = resolvedPath

        // Pass empty object - SDK will auto-read from env var (service account only)
        ai = new GoogleGenAI({})

        // Restore env vars after SDK initialization
        process.env.GOOGLE_APPLICATION_CREDENTIALS = originalPath
        if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey
        if (originalGoogleGeminiKey) process.env.GOOGLE_GEMINI_API_KEY = originalGoogleGeminiKey
        if (originalGenerativeAiKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGenerativeAiKey
        if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey

        serverLogger.info('Using service account for Live API', { connectionId, path: resolvedPath })
      } catch (error) {
        // Restore env vars on error too
        if (originalGeminiKey) process.env.GEMINI_API_KEY = originalGeminiKey
        if (originalGoogleGeminiKey) process.env.GOOGLE_GEMINI_API_KEY = originalGoogleGeminiKey
        if (originalGenerativeAiKey) process.env.GOOGLE_GENERATIVE_AI_API_KEY = originalGenerativeAiKey
        if (originalGoogleKey) process.env.GOOGLE_API_KEY = originalGoogleKey

        serverLogger.warn('Failed to initialize service account, falling back to API key', {
          connectionId,
          error: error instanceof Error ? error.message : String(error)
        })
        const { getResolvedGeminiApiKey } = await import('../../src/config/env.js')
        ai = new GoogleGenAI({ apiKey: getResolvedGeminiApiKey() })
        serverLogger.info('Using API key for Live API', { connectionId })
      }
    } else {
      serverLogger.warn('Service account file not found, using API key', { connectionId, path: resolvedPath })
      const { getResolvedGeminiApiKey } = await import('../../src/config/env.js')
      ai = new GoogleGenAI({ apiKey: getResolvedGeminiApiKey() })
      serverLogger.info('Using API key for Live API', { connectionId })
    }
  } else {
    // Fallback to API key
    const { getResolvedGeminiApiKey } = await import('../../src/config/env.js')
    ai = new GoogleGenAI({ apiKey: getResolvedGeminiApiKey() })
    serverLogger.info('Using API key for Live API', { connectionId })
  }

  return ai
}

/**
 * Get the model name for Live API
 */
export function getLiveApiModel(): string {
  const configured = process.env.GEMINI_LIVE_MODEL
  const defaultAudio = GEMINI_MODELS.DEFAULT_VOICE

  // Guard against misconfigured non-audio models that will hang the Live connect
  const candidate = configured && configured.trim().length > 0 ? configured.trim() : defaultAudio
  const isAudioModel = candidate.includes('audio')

  if (!isAudioModel) {
    serverLogger.warn('GEMINI_LIVE_MODEL is not an audio-capable model; falling back to DEFAULT_VOICE', {
      configuredModel: candidate,
      fallback: defaultAudio
    })
    return `models/${defaultAudio}`
  }

  return `models/${candidate}`
}
