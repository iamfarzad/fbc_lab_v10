/**
 * Centralized AI SDK wrapper to standardize configuration and retries.
 * Mirrors the vercelCache pattern so consumers avoid direct SDK imports.
 */
import { generateText as baseGenerateText, streamText as baseStreamText, generateObject as baseGenerateObject } from 'ai'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import type { GoogleGenerativeAIProvider } from '@ai-sdk/google'
import { createRetryableGemini as baseCreateRetryableGemini, createRetryableGeminiStream as baseCreateRetryableGeminiStream, createRetryableGeminiReliable as baseCreateRetryableGeminiReliable } from 'src/lib/ai/retry-model'
import { getResolvedGeminiApiKey } from 'src/config/env'

let isGeminiConfigured = false
let googleProvider: GoogleGenerativeAIProvider | null = null

const ensureGeminiConfigured = () => {
  if (!isGeminiConfigured) {
    const apiKey = getResolvedGeminiApiKey()
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

// Copy all provider methods and properties
Object.assign(googleWrapper, ensureGeminiConfigured())

// Export as any to allow passing settings which might not be in the official type yet
export const google: any = googleWrapper

export const generateText: typeof baseGenerateText = async (options) => {
  ensureGeminiConfigured()
  // Pass through options directly - the AI SDK and our model configuration will handle specific parameters
  // if they are part of the standard options or model-specific settings.
  return baseGenerateText(options)
}

export const streamText: typeof baseStreamText = (...args) => {
  ensureGeminiConfigured()
  return baseStreamText(...args)
}

export const generateObject: typeof baseGenerateObject = async (...args) => {
  ensureGeminiConfigured()
  return baseGenerateObject(...args)
}

export const createRetryableGemini = () => {
  ensureGeminiConfigured()
  return baseCreateRetryableGemini()
}

export const createRetryableGeminiStream = () => {
  ensureGeminiConfigured()
  return baseCreateRetryableGeminiStream()
}

export const createRetryableGeminiReliable = () => {
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
