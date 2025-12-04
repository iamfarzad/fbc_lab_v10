/**
 * Multi-Agent System for F.B/c Sales Funnel
 * 
 * Architecture (2026):
 * - 6 Core Agents: Discovery, Pitch, Objection, Closer, Summary, Lead Research
 * - 7 Funnel Stages: DISCOVERY → QUALIFIED → PITCHING → OBJECTION → CLOSING → BOOKED → SUMMARY
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

export { routeToAgent, getCurrentStage } from './orchestrator.js'
export { discoveryAgent } from './discovery-agent.js'
export { pitchAgent } from './pitch-agent.js'
export { objectionAgent } from './objection-agent.js'
export { closerAgent } from './closer-agent.js'
export { summaryAgent } from './summary-agent.js'
// Special agents (not in main flow)
export { adminAgent, searchConversations, draftFollowUpEmail } from './admin-agent.js'
export { retargetingAgent } from './retargeting-agent.js'
export { leadIntelligenceAgent } from './lead-intelligence-agent.js'

export type { 
  AgentContext, 
  AgentResult, 
  FunnelStage,
  IntelligenceContext,
  MultimodalContextData,
  ChatMessage
} from './types.js'
