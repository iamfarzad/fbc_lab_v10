import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'
import type { ObjectionType } from '../types.js'

const schema = z.object({
  type: z.enum(['price', 'timing', 'authority', 'need', 'trust', 'no_objection']).nullable(),
  confidence: z.number().min(0).max(1),
})

export interface DetectObjectionResult {
  type: ObjectionType
  confidence: number
}

/**
 * Detect and classify objection type from a user message
 * Returns objection type with confidence score
 */
export async function detectObjection(message: string): Promise<DetectObjectionResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.DEFAULT_CHAT),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at detecting sales objections. Classify the objection type: price (cost concerns), timing (not the right time), authority (can\'t make decision), need (don\'t see the value), trust (skeptical), or no_objection (no objection present).\n\nIMPORTANT: Do NOT classify these as objections:\n- Corrections to factual information ("I don\'t work there", "That\'s not my role")\n- Clarifications about personal details\n- Questions asking for information\n- Statements correcting research data\n\nOnly classify as objection if it\'s a clear rejection or concern about the product/service. Return confidence score 0-1 based on how clear the objection is.'
      },
      {
        role: 'user',
        content: `Classify this objection (or null if none): "${message}"`
      }
    ],
    schema,
    temperature: 0.3
  })

  // Convert 'no_objection' to null to match ObjectionType
  return {
    type: object.type === 'no_objection' ? null : object.type,
    confidence: object.confidence
  }
}

