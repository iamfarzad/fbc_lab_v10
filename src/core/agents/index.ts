/**
 * Multi-Agent System for F.B/c Sales Funnel
 * 
 * Architecture (2026):
 * - 10 Core Agents: Discovery, Scoring, Workshop, Consulting, Pitch, Objection, Closer, Summary, Proposal, Retargeting
 * - 15 Funnel Stages: Full pipeline support
 * - Fast-track qualified leads (skip discovery)
 * - Objection override (highest priority)
 * - 100% structured output (zero regex parsing)
 * 
 * Special Agents (not in main flow):
 * - Admin Agent: Business intelligence assistant (handled via trigger)
 * - Retargeting Agent: Automated follow-up emails (scheduled jobs)
 * - Lead Intelligence Agent: Background research worker
 * 
 * All agents are multimodal-aware and share context via orchestrator
 */

// Main orchestration
export { routeToAgent, getCurrentStage } from './orchestrator.js'

// Core pipeline agents
export { discoveryAgent } from './discovery-agent.js'
export { scoringAgent } from './scoring-agent.js'
export { workshopSalesAgent } from './workshop-sales-agent.js'
export { consultingSalesAgent } from './consulting-sales-agent.js'
export { pitchAgent } from './pitch-agent.js'
export { objectionAgent } from './objection-agent.js'
export { closerAgent } from './closer-agent.js'
export { summaryAgent } from './summary-agent.js'
export { proposalAgent } from './proposal-agent.js'

// Special agents (not in main flow)
export { adminAgent, searchConversations, draftFollowUpEmail } from './admin-agent.js'
export { retargetingAgent } from './retargeting-agent.js'
export { leadIntelligenceAgent } from './lead-intelligence-agent.js'

// Types
export type { 
  AgentContext, 
  AgentResult, 
  FunnelStage,
  IntelligenceContext,
  MultimodalContextData,
  ChatMessage,
  Proposal,
  ChainOfThoughtStep
} from './types.js'
