import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'

const schema = z.object({
  projectedRoi: z.number(),
  paybackMonths: z.number(),
  reasoning: z.string(),
})

export interface CalculateRoiResult {
  projectedRoi: number
  paybackMonths: number
  reasoning: string
}

export interface CalculateRoiInput {
  teamSize: number
  currentPain: string
  product: 'workshop' | 'consulting'
}

/**
 * Calculate realistic ROI for workshop or consulting engagement
 * Returns projected ROI, payback period, and reasoning
 */
export async function calculateRoi(context: CalculateRoiInput): Promise<CalculateRoiResult> {
  const { object } = await generateObject({
    model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
    messages: [
      {
        role: 'system',
        content: 'You are an expert at calculating ROI for AI consulting and workshops. Provide realistic, conservative estimates based on team size, current pain points, and the product type. For workshops, focus on time savings and efficiency gains. For consulting, focus on revenue impact, cost savings, and strategic value. Return projected ROI as a percentage and payback period in months.'
      },
      {
        role: 'user',
        content: `Calculate realistic ROI for ${context.product} given:\n- Team size: ${context.teamSize} people\n- Current pain: ${context.currentPain}\n\nProvide conservative, realistic estimates.`
      }
    ],
    schema,
    temperature: 0.5
  })

  return object
}

