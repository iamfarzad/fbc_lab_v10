/**
 * Unified Tool Registry - Single source of truth for all tool definitions and execution
 * 
 * Combines the best patterns from v5→v10 evolution:
 * - Zod schema validation (from v5/v7)
 * - Server-side execution (from v10)
 * - AI SDK pattern for chat (from v5)
 * - Unified routing (NEW)
 * 
 * This file provides:
 * - validateToolArgs() - Validate tool arguments before execution
 * - executeUnifiedTool() - Execute any tool through unified routing
 * - getChatToolDefinitions() - Get AI SDK-compatible tool definitions for chat agents
 */

import { z } from 'zod'
import { toolExecutor } from './tool-executor'
import { withTimeout } from 'src/lib/code-quality'
import type { ToolExecutionResult } from './types'

// Re-export Live API function declarations (no changes needed - already correct format)
export { LIVE_FUNCTION_DECLARATIONS, ADMIN_LIVE_FUNCTION_DECLARATIONS } from 'src/config/live-tools'

// ============================================================================
// Tool Result Interface (matches server/utils/tool-implementations.ts)
// ============================================================================

export interface ToolResult {
  success: boolean
  data?: unknown
  error?: string
}

// ============================================================================
// Tool Execution Context
// ============================================================================

export interface ToolExecutionContext {
  sessionId: string
  connectionId?: string  // For voice sessions
  agent?: string         // For chat agents
  activeSessions?: {     // For voice context access (screen/webcam snapshots)
    get: (id: string) => { latestContext?: { screen?: unknown; webcam?: unknown } } | undefined
  }
}

// ============================================================================
// Zod Schemas for All Tools
// ============================================================================

// Helper for optional numeric fields
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

// Helper for optional boolean fields
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

// Tool Schemas (restore v5/v7's strict validation pattern)
export const ToolSchemas = {
  // Search tool
  search_web: z.object({
    query: z.string().min(1, 'Query cannot be empty'),
    urls: z.array(z.string().url()).optional()
  }),

  // Action items extraction
  extract_action_items: z.object({}),

  // ROI calculation (reused from shared-tool-registry)
  calculate_roi: z.object({
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
  }),

  // Summary preview (reused from shared-tool-registry)
  generate_summary_preview: z.object({
    includeRecommendations: parseBooleanOptional().describe('Include recommendations section in preview.'),
    includeNextSteps: parseBooleanOptional().describe('Include next steps section in preview.')
  }),

  // Follow-up email (reused from shared-tool-registry)
  draft_follow_up_email: z.object({
    recipient: z.enum(['client', 'team', 'farzad']).describe('Who the email is for.'),
    tone: z.enum(['professional', 'casual', 'technical']).describe('Tone of the email.'),
    includeSummary: parseBooleanOptional().describe('Include conversation summary in the email.')
  }),

  // Proposal generation
  generate_proposal_draft: z.object({}),

  // Screen snapshot
  capture_screen_snapshot: z.object({
    summaryOnly: parseBooleanOptional().describe('Omit raw image data when true.')
  }),

  // Webcam snapshot
  capture_webcam_snapshot: z.object({
    summaryOnly: parseBooleanOptional().describe('Omit raw image data when true.')
  }),

  // Dashboard stats (admin only)
  get_dashboard_stats: z.object({
    period: z.enum(['1d', '7d', '30d', '90d']).optional().describe('Time period for stats. Defaults to "7d".')
  })
} as const

export type UnifiedToolName = keyof typeof ToolSchemas

// List of all unified tool names
export const UNIFIED_TOOL_NAMES = Object.keys(ToolSchemas) as UnifiedToolName[]

// ============================================================================
// Validation Function
// ============================================================================

/**
 * Validate tool arguments against schema
 * @returns { valid: true } if valid, { valid: false, error: string } if invalid
 */
export function validateToolArgs(toolName: string, args: unknown): { valid: boolean; error?: string } {
  const schema = ToolSchemas[toolName as UnifiedToolName]
  
  if (!schema) {
    return { valid: false, error: `Unknown tool: ${toolName}` }
  }

  const parseResult = schema.safeParse(args ?? {})
  if (!parseResult.success) {
    const errors = parseResult.error.issues
      .map(i => `${i.path.join('.')}: ${i.message}`)
      .join('; ')
    return { valid: false, error: `Schema validation failed: ${errors}` }
  }
  
  return { valid: true }
}

// ============================================================================
// Unified Execution Function
// ============================================================================

/**
 * Execute a tool through the unified registry
 * Routes to existing implementations in server/utils/tool-implementations.ts
 * Preserves existing ToolResult format: { success, data?, error? }
 */
