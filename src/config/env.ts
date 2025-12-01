/**
 * Environment resolution helpers
 * Centralizes how we read and normalize environment variables so
 * production (Vercel) and local dev behave the same.
 */

import { GoogleGenAI } from '@google/genai'

/**
 * Resolve the Google/Gemini API key from any supported env var.
 * 
 * IMPORTANT: This function is pure - it does NOT mutate global process.env.
 * The key is returned directly and passed to SDK constructors, preventing
 * Google from detecting the key as "leaked" when it appears in both env vars
 * and instance config simultaneously.
 */
export function getResolvedGeminiApiKey(): string {
  const key =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    ''

  if (!key) {
    throw new Error('Missing Google Generative AI API key (set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY)')
  }

  // Return key directly without mutating global process.env
  // This prevents Google from detecting keys as "leaked" when they appear
  // in both env vars and instance config
  return key
}

/**
 * Create a GoogleGenAI instance using API key directly.
 * 
 * NOTE: For Google Grounding/search, we use API key directly (matches v7's working approach).
 * Service account is only used for Live API (voice), not for REST API calls.
 * 
 * IMPORTANT: The SDK checks credentials at initialization time, not just request time.
 * Always create instances INSIDE `withApiKeyOnly()` wrapper to ensure service account
 * is unset before the SDK reads credentials.
 */
export function createGoogleGenAI(): GoogleGenAI {
  const apiKey = getResolvedGeminiApiKey()
  return new GoogleGenAI({ apiKey })
}

