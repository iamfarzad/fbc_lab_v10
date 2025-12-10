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
import { toolExecutor } from './tool-executor.js'
import { withTimeout } from '../../lib/code-quality.js'
import type { ToolExecutionResult } from './types.js'

// Re-export Live API function declarations (no changes needed - already correct format)
export { LIVE_FUNCTION_DECLARATIONS, ADMIN_LIVE_FUNCTION_DECLARATIONS } from '../../config/live-tools.js'

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

  // Weather tool - uses search_web internally
  get_weather: z.object({
    location: z.string().min(1, 'Location cannot be empty')
  }),

  // Search companies by location tool
  search_companies_by_location: z.object({
    location: z.string().min(1, 'Location cannot be empty').describe('City, region, or country to search for companies'),
    industry: z.string().optional().describe('Optional industry filter'),
    companyType: z.string().optional().describe('Optional company type (e.g., "startups", "enterprises", "consultants")')
  }),

  // Action items extraction
  extract_action_items: z.object({}),

  // ROI calculation
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

  // Summary preview
  generate_summary_preview: z.object({
    includeRecommendations: parseBooleanOptional().describe('Include recommendations section in preview.'),
    includeNextSteps: parseBooleanOptional().describe('Include next steps section in preview.')
  }),

  // Follow-up email
  draft_follow_up_email: z.object({
    recipient: z.enum(['client', 'team', 'farzad']).describe('Who the email is for.'),
    tone: z.enum(['professional', 'casual', 'technical']).describe('Tone of the email.'),
    includeSummary: parseBooleanOptional().describe('Include conversation summary in the email.')
  }),

  // Proposal generation
  generate_proposal_draft: z.object({}),

  // Screen snapshot
  capture_screen_snapshot: z.object({
    focus_prompt: z.string().optional()
      .describe("Specific question about what to look for on the screen. E.g., 'What is the error message?' or 'Read the numbers in the Q3 column'."),
    summaryOnly: parseBooleanOptional().describe('Omit raw image data when true.')
  }),

  // Webcam snapshot
  capture_webcam_snapshot: z.object({
    focus_prompt: z.string().optional()
      .describe("Specific question about user's environment or emotion. E.g., 'What object are they holding?' or 'Are they smiling?'."),
    summaryOnly: parseBooleanOptional().describe('Omit raw image data when true.')
  }),

  // Dashboard stats (admin only)
  get_dashboard_stats: z.object({
    period: z.enum(['1d', '7d', '30d', '90d']).optional().describe('Time period for stats. Defaults to "7d".')
  }),

  // Booking link
  get_booking_link: z.object({
    meetingType: z.enum(['consultation', 'workshop', 'strategy-call']).optional().describe('Type of meeting (all redirect to same Cal.com link)')
  }),

  // Location tool - get user's current location
  get_location: z.object({}),

  // Stock price tool - get current stock price
  get_stock_price: z.object({
    symbol: z.string().min(1, 'Stock symbol cannot be empty').describe('Stock ticker symbol (e.g., "TSLA", "AAPL")')
  }),

  // Instant Audit Tool - Analyze website tech stack
  analyze_website_tech_stack: z.object({
    url: z.string().url().describe("The prospective client's website URL"),
    focus: z.enum(['ai_opportunities', 'marketing_stack']).optional()
      .describe("What to focus on: AI integration opportunities or marketing tech stack")
  }),

  // Visualizer Tool - Generate architecture diagrams
  generate_architecture_diagram: z.object({
    diagram_type: z.enum(['flowchart', 'sequence', 'gantt', 'mindmap']).describe('Type of diagram to generate'),
    content_description: z.string().describe("What to draw? e.g., 'Workflow for video automation pipeline'")
  }),

  // Social Proof Tool - Search internal case studies
  search_internal_case_studies: z.object({
    query: z.string().describe("Search query for use case or industry (e.g., 'customer support', 'video generation', 'data entry')"),
    industry: z.string().optional().describe("Optional industry filter")
  }),

  // Curriculum Architect - Custom syllabus generator (Teaser Tool)
  generate_custom_syllabus: z.object({
    team_roles: z.string().describe("Who is in the workshop? e.g. '3 devs, 1 PM'"),
    pain_points: z.array(z.string()).describe("What do they want to solve?"),
    tech_stack: z.string().describe("Their current tools")
  }),

  // FOMO Radar - Competitor gap analysis (Teaser Tool)
  analyze_competitor_gap: z.object({
    industry: z.string().describe("Industry to analyze"),
    client_current_state: z.string().describe("What the user told us they are doing")
  }),

  // ROI Simulator - Cost of inaction calculator (Teaser Tool)
  simulate_cost_of_inaction: z.object({
    inefficient_process: z.string().describe("The manual task they complained about"),
    hours_wasted_per_week: z.number().describe("Hours wasted per week"),
    team_size: z.number().describe("Number of people affected")
  }),

  // Executive Briefing Generator - C-level memo for decision makers
  generate_executive_memo: z.object({
    target_audience: z.enum(['CFO', 'CEO', 'CTO']).describe("Who are we trying to convince?"),
    key_blocker: z.enum(['budget', 'timing', 'security']).describe("What is the main objection we expect?"),
    proposed_solution: z.string().describe("e.g. '2-Day In-House Workshop'")
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
    executeGetDashboardStats,
    executeGenerateExecutiveMemo
  } = await import('../../../server/utils/tool-implementations.js')

  const { sessionId, connectionId, activeSessions } = context

  switch (toolName) {
    case 'search_web':
      return await executeSearchWeb(args as { query: string; urls?: string[] })

    case 'get_weather': {
      // Weather is implemented via search_web with a formatted query
      // Explicitly request Celsius temperature
      const location = (args as { location: string }).location
      return await executeSearchWeb({ query: `current weather in ${location} temperature in celsius degrees` })
    }

    case 'search_companies_by_location': {
      // Search for companies by location using search_web
      const { location, industry, companyType } = args as { location: string; industry?: string; companyType?: string }
      let searchQuery = `companies businesses in ${location}`
      if (industry) searchQuery += ` ${industry} industry`
      if (companyType) searchQuery += ` ${companyType}`
      searchQuery += ' business directory'
      return await executeSearchWeb({ query: searchQuery })
    }

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

    case 'get_booking_link': {
      // Return the Cal.com booking link
      const BOOKING_URL = 'https://cal.com/farzadbayat/discovery-call'
      return {
        success: true,
        data: {
          link: BOOKING_URL,
          message: `Here's the booking link: ${BOOKING_URL}`,
          note: 'Please share this link with the user. You cannot book on their behalf.'
        }
      }
    }

    case 'get_location': {
      // Get user's current location from unifiedContext
      const { unifiedContext } = await import('../../../services/unifiedContext.js')
      const location = await unifiedContext.ensureLocation()
      if (location) {
        // Get snapshot to check for city/country in intelligence context
        const snapshot = unifiedContext.getSnapshot()
        const intelLocation = snapshot.intelligenceContext?.location
        return {
          success: true,
          data: {
            latitude: location.latitude,
            longitude: location.longitude,
            ...(intelLocation?.city && { city: intelLocation.city }),
            ...(intelLocation?.country && { country: intelLocation.country }),
            message: intelLocation?.city && intelLocation?.country
              ? `User is located in ${intelLocation.city}, ${intelLocation.country} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
              : `User location: ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`
          }
        }
      }
      return {
        success: false,
        error: 'Location not available. User may need to grant location permissions.'
      }
    }

    case 'get_stock_price': {
      // Get stock price using search_web
      const symbol = (args as { symbol: string }).symbol.toUpperCase()
      return await executeSearchWeb({ query: `current stock price ${symbol} real-time quote` })
    }

    case 'analyze_website_tech_stack': {
      const { executeAnalyzeWebsiteTechStack } = await import('../../../server/utils/tool-implementations.js')
      return await executeAnalyzeWebsiteTechStack(args as { url: string; focus?: 'ai_opportunities' | 'marketing_stack' })
    }

    case 'generate_architecture_diagram': {
      const { executeGenerateArchitectureDiagram } = await import('../../../server/utils/tool-implementations.js')
      return await executeGenerateArchitectureDiagram(args as { diagram_type: 'flowchart' | 'sequence' | 'gantt' | 'mindmap'; content_description: string }, sessionId)
    }

    case 'search_internal_case_studies': {
      const { executeSearchInternalCaseStudies } = await import('../../../server/utils/tool-implementations.js')
      return await executeSearchInternalCaseStudies(args as { query: string; industry?: string })
    }

    case 'generate_custom_syllabus': {
      const { executeGenerateCustomSyllabus } = await import('../../../server/utils/tool-implementations.js')
      return await executeGenerateCustomSyllabus(args as { team_roles: string; pain_points: string[]; tech_stack: string }, sessionId)
    }

    case 'analyze_competitor_gap': {
      const { executeAnalyzeCompetitorGap } = await import('../../../server/utils/tool-implementations.js')
      return await executeAnalyzeCompetitorGap(args as { industry: string; client_current_state: string })
    }

    case 'simulate_cost_of_inaction': {
      const { executeSimulateCostOfInaction } = await import('../../../server/utils/tool-implementations.js')
      return await executeSimulateCostOfInaction(args as { inefficient_process: string; hours_wasted_per_week: number; team_size: number })
    }

    case 'generate_executive_memo':
      return await executeGenerateExecutiveMemo(args as { target_audience: 'CFO' | 'CEO' | 'CTO'; key_blocker: 'budget' | 'timing' | 'security'; proposed_solution: string }, sessionId)

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
      description: 'Retrieve the latest analyzed webcam context for this session. If focus_prompt is provided, performs fresh targeted analysis (e.g., "What object are they holding?" or "Describe their facial expression"). Without focus_prompt, returns cached analysis.',
      parameters: ToolSchemas.capture_webcam_snapshot,
      execute: createToolExecute('capture_webcam_snapshot')
    },
    capture_screen_snapshot: {
      description: 'Retrieve the latest analyzed screen-share context for this session. If focus_prompt is provided, performs fresh targeted analysis (e.g., "What is the error message?" or "Read the numbers in column Q3"). Without focus_prompt, returns cached analysis.',
      parameters: ToolSchemas.capture_screen_snapshot,
      execute: createToolExecute('capture_screen_snapshot')
    },
    analyze_website_tech_stack: {
      description: 'Analyze a website\'s technology stack to identify technologies used and where AI could fit. Use this when a client shares their website URL to establish immediate technical authority.',
      parameters: ToolSchemas.analyze_website_tech_stack,
      execute: createToolExecute('analyze_website_tech_stack')
    },
    generate_architecture_diagram: {
      description: 'Generate a visual architecture diagram (flowchart, sequence, Gantt, or mindmap) to help visualize complex workflows and solutions. Returns Mermaid.js code that can be rendered in the UI.',
      parameters: ToolSchemas.generate_architecture_diagram,
      execute: createToolExecute('generate_architecture_diagram')
    },
    search_internal_case_studies: {
      description: 'Search internal case studies and past project wins to provide social proof. Use this when a client is skeptical or needs specific examples of similar solutions in their industry or use case.',
      parameters: ToolSchemas.search_internal_case_studies,
      execute: createToolExecute('search_internal_case_studies')
    },
    generate_custom_syllabus: {
      description: 'Generate a custom workshop syllabus tailored to the client\'s team, pain points, and tech stack. Use this INSTEAD of giving away solutions for free - show them that their questions are covered in specific workshop modules. This demonstrates your expertise while driving them to book.',
      parameters: ToolSchemas.generate_custom_syllabus,
      execute: createToolExecute('generate_custom_syllabus')
    },
    analyze_competitor_gap: {
      description: 'Analyze what competitors in the client\'s industry are doing with AI to show the competitive gap. Use this to create urgency (FOMO) by demonstrating they are falling behind market leaders. Perfect for C-level/VP discussions.',
      parameters: ToolSchemas.analyze_competitor_gap,
      execute: createToolExecute('analyze_competitor_gap')
    },
    simulate_cost_of_inaction: {
      description: 'Calculate how much money the client is losing every month by not solving their inefficiency problem. This turns your workshop/consulting fee from a "cost" into a "savings" by showing they\'re already paying that amount in wasted time. Perfect for finance/procurement discussions.',
      parameters: ToolSchemas.simulate_cost_of_inaction,
      execute: createToolExecute('simulate_cost_of_inaction')
    },
    generate_executive_memo: {
      description: 'Generate a 1-page executive memo for CFO/CEO/CTO explaining why the proposed solution will save money and overcome their specific objections. This helps the champion sell to the decision maker. Use when budget, timing, or security concerns are raised.',
      parameters: ToolSchemas.generate_executive_memo,
      execute: createToolExecute('generate_executive_memo')
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

