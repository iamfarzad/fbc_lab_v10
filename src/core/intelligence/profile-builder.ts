import type { ResearchResult } from './lead-research.js'
import type { LeadProfile } from './types.js'
import { logger } from '../../lib/logger.js'

/**
 * Build LeadProfile from ResearchResult
 * 
 * Transforms research data into structured profile with:
 * - Identity verification (email domain matches LinkedIn company)
 * - Digital footprint detection (GitHub, publications, speaking)
 * - Context hooks generation (natural icebreakers)
 */
export function buildLeadProfile(
  research: ResearchResult,
  email: string,
  name?: string
): LeadProfile {
  const emailDomain = email.split('@')[1] || ''
  const personName = research.person?.fullName || name || 'Unknown'
  const companyName = research.company?.name || 'Unknown Company'
  const currentRole = research.person?.role || research.role || 'Unknown Role'
  const industry = research.company?.industry || 'Unknown Industry'

  // === IDENTITY VERIFICATION ===
  // Check if email domain matches LinkedIn company
  let verified = false
  let confidenceScore = research.confidence * 100 // Start with research confidence

  if (research.person?.profileUrl) {
    // LinkedIn profile exists - verify company match
    const linkedInCompany = research.person?.company || research.company?.name || ''
    const companyDomain = research.company?.domain || emailDomain
    
    // Check if LinkedIn company matches email domain
    // Normalize: "Acme Corp" vs "acme.com" - check if domain contains company name or vice versa
    const normalizedLinkedInCompany = linkedInCompany.toLowerCase().replace(/\s+/g, '')
    const normalizedDomain = companyDomain.toLowerCase().replace(/\.(com|org|net|io|co|ai)$/, '')
    
    // Match if:
    // 1. Domain name is in company name (e.g., "acme" in "Acme Corp")
    // 2. Company name is in domain (e.g., "acme" in "acme.com")
    // 3. Company website domain matches email domain
    if (
      normalizedLinkedInCompany.includes(normalizedDomain) ||
      normalizedDomain.includes(normalizedLinkedInCompany) ||
      (research.company?.website && research.company.website.includes(companyDomain))
    ) {
      verified = true
      confidenceScore = Math.min(100, confidenceScore + 20) // Bonus for verification
    }
  }

  // If we have high research confidence and profile URL, boost score
  if (research.person?.profileUrl && research.confidence > 0.7) {
    confidenceScore = Math.min(100, confidenceScore + 10)
  }

  // === DIGITAL FOOTPRINT DETECTION ===
  const citations = research.citations || []
  const strategic = research.strategic

  // Check for GitHub
  const hasGitHub = citations.some(c => 
    c.uri?.toLowerCase().includes('github.com') ||
    c.title?.toLowerCase().includes('github') ||
    c.description?.toLowerCase().includes('github')
  )

  // Check for publications (scholar, researchgate, arxiv, etc.)
  const hasPublications = citations.some(c => {
    const uri = c.uri?.toLowerCase() || ''
    return (
      uri.includes('scholar.google') ||
      uri.includes('researchgate') ||
      uri.includes('arxiv.org') ||
      uri.includes('pubmed') ||
      uri.includes('ieee') ||
      uri.includes('acm.org')
    )
  }) || (strategic?.latest_news?.some(news => 
    news.toLowerCase().includes('published') ||
    news.toLowerCase().includes('research') ||
    news.toLowerCase().includes('paper')
  ) || false)

  // Check for recent speaking (conferences, talks, keynotes)
  const recentSpeaking = citations.some(c => {
    const text = `${c.title || ''} ${c.description || ''}`.toLowerCase()
    return (
      text.includes('speaker') ||
      text.includes('keynote') ||
      text.includes('conference') ||
      text.includes('talk') ||
      text.includes('presentation')
    )
  }) || (strategic?.latest_news?.some(news => 
    news.toLowerCase().includes('speaking') ||
    news.toLowerCase().includes('keynote') ||
    news.toLowerCase().includes('conference')
  ) || false)

  // === YEARS EXPERIENCE (INFERRED) ===
  // This is a rough estimate - in a real implementation, you'd parse LinkedIn experience dates
  // For now, infer from seniority level
  let yearsExperience: number | undefined
  const seniority = research.person?.seniority?.toLowerCase() || ''
  if (seniority.includes('c-level') || seniority.includes('vp') || seniority.includes('vice president')) {
    yearsExperience = 15
  } else if (seniority.includes('director')) {
    yearsExperience = 10
  } else if (seniority.includes('manager') || seniority.includes('lead')) {
    yearsExperience = 7
  } else if (seniority.includes('senior')) {
    yearsExperience = 5
  }

  // === CONTEXT HOOKS GENERATION ===
  const contexthooks: string[] = []

  // From recent company news
  if (strategic?.latest_news && strategic.latest_news.length > 0) {
    const latestNews = strategic.latest_news[0]
    if (latestNews && latestNews.length > 0) {
      contexthooks.push(`Noticed ${companyName} recently ${latestNews.toLowerCase()}`)
    }
  }

  // From professional background
  if (currentRole && currentRole !== 'Unknown Role') {
    if (industry && industry !== 'Unknown Industry') {
      contexthooks.push(`Given your background as ${currentRole} in ${industry}`)
    } else {
      contexthooks.push(`Given your role as ${currentRole}`)
    }
  }

  // From industry trends
  if (strategic?.market_trends && strategic.market_trends.length > 0) {
    const trend = strategic.market_trends[0]
    if (trend) {
      contexthooks.push(`Seeing how ${industry} is moving toward ${trend.toLowerCase()}`)
    }
  }

  // Fallback if no hooks generated
  if (contexthooks.length === 0 && companyName && companyName !== 'Unknown Company') {
    contexthooks.push(`With ${companyName} being in ${industry}`)
  }

  const profile: LeadProfile = {
    identity: {
      name: personName,
      verified,
      confidenceScore: Math.round(confidenceScore)
    },
    professional: {
      currentRole,
      company: companyName,
      industry,
      ...(yearsExperience !== undefined && { yearsExperience })
    },
    digitalFootprint: {
      hasGitHub,
      hasPublications,
      recentSpeaking
    },
    contexthooks: contexthooks.slice(0, 3) // Limit to 3 hooks
  }

  logger.debug('✅ [Profile Builder] Built LeadProfile', {
    name: personName,
    verified,
    confidenceScore: profile.identity.confidenceScore,
    hasGitHub,
    hasPublications,
    hooksCount: contexthooks.length
  })

  return profile
}
