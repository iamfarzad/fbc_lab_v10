import { google, generateText, streamText } from '../../lib/ai-client.js'
import type { AgentContext, ChatMessage, ChainOfThoughtStep } from './types.js'
import type { SummaryData } from '../pdf/utils/types.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { multimodalContextManager } from '../context/multimodal-context.js'
import { buildModelSettings } from '../../lib/multimodal-helpers.js'
import { z } from 'zod'
import { getAgentTools, extractToolNames } from './utils/agent-tools.js'

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
  const tools: any = getAgentTools(sessionId || 'anonymous', 'Summary Agent')
  let toolsUsed: string[] = []

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

  const contextSection = `CONTEXT:
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
${multimodalData.uploadContext.map((u, i) => `${i + 1}. ${u.filename}: ${u.analysis.substring(0, 150)}...`).join('\n')}`

  const instructionSection = `INSTRUCTIONS:
You are F.B/c Summary AI - create executive summaries of discovery conversations.

YOUR MISSION:
Create a structured summary for the lead to share with stakeholders. Provide a detailed analysis with specific examples and actionable recommendations.

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

  const systemPrompt = `${contextSection}

${instructionSection}
${context.systemPromptSupplement || ''}`

  // Step 4: Determining recommended solution
  steps.push({
    label: 'Determining recommended solution',
    description: 'Workshop vs Consulting fit analysis',
    status: 'active',
    timestamp: Date.now()
  })

  const isStreaming = context.streaming === true && context.onChunk
  type StreamPart = any

  let result: any
  let generatedText = ''

  if (isStreaming) {
    // Streaming mode: use streamText
    // Summary always has multimodal context, use high resolution for detailed analysis
    const modelSettings = buildModelSettings(context, messages, { 
      thinkingLevel: 'high',
      defaultMediaResolution: 'media_resolution_high'
    })
    const stream = await streamText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the conversation summary based on all provided context.' }
      ],
      temperature: 1.0,
      tools
    })

    // Stream all events (text, tool calls, reasoning, etc.) in real-time
    for await (const part of stream.fullStream as AsyncIterable<StreamPart>) {
      if (part.type === 'text-delta') {
        // Stream text tokens as they arrive
        generatedText += part.text
        if (context.onChunk) {
          context.onChunk(part.text)
        }
      } else if (part.type === 'tool-call' && context.onMetadata) {
        // Stream tool calls in real-time
        context.onMetadata({
          type: 'tool_call',
          toolCall: part
        })
      } else if (part.type === 'tool-result' && context.onMetadata) {
        // Stream tool results in real-time
        context.onMetadata({
          type: 'tool_result',
          toolResult: part
        })
      } else if (part.type === 'reasoning-delta' && context.onMetadata) {
        // Stream reasoning in real-time (if supported by model)
        context.onMetadata({
          type: 'reasoning',
          reasoning: part.delta || part.text
        })
      } else if (part.type === 'reasoning-start' && context.onMetadata) {
        // Stream reasoning start event
        context.onMetadata({
          type: 'reasoning_start',
          message: 'AI is thinking...'
        })
      }
    }

    // Get final result for metadata extraction
    result = await stream
    try {
      const tc = await result.toolCalls
      toolsUsed = extractToolNames(tc)
    } catch {
      toolsUsed = []
    }
    
    // Stream tool calls if they occurred (from final result)
    if (context.onMetadata) {
      try {
        const toolCalls = await result.toolCalls
        if (toolCalls && toolCalls.length > 0) {
          for (const toolCall of toolCalls) {
            context.onMetadata({
              type: 'tool_call',
              toolCall: toolCall
            })
          }
        }
      } catch {
        // Ignore if toolCalls not available
      }
    }
  } else {
    // Non-streaming mode: use generateText
    // Summary always has multimodal context, use high resolution for detailed analysis
    const modelSettings = buildModelSettings(context, messages, { 
      thinkingLevel: 'high',
      defaultMediaResolution: 'media_resolution_high'
    })
    result = await generateText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the conversation summary based on all provided context.' }
      ],
      temperature: 1.0, // Recommended for high thinking
      tools
    })
    generatedText = result.text || ''
    toolsUsed = extractToolNames(result.toolCalls)
  }

  // Extract metadata (groundingMetadata, reasoning) from response
  const { extractGeminiMetadata } = await import('../../lib/extract-gemini-metadata.js')
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
    const textToParse = generatedText || result.text || ''
    const jsonMatch = textToParse.match(/\{[\s\S]*\}/)
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

  // Step 7: Extracting artifacts from tool invocations
  const artifacts = extractArtifacts(messages)
  if (artifacts) {
    steps.push({
      label: 'Extracting artifacts',
      description: `Found ${Object.keys(artifacts).length} high-value artifacts`,
      status: 'complete',
      timestamp: Date.now()
    })
  }

  // Include artifacts in summary output
  const summaryWithArtifacts = {
    ...summary,
    ...(artifacts && { artifacts })
  }

  return {
    output: JSON.stringify(summaryWithArtifacts, null, 2),
    agent: 'Summary Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: 'SUMMARY' as const,
      chainOfThought: { steps },
      toolsUsed,
      summary: summaryWithArtifacts,
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
    `${cat}: ${covered[cat] ? 'covered' : 'not covered'}`
  ).join('\n')
}

/**
 * Extract high-value artifacts from conversation history
 * Scans messages for tool invocations and extracts structured artifact data
 */
function extractArtifacts(messages: ChatMessage[]): SummaryData['artifacts'] {
  const artifacts: SummaryData['artifacts'] = {}

  for (const msg of messages) {
    // Check metadata for tool invocations
    const metadata = msg.metadata as { toolInvocations?: Array<{ name?: string; result?: unknown; state?: string; arguments?: Record<string, unknown> }> } | undefined
    const toolInvocations = metadata?.toolInvocations || []

    for (const toolInv of toolInvocations) {
      if (toolInv.state === 'complete' && toolInv.result) {
        // Extract Executive Memo
        if (toolInv.name === 'generate_executive_memo') {
          const result = toolInv.result as { data?: { target_audience?: string; memo?: string; subject?: string } }
          const args = toolInv.arguments as { target_audience?: 'CFO' | 'CEO' | 'CTO' } | undefined
          if (result.data && args?.target_audience) {
            artifacts.executiveMemo = {
              targetAudience: args.target_audience,
              content: result.data.memo || '',
              ...(result.data.subject && { subject: result.data.subject })
            }
          }
        }

        // Extract Custom Syllabus
        if (toolInv.name === 'generate_custom_syllabus') {
          const result = toolInv.result as { data?: { syllabus?: string; modules?: Array<{ title: string; topics: string[] }> } }
          // Try to parse syllabus text into modules if structured data not available
          if (result.data) {
            if (result.data.modules) {
              artifacts.customSyllabus = {
                title: 'Custom Workshop Syllabus',
                modules: result.data.modules
              }
            } else if (result.data.syllabus) {
              // Parse markdown syllabus into modules
              const syllabusText = result.data.syllabus
              const modules: Array<{ title: string; topics: string[] }> = []
              const moduleMatches = syllabusText.matchAll(/###\s+(.+?)\n([\s\S]*?)(?=###|$)/g)
              for (const match of moduleMatches) {
                const title = match[1]?.trim() || ''
                const content = match[2] || ''
                const topics = content.split('\n')
                  .map(line => line.replace(/^[-*]\s*/, '').trim())
                  .filter(line => line.length > 0)
                if (title && topics.length > 0) {
                  modules.push({ title, topics })
                }
              }
              if (modules.length > 0) {
                artifacts.customSyllabus = {
                  title: 'Custom Workshop Syllabus',
                  modules
                }
              }
            }
          }
        }

        // Extract Cost of Inaction
        if (toolInv.name === 'simulate_cost_of_inaction') {
          const result = toolInv.result as { data?: { monthlyCost?: number; annualCost?: number; inefficient_process?: string } }
          if (result.data && result.data.monthlyCost !== undefined && result.data.annualCost !== undefined) {
            artifacts.costOfInaction = {
              monthlyWaste: result.data.monthlyCost,
              annualWaste: result.data.annualCost,
              inefficiencySource: result.data.inefficient_process || 'Inefficient process'
            }
          }
        }

        // Extract Competitor Gap
        if (toolInv.name === 'analyze_competitor_gap') {
          const result = toolInv.result as { data?: { clientState?: string; competitors?: string[]; gapAnalysis?: string } }
          if (result.data) {
            artifacts.competitorGap = {
              clientState: result.data.clientState || '',
              competitors: result.data.competitors || [],
              gapAnalysis: result.data.gapAnalysis || ''
            }
          }
        }
      }
    }
  }

  return Object.keys(artifacts).length > 0 ? artifacts : undefined
}
