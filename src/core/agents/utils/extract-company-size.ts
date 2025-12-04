import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'
import type { CompanySize } from '../types.js'

const schema = z.object({
  size: z.enum(['1-10', '11-50', '51-200', '201-1000', '1000+', 'unknown']),
  employeeCount: z.number().optional(),
})

export interface ExtractCompanySizeResult {
  size: CompanySize
  employeeCount?: number
}

/**
 * Extract company size from conversation text using AI
 * Returns structured company size with optional employee count
 */
export async function extractCompanySize(conversationText: string): Promise<ExtractCompanySizeResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at extracting company size from natural conversation. Return only valid JSON matching the schema. Look for mentions of employee count, team size, company size, or organizational structure.'
      },
      {
        role: 'user',
        content: `Extract company size from this conversation:\n\n${conversationText}`
      }
    ],
    schema,
    temperature: 0.3
  })

  return {
    size: object.size,
    ...(object.employeeCount !== undefined && { employeeCount: object.employeeCount })
  }
}

