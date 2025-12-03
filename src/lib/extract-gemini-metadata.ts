import type { GenerateTextResult } from 'ai'
import type { GroundingMetadata } from 'types'

/**
 * Extract metadata from AI SDK GenerateTextResult
 * Attempts to extract groundingMetadata and reasoning from the response
 * 
 * The AI SDK wraps the Google GenAI response, so we need to try multiple paths
 * to access the raw response structure with candidates and groundingMetadata
 */
export function extractGeminiMetadata(
  result: GenerateTextResult<any, any>
): {
  groundingMetadata?: GroundingMetadata
  reasoning?: string
} {
  const metadata: {
    groundingMetadata?: GroundingMetadata
    reasoning?: string
  } = {}

  try {
    // Try multiple paths to access raw response from AI SDK
    // The Google provider may expose it through different properties
    const resultAny = result as any
    
    // Path 1: Check for response property directly
    let rawResponse = resultAny.response
    
    // Path 2: Check experimental_providerMetadata (AI SDK experimental feature)
    if (!rawResponse && resultAny.experimental_providerMetadata) {
      rawResponse = resultAny.experimental_providerMetadata
    }
    
    // Path 3: Check for raw property
    if (!rawResponse && resultAny.raw) {
      rawResponse = resultAny.raw
    }
    
    // Path 4: Check if response is nested in response property
    if (!rawResponse && resultAny.response?.response) {
      rawResponse = resultAny.response.response
    }
    
    // Path 5: Check for provider-specific metadata structure
    if (!rawResponse && resultAny.providerMetadata) {
      rawResponse = resultAny.providerMetadata
    }

    if (rawResponse) {
      // Extract groundingMetadata from candidate
      const candidate = rawResponse?.candidates?.[0] || rawResponse?.candidate
      
      if (candidate?.groundingMetadata) {
        metadata.groundingMetadata = {
          groundingChunks: candidate.groundingMetadata.groundingChunks || [],
          ...(candidate.groundingMetadata.webSearchQueries && {
            webSearchQueries: candidate.groundingMetadata.webSearchQueries
          }),
          ...(candidate.groundingMetadata.searchEntryPoint && {
            searchEntryPoint: candidate.groundingMetadata.searchEntryPoint
          })
        }
      }

      // Extract reasoning from thought parts
      const parts = candidate?.content?.parts || candidate?.parts || []
      if (parts.length > 0) {
        const thoughtParts = parts.filter((part: any) => part.thought)
        if (thoughtParts.length > 0) {
          metadata.reasoning = thoughtParts
            .map((part: any) => part.text || '')
            .join('\n')
        }
      }
    } else {
      // Debug: Log structure to help diagnose (only in dev)
      if (process.env.NODE_ENV !== 'production') {
        console.debug('[extractGeminiMetadata] Response structure:', {
          hasResponse: !!resultAny.response,
          hasExperimental: !!resultAny.experimental_providerMetadata,
          hasRaw: !!resultAny.raw,
          keys: Object.keys(resultAny).slice(0, 10)
        })
      }
    }
  } catch (error) {
    console.warn('[extractGeminiMetadata] Failed to extract metadata:', error)
  }

  return metadata
}
