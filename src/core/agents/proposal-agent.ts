import { google, generateText } from '../../lib/ai-client.js'
import { buildModelSettings } from '../../lib/multimodal-helpers.js'
import { z } from 'zod'
import type { AgentContext, ChatMessage, ChainOfThoughtStep, AgentResult } from './types.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import type { FunnelStage } from '../types/funnel-stage.js'

// Proposal interface for structured output
export interface Proposal {
  executiveSummary?: {
    client?: string | undefined
    industry?: string | undefined
    problemStatement?: string | undefined
    proposedSolution?: string | undefined
  } | undefined
  scopeOfWork?: {
    phases?: Array<{
      name?: string | undefined
      duration?: string | undefined
      deliverables?: string[] | undefined
    }> | undefined
  } | undefined
  timeline?: {
    projectStart?: string | undefined
    milestones?: string[] | undefined
    projectCompletion?: string | undefined
  } | undefined
  investment?: {
    phase1?: number | undefined
    phase2?: number | undefined
    phase3?: number | undefined
    total?: number | undefined
    paymentTerms?: string | undefined
  } | undefined
  roi?: {
    expectedSavings?: string | undefined
    paybackPeriod?: string | undefined
    efficiency?: string | undefined
  } | undefined
}

// Zod schema for validating proposal output
const ProposalSchema = z.object({
  executiveSummary: z.object({
    client: z.string().optional(),
    industry: z.string().optional(),
    problemStatement: z.string().optional(),
    proposedSolution: z.string().optional(),
  }).optional(),
  scopeOfWork: z.object({
    phases: z.array(z.object({
      name: z.string().optional(),
      duration: z.string().optional(),
      deliverables: z.array(z.string()).optional(),
    })).optional(),
  }).optional(),
  timeline: z.object({
    projectStart: z.string().optional(),
    milestones: z.array(z.string()).optional(),
    projectCompletion: z.string().optional(),
  }).optional(),
  investment: z.object({
    phase1: z.number().optional(),
    phase2: z.number().optional(),
    phase3: z.number().optional(),
    total: z.number().optional(),
    paymentTerms: z.string().optional(),
  }).optional(),
  roi: z.object({
    expectedSavings: z.string().optional(),
    paybackPeriod: z.string().optional(),
    efficiency: z.string().optional(),
  }).optional(),
})

/**
 * Proposal Agent - Generates formal consulting proposals
 *
 * Triggered: User requests quote OR consulting fit > 0.8 + explicit consent
 * Model: gemini-2.5-flash (reliable for pricing)
 * Output: Structured JSON for PDF generation
 */