export async function executeUnifiedTool(
  toolName: string,
  args: unknown,
  context: ToolExecutionContext
): Promise<ToolResult> {
  // Dynamic import to avoid circular dependencies
  // These implementations are server-side and use the ToolResult format
  const {
    executeSearchWeb,
    executeExtractActionItems,
    executeCalculateROI,
    executeGenerateSummaryPreview,
    executeDraftFollowUpEmail,
    executeGenerateProposalDraft,
    executeCaptureScreenSnapshot,
    executeCaptureWebcamSnapshot,
    executeCaptureScreenSnapshotBySession,
    executeCaptureWebcamSnapshotBySession,
    executeGetDashboardStats
  } = await import('../../../server/utils/tool-implementations.js')

  const { sessionId, connectionId, activeSessions } = context

  switch (toolName) {
    case 'search_web':
      return await executeSearchWeb(args as { query: string; urls?: string[] })

    case 'extract_action_items':
      return await executeExtractActionItems(args, sessionId)

    case 'calculate_roi':
      return await executeCalculateROI(args)

    case 'generate_summary_preview':
      return await executeGenerateSummaryPreview(args, sessionId)

    case 'draft_follow_up_email':
      return await executeDraftFollowUpEmail(args, sessionId)

    case 'generate_proposal_draft':
      return await executeGenerateProposalDraft(args, sessionId)

    case 'capture_screen_snapshot':
      // Try connection-based lookup first (voice), then session-based (chat)
      if (connectionId && activeSessions) {
        return await executeCaptureScreenSnapshot(args, connectionId, activeSessions)
      }
      // Fallback to session-based lookup via multimodal context (chat)
      return await executeCaptureScreenSnapshotBySession(args, sessionId)

    case 'capture_webcam_snapshot':
      // Try connection-based lookup first (voice), then session-based (chat)
      if (connectionId && activeSessions) {
        return await executeCaptureWebcamSnapshot(args, connectionId, activeSessions)
      }
      // Fallback to session-based lookup via multimodal context (chat)
      return await executeCaptureWebcamSnapshotBySession(args, sessionId)

    case 'get_dashboard_stats':
      return await executeGetDashboardStats(args, sessionId)

    default:
      return {
        success: false,
        error: `Unknown tool: ${toolName}`
      }
  }
}

// ============================================================================
// Chat Tool Definitions (AI SDK Pattern)
// ============================================================================

// Tool definition compatible with AI SDK
export interface ChatToolDefinition {
  description: string
  parameters: z.ZodTypeAny
  execute: (args: unknown) => Promise<unknown>
}

/**
 * Get AI SDK-compatible tool definitions for chat agents
 * Wraps unified tools with toolExecutor for retry/caching/logging
 * Uses AI SDK tool() pattern from v5
 */
export function getChatToolDefinitions(sessionId: string, agentName: string = 'Chat Agent'): Record<string, ChatToolDefinition> {
  const createToolExecute = (toolName: UnifiedToolName) => {
    return async (args: unknown): Promise<unknown> => {
      // Validate args first
      const validation = validateToolArgs(toolName, args)
      if (!validation.valid) {
        throw new Error(validation.error)
      }

      // Execute with toolExecutor for retry/caching/logging
      const result: ToolExecutionResult<ToolResult> = await toolExecutor.execute({
        toolName,
        sessionId,
        agent: agentName,
        inputs: (args ?? {}) as Record<string, unknown>,
        handler: async () => {
          // Add timeout wrapper (25s - stays under Vercel 30s limit)
          return await withTimeout(
            executeUnifiedTool(toolName, args, { sessionId }),
            25000,
            `Tool ${toolName} timed out`
          )
        },
        cacheable: toolName === 'search_web' || toolName === 'calculate_roi' // Cache read-only tools
      })

      if (!result.success) {
        throw new Error(result.error || `Tool ${toolName} failed`)
      }

      return result.data
    }
  }

  return {
    search_web: {
      description: 'Search the web for current information and return grounded, cited findings.',
      parameters: ToolSchemas.search_web,
      execute: createToolExecute('search_web')
    },
    extract_action_items: {
      description: 'Extract key outcomes, recommendations, and next steps from the conversation so far.',
      parameters: ToolSchemas.extract_action_items,
      execute: createToolExecute('extract_action_items')
    },
    calculate_roi: {
      description: 'Calculate ROI based on discussed investment and savings. Use when discussing costs, savings, or ROI during the conversation.',
      parameters: ToolSchemas.calculate_roi,
      execute: createToolExecute('calculate_roi')
    },
    generate_summary_preview: {
      description: 'Generate a preview of the conversation summary that will be included in the final PDF.',
      parameters: ToolSchemas.generate_summary_preview,
      execute: createToolExecute('generate_summary_preview')
    },
    draft_follow_up_email: {
      description: 'Draft a follow-up email summarizing the conversation or next steps. Can be sent to the client, their team, or Farzad.',
      parameters: ToolSchemas.draft_follow_up_email,
      execute: createToolExecute('draft_follow_up_email')
    },
    generate_proposal_draft: {
      description: 'Generate a proposal based on the conversation. Returns markdown proposal text that can be displayed or saved.',
      parameters: ToolSchemas.generate_proposal_draft,
      execute: createToolExecute('generate_proposal_draft')
    },
    capture_webcam_snapshot: {
      description: 'Retrieve the latest analyzed webcam context for this session.',
      parameters: ToolSchemas.capture_webcam_snapshot,
      execute: createToolExecute('capture_webcam_snapshot')
    },
    capture_screen_snapshot: {
      description: 'Retrieve the latest analyzed screen-share context for this session.',
      parameters: ToolSchemas.capture_screen_snapshot,
      execute: createToolExecute('capture_screen_snapshot')
    }
    // Note: get_dashboard_stats is admin-only and not included in chat tool definitions
  }
}

// ============================================================================
// Transient Error Detection (same logic as toolExecutor)
// ============================================================================

/**
 * Check if error is transient (should retry)
 * Same logic as ToolExecutor.isTransientError()
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false

  const message = error.message.toLowerCase()
  const transientPatterns = [
    'network',
    'timeout',
    'econnreset',
    'enotfound',
    'econnrefused',
    'temporary',
    'rate limit',
    '429',
    '503',
    '502'
  ]

  return transientPatterns.some(pattern => message.includes(pattern))
}

