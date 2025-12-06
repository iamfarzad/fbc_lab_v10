/**
 * Response Validation Helper for Agent Outputs
 * 
 * Ensures agent responses follow critical rules:
 * - No fabricated ROI numbers (must come from calculate_roi tool)
 * - No false claims about booking meetings
 * - Discovery categories covered progressively
 * - Direct questions answered before continuing
 */

import { logger } from '../../lib/logger.js'

export interface ValidationResult {
  isValid: boolean
  issues: ValidationIssue[]
  correctedResponse?: string
  shouldBlock: boolean
}

export interface ValidationIssue {
  type: 'fabricated_roi' | 'false_booking_claim' | 'skipped_question' | 'hallucinated_action' | 'identity_leak'
  severity: 'warning' | 'error' | 'critical'
  message: string
  suggestion?: string
}

interface ValidationContext {
  toolsUsed: string[]
  userQuestion?: string
  agentName: string
  stage: string
}

// Patterns that indicate fabricated ROI
const FABRICATED_ROI_PATTERNS = [
  /\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*%\s*(?:ROI|return|savings?|increase|reduction|improvement)/gi,
  /\b(?:ROI|return|savings?)\s*(?:of|at|around)?\s*\$?\d+/gi,
  /\bsave\s+(?:up to\s+)?\$?\d{3,}/gi,
  /\b(?:increase|boost|improve)\s+(?:revenue|profit|sales)\s+(?:by\s+)?\d+/gi,
]

