import { generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { GEMINI_MODELS } from '../../config/constants'
import { logger } from '../../lib/logger'

export interface SearchResult {
  query: string
  results: Array<{
    title: string
    snippet: string
    url: string
  }>
  answer: string
}

/**
 * Perform a grounded web search using Google Search via Gemini
 */
export async function searchWeb(query: string, urls?: string[]): Promise<SearchResult> {
  try {
    logger.debug('🔍 [Search] Executing web search', { query, urls })

    // Use Gemini 3.0 Pro
    // Note: Search grounding configuration depends on specific SDK version capabilities
    const { text, toolResults } = await generateText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      system: 'You are a helpful research assistant. Provide specific details and citations.',
      prompt: `Search for information about: ${query}. ${urls ? `Prioritize these URLs: ${urls.join(', ')}` : ''}. Return a summary of findings.`,
      tools: {
        googleSearch: {} as any
      }
    })

    // Extract citations/sources if available in the experimental provider response
    // The SDK exposes grounding metadata in toolResults for the googleSearch tool
    const results: SearchResult['results'] = []
    
    if (toolResults && Array.isArray(toolResults)) {
      // Try to extract grounding metadata from tool results if available
      // Note: The structure depends on the AI SDK version and provider implementation
      // This is a best-effort extraction
      try {
        toolResults.forEach((result: any) => {
          if (result.toolName === 'googleSearch' && result.result) {
            // Map grounding chunks to results structure if available
            // This part assumes result structure from Google provider
            const groundingMetadata = result.result?.groundingMetadata
            if (groundingMetadata?.groundingChunks) {
              groundingMetadata.groundingChunks.forEach((chunk: any) => {
                if (chunk.web?.uri && chunk.web?.title) {
                  results.push({
                    title: chunk.web.title,
                    url: chunk.web.uri,
                    snippet: chunk.web.snippet || ''
                  })
                }
              })
            }
          }
        })
      } catch (err) {
        // Use proper logger call or cast if needed
        console.warn('Failed to extract grounding metadata', err)
      }
    }
    
    return {
      query,
      results,
      answer: text
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    logger.error('❌ [Search] Failed to execute search', err)
    throw err
  }
}
