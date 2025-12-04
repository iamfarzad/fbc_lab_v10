import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'

const schema = z.object({
  level: z.number().min(0).max(1),
})

export interface DetectInterestLevelResult {
  level: number
}

/**
 * Detect interest level from conversation based on positive signals
 * Returns interest level 0-1 (0 = no interest, 1 = very interested)
 */
export async function detectInterestLevel(conversation: string): Promise<DetectInterestLevelResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at detecting buyer interest. Rate interest level 0-1 based on positive signals like: "tell me more", "how much", "when can we start", "this sounds interesting", asking detailed questions, requesting proposals, or expressing urgency. Lower scores for: "maybe later", "not interested", "too expensive", or disengagement.'
      },
      {
        role: 'user',
        content: `Rate interest 0-1 based on positive signals in this conversation:\n\n${conversation}`
      }
    ],
    schema,
    temperature: 0.3
  })

  return object
}

