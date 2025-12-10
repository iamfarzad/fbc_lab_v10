import type { IntelligenceContext } from '../../src/core/agents/types.js'
import { logger } from '../../src/lib/logger.js'

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

/**
 * Validate intelligence context structure, freshness, and session match
 */
export function validateIntelligenceContext(
  context: IntelligenceContext | Record<string, unknown> | undefined,
  sessionId?: string
): ValidationResult {
  const errors: string[] = []

  // Validate structure
  if (!context || typeof context !== 'object') {
    errors.push('Context is not an object')
    return { valid: false, errors }
  }

  // Validate required fields (at least email or name should be present)
  const hasEmail = 'email' in context && typeof context.email === 'string' && context.email.trim().length > 0
  const hasName = 'name' in context && typeof context.name === 'string' && context.name.trim().length > 0

  if (!hasEmail && !hasName) {
    errors.push('Context must have at least email or name')
  }

  // Validate email format if present
  if (hasEmail && typeof context.email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(context.email)) {
      errors.push('Invalid email format')
    }
  }

  // Validate company structure if present
  if ('company' in context && context.company) {
    if (typeof context.company !== 'object' || context.company === null) {
      errors.push('Company must be an object')
    } else {
      const company = context.company as Record<string, unknown>
      if (!('domain' in company) || typeof company.domain !== 'string' || company.domain.trim().length === 0) {
        errors.push('Company must have a domain')
      }
    }
  }

  // Validate person structure if present
  if ('person' in context && context.person) {
    if (typeof context.person !== 'object' || context.person === null) {
      errors.push('Person must be an object')
    } else {
      const person = context.person as Record<string, unknown>
      if (!('fullName' in person) || typeof person.fullName !== 'string' || person.fullName.trim().length === 0) {
        errors.push('Person must have a fullName')
      }
    }
  }

  // Validate session match (if sessionId provided and context has sessionId)
  if (sessionId && 'sessionId' in context && context.sessionId) {
    if (typeof context.sessionId === 'string' && context.sessionId !== sessionId) {
      errors.push('Context sessionId does not match current session')
    }
  }

  // Validate freshness (if timestamp exists)
  if ('lastUpdated' in context && context.lastUpdated) {
    try {
      const lastUpdated = typeof context.lastUpdated === 'string' 
        ? new Date(context.lastUpdated).getTime()
        : typeof context.lastUpdated === 'number'
        ? context.lastUpdated
        : null

      if (lastUpdated) {
        const age = Date.now() - lastUpdated
        const STALE_THRESHOLD = 60 * 60 * 1000 // 1 hour
        if (age > STALE_THRESHOLD) {
          errors.push(`Context is stale (older than 1 hour, age: ${Math.round(age / 1000 / 60)} minutes)`)
        }
      }
    } catch (err) {
      logger.warn('Failed to parse lastUpdated timestamp', { error: err })
      // Don't add error for parsing failure - timestamp validation is optional
    }
  }

  // Validate research confidence if present
  if ('researchConfidence' in context && context.researchConfidence !== undefined) {
    const confidence = typeof context.researchConfidence === 'number' ? context.researchConfidence : null
    if (confidence !== null && (confidence < 0 || confidence > 1)) {
      errors.push('Research confidence must be between 0 and 1')
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
