/**
 * Client-Side Agent Orchestrator
 *
 * Runs entirely in the browser - no serverless function limits.
 * Routes messages to specialized agents based on:
 * - Current funnel stage
 * - Exit intents
 * - Scoring results
 * - User triggers
 */

import type { AgentContext, AgentResult, ChatMessage } from './types.js'
import type { FunnelStage } from '../types/funnel-stage.js'
import { discoveryAgent } from './discovery-agent.js'
import { scoringAgent } from './scoring-agent.js'
// Deprecated specialized sales agents – unified by pitchAgent
// import { workshopSalesAgent } from './workshop-sales-agent.js'
// import { consultingSalesAgent } from './consulting-sales-agent.js'
import { pitchAgent } from './pitch-agent.js'
import { objectionAgent } from './objection-agent.js'
import { closerAgent } from './closer-agent.js'
import { summaryAgent } from './summary-agent.js'
import { proposalAgent } from './proposal-agent.js'
// Note: retargetingAgent and leadIntelligenceAgent have different signatures
// They are not chat agents - retargeting is for scheduled emails, lead intelligence runs at session start
import { adminAgent } from './admin-agent.js'
import type { ExitIntent } from './intent.js'
import { preProcessIntent } from './intent.js'

/**
 * Exit detection result
 */
interface ExitDetectionResult {
  intent: ExitIntent
  confidence: number
  shouldForceExit: boolean
}

/**
 * Client-side state tracker for conversation flow
 */
interface ClientFlowState {
  currentStage: FunnelStage
  exitAttempts: number
  scoringComplete: boolean
  fitScore?: { workshop: number; consulting: number } | undefined
  leadScore?: number | undefined
  pitchDelivered: boolean
  proposalGenerated: boolean
  objectionCount: number
}

// Module-level flow state (persists across calls in same browser session)
let flowState: ClientFlowState = {
  currentStage: 'DISCOVERY',
  exitAttempts: 0,
  scoringComplete: false,
  pitchDelivered: false,
  proposalGenerated: false,
  objectionCount: 0
}

/**
 * Reset flow state (call when starting new conversation)
 */
export function resetClientFlowState(): void {
  flowState = {
    currentStage: 'DISCOVERY',
    exitAttempts: 0,
    scoringComplete: false,
    pitchDelivered: false,
    proposalGenerated: false,
    objectionCount: 0
  }
}

/**
 * Get current flow state
 */
export function getClientFlowState(): ClientFlowState {
  return { ...flowState }
}

/**
 * Detect exit intent from recent messages
 */
function detectExitIntent(messages: ChatMessage[]): ExitDetectionResult {
  const recentMessages = messages.slice(-5)
  const lastUserMessage = recentMessages.filter(m => m.role === 'user').pop()

  if (!lastUserMessage) {
    return { intent: null, confidence: 0, shouldForceExit: false }
  }

  const text = lastUserMessage.content.toLowerCase()

  // Booking intent
  const bookingPatterns = [
    'book', 'schedule', 'calendar', 'meeting', 'call',
    'let\'s talk', 'set up', 'available', 'appointment'
  ]
  if (bookingPatterns.some(p => text.includes(p))) {
    return { intent: 'BOOKING', confidence: 0.9, shouldForceExit: false }
  }

  // Wrap-up intent
  const wrapUpPatterns = [
    'summary', 'summarize', 'wrap up', 'that\'s all',
    'thanks for', 'thank you', 'got what i need'
  ]
  if (wrapUpPatterns.some(p => text.includes(p))) {
    return { intent: 'WRAP_UP', confidence: 0.8, shouldForceExit: false }
  }

  // Frustration intent
  const frustrationPatterns = [
    'stop', 'enough', 'annoying', 'spam', 'leave me alone',
    'not interested', 'unsubscribe', 'go away', 'shut up'
  ]
  if (frustrationPatterns.some(p => text.includes(p))) {
    flowState.exitAttempts++
    const shouldForceExit = flowState.exitAttempts >= 2
    return {
      intent: shouldForceExit ? 'FORCE_EXIT' : 'FRUSTRATION',
      confidence: 0.95,
      shouldForceExit
    }
  }

  return { intent: null, confidence: 0, shouldForceExit: false }
}

/**
 * Determine if scoring is needed
 */
function needsScoring(context: AgentContext): boolean {
  if (flowState.scoringComplete) return false

  const intel = context.intelligenceContext
  // Score when we have enough context
  return !!(
    intel?.company?.name &&
    (intel?.person?.role || intel?.company?.size)
  )
}

/**
 * Determine pitch type based on fit scores
 */
function determinePitchType(): 'WORKSHOP_PITCH' | 'CONSULTING_PITCH' | 'PITCHING' {
  if (!flowState.fitScore) return 'PITCHING'

  const { workshop, consulting } = flowState.fitScore

  // Clear workshop fit
  if (workshop > 0.7 && workshop > consulting + 0.1) {
    return 'WORKSHOP_PITCH'
  }

  // Clear consulting fit
  if (consulting > 0.7 && consulting > workshop + 0.1) {
    return 'CONSULTING_PITCH'
  }

  // Use generic pitch for unclear fit
  return 'PITCHING'
}

/**
 * Check for objection patterns in messages
 */
