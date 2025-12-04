/**
 * Centralized AI SDK wrapper to standardize configuration and retries.
 * Mirrors the vercelCache pattern so consumers avoid direct SDK imports.
 */
import { generateText as baseGenerateText, streamText as baseStreamText, generateObject as baseGenerateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createRetryableGemini as baseCreateRetryableGemini, createRetryableGeminiStream as baseCreateRetryableGeminiStream, createRetryableGeminiReliable as baseCreateRetryableGeminiReliable } from './ai/retry-model.js'
import { getResolvedGeminiApiKey } from '../config/env.js'

let isGeminiConfigured = false
let googleProvider: GoogleGenerativeAIProvider | null = null

const ensureGeminiConfigured = () => {
  if (!isGeminiConfigured) {
    const apiKey = getResolvedGeminiApiKey()
    if (!apiKey) {
      // Return a mock provider that will throw when actually used
      // This allows the app to load but will error when trying to use AI features
      throw new Error('Gemini API key not configured. Please set GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY environment variable.')
    }
    googleProvider = createGoogleGenerativeAI({ apiKey })
    isGeminiConfigured = true
  }
  return googleProvider!
}

// Create a callable wrapper that uses the provider with resolved API key
const googleWrapper = ((modelId: string, settings?: unknown) => {
  const provider = ensureGeminiConfigured()
  // Cast to any to bypass strict type check if the installed SDK version doesn't explicitly support settings yet
  return (provider as any)(modelId, settings)
}) as GoogleGenerativeAIProvider

// Lazy initialization - only copy properties when first accessed, not at module load
// This prevents errors at module load time if API key is missing
let propertiesCopied = false
const ensurePropertiesCopied = () => {
  if (!propertiesCopied) {
    const provider = ensureGeminiConfigured()
    Object.assign(googleWrapper, provider)
    propertiesCopied = true
  }
}

// Export as any to allow passing settings which might not be in the official type yet
export const google: any = googleWrapper

export const generateText: typeof baseGenerateText = async (options) => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  // Pass through options directly - the AI SDK and our model configuration will handle specific parameters
  // if they are part of the standard options or model-specific settings.
  return baseGenerateText(options)
}

export const streamText: typeof baseStreamText = (...args) => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  return baseStreamText(...args)
}

export const generateObject: typeof baseGenerateObject = async (...args) => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  return baseGenerateObject(...args)
}

export const createRetryableGemini = () => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  return baseCreateRetryableGemini()
}

export const createRetryableGeminiStream = () => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  return baseCreateRetryableGeminiStream()
}

export const createRetryableGeminiReliable = () => {
  ensurePropertiesCopied()
  ensureGeminiConfigured()
  return baseCreateRetryableGeminiReliable()
}

export const aiClient = {
  generateText,
  streamText,
  generateObject,
  google,
  createRetryableGemini,
  createRetryableGeminiStream,
  createRetryableGeminiReliable
}

export type {
  ToolUIPart,
  ChatStatus,
  FileUIPart,
  UIMessage,
  Experimental_GeneratedImage,
  LanguageModelUsage
} from 'ai'
