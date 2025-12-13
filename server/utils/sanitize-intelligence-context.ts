import type { IntelligenceContext } from '../../src/core/agents/types.js'

type AnyRecord = Record<string, unknown>

function asNonEmptyString(v: unknown): string | undefined {
  if (typeof v !== 'string') return undefined
  const trimmed = v.trim()
  return trimmed ? trimmed : undefined
}

function isPlainObject(v: unknown): v is AnyRecord {
  return !!v && typeof v === 'object' && !Array.isArray(v)
}

function coerceLocation(loc: unknown): IntelligenceContext['location'] | undefined {
  if (!isPlainObject(loc)) return undefined
  const latitude = loc.latitude
  const longitude = loc.longitude
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return undefined
  const city = asNonEmptyString(loc.city)
  const country = asNonEmptyString(loc.country)
  return {
    latitude,
    longitude,
    ...(city ? { city } : {}),
    ...(country ? { country } : {})
  }
}

function isIdentityVerified(ctx: AnyRecord): boolean {
  const profile = ctx.profile
  const profileVerified =
    isPlainObject(profile) &&
    isPlainObject(profile.identity) &&
    profile.identity.verified === true

  const researchConfidence = typeof ctx.researchConfidence === 'number' ? ctx.researchConfidence : 0

  // Require grounding to treat external research as verified.
  const citationsCount =
    isPlainObject(ctx.research) && Array.isArray((ctx.research as AnyRecord).citations)
      ? ((ctx.research as AnyRecord).citations as unknown[]).length
      : 0

  const hasGrounding = citationsCount > 0
  return profileVerified && researchConfidence >= 0.85 && hasGrounding
}

/**
 * Sanitizes intelligence context before it is fed into agent prompts.
 *
 * Goal: prevent unverified background research from being treated as fact
 * (e.g., wrong role/location/company) while still preserving fields used for
 * stage progression (budget/timeline/leadScore, etc.).
 */
export function sanitizeIntelligenceContextForAgents(
  input: IntelligenceContext | AnyRecord | undefined
): AnyRecord | undefined {
  if (!isPlainObject(input)) return undefined

  const email = asNonEmptyString(input.email)
  const name = asNonEmptyString(input.name)
  if (!email && !name) return undefined

  const userConfirmed = (input as AnyRecord).identityConfirmed === true
  const verified = isIdentityVerified(input)
  // IMPORTANT: even "research-verified" identity can be wrong. Only treat identity facts
  // (company name, role, person full name) as usable when the user explicitly confirmed them.
  const allowIdentityFields = userConfirmed
  const sanitized: AnyRecord = {}

  if (email) sanitized.email = email
  if (name) sanitized.name = name
  sanitized.identityConfirmed = userConfirmed

  // Preserve non-identity fields that affect routing and UX.
  const passthroughKeys: Array<keyof IntelligenceContext> = [
    'leadScore',
    'fitScore',
    'budget',
    'timeline',
    'interestLevel',
    'currentObjection',
    'calendarBooked',
    'pitchDelivered',
    'roleConfidence',
    'researchConfidence',
    'lastUpdated',
    'sessionId'
  ]
  for (const key of passthroughKeys) {
    if (key in input) sanitized[key as string] = input[key]
  }

  const location = coerceLocation(input.location)
  if (location) sanitized.location = location

  // Preserve citations metadata only when the user has confirmed identity (prevents "sources" from becoming authority).
  const researchIn = isPlainObject(input.research) ? (input.research as AnyRecord) : undefined
  if (userConfirmed && researchIn && Array.isArray(researchIn.citations)) {
    sanitized.research = { citations: (researchIn.citations as unknown[]).slice(0, 12) }
  }

  // Company: always keep domain (derived from email if needed). Strip identity-heavy fields unless user-confirmed.
  const companyIn = isPlainObject(input.company) ? (input.company as AnyRecord) : undefined
  const emailDomain = email?.split('@')[1]
  const companyDomain = asNonEmptyString(companyIn?.domain) || (emailDomain ? emailDomain.trim() : undefined)
  if (companyDomain) {
    const companyOut: AnyRecord = { domain: companyDomain }
    // Keep size/employeeCount even when unverified (stage progression).
    if (companyIn && 'size' in companyIn && companyIn.size !== undefined) {
      companyOut.size = companyIn.size
    }
    if (companyIn && 'employeeCount' in companyIn && typeof companyIn.employeeCount === 'number') {
      companyOut.employeeCount = companyIn.employeeCount
    }
    if (allowIdentityFields && companyIn) {
      const nameVal = asNonEmptyString(companyIn.name)
      const industryVal = asNonEmptyString(companyIn.industry)
      const summaryVal = asNonEmptyString(companyIn.summary)
      const websiteVal = asNonEmptyString(companyIn.website)
      const linkedinVal = asNonEmptyString(companyIn.linkedin)
      if (nameVal) companyOut.name = nameVal
      if (industryVal) companyOut.industry = industryVal
      if (summaryVal) companyOut.summary = summaryVal
      if (websiteVal) companyOut.website = websiteVal
      if (linkedinVal) companyOut.linkedin = linkedinVal
    }
    sanitized.company = companyOut
  }

  // Person: keep seniority even when unverified (stage progression). Strip role/fullName unless user-confirmed.
  const personIn = isPlainObject(input.person) ? (input.person as AnyRecord) : undefined
  if (personIn) {
    const personOut: AnyRecord = {}
    const seniorityVal = asNonEmptyString(personIn.seniority)
    if (seniorityVal) personOut.seniority = seniorityVal

    if (allowIdentityFields) {
      const fullNameVal = asNonEmptyString(personIn.fullName)
      const roleVal = asNonEmptyString(personIn.role)
      const profileUrlVal = asNonEmptyString(personIn.profileUrl)
      if (fullNameVal) personOut.fullName = fullNameVal
      if (roleVal) personOut.role = roleVal
      if (profileUrlVal) personOut.profileUrl = profileUrlVal
    }

    if (Object.keys(personOut).length > 0) {
      sanitized.person = personOut
    }
  }

  // Keep role only when identity is user-confirmed.
  if (allowIdentityFields) {
    const roleVal = asNonEmptyString(input.role)
    if (roleVal) sanitized.role = roleVal
  }

  // High-risk fields:
  // - Research-derived: only after user confirms identity AND research is grounded.
  // - Semantic memory facts: only after user confirms identity (prevents cross-session mixups).
  if (userConfirmed && verified) {
    if (isPlainObject(input.profile)) sanitized.profile = input.profile
    if (isPlainObject(input.strategicContext)) sanitized.strategicContext = input.strategicContext
  }
  if (userConfirmed && Array.isArray(input.facts)) {
    sanitized.facts = input.facts
  }

  return sanitized
}
