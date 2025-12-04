import { google, generateText } from '../../lib/ai-client.js'
import type { AgentContext, ChatMessage, ChainOfThoughtStep } from './types.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { multimodalContextManager } from '../context/multimodal-context.js'
import { z } from 'zod'

/**
 * Summary Agent - Analyzes full conversation and generates PDF summary
 * 
 * Triggered when: Conversation ends (goodbye, timeout, limits reached)
 * Analyzes: Full multimodal context + conversation flow + intelligence
 * Output: Structured JSON for PDF generation
 */
export async function summaryAgent(
  messages: ChatMessage[],
  context: AgentContext
) {
  const { sessionId, intelligenceContext, conversationFlow } = context
  const steps: ChainOfThoughtStep[] = []

  // Step 1: Analyzing full conversation
  steps.push({
    label: 'Analyzing full conversation',
    description: `Reviewing ${messages.length} messages`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Get full multimodal context
  const multimodalData = await multimodalContextManager.getConversationContext(
    sessionId,
    true,
    true
  )

  // Step 2: Processing multimodal data
  const modalitiesUsed = multimodalData.summary.modalitiesUsed
  steps.push({
    label: 'Processing multimodal data',
    description: `Found: ${modalitiesUsed.join(', ')} (${multimodalData.summary.totalMessages} items)`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 3: Extracting key findings
  const categoriesCovered = conversationFlow ? Object.values(conversationFlow.covered).filter(Boolean).length : 0
  steps.push({
    label: 'Extracting key findings',
    description: `${categoriesCovered}/6 discovery categories covered`,
    status: 'complete',
    timestamp: Date.now()
  })

  const systemPrompt = `You are F.B/c Summary AI - create executive summaries of discovery conversations.

LEAD INFORMATION:
${JSON.stringify(intelligenceContext, null, 2)}

FULL CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}

DISCOVERY COVERAGE:
${conversationFlow ? formatDiscoveryStatus(conversationFlow) : 'N/A'}

MULTIMODAL INTERACTION DATA:
Total messages: ${multimodalData.summary.totalMessages}
Modalities used: ${multimodalData.summary.modalitiesUsed.join(', ')}
Voice transcripts: ${multimodalData.audioContext.length} items
Screen/webcam captures: ${multimodalData.visualContext.length} items
Documents uploaded: ${multimodalData.uploadContext.length} items

Recent visual analyses:
${multimodalData.visualContext.map((v, i) => `${i + 1}. ${v.analysis.substring(0, 200)}...`).join('\n')}

Recent uploads:
${multimodalData.uploadContext.map((u, i) => `${i + 1}. ${u.filename}: ${u.analysis.substring(0, 150)}...`).join('\n')}

YOUR MISSION:
Create a structured summary for the lead to share with stakeholders.

OUTPUT REQUIRED (JSON only):
{
  "executiveSummary": "<2-3 sentences covering what was discussed>",
  "multimodalInteractionSummary": {
    "voice": "<if used: duration and key topics>",
    "screenShare": "<if used: what was shown>",
    "documentsReviewed": ["<filename: key insight>"],
    "engagementScore": "<High/Medium/Low based on multimodal usage>"
  },
  "keyFindings": {
    "goals": "<from discovery>",
    "painPoints": ["<prioritized list>"],
    "currentSituation": "<what they're doing now>",
    "dataReality": "<where their data lives>",
    "teamReadiness": "<change management signals>",
    "budgetSignals": "<timeline and investment indicators>"
  },
  "recommendedSolution": "workshop" | "consulting",
  "solutionRationale": "<why this solution fits>",
  "expectedROI": "<specific outcome projection>",
  "pricingBallpark": "<e.g. $5K-$15K or $50K-$150K>",
  "nextSteps": "<primary CTA: book call, secondary: reply with questions>"
}

TONE: Professional but conversational. This is a valuable document they'll share internally.`

  // Step 4: Determining recommended solution
  steps.push({
    label: 'Determining recommended solution',
    description: 'Workshop vs Consulting fit analysis',
    status: 'active',
    timestamp: Date.now()
  })

  const result = await generateText({
    model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, { thinking: 'high' }), // Use Gemini 3.0 for reasoning
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Generate the conversation summary based on all provided context.' }
    ],
    temperature: 1.0 // Recommended for high thinking
  })

  // Extract metadata (groundingMetadata, reasoning) from response
  const { extractGeminiMetadata } = await import('src/lib/extract-gemini-metadata')
  const extractedMetadata = extractGeminiMetadata(result)

  // Schema for summary output
  const SummarySchema = z.object({
    executiveSummary: z.string(),
    bullets: z.array(z.string()).optional(),
    summary: z.string().optional(),
    multimodalInteractionSummary: z.object({
      voice: z.string().optional(),
      screenShare: z.string().optional(),
      documentsReviewed: z.array(z.string()).optional(),
      engagementScore: z.string().optional(),
    }).optional(),
    keyFindings: z.record(z.string(), z.unknown()).optional(),
    recommendedSolution: z.enum(['workshop', 'consulting']).optional(),
    solutionRationale: z.string().optional(),
    expectedROI: z.string().optional(),
    pricingBallpark: z.string().optional(),
    nextSteps: z.string().optional(),
  })

  // Parse JSON from response
  let summary: z.infer<typeof SummarySchema>
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]) as unknown
      summary = SummarySchema.parse(raw)
    } else {
      throw new Error('No JSON found in summary')
    }
  } catch (error) {
    console.error('Failed to parse summary:', error)
    // Fallback summary
    const consultingScore = typeof intelligenceContext?.fitScore === 'object' && intelligenceContext?.fitScore !== null && 'consulting' in intelligenceContext.fitScore && typeof (intelligenceContext.fitScore as { consulting?: unknown }).consulting === 'number' ? (intelligenceContext.fitScore as { consulting: number }).consulting : 0
    const workshopScore = typeof intelligenceContext?.fitScore === 'object' && intelligenceContext?.fitScore !== null && 'workshop' in intelligenceContext.fitScore && typeof (intelligenceContext.fitScore as { workshop?: unknown }).workshop === 'number' ? (intelligenceContext.fitScore as { workshop: number }).workshop : 0
    summary = SummarySchema.parse({
      executiveSummary: 'Conversation summary generation failed',
      keyFindings: {},
      recommendedSolution: consultingScore > workshopScore ? 'consulting' : 'workshop'
    })
  }

  if (steps[3]) {
    steps[3].status = 'complete'
    steps[3].description = `Recommended: ${summary.recommendedSolution}`
  }

  // Step 5: Calculating ROI projection
  steps.push({
    label: 'Calculating ROI projection',
    description: summary.expectedROI || 'Estimating expected outcomes',
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 6: Structuring executive summary
  steps.push({
    label: 'Structuring executive summary',
    description: 'Formatting for stakeholder review',
    status: 'complete',
    timestamp: Date.now()
  })

  return {
    output: JSON.stringify(summary, null, 2),
    agent: 'Summary Agent',
    model: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
    metadata: {
      stage: 'SUMMARY' as const,
      chainOfThought: { steps },
      summary,
      multimodalEngagement: {
        voice: multimodalData.audioContext.length > 0,
        visual: multimodalData.visualContext.length > 0,
        uploads: multimodalData.uploadContext.length > 0
      },
      // Pass through extracted metadata
      ...(extractedMetadata.reasoning && { reasoning: extractedMetadata.reasoning }),
      ...(extractedMetadata.groundingMetadata && { groundingMetadata: extractedMetadata.groundingMetadata }),
    }
  }
}

function formatDiscoveryStatus(flow: { covered?: Record<string, boolean> }): string {
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  const covered = flow.covered || {}
  return categories.map(cat =>
    `${cat}: ${covered[cat] ? '✅ Covered' : '❌ Not covered'}`
  ).join('\n')
}
