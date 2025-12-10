/**
 * LeadProfile - Structured profile for Discovery Agent personalization
 * 
 * Transformed from ResearchResult to enable subtle, non-creepy personalization
 */

export interface LeadProfile {
  identity: {
    name: string
    verified: boolean // true if email domain matches LinkedIn company
    confidenceScore: number // 0-100
  }
  professional: {
    currentRole: string
    company: string
    industry: string
    yearsExperience?: number // Inferred from graduation or first role
  }
  digitalFootprint: {
    hasGitHub: boolean // Indicates technical capability
    hasPublications: boolean // Indicates academic/research focus
    recentSpeaking: boolean // Good target for "Speaker Coaching" or "Keynotes"
  }
  contexthooks: string[] // Generated "icebreakers" (e.g., "Saw your work on Project X")
}

/**
 * IntentResult - Detected user intent from conversation
 */
export interface IntentResult {
  type: 'consulting' | 'workshop' | 'other'
  confidence: number // 0-1
  slots: Record<string, string | number | boolean>
}

/**
 * ContextSnapshot - Snapshot of conversation context for tool suggestions
 */
export interface ContextSnapshot {
  stage?: string
  categoriesCovered?: Record<string, boolean>
  intelligenceContext?: unknown
  conversationFlow?: unknown
  role?: string
  company?: {
    industry?: string
  }
  capabilities?: string[]
}

/**
 * Suggestion - Tool suggestion for user
 */
export interface Suggestion {
  id: string
  label: string
  capability: string
  description?: string
  relevanceScore?: number
  action?: string
}

/**
 * AgentStrategicContext - Strategic communication parameters for agents
 * 
 * Determines how agents should adapt their communication style based on
 * privacy sensitivity, technical level, and authority level of the lead.
 */
export interface AgentStrategicContext {
  privacySensitivity: 'HIGH' | 'MEDIUM' | 'LOW' // Triggers "Safe Environment" talk
  technicalLevel: 'HIGH' | 'LOW' // Triggers "Jargon" vs "Business Value"
  authorityLevel: 'DECISION_MAKER' | 'INFLUENCER' | 'RESEARCHER' // Adjusts deference and closing strategy
}
