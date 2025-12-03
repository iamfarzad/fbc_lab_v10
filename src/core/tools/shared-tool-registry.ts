import { z } from 'zod'

import { SHARED_TOOL_NAMES, type SharedToolName } from './shared-tools'
import { extractActionItems } from './extract-action-items'
import { generateSummaryPreview } from './generate-summary-preview'
import { calculateROI } from './calculate-roi'
import { draftFollowUpEmail } from './draft-follow-up-email'
import { generateProposal } from './generate-proposal'

type ToolSchema = z.ZodTypeAny

type SharedToolDefinition = {
  description: string
  inputSchema: ToolSchema
  execute: (sessionId: string, args: unknown) => Promise<unknown>
}

const parseNumericOptional = () =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === '') return undefined
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
    if (typeof value === 'string') {
      const trimmed = value.trim()
      if (!trimmed) return undefined
      const parsed = Number(trimmed)
      return Number.isFinite(parsed) ? parsed : undefined
    }
    return undefined
  }, z.number().optional())

const parseBooleanOptional = () =>
  z.preprocess((value) => {
    if (value === null || value === undefined) return undefined
    if (typeof value === 'boolean') return value
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase()
      if (normalized === 'true') return true
      if (normalized === 'false') return false
    }
    return value
  }, z.boolean().optional())

const extractActionItemsSchema = z.object({})

const summaryPreviewSchema = z.object({
  includeRecommendations: parseBooleanOptional().describe('Include recommendations section in preview.'),
  includeNextSteps: parseBooleanOptional().describe('Include next steps section in preview.')
})

const calculateRoiSchema = z.object({
  currentCost: parseNumericOptional().describe('Current annual cost (optional, for simplified calculation).'),
  timeSavings: parseNumericOptional().describe('Hours saved per year (optional, for simplified calculation).'),
  employeeCostPerHour: parseNumericOptional().describe('Average employee cost per hour (optional, for simplified calculation).'),
  implementationCost: parseNumericOptional().describe('One-time implementation cost (optional, for simplified calculation).'),
  timeline: parseNumericOptional().describe('Timeline in months (optional).'),
  initialInvestment: parseNumericOptional().describe('Initial investment amount (optional, for detailed calculation).'),
  annualCost: parseNumericOptional().describe('Annual recurring cost (optional, for detailed calculation).'),
  staffReductionSavings: parseNumericOptional().describe('Savings from staff reduction (optional, for detailed calculation).'),
  efficiencySavings: parseNumericOptional().describe('Savings from efficiency gains (optional, for detailed calculation).'),
  retentionSavings: parseNumericOptional().describe('Savings from retention improvement (optional, for detailed calculation).')
})

const draftFollowUpEmailSchema = z.object({
  recipient: z.enum(['client', 'team', 'farzad']).describe('Who the email is for.'),
  tone: z.enum(['professional', 'casual', 'technical']).describe('Tone of the email.'),
  includeSummary: parseBooleanOptional().describe('Include conversation summary in the email.')
})

const generateProposalSchema = z.object({})

const sharedToolDefinitions: Record<SharedToolName, SharedToolDefinition> = {
  extract_action_items: {
    description: 'Extract key outcomes, recommendations, and next steps from the conversation so far.',
    inputSchema: extractActionItemsSchema,
    execute: async (sessionId) => {
      return await extractActionItems(sessionId)
    }
  },
  generate_summary_preview: {
    description: 'Generate a preview of the conversation summary that will be included in the final PDF.',
    inputSchema: summaryPreviewSchema,
    execute: async (sessionId, args) => {
      const parsed = summaryPreviewSchema.parse(args)
      const preview = await generateSummaryPreview(sessionId, {
        includeRecommendations: parsed.includeRecommendations !== false,
        includeNextSteps: parsed.includeNextSteps !== false
      })

      return { preview }
    }
  },
  calculate_roi: {
    description: 'Calculate ROI based on discussed investment and savings. Use when discussing costs, savings, or ROI during the conversation.',
    inputSchema: calculateRoiSchema,
    execute: async (sessionId, args) => {
      const parsed = calculateRoiSchema.parse(args)
      // Filter out undefined values for strict optional property types
      const roiParams: Record<string, number> = {}
      if (typeof parsed.currentCost === 'number') roiParams.currentCost = parsed.currentCost
      if (typeof parsed.timeSavings === 'number') roiParams.timeSavings = parsed.timeSavings
      if (typeof parsed.employeeCostPerHour === 'number') roiParams.employeeCostPerHour = parsed.employeeCostPerHour
      if (typeof parsed.implementationCost === 'number') roiParams.implementationCost = parsed.implementationCost
      if (typeof parsed.timeline === 'number') roiParams.timeline = parsed.timeline
      if (typeof parsed.initialInvestment === 'number') roiParams.initialInvestment = parsed.initialInvestment
      if (typeof parsed.annualCost === 'number') roiParams.annualCost = parsed.annualCost
      if (typeof parsed.staffReductionSavings === 'number') roiParams.staffReductionSavings = parsed.staffReductionSavings
      if (typeof parsed.efficiencySavings === 'number') roiParams.efficiencySavings = parsed.efficiencySavings
      if (typeof parsed.retentionSavings === 'number') roiParams.retentionSavings = parsed.retentionSavings
      return await calculateROI(sessionId, roiParams as Parameters<typeof calculateROI>[1])
    }
  },
  draft_follow_up_email: {
    description: 'Draft a follow-up email summarizing the conversation or next steps. Can be sent to the client, their team, or Farzad.',
    inputSchema: draftFollowUpEmailSchema,
    execute: async (sessionId, args) => {
      const parsed = draftFollowUpEmailSchema.parse(args)
      return await draftFollowUpEmail(sessionId, {
        recipient: parsed.recipient,
        tone: parsed.tone,
        includeSummary: parsed.includeSummary !== false
      })
    }
  },
  generate_proposal_draft: {
    description: 'Generate a proposal based on the conversation. Returns markdown proposal text that can be displayed or saved.',
    inputSchema: generateProposalSchema,
    execute: async (sessionId) => {
      const proposal = await generateProposal(sessionId)
      return { proposal }
    }
  }
}

type SharedToolMapEntry = {
  description: string
  inputSchema: ToolSchema
  execute: (args: unknown) => Promise<unknown>
}

export function createSharedToolMap(sessionId: string) {
  const map: Partial<Record<SharedToolName, SharedToolMapEntry>> = {}

  for (const name of SHARED_TOOL_NAMES) {
    const definition = sharedToolDefinitions[name]
    map[name] = {
      description: definition.description,
      inputSchema: definition.inputSchema,
      execute: (args: unknown) => definition.execute(sessionId, args)
    }
  }

  return map as Record<SharedToolName, SharedToolMapEntry>
}

export async function executeSharedTool(toolName: SharedToolName, sessionId: string, args: unknown) {
  const definition = sharedToolDefinitions[toolName]
  if (!definition) {
    throw new Error(`Unsupported tool: ${toolName}`)
  }
  return await definition.execute(sessionId, args)
}
