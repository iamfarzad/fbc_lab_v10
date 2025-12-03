import type { ConversationFlowState } from 'src/types/conversation-flow-types'
import type { FunnelStage } from 'src/core/types/funnel-stage'

export interface AgentContext {
  sessionId: string
  intelligenceContext?: IntelligenceContext
  conversationFlow?: ConversationFlowState
  multimodalContext?: MultimodalContextData
  // mode removed - transport determined by connection type (HTTP vs WebSocket)
  voiceActive?: boolean
  stage?: FunnelStage
  thinkingLevel?: 'low' | 'high'
  mediaResolution?: 'media_resolution_low' | 'media_resolution_medium' | 'media_resolution_high'
}

export type CompanySize = '1-10' | '11-50' | '51-200' | '201-1000' | '1000+' | 'unknown'

export type Seniority = 'C-Level' | 'VP' | 'Director' | 'Manager' | 'Individual Contributor' | 'unknown'

export type ObjectionType = 'price' | 'timing' | 'authority' | 'need' | 'trust' | null

export interface IntelligenceContext {
  email: string
  name: string
  lead?: {
    name: string
    email: string
  }
  company?: {
    name?: string
    domain: string
    industry?: string
    size?: CompanySize | (string & Record<never, never>) // Support both old string format and new enum
    employeeCount?: number
    summary?: string
    website?: string
    linkedin?: string
  }
  person?: {
    fullName: string
    role?: string
    seniority?: Seniority | (string & Record<never, never>) // Support both old string format and new enum
    profileUrl?: string
  }
  role?: string
  roleConfidence?: number
  fitScore?: {
    workshop: number
    consulting: number
  }
  leadScore?: number
  pitchDelivered?: boolean
  calendarBooked?: boolean
  // === NEW STRUCTURED FIELDS (backward compatible - all optional) ===
  budget?: {
    hasExplicit: boolean
    minUsd?: number
    maxUsd?: number
    urgency: number // 0-1
  }
  timeline?: {
    urgency: number // 0-1
    explicit?: string
  }
  interestLevel?: number // 0-1
  currentObjection?: ObjectionType
  researchConfidence?: number // 0-1 from lead research
}

export interface MultimodalContextData {
  hasRecentImages: boolean
  hasRecentAudio: boolean
  hasRecentUploads: boolean
  recentAnalyses: string[]
  recentUploads: string[]
}

// Re-export FunnelStage from centralized location
export type { FunnelStage } from 'src/core/types/funnel-stage'

export interface ChainOfThoughtStep {
  label: string
  description?: string
  status: 'complete' | 'active' | 'pending'
  timestamp?: number
}

export interface ToolMetadata {
  name: string
  type: string
  state: 'running' | 'complete' | 'error'
  input?: unknown
  output?: unknown
  error?: string
}

export interface AgentMetadata {
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  stage?: FunnelStage | string
  chainOfThought?: {
    steps: ChainOfThoughtStep[]
  }
  reasoning?: string
  tools?: ToolMetadata[]
  multimodalUsed?: boolean
  handoffReasons?: string[]
  leadScore?: number
  fitScore?: { workshop: number; consulting: number }
  enhancedConversationFlow?: unknown
  triggerBooking?: boolean
  action?: string
  recapProvided?: boolean
  categoriesCovered?: number
  recommendedNext?: string | null
  proposal?: Proposal
  estimatedValue?: number
  [key: string]: unknown
}

// Proposal types for proposal-agent
export interface Proposal {
  executiveSummary?: {
    client?: string
    industry?: string
    problemStatement?: string
    proposedSolution?: string
  }
  scopeOfWork?: {
    phases?: Array<{
      name?: string
      duration?: string
      deliverables?: string[]
    }>
  }
  timeline?: {
    projectStart?: string
    milestones?: string[]
    projectCompletion?: string
  }
  investment?: {
    phase1?: number
    phase2?: number
    phase3?: number
    total?: number
    paymentTerms?: string
  }
  roi?: {
    expectedSavings?: string
    paybackPeriod?: string
    efficiency?: string
  }
}

export interface ProposalMeta {
  confidence?: number
  source?: string
}

export type ProposalResult =
  | { type: 'success'; data: Proposal; metadata?: ProposalMeta }
  | { type: 'error'; error: string; metadata?: ProposalMeta }

export interface AgentResult {
  output: string
  agent: string
  model?: string
  metadata?: AgentMetadata
}

// Use canonical Message type from src/types/core
export type { Message as ChatMessage } from 'src/types/core'
