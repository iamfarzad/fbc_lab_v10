import type { IntelligenceContext } from '../../src/core/agents/types.js'
import { ContextStorage } from '../../src/core/context/context-storage.js'
import { logger } from '../../src/lib/logger.js'

/**
 * Load intelligence context from database for a given session
 * Extracts intelligence context from stored conversation context
 */
export async function loadIntelligenceContextFromDB(
  sessionId: string
): Promise<IntelligenceContext | null> {
  if (!sessionId || sessionId === 'anonymous') {
    return null
  }

  try {
    const storage = new ContextStorage()
    const stored = await storage.get(sessionId)
    
    if (!stored) {
      return null
    }

    // Extract intelligence context from stored context
    // The stored context may have intelligence_context as a JSON field
    // or the data may be at the root level (email, name, company_context, etc.)
    const intelligenceContext: Partial<IntelligenceContext> = {}

    // Extract basic fields
    if (stored.email && typeof stored.email === 'string') {
      intelligenceContext.email = stored.email
    }
    if (stored.name && typeof stored.name === 'string') {
      intelligenceContext.name = stored.name
    }
    if (stored.role && typeof stored.role === 'string') {
      intelligenceContext.role = stored.role
    }

    // Extract company context
    if (stored.company_context && typeof stored.company_context === 'object') {
      const companyCtx = stored.company_context as Record<string, unknown>
      const companyObj: NonNullable<IntelligenceContext['company']> = {
        domain: typeof companyCtx.domain === 'string' ? companyCtx.domain : ''
      }
      if (typeof companyCtx.name === 'string') {
        companyObj.name = companyCtx.name
      }
      if (typeof companyCtx.industry === 'string') {
        companyObj.industry = companyCtx.industry
      }
      if (typeof companyCtx.size === 'string' && companyCtx.size) {
        // Use Object.assign to satisfy exactOptionalPropertyTypes
        Object.assign(companyObj, {
          size: companyCtx.size as NonNullable<IntelligenceContext['company']>['size']
        })
      }
      if (typeof companyCtx.summary === 'string') {
        companyObj.summary = companyCtx.summary
      }
      if (typeof companyCtx.website === 'string') {
        companyObj.website = companyCtx.website
      }
      if (typeof companyCtx.linkedin === 'string') {
        companyObj.linkedin = companyCtx.linkedin
      }
      intelligenceContext.company = companyObj
    }

    // Extract person/profile context from person_context field
    if (stored.person_context && typeof stored.person_context === 'object') {
      const profile = stored.person_context as Record<string, unknown>
      const personObj: NonNullable<IntelligenceContext['person']> = {
        fullName: typeof profile.fullName === 'string' ? profile.fullName : intelligenceContext.name || ''
      }
      if (typeof profile.role === 'string') {
        personObj.role = profile.role
      }
      if (typeof profile.seniority === 'string' && profile.seniority) {
        // Use Object.assign to satisfy exactOptionalPropertyTypes
        Object.assign(personObj, {
          seniority: profile.seniority as NonNullable<IntelligenceContext['person']>['seniority']
        })
      }
      if (typeof profile.profileUrl === 'string') {
        personObj.profileUrl = profile.profileUrl
      }
      intelligenceContext.person = personObj
    }

    // Extract research confidence from role_confidence field
    if (typeof stored.role_confidence === 'number') {
      intelligenceContext.researchConfidence = stored.role_confidence
    }

    // Extract intelligence_context JSON field if it exists
    if (stored.intelligence_context && typeof stored.intelligence_context === 'object') {
      const intelCtx = stored.intelligence_context as Record<string, unknown>
      // Merge with extracted fields (intelligence_context takes precedence)
      Object.assign(intelligenceContext, intelCtx)
    }

    // Validate that we have at least email or name
    if (!intelligenceContext.email && !intelligenceContext.name) {
      logger.debug('No valid intelligence context found in stored data', { sessionId })
      return null
    }

    return intelligenceContext as IntelligenceContext
  } catch (error) {
    logger.warn('Failed to load intelligence context from database', {
      sessionId,
      error: error instanceof Error ? error.message : String(error)
    })
    return null
  }
}
