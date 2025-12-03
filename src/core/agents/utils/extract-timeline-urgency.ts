import { generateObject, google } from 'src/lib/ai-client'
import { GEMINI_MODELS } from 'src/config/constants'
import { z } from 'zod'

const schema = z.object({
  urgency: z.number().min(0).max(1),
  explicit: z.string().optional(),
})

export interface ExtractTimelineUrgencyResult {
  urgency: number
  explicit?: string
}

/**
 * Extract timeline urgency from conversation text
 * Returns urgency score 0-1 and optional explicit timeline mention
 */
export async function extractTimelineUrgency(text: string): Promise<ExtractTimelineUrgencyResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at detecting timeline urgency. Look for explicit dates, deadlines, "asap", "urgent", "soon", "next quarter", or time-sensitive language. Return urgency 0-1 (0 = no urgency, 1 = very urgent) and extract any explicit timeline mentions if present.'
      },
      {
        role: 'user',
        content: `Extract timeline urgency from: ${text}`
      }
    ],
    schema,
    temperature: 0.3
  })

  const result: ExtractTimelineUrgencyResult = {
    urgency: object.urgency
  }
  
  if (object.explicit !== undefined) {
    result.explicit = object.explicit
  }
  
  return result
}

