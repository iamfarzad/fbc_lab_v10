import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'

const schema = z.object({
  hasExplicit: z.boolean(),
  minUsd: z.number().nullable(),
  maxUsd: z.number().nullable(),
  urgency: z.number().min(0).max(1),
})

export interface ExtractBudgetSignalsResult {
  hasExplicit: boolean
  minUsd?: number
  maxUsd?: number
  urgency: number
}

/**
 * Extract budget signals (amounts, ranges, urgency) from conversation text
 * Returns structured budget information with urgency score
 */
export async function extractBudgetSignals(conversationText: string): Promise<ExtractBudgetSignalsResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at extracting budget information from conversations. Look for explicit dollar amounts, budget ranges, budget constraints, or urgency indicators. Return only valid JSON matching the schema. Set urgency to 0.5 if no clear urgency signal, higher (0.7-1.0) if urgent, lower (0.0-0.3) if not urgent.'
      },
      {
        role: 'user',
        content: `Extract budget signals from this conversation:\n\n${conversationText}`
      }
    ],
    schema,
    temperature: 0.3
  })

  // Convert null to undefined for optional fields
  const result: ExtractBudgetSignalsResult = {
    hasExplicit: object.hasExplicit,
    urgency: object.urgency
  }
  
  if (object.minUsd !== null) {
    result.minUsd = object.minUsd
  }
  
  if (object.maxUsd !== null) {
    result.maxUsd = object.maxUsd
  }
  
  return result
}

