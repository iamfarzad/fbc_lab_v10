import * as path from 'path'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { logger } from '../../src/lib/logger.js'
import { getResolvedGeminiApiKey } from '../../src/config/env.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Get project root (two levels up from server/utils)
const projectRoot = path.resolve(__dirname, '..', '..')

// Load ONLY .env.local files (skip .env to prevent old/leaked keys from overwriting)
// Priority: root .env.local loads first, then server/.env.local overrides it
// This matches v7 fix: https://github.com/.../API_KEY_FIX_DOCUMENTATION.md
const rootEnvLocal = path.join(projectRoot, '.env.local')
const serverEnvLocal = path.join(__dirname, '..', '.env.local')

// Load root .env.local first
dotenv.config({ path: rootEnvLocal, override: true })

// Then load server/.env.local (overrides root if same keys exist)
dotenv.config({ path: serverEnvLocal, override: true })

// DO NOT load .env file - it may contain outdated credentials
// .env files are for examples/templates only, not actual secrets

// CRITICAL: Resolve and normalize Gemini API key for orchestrator agents
// This ensures @ai-sdk/google can find the API key when agents are called
// BUT: Only do this if NOT using service account (to prevent env var pollution)
// Logger doesn't have child method - use logger directly with context
const serverLogger = logger

// Only resolve API key if NOT using service account
// This prevents API key env vars from being set when using service account,
// which could cause SDK to use API keys even when service account is intended
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  try {
    getResolvedGeminiApiKey()
    serverLogger.info('Gemini API key resolved and normalized for agents')
  } catch (err) {
    serverLogger.error('Failed to resolve Gemini API key', err instanceof Error ? err : undefined)
  }
} else {
  serverLogger.info('Skipping API key resolution - using service account', {
    serviceAccountPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
  })
}

// Prioritize PORT for Fly.io compatibility (Fly.io sets PORT=8080)
// Fallback to LIVE_SERVER_PORT for explicit override, then default to 3001
export const PORT = process.env.LIVE_SERVER_PORT || process.env.PORT || 3001

serverLogger.debug('Environment check', {
  port: process.env.PORT,
  liveServerPort: process.env.LIVE_SERVER_PORT,
  using: PORT
})

export { serverLogger }