export async function proposalAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { intelligenceContext, conversationFlow } = context
  const steps: ChainOfThoughtStep[] = []

  // Step 1: Analyzing project complexity
  steps.push({
    label: 'Analyzing project complexity',
    description: 'Scope assessment from conversation',
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 2: Determining pricing tier
  const companySize = intelligenceContext?.company?.size || 'Unknown'
  steps.push({
    label: 'Determining pricing tier',
    description: `Based on company size: ${companySize}`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 3: Structuring project phases
  steps.push({
    label: 'Structuring project phases',
    description: 'Discovery → Development → Deployment → Support',
    status: 'complete',
    timestamp: Date.now()
  })

  const contextSection = `CONTEXT:
LEAD INFORMATION:
${JSON.stringify(intelligenceContext, null, 2)}

DISCOVERY SUMMARY:
${conversationFlow?.evidence ? JSON.stringify(conversationFlow.evidence).substring(0, 1000) : 'None'}

FULL CONVERSATION:
${messages.map(m => `${m.role}: ${m.content}`).join('\n')}`

  const instructionSection = `INSTRUCTIONS:
You are F.B/c Proposal AI - create formal consulting proposals.

YOUR MISSION:
Create a detailed consulting proposal with accurate scope and pricing.

PROPOSAL STRUCTURE:
{
  "executiveSummary": {
    "client": "${intelligenceContext?.company?.name || 'Client'}",
    "industry": "${intelligenceContext?.company?.industry || 'Industry'}",
    "problemStatement": "<Pain points from discovery>",
    "proposedSolution": "<High-level solution overview>"
  },
  "scopeOfWork": {
    "phases": [
      {
        "name": "Discovery & Planning",
        "duration": "2-3 weeks",
        "deliverables": ["Requirements doc", "Technical architecture", "Project roadmap"]
      },
      {
        "name": "Development & Implementation",
        "duration": "8-12 weeks",
        "deliverables": ["Custom AI system", "API integrations", "Testing"]
      },
      {
        "name": "Deployment & Training",
        "duration": "2-3 weeks",
        "deliverables": ["Production deployment", "Team training", "Documentation"]
      },
      {
        "name": "Support & Optimization",
        "duration": "3 months",
        "deliverables": ["Ongoing support", "Performance tuning", "Feature enhancements"]
      }
    ]
  },
  "timeline": {
    "projectStart": "<Calculate based on current date + 2 weeks>",
    "milestones": ["Phase 1 complete", "MVP launch", "Full deployment"],
    "projectCompletion": "<Calculate based on total duration>"
  },
  "investment": {
    "phase1": <Calculate based on complexity>,
    "phase2": <Calculate based on scope>,
    "phase3": <Calculate based on support>,
    "total": <Sum of all phases>,
    "paymentTerms": "50% upfront, 25% at MVP, 25% at completion"
  },
  "roi": {
    "expectedSavings": "<Annual cost savings>",
    "paybackPeriod": "<Months to ROI>",
    "efficiency": "<Productivity gains>"
  }
}

PRICING GUIDELINES:
Base pricing on complexity and company size:

Small project (MVP/POC):
- Startup/Small: $25K - $40K
- Mid-market: $35K - $50K
- Enterprise: $50K - $75K

Medium project (Full implementation):
- Startup/Small: $50K - $75K
- Mid-market: $75K - $125K
- Enterprise: $125K - $200K

Large project (Complex/Multi-system):
- Startup/Small: $75K - $150K
- Mid-market: $150K - $300K
- Enterprise: $300K - $500K+

Adjust based on:
- Pain point severity (high pain = premium justified)
- Timeline urgency (fast = +20%)
- Team size needing training
- Integration complexity

OUTPUT: Valid JSON only, no explanation.`

  const systemPrompt = `${contextSection}

${instructionSection}`

  // Step 4: Calculating timeline
  steps.push({
    label: 'Calculating timeline',
    description: 'Phase durations and milestones',
    status: 'active',
    timestamp: Date.now()
  })

  let result: Awaited<ReturnType<typeof generateText>>
  try {
    const modelSettings = buildModelSettings(context, messages, { 
      thinkingLevel: 'high',
      defaultMediaResolution: 'media_resolution_medium'
    })
    result = await generateText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the formal consulting proposal based on the conversation and context.' }
      ],
      temperature: 1.0
    })
  } catch (error) {
    console.warn('[Proposal Agent] Falling back to Flash model after error:', error)
    const modelSettings = buildModelSettings(context, messages, { 
      thinkingLevel: 'high',
      defaultMediaResolution: 'media_resolution_medium'
    })
    result = await generateText({
      model: google(GEMINI_MODELS.DEFAULT_RELIABLE, modelSettings),
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Generate the formal consulting proposal based on the conversation and context.' }
      ],
      temperature: 1.0
    })
  }

  // Parse and validate JSON from response
  let proposal: Proposal
  try {
    const jsonMatch = result.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const raw = JSON.parse(jsonMatch[0]) as unknown
      // Zod-validate LLM/tool outputs before use
      proposal = ProposalSchema.parse(raw)
    } else {
      throw new Error('No JSON found in proposal')
    }
  } catch (error) {
    console.error('Failed to parse proposal:', error)
    // Fallback proposal with validated structure
    proposal = ProposalSchema.parse({
      executiveSummary: {
        client: intelligenceContext?.company?.name || 'Client',
        problemStatement: 'Proposal generation failed',
        proposedSolution: 'Custom AI implementation'
      },
      investment: {
        total: 75000,
        paymentTerms: 'To be discussed'
      }
    })
  }

  if (steps[3]) {
    steps[3].status = 'complete'
    const milestones = proposal.timeline?.milestones
    const totalWeeks = Array.isArray(milestones) ? milestones.length : 12
    steps[3].description = `${totalWeeks} weeks total project timeline`
  }

  // Step 5: Computing investment breakdown
  const totalInvestment = proposal.investment?.total
  const investmentValue = typeof totalInvestment === 'number' && Number.isFinite(totalInvestment) ? totalInvestment : 75000
  steps.push({
    label: 'Computing investment breakdown',
    description: `Total: $${investmentValue.toLocaleString()}`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 6: Projecting ROI metrics
  const expectedSavings = proposal.roi?.expectedSavings
  steps.push({
    label: 'Projecting ROI metrics',
    description: typeof expectedSavings === 'string' ? expectedSavings : 'Calculating savings and efficiency gains',
    status: 'complete',
    timestamp: Date.now()
  })

  const estimatedValue = typeof proposal.investment?.total === 'number' && Number.isFinite(proposal.investment.total)
    ? proposal.investment.total
    : 0

  return {
    output: JSON.stringify(proposal, null, 2),
    agent: 'Proposal Agent',
    model: GEMINI_MODELS.DEFAULT_RELIABLE,
    metadata: {
      stage: 'PROPOSAL' as FunnelStage,
      chainOfThought: { steps },
      proposal,
      estimatedValue
    }
  }
}