// Patterns indicating false booking claims
const FALSE_BOOKING_PATTERNS = [
  /\b(?:I'?(?:ve|ll)|I have|I will)\s+(?:booked?|scheduled?|sent?|confirmed?)\s+(?:a|the|your)?\s*(?:meeting|appointment|calendar|invite)/gi,
  /\b(?:meeting|appointment|call)\s+(?:is\s+)?(?:booked|scheduled|confirmed|set)/gi,
  /\b(?:sent|sending)\s+(?:a|the|an?)?\s*(?:calendar\s+)?invite/gi,
  /\byour?\s+(?:meeting|appointment)\s+(?:is|has been)\s+(?:booked|confirmed)/gi,
]

// Patterns indicating identity leaks (revealing it's Gemini/Google)
const IDENTITY_LEAK_PATTERNS = [
  /\bI(?:'m| am)\s+(?:Gemini|Google|an? AI|ChatGPT|Claude|Anthropic)/gi,
  /\b(?:as|being)\s+(?:a|an)\s+(?:AI|language model|LLM)/gi,
  /\bGemini(?:'s|\s+)(?:capabilities|features|model)/gi,
]

// Patterns for hallucinated actions
const HALLUCINATED_ACTION_PATTERNS = [
  /\b(?:I'?(?:ve|ll)|I have|I will)\s+(?:emailed?|contacted?|notified?)\s+(?:you|your team|the team)/gi,
  /\b(?:I'?(?:ve|ll)|I have|I will)\s+(?:created?|generated?|prepared?)\s+(?:a|the|your)?\s*(?:proposal|contract|invoice|report)/gi,
]

/**
 * Validate an agent response against critical rules
 */
export function validateAgentResponse(
  response: string,
  context: ValidationContext
): ValidationResult {
  const issues: ValidationIssue[] = []

  // Check for fabricated ROI (unless calculate_roi was used)
  if (!context.toolsUsed.includes('calculate_roi')) {
    for (const pattern of FABRICATED_ROI_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({
          type: 'fabricated_roi',
          severity: 'critical',
          message: 'ROI numbers mentioned without using calculate_roi tool',
          suggestion: 'Use the calculate_roi tool before mentioning any specific numbers'
        })
        break // One issue per type is enough
      }
    }
  }

  // Check for false booking claims (unless booking tool was used AND returned success)
  if (!context.toolsUsed.includes('create_calendar_widget') && 
      !context.toolsUsed.includes('get_booking_link')) {
    for (const pattern of FALSE_BOOKING_PATTERNS) {
      if (pattern.test(response)) {
        issues.push({
          type: 'false_booking_claim',
          severity: 'critical',
          message: 'Claims about booking/scheduling without using booking tools',
          suggestion: 'Use get_booking_link to provide a link, and clarify you cannot book directly'
        })
        break
      }
    }
  }

  // Check for identity leaks
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    if (pattern.test(response)) {
      issues.push({
        type: 'identity_leak',
        severity: 'error',
        message: 'Response reveals AI identity as Gemini/Google',
        suggestion: 'Respond as F.B/c AI, not Gemini or any other AI assistant'
      })
      break
    }
  }

  // Check for hallucinated actions
  for (const pattern of HALLUCINATED_ACTION_PATTERNS) {
    if (pattern.test(response)) {
      issues.push({
        type: 'hallucinated_action',
        severity: 'error',
        message: 'Response claims to have performed actions the AI cannot do',
        suggestion: 'Only claim actions that were actually performed via tools'
      })
      break
    }
  }

  // Check if direct question was answered (if provided)
  if (context.userQuestion && isDirectQuestion(context.userQuestion)) {
    if (!containsAnswer(response, context.userQuestion)) {
      issues.push({
        type: 'skipped_question',
        severity: 'warning',
        message: 'User\'s direct question may not have been answered first',
        suggestion: 'Answer the user\'s question directly before continuing with discovery'
      })
    }
  }

  // Determine if response should be blocked
  const hasCritical = issues.some(i => i.severity === 'critical')
  const shouldBlock = hasCritical

  // Log validation result
  if (issues.length > 0) {
    logger.warn('Agent response validation issues', {
      agent: context.agentName,
      stage: context.stage,
      issueCount: issues.length,
      hasCritical,
      issues: issues.map(i => ({ type: i.type, severity: i.severity }))
    })
  }

  return {
    isValid: issues.length === 0,
    issues,
    shouldBlock
  }
}

/**
 * Check if user message is a direct question
 */
function isDirectQuestion(message: string): boolean {
  const questionIndicators = [
    /\?$/,
    /^(?:what|who|where|when|why|how|is|are|can|could|would|do|does|did)\b/i,
    /\b(?:tell me|explain|clarify)\b/i,
  ]
  return questionIndicators.some(pattern => pattern.test(message.trim()))
}

/**
 * Check if response appears to address the question
 * Simple heuristic - could be enhanced with NLP
 */
function containsAnswer(response: string, question: string): boolean {
  // Extract key terms from question
  const keyTerms = question
    .toLowerCase()
    .replace(/[?.,!]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3 && !['what', 'where', 'when', 'how', 'does', 'your', 'this', 'that', 'have', 'with'].includes(word))

  // Check if at least some key terms appear in response
  const responseLower = response.toLowerCase()
  const matchedTerms = keyTerms.filter(term => responseLower.includes(term))

  return matchedTerms.length >= Math.min(2, keyTerms.length)
}

/**
 * Sanitize response by removing problematic content
 * Use sparingly - better to regenerate than patch
 */
export function sanitizeResponse(response: string): string {
  let sanitized = response

  // Remove identity leaks
  for (const pattern of IDENTITY_LEAK_PATTERNS) {
    sanitized = sanitized.replace(pattern, 'I')
  }

  return sanitized
}

/**
 * Generate validation report for logging/debugging
 */
export function generateValidationReport(result: ValidationResult, context: ValidationContext): string {
  if (result.isValid) {
    return `✅ Response validated: Agent=${context.agentName}, Stage=${context.stage}`
  }

  const issueList = result.issues
    .map(i => `  - [${i.severity.toUpperCase()}] ${i.type}: ${i.message}`)
    .join('\n')

  return `⚠️ Response validation failed: Agent=${context.agentName}, Stage=${context.stage}
Issues:
${issueList}
ShouldBlock: ${result.shouldBlock}`
}

/**
 * Quick validation check for critical issues only
 * Faster version for performance-sensitive paths
 */
export function quickValidate(response: string, toolsUsed: string[]): { hasCriticalIssue: boolean; issue?: string } {
  // Check fabricated ROI without tool
  if (!toolsUsed.includes('calculate_roi')) {
    for (const pattern of FABRICATED_ROI_PATTERNS) {
      if (pattern.test(response)) {
        return { hasCriticalIssue: true, issue: 'fabricated_roi' }
      }
    }
  }

  // Check false booking claims
  if (!toolsUsed.includes('create_calendar_widget') && !toolsUsed.includes('get_booking_link')) {
    for (const pattern of FALSE_BOOKING_PATTERNS) {
      if (pattern.test(response)) {
        return { hasCriticalIssue: true, issue: 'false_booking_claim' }
      }
    }
  }

  return { hasCriticalIssue: false }
}