function detectObjection(messages: ChatMessage[]): boolean {
  const lastUserMessage = messages.filter(m => m.role === 'user').pop()
  if (!lastUserMessage) return false

  const text = lastUserMessage.content.toLowerCase()
  const objectionPatterns = [
    'too expensive', 'cost too much', 'budget', 'can\'t afford',
    'not sure', 'need to think', 'check with', 'not now',
    'maybe later', 'competitor', 'alternative', 'already have'
  ]

  const hasObjection = objectionPatterns.some(p => text.includes(p))
  if (hasObjection) {
    flowState.objectionCount++
  }
  return hasObjection
}

/**
 * Client-side agent routing - runs entirely in browser
 */
export async function clientRouteToAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  // 1. Check for exit intent first (highest priority)
  const exitResult = detectExitIntent(messages)
  if (exitResult.intent === 'BOOKING') {
    flowState.currentStage = 'BOOKING_REQUESTED'
    return closerAgent(messages, context)
  }
  if (exitResult.intent === 'FORCE_EXIT' || exitResult.shouldForceExit) {
    flowState.currentStage = 'FORCE_EXIT'
    return summaryAgent(messages, context)
  }
  if (exitResult.intent === 'WRAP_UP') {
    flowState.currentStage = 'SUMMARY'
    return summaryAgent(messages, context)
  }

  // 2. Check for admin trigger
  const intent = preProcessIntent(messages)
  if (intent === 'ADMIN') {
    flowState.currentStage = 'ADMIN'
    return adminAgent(messages, context)
  }

  // 3. Check for objections (override current stage)
  if (detectObjection(messages) && flowState.pitchDelivered) {
    flowState.currentStage = 'OBJECTION'
    return objectionAgent(messages, context)
  }

  // 4. Run scoring if needed (async but affects next routing)
  if (needsScoring(context)) {
    try {
      const scoringResult = await scoringAgent(messages, context)
      flowState.scoringComplete = true
      flowState.leadScore = scoringResult.metadata?.leadScore as number | undefined
      flowState.fitScore = scoringResult.metadata?.fitScore as { workshop: number; consulting: number } | undefined
      flowState.currentStage = 'SCORING'
      // Don't return scoring result to user - continue to next stage
    } catch (error) {
      console.error('[ClientOrchestrator] Scoring failed:', error)
    }
  }

  // 5. Route based on current stage
  switch (flowState.currentStage) {
    case 'DISCOVERY':
      // Progress to scoring if we have enough context
      if (flowState.scoringComplete) {
        flowState.currentStage = determinePitchType()
        return clientRouteToAgent(messages, context) // Re-route
      }
      return discoveryAgent(messages, context)

    case 'SCORING':
      // After scoring, move to appropriate pitch
      flowState.currentStage = determinePitchType()
      return clientRouteToAgent(messages, context)

    case 'INTELLIGENCE_GATHERING':
      // Lead intelligence runs at session start, not during chat
      // Route to discovery for continued conversation
      return discoveryAgent(messages, context)

    case 'WORKSHOP_PITCH':
      flowState.pitchDelivered = true
      // Use unified pitch agent (auto-tailors by fit score)
      return pitchAgent(messages, context)

    case 'CONSULTING_PITCH':
      flowState.pitchDelivered = true
      // Use unified pitch agent (auto-tailors by fit score)
      return pitchAgent(messages, context)

    case 'PITCHING':
      flowState.pitchDelivered = true
      return pitchAgent(messages, context)

    case 'PROPOSAL':
      flowState.proposalGenerated = true
      return proposalAgent(messages, context)

    case 'OBJECTION':
      // After handling objection, try to close
      if (flowState.objectionCount > 2) {
        flowState.currentStage = 'CLOSING'
      }
      return objectionAgent(messages, context)

    case 'CLOSING':
    case 'BOOKING_REQUESTED':
      return closerAgent(messages, context)

    case 'BOOKED':
    case 'SUMMARY':
    case 'FORCE_EXIT':
      return summaryAgent(messages, context)

    case 'RETARGETING':
      // Retargeting is for scheduled follow-up emails, not interactive chat
      // Route to summary agent for wrap-up
      return summaryAgent(messages, context)

    case 'ADMIN':
      return adminAgent(messages, context)

    default:
      // Default to discovery for unknown stages
      return discoveryAgent(messages, context)
  }
}

/**
 * Manually set the current stage (for testing or manual override)
 */
export function setClientStage(stage: FunnelStage): void {
  flowState.currentStage = stage
}

/**
 * Update intelligence context after scoring
 */
export function updateIntelligenceFromScoring(
  leadScore: number,
  fitScore: { workshop: number; consulting: number }
): void {
  flowState.leadScore = leadScore
  flowState.fitScore = fitScore
  flowState.scoringComplete = true
}

/**
 * Check if proposal should be offered
 */
export function shouldOfferProposal(_context: AgentContext): boolean {
  if (flowState.proposalGenerated) return false

  // Offer proposal when:
  // 1. High lead score (>70)
  // 2. Consulting fit is dominant
  // 3. Pitch has been delivered
  return (
    flowState.pitchDelivered &&
    (flowState.leadScore ?? 0) > 70 &&
    (flowState.fitScore?.consulting ?? 0) > 0.6
  )
}

/**
 * Move to proposal stage
 */
export function triggerProposal(): void {
  flowState.currentStage = 'PROPOSAL'
}

/**
 * Move to closing stage
 */
export function triggerClosing(): void {
  flowState.currentStage = 'CLOSING'
}

export { flowState as __flowState } // For testing

