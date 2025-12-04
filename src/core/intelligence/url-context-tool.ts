import { generateObject, google } from '../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { z } from 'zod'

/**
 * URL Context Tool - Analyzes web pages to extract strategic business context
 * 
 * Uses Gemini's URL fetching capability to analyze web pages and extract:
 * - Page summary
 * - Key initiatives
 * - Tech stack hints
 * - Hiring signals
 * - Pain points mentioned
 */

const UrlContextSchema = z.object({
  pageSummary: z.string(),
  keyInitiatives: z.array(z.string()),
  techStackHints: z.array(z.string()).optional(),
  hiringSignals: z.array(z.string()).optional(),
  painPointsMentioned: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1),
})

export type UrlContextResult = z.infer<typeof UrlContextSchema>

/**
 * Analyze a URL and extract strategic business context
 * 
 * @param url - The URL to analyze
 * @returns Structured context about the page
 */
export async function analyzeUrl(url: string): Promise<UrlContextResult> {
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      messages: [
        {
          role: 'user',
          content: `Deeply analyze this live webpage and extract strategic business context for sales:\n\n${url}`
        }
      ],
      schema: UrlContextSchema,
      temperature: 0.4
    })

    return object
  } catch (error) {
    console.warn('URL analysis failed:', error)
    // Return fallback with low confidence
    return {
      pageSummary: `Unable to analyze ${url}`,
      keyInitiatives: [],
      confidence: 0.1
    }
  }
}

