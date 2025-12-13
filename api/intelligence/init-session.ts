import type { VercelRequest, VercelResponse } from '@vercel/node'
import type { LocationData, ResearchResult } from '../../src/core/intelligence/lead-research.js'
import { LeadResearchService } from '../../src/core/intelligence/lead-research.js'
import { buildLeadProfile } from '../../src/core/intelligence/profile-builder.js'
import { contextStorage } from '../../src/core/context/context-storage.js'
import { logger } from '../../src/lib/logger.js'

type ConsentRecord = {
  allowResearch: boolean
  allowedDomains: string[]
  ts: number
  policyVersion?: string
  name?: string
  email?: string
  companyDomain?: string
}

type InitSessionBody = {
  sessionId: string
  email: string
  name?: string
  companyUrl?: string
  location?: LocationData
  forceFresh?: boolean
}

function setCors(res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function buildFallbackResearchResult(email: string, name?: string, companyUrl?: string): ResearchResult {
  const domain = email.split('@')[1] || 'unknown.com'
  const companyName = domain.split('.')[0] || 'Unknown'
  const personName = name || email.split('@')[0] || 'Unknown'
  return {
    company: {
      name: companyName,
      domain,
      website: companyUrl || `https://${domain}`,
      summary: 'Company information unavailable',
    },
    person: {
      fullName: personName,
      company: companyName,
    },
    role: 'Business Professional',
    confidence: 0,
    citations: [],
  }
}

function normalizeAllowedDomains(consent?: ConsentRecord): string[] {
  if (!consent?.allowResearch) return []
  const domains = Array.isArray(consent.allowedDomains) ? consent.allowedDomains.filter(Boolean) : []
  return Array.from(new Set(domains.map((d) => String(d).toLowerCase().trim()))).filter(Boolean)
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const body = req.body && typeof req.body === 'object' ? (req.body as Partial<InitSessionBody>) : {}
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined
  const companyUrl = typeof body.companyUrl === 'string' ? body.companyUrl.trim() : undefined
  const location = body.location && typeof body.location === 'object' ? (body.location as LocationData) : undefined
  const forceFresh = body.forceFresh !== false

  if (!sessionId) return res.status(400).json({ ok: false, error: 'sessionId is required' })
  if (!email || !isValidEmail(email)) return res.status(400).json({ ok: false, error: 'Valid email is required' })

  try {
    const stored = await contextStorage.get(sessionId)
    const existingIntel =
      stored?.intelligence_context && typeof stored.intelligence_context === 'object'
        ? (stored.intelligence_context as Record<string, unknown>)
        : {}
    const consent = (existingIntel as any)?.consent as ConsentRecord | undefined
    const allowedDomains = normalizeAllowedDomains(consent)

    const allowResearch = consent?.allowResearch === true

    const identityName = name || (existingIntel as any)?.name || email.split('@')[0] || 'Unknown'

    let research: ResearchResult | null = null
    let trustedIdentity = false
    let profile: any = undefined

    if (allowResearch) {
      const service = new LeadResearchService()
      const linkedInOverride =
        companyUrl && companyUrl.includes('linkedin.com') ? companyUrl : undefined

      research = await service.researchLead(email, identityName, companyUrl, sessionId, location, {
        forceFresh,
        ...(linkedInOverride ? { linkedInUrl: linkedInOverride } : {}),
        ...(allowedDomains.length > 0 ? { allowedDomains } : {}),
      })

      profile = buildLeadProfile(research, email, identityName)

      const citationsCount = Array.isArray(research.citations) ? research.citations.length : 0
      const emailDomain = (email.split('@')[1] || '').toLowerCase()
      const isCorporateEmail = Boolean(emailDomain) && !['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'].includes(emailDomain)

      trustedIdentity =
        isCorporateEmail &&
        profile?.identity?.verified === true &&
        typeof profile?.identity?.confidenceScore === 'number' &&
        profile.identity.confidenceScore >= 85 &&
        typeof research.confidence === 'number' &&
        research.confidence >= 0.75 &&
        citationsCount > 0
    }

    const researchForContext = research
      ? trustedIdentity
        ? research
        : buildFallbackResearchResult(email, identityName, companyUrl)
      : null

    const nextIntelligenceContext: Record<string, unknown> = {
      ...existingIntel,
      email,
      name: identityName,
      identityConfirmed: true,
      ...(location ? { location } : {}),
      ...(consent ? { consent } : {}),
      ...(profile ? { profile } : {}),
      ...(research ? { researchConfidence: research.confidence } : {}),
      ...(research && trustedIdentity
        ? {
            company: {
              domain: research.company.domain,
              ...(research.company.name ? { name: research.company.name } : {}),
              ...(research.company.industry ? { industry: research.company.industry } : {}),
              ...(research.company.size ? { size: research.company.size } : {}),
              ...(research.company.summary ? { summary: research.company.summary } : {}),
              ...(research.company.website ? { website: research.company.website } : {}),
              ...(research.company.linkedin ? { linkedin: research.company.linkedin } : {}),
            },
            ...(research.person?.fullName
              ? {
                  person: {
                    fullName: research.person.fullName,
                    ...(research.person.role ? { role: research.person.role } : {}),
                    ...(research.person.seniority ? { seniority: research.person.seniority } : {}),
                    ...(research.person.profileUrl ? { profileUrl: research.person.profileUrl } : {}),
                  },
                }
              : {}),
            ...(research.role ? { role: research.role } : {}),
            ...(typeof research.confidence === 'number' ? { roleConfidence: research.confidence } : {}),
          }
        : {}),
      research: {
        citations: trustedIdentity && research?.citations ? research.citations : [],
        allowedDomains,
        trustedIdentity,
      },
      lastUpdated: new Date().toISOString(),
      sessionId,
    }

    await contextStorage.updateWithVersionCheck(
      sessionId,
      {
        email,
        name: identityName,
        ...(companyUrl ? { company_url: companyUrl } : {}),
        ...(researchForContext
          ? {
              company_context: researchForContext.company as any,
              person_context: researchForContext.person as any,
              role: researchForContext.role,
              role_confidence: researchForContext.confidence,
            }
          : {}),
        intelligence_context: nextIntelligenceContext as any,
      },
      { attempts: 2, backoff: 50 }
    )

    logger.info('[API /intelligence/init-session] Completed', {
      sessionId,
      allowResearch,
      trustedIdentity,
      citations: research?.citations?.length || 0,
    })

    return res.status(200).json({
      ok: true,
      allowResearch,
      trustedIdentity,
      ...(researchForContext ? { research: researchForContext } : {}),
      intelligenceContext: nextIntelligenceContext,
    })
  } catch (error) {
    logger.error('[API /intelligence/init-session] Failed', error instanceof Error ? error : undefined, {
      sessionId,
      email,
    })
    return res.status(500).json({ ok: false, error: error instanceof Error ? error.message : 'Internal error' })
  }
}
