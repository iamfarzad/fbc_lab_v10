import { safeGenerateText } from '../../lib/gemini-safe.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { calculateRoi } from './utils/calculate-roi.js'
import type { AgentContext, ChatMessage, AgentResult, FunnelStage } from './types.js'
import { extractGeminiMetadata } from '../../lib/extract-gemini-metadata.js'

/**
 * Unified Pitch Agent - Replaces workshop-sales-agent and consulting-sales-agent
 * 
 * Auto-detects primary product (workshop vs consulting) based on fitScore
 * Uses calculateRoi utility for dynamic ROI calculations
 * References multimodal context naturally
 */
export async function pitchAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { intelligenceContext, multimodalContext } = context

  if (!intelligenceContext) {
    return {
      output: "I'd love to help you explore our AI solutions. Can you tell me a bit about your company and what you're looking to achieve?",
      agent: 'Pitch Agent',
      model: GEMINI_MODELS.DEFAULT_CHAT,
      metadata: {
        stage: 'DISCOVERY'
      }
    }
  }

  const lastUserMessage = messages[messages.length - 1]?.content || ''

  // Auto-detect primary product based on fitScore
  const workshopScore = intelligenceContext.fitScore?.workshop || 0
  const consultingScore = intelligenceContext.fitScore?.consulting || 0
  const isWorkshop = workshopScore > consultingScore
  const product = isWorkshop ? 'workshop' : 'consulting'

  const productConfig = {
    workshop: {
      name: 'AI Acceleration Workshop',
      priceRange: '$8K–$18K',
      duration: '2–3 days',
      format: 'intensive hands-on',
      bestFor: 'teams of 8–40, mid-market & startups',
    },
    consulting: {
      name: 'Custom AI Transformation Program',
      priceRange: '$80K–$400K+',
      duration: '3–12 months',
      format: 'strategic partnership',
      bestFor: 'enterprise & high-growth companies',
    },
  }

  const productInfo = productConfig[product]

  // Dynamic ROI calculation
  const teamSize = intelligenceContext.company?.employeeCount || 
    (intelligenceContext.company?.size === '1-10' ? 5 :
     intelligenceContext.company?.size === '11-50' ? 25 :
     intelligenceContext.company?.size === '51-200' ? 100 :
     intelligenceContext.company?.size === '201-1000' ? 500 :
     intelligenceContext.company?.size === '1000+' ? 2000 : 50)

  const currentPain = intelligenceContext.company?.summary || 
    'scaling AI adoption and automation'

  let roi
  try {
    roi = await calculateRoi({
      teamSize,
      currentPain,
      product
    })
  } catch (error) {
    console.warn('ROI calculation failed, using defaults:', error)
    roi = {
      projectedRoi: product === 'workshop' ? 3.5 : 4.2,
      paybackMonths: product === 'workshop' ? 3 : 6,
      reasoning: 'Based on typical client outcomes'
    }
  }

  // Build dynamic system prompt
  const systemPrompt = `You are an elite AI sales closer. Your job is to pitch the ${productInfo.name} with surgical precision.

CRITICAL CONTEXT:
- Company: ${intelligenceContext.company?.name || 'Unknown'} (${intelligenceContext.company?.size || 'unknown'}, ${intelligenceContext.company?.industry || 'unknown industry'})
- Role: ${intelligenceContext.person?.role || 'Unknown'} (${intelligenceContext.person?.seniority || 'unknown'})
- Budget signals: ${intelligenceContext.budget?.hasExplicit ? 'explicit' : 'inferred'} ${intelligenceContext.budget?.minUsd ? `($${intelligenceContext.budget.minUsd}k+)` : ''}
- Fit score (${product}): ${isWorkshop ? workshopScore.toFixed(2) : consultingScore.toFixed(2)}
- Interest level: ${(intelligenceContext.interestLevel || 0.7).toFixed(2)}
- ROI projection: ${roi.projectedRoi}x in ${roi.paybackMonths} months

RECENT MULTIMODAL INSIGHTS:
${multimodalContext?.recentAnalyses?.slice(0, 3).map((a: string) => `- ${a}`).join('\n') || 'None'}

PITCH RULES:
- Never mention the other product unless asked
- Use exact company/role context naturally
- Reference what they showed on screen/webcam/uploaded
- Create urgency without sounding salesy
- End with a clear next step (book call or ask for budget/timeline)

Price guidance: ${productInfo.priceRange} — only reveal if they show high interest (>0.75) or ask directly.

Respond now to: "${lastUserMessage}"`

  const result = await safeGenerateText({
    system: systemPrompt,
    messages: messages.slice(-15), // short context for speed
    temperature: 0.7,
  })

  // Extract metadata (groundingMetadata, reasoning) from response
  const extractedMetadata = extractGeminiMetadata(result)

  return {
    output: result.text,
    agent: 'Pitch Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: ((intelligenceContext.interestLevel || 0) > 0.8 ? 'CLOSING' : 'PITCHING') as FunnelStage,
      ...(intelligenceContext.fitScore && { fitScore: intelligenceContext.fitScore }),
      // Pass through extracted metadata
      ...(extractedMetadata.reasoning && { reasoning: extractedMetadata.reasoning }),
      ...(extractedMetadata.groundingMetadata && { groundingMetadata: extractedMetadata.groundingMetadata }),
    },
  }
}

