import { generateObject, google } from '../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { createCachedFunction, CACHE_TTL } from '../../lib/ai-cache.js'
import { z } from 'zod'
import { logger } from '../../lib/logger.js'
import { analyzeUrl } from './url-context-tool.js'

export interface CompanyContext {
  name: string
  domain: string
  industry?: string
  size?: string
  summary?: string
  website?: string
  linkedin?: string
  country?: string
}

export interface PersonContext {
  fullName: string
  role?: string
  seniority?: string
  profileUrl?: string
  company?: string
}

export interface StrategicContext {
  latest_news: string[]
  competitors: string[]
  pain_points: string[]
  market_trends?: string[]
}

export interface ResearchResult {
  company: CompanyContext
  person: PersonContext
  strategic?: StrategicContext
  role: string
  confidence: number
  citations?: Array<{
    uri: string
    title?: string
    description?: string
  }>
  groundingMetadata?: any
}

// Zod schema for ResearchResult (used with generateObject)
const ResearchResultSchema = z.object({
  company: z.object({
    name: z.string(),
    domain: z.string(),
    industry: z.string().optional(),
    size: z.string().optional(),
    summary: z.string().optional(),
    website: z.string().optional(),
    linkedin: z.string().optional(),
    country: z.string().optional(),
  }),
  person: z.object({
    fullName: z.string(),
    role: z.string().optional(),
    seniority: z.string().optional(),
    profileUrl: z.string().optional(),
    company: z.string().optional(),
  }),
  strategic: z.object({
    latest_news: z.array(z.string()).optional(),
    competitors: z.array(z.string()).optional(),
    pain_points: z.array(z.string()).optional(),
    market_trends: z.array(z.string()).optional(),
  }).optional(),
  role: z.string(),
  confidence: z.number().min(0).max(1),
})

export interface LocationData {
  latitude: number
  longitude: number
  city?: string
  country?: string
}

export class LeadResearchService {
  private static readonly RESEARCH_TEMPERATURE = 0.4

  // Cached research function
  private cachedResearch: (
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string,
    location?: LocationData,
    options?: { contents?: any[]; linkedInUrl?: string; forceFresh?: boolean }
  ) => Promise<ResearchResult>

  /**
   * Build region-aware queries to probe location, registry, and LinkedIn anchors.
   * Implements the "Probe then Drill" geolocation loop.
   */
  private buildStrategicQueries(name: string, company: string, email: string): string[] {
    const tld = email.split('.').pop()?.toLowerCase()

    let regionContext = ''
    let registryTerm = 'business registry'

    if (tld === 'ae') {
      regionContext = 'Dubai UAE'
      registryTerm = 'DIFC OR DED license'
    } else if (tld === 'no') {
      regionContext = 'Norway Oslo'
      registryTerm = 'brreg proff.no'
    } else if (tld === 'uk') {
      regionContext = 'London UK'
      registryTerm = 'Companies House'
    }

    return [
      `"${name}" "${company}" site:linkedin.com`,
      regionContext
        ? `"${company}" ${regionContext} ${registryTerm}`
        : `"${company}" headquarters location`,
      `"${company}" ${name} AI technology consulting services`
    ]
  }

  /**
   * Post-process model confidence with basic grounding + identity checks.
   * This prevents high-confidence hallucinations when search results are thin or mismatched.
   */
  private adjustConfidence(params: {
    rawConfidence: number
    citationsCount: number
    emailDomain: string
    parsedCompanyDomain?: string
    parsedPersonName?: string
    parsedPersonCompany?: string
    providedName?: string
    inferredFirstName?: string
    inferredLastName?: string
  }): number {
    const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
    let confidence = clamp01(params.rawConfidence ?? 0)

    // No grounding → treat as mostly unverified.
    if (params.citationsCount === 0) {
      confidence *= 0.25
    }

    const stripTld = (d: string) =>
      d
        .toLowerCase()
        .replace(/^www\./, '')
        .replace(/\.(com|org|net|io|co|ai|app|dev|agency|media)$/i, '')

    const emailRoot = stripTld(params.emailDomain || '')
    const parsedRoot = stripTld(params.parsedCompanyDomain || '')

    if (!parsedRoot || !emailRoot || !(emailRoot.includes(parsedRoot) || parsedRoot.includes(emailRoot))) {
      confidence *= 0.4
    }

    const candidateName =
      params.providedName ||
      [params.inferredFirstName, params.inferredLastName].filter(Boolean).join(' ')

    if (candidateName && params.parsedPersonName) {
      const wantedTokens = candidateName
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)
      const parsedTokens = params.parsedPersonName
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean)

      if (wantedTokens.length > 0 && parsedTokens.length > 0) {
        const matches = wantedTokens.every(token =>
          parsedTokens.some(p => p.startsWith(token) || token.startsWith(p))
        )
        if (!matches) {
          confidence *= 0.35
        }
      }
    }

    if (params.parsedPersonCompany) {
      const personCompanyRoot = stripTld(params.parsedPersonCompany.replace(/\s+/g, ''))
      if (personCompanyRoot && emailRoot && !(personCompanyRoot.includes(emailRoot) || emailRoot.includes(personCompanyRoot))) {
        confidence *= 0.6
      }
    }

    // Round to 2 decimals for stable UX/logging.
    return Math.round(clamp01(confidence) * 100) / 100
  }

  constructor() {
    // Wrap the internal method with caching (24 hour TTL)
    // This handles server-side/memory caching via the stub or future implementation
    this.cachedResearch = createCachedFunction(
      this.researchLeadInternal.bind(this),
      {
        ttl: CACHE_TTL.VERY_LONG, // 24 hours
        keyPrefix: 'lead-research:',
        keyGenerator: (
          email: string,
          name: string | undefined,
          companyUrl: string | undefined,
          _sessionId: string | undefined,
          location: LocationData | undefined,
          options?: { contents?: any[] }
        ) =>
          `${email}|${name || ''}|${companyUrl || ''}|${location?.city || ''}|${options?.contents ? 'has-contents' : 'no-contents'}|temp-${LeadResearchService.RESEARCH_TEMPERATURE}`
      }
    )
  }

  async researchLead(
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string,
    location?: LocationData,
    options?: { contents?: any[]; linkedInUrl?: string; forceFresh?: boolean }
  ): Promise<ResearchResult> {
    // Client-side Caching (localStorage)
    // This preserves the behavior from the old service for browser environments
    const cacheKey = `lead_research_${email}_${name || ''}_${location?.city || ''}`
    
    let clientCacheHit = false
    if (!options?.forceFresh && typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            logger.debug('[LeadResearch] Client cache hit', { email })
            try {
                const parsed = JSON.parse(cached) as ResearchResult
                logger.debug('[LeadResearch] researchLead completed (client cache)', { 
                  email, 
                  cacheHit: true,
                  citations: parsed.citations?.length || 0
                })
                return parsed
            } catch (e) {
                console.warn('Failed to parse cached research, re-fetching', e)
                localStorage.removeItem(cacheKey)
            }
        }
    }

    // Execute research (using server-side cache wrapper)
    let result: ResearchResult
    let serverCacheHit = false
    const startTime = Date.now()
    try {
      if (options?.forceFresh) {
        logger.debug('[LeadResearch] Force fresh research, bypassing cache', { email, sessionId })
        result = await this.researchLeadInternal(email, name, companyUrl, sessionId, location, options)
      } else {
        result = await this.cachedResearch(email, name, companyUrl, sessionId, location, options)
      }
      // If result came back very quickly (< 100ms), likely from server cache
      // This is a heuristic since we can't directly detect cache hits from the wrapper
      const duration = Date.now() - startTime
      serverCacheHit = duration < 100
    } catch {
      // If cache layer fails, fall back to direct call
      logger.debug('[LeadResearch] Cache wrapper failed, using direct call', { email })
      result = await this.researchLeadInternal(email, name, companyUrl, sessionId, location, options)
    }

    // Update client-side cache
    if (typeof window !== 'undefined' && result) {
      try {
          localStorage.setItem(cacheKey, JSON.stringify(result))
      } catch (err) {
          console.warn('Failed to cache research result locally:', err)
      }
    }

    logger.debug('[LeadResearch] researchLead completed', { 
      email, 
      clientCacheHit,
      serverCacheHit,
      citations: result.citations?.length || 0
    })
    return result
  }

  private async researchLeadInternal(
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string,
    location?: LocationData,
    options?: { contents?: any[]; linkedInUrl?: string; forceFresh?: boolean }
  ): Promise<ResearchResult> {
    void sessionId

    try {
      logger.debug('🔍 [Lead Research] Starting', { email, hasLocation: Boolean(location) })

      const domain = email.split('@')[1] || 'unknown.com'
      const emailPrefix = email.split('@')[0] || ''
      
      // Extract company name from domain (e.g., "salukimedia.com" -> "Saluki Media")
      // This helps with better matching
      const domainParts = domain.split('.')
      const companyNameFromDomain = domainParts[0] 
        ? domainParts[0].charAt(0).toUpperCase() + domainParts[0].slice(1).replace(/([A-Z])/g, ' $1').trim()
        : ''
      
      // Extract name parts for better matching
      let firstName = ''
      let lastName = ''
      if (name) {
        const nameParts = name.trim().split(/\s+/)
        firstName = nameParts[0] || ''
        lastName = nameParts.slice(1).join(' ') || ''
      }
      
      // Try to extract name from email if name not provided
      // Common patterns: first.last, firstlast, f.last, first_l, etc.
      let inferredFirstName = ''
      let inferredLastName = ''
      if (!name && emailPrefix) {
        // Try common patterns
        if (emailPrefix.includes('.')) {
          const parts = emailPrefix.split('.')
          inferredFirstName = parts[0] || ''
          inferredLastName = parts.slice(1).join(' ') || ''
        } else if (emailPrefix.includes('_')) {
          const parts = emailPrefix.split('_')
          inferredFirstName = parts[0] || ''
          inferredLastName = parts.slice(1).join(' ') || ''
        } else {
          // Single word - could be first name or username
          inferredFirstName = emailPrefix
        }
      }
      
      // Build name matching strategy
      const nameVariations: string[] = []
      if (name) {
        nameVariations.push(name)
        if (firstName && lastName) {
          nameVariations.push(`${firstName} ${lastName}`)
          nameVariations.push(`${firstName} ${lastName.charAt(0)}.`)
          nameVariations.push(`${firstName.charAt(0)}. ${lastName}`)
        }
      }
      if (inferredFirstName) {
        nameVariations.push(inferredFirstName)
        if (inferredLastName) {
          nameVariations.push(`${inferredFirstName} ${inferredLastName}`)
        }
      }
      
      const linkedInUrl = options?.linkedInUrl || (companyUrl?.includes('linkedin.com') ? companyUrl : undefined)
      const strategicQueries = this.buildStrategicQueries(
        name || emailPrefix,
        companyNameFromDomain || domain,
        email
      )

      // Build location context for prompt
      const locationContext = location 
        ? `User Location: ${location.city || 'Unknown city'}, ${location.country || 'Unknown country'} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
        : ''

      // Use generateObject with Google Grounding Search
      // Build context block first (end-anchored structure)
      const contextBlock = `Research the following individual and company using Google Search with maximum depth.

Target:
Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company URL: ${companyUrl || 'Use email domain to find company website'}
${linkedInUrl ? `LinkedIn URL: ${linkedInUrl} (USE THIS AS PRIMARY PROFILE - verify current role/dates)` : ''}
${locationContext ? `${locationContext}` : ''}

STRATEGIC QUERIES (Probe then Drill):
- Q1 (LinkedIn Anchor): ${strategicQueries[0]}
- Q2 (Registry / HQ): ${strategicQueries[1]}
- Q3 (Context Clue): ${strategicQueries[2]}

CRITICAL RESEARCH TASKS:
1) LinkedIn Profile Discovery (SMART MATCHING):
   ${nameVariations.length > 0 ? `- Name variations to search: ${nameVariations.join(', ')}` : `- Primary search: "${name || emailPrefix}"`}
   - MATCHING STRATEGY: Match name with email domain for verification
   - Search patterns (try ALL):
     * "${name || emailPrefix} ${domain.split('.')[0]} LinkedIn" (name + company)
     * "${name || emailPrefix} site:linkedin.com/in" (LinkedIn site search)
     * "email:${email} LinkedIn" (if email format known)
     * "${firstName || emailPrefix} ${domain} LinkedIn" (first name + company domain)
   - VERIFICATION: When multiple profiles found, prioritize:
     1. Profile where CURRENT (not past) company matches domain "${domain}" or company name "${companyNameFromDomain}"
     2. Profile where email domain "${domain}" matches the profile's CURRENT company domain
     3. Profile where email prefix "${emailPrefix}" matches name pattern (e.g., first.last, firstlast)
     4. Profile with most matching details (name, location, role)
     5. Profile with highest activity/connections (more likely to be current)
   - CRITICAL: Check employment dates on LinkedIn profile
     * Look for "Present" or recent end dates (within last 2 years) for current positions
     * IGNORE positions that ended more than 2 years ago unless explicitly marked as current
     * If profile shows "${companyNameFromDomain || domain}" in "Experience" section, check the date range
     * Only use company/role if it's marked as CURRENT or has end date in 2024-2025
     * If profile shows old positions (e.g., ended in 2016, 2017, etc.), those are PAST companies, not current
   - Extract: CURRENT role (not past), company, seniority level, experience, education, skills
   - Look for: mutual connections, recommendations, posts, articles, certifications
   - CRITICAL: Verify it's the right person by cross-referencing email domain with profile's CURRENT company
   - CRITICAL: If LinkedIn shows "${companyNameFromDomain || domain}" but with end date before 2023, that's a PAST company - do NOT use it as current

2) Company Deep Dive${companyUrl ? ` (URL provided: ${companyUrl})` : ` (find website from domain ${domain})`}:
   ${companyUrl ? `- CRITICAL: The company URL ${companyUrl} is provided - analyze it deeply using URL context
   - Extract from the live website: company mission, services, team size, recent news, careers page
   - TEAM PAGE SEARCH: Check these pages for person's profile:
     * ${companyUrl}/about, ${companyUrl}/team, ${companyUrl}/people, ${companyUrl}/leadership
     * ${companyUrl}/about-us, ${companyUrl}/our-team, ${companyUrl}/staff
   - Look for: leadership team bios, company culture, values, recent blog posts, press releases
   - Analyze: tech stack hints, tools they use, hiring patterns, job postings
   - EMAIL PATTERN: Check contact pages for email format (first.last@domain, firstlast@domain, etc.)
   - Note: Use the actual website content, not just search results` : `- Find company website from domain ${domain}
   - Once found, analyze the website using URL context
   - TEAM PAGE SEARCH: Check /about, /team, /people, /leadership pages for person's profile
   - Extract: company mission, services, team size, recent news, careers page`}
   - Search for: company LinkedIn page, Crunchbase, industry reports
   - Find: recent funding, acquisitions, partnerships, press releases
   - Identify: tech stack, tools they use, hiring patterns

3) Location-Based Intelligence${location ? ` (User is in ${location.city || 'Unknown'}, ${location.country || 'Unknown'})` : ''}:
   ${location ? `- Search for local business presence in ${location.city}, ${location.country}
   - Find: local offices, regional operations, local market position
   - Identify: local competitors, market trends in ${location.city}
   - Check: local news, events, partnerships in the area
   - Note: Timezone, business hours, cultural context for ${location.country}` : '- General geographic context based on domain/company data'}

4) Strategic Analysis:
   - Recent news/events about the company (last 12 months)
   - Key competitors in their industry and region
   - Industry trends affecting their business
   - Pain points likely based on: role, company size, industry, location
   - Growth signals: hiring, expansion, new products/services
   - Risk factors: market challenges, competitive pressure

5) Person Profile Enhancement (MULTI-PLATFORM RESEARCH):
   - Professional background and career trajectory
   - Areas of expertise and specialization
   - Public speaking, publications, thought leadership
   - Social media presence (professional platforms)
   - Current projects or initiatives they're involved in
   
6) Additional Research Channels (SMART SEARCHES):
   ${firstName || emailPrefix ? `- GitHub: Search "${firstName || emailPrefix} ${domain.split('.')[0]} github" or "${emailPrefix} github"
   - Twitter/X: Search "${name || emailPrefix} ${domain.split('.')[0]} twitter" or site:twitter.com "${name || emailPrefix}"
   - Company Team Page: If company website found, check "About Us" or "Team" page for their profile
   - Email Pattern Analysis: If company website found, check contact pages for email format pattern (first.last@domain, etc.)
   - Professional Publications: Search "${name || emailPrefix}" + "author" + "${domain.split('.')[0]}" on Google Scholar, ResearchGate
   - Conference Speaking: Search "${name || emailPrefix}" + "speaker" + "${domain.split('.')[0]}" or conference talks
   - Patents/Research: Search "${name || emailPrefix}" + "patent" or "${name || emailPrefix}" + "research paper"
   - Industry Forums: Search "${name || emailPrefix}" + "${domain.split('.')[0]}" on Stack Overflow, Reddit (professional subs)
   - Company Directory: If company has public directory, search for name variations there` : `- GitHub: Search email prefix or name variations
   - Twitter/X: Search name + company
   - Company Team Page: Check company website for team profiles
   - Professional Publications: Search name + company for research papers, articles`}
   
7) Cross-Reference & Verification:
   - Verify LinkedIn profile matches email domain company
   - Cross-check name variations across all platforms
   - Confirm role consistency across LinkedIn, company site, and other sources
   - Build confidence score based on number of matching sources
   - If conflicts found, note them but provide best assessment`

      const instructionBlock = `INSTRUCTIONS:
- Use Google Search AGGRESSIVELY - perform multiple searches to build comprehensive profile
- For LinkedIn: Use ALL name variations (${nameVariations.length > 0 ? nameVariations.join(', ') : name || emailPrefix}) and match with email domain for verification
  * Try: "name + ${companyNameFromDomain || domain.split('.')[0]} + LinkedIn", "name + ${domain} + LinkedIn", "site:linkedin.com/in name ${companyNameFromDomain || domain.split('.')[0]}"
  * CRITICAL: Verify profile matches email domain "${domain}" - if profile shows different company, it's likely wrong
  * CRITICAL: Check employment dates - only use CURRENT positions (marked "Present" or ended in 2024-2025)
  * CRITICAL: IGNORE past positions - if "${companyNameFromDomain || domain}" appears with end date before 2023, it's a PAST company, not current
  * If LinkedIn URL is provided (${linkedInUrl || 'none'}), treat it as primary and extract current role/company from it
  * If multiple profiles found, prioritize:
    1. Profile where CURRENT company (not past) matches "${domain}" or "${companyNameFromDomain}"
    2. Profile where email prefix "${emailPrefix}" matches name pattern
    3. Profile with most matching details
    4. Profile with most recent activity/updates (indicates current status)
- LOCATION-FIRST SYNTHESIS:
  1) Identify location from snippets: city/country (e.g., Dubai, Oslo, NY)
  2) Resolve ambiguity: if company name is generic, match by location + role
  3) Extract specific industry (e.g., "Media Production" vs "Event Planning")
- For company URL: Deeply analyze the website content (URL analysis provided below if available)
  * Check "Team" or "About Us" pages for person's profile
  * Look for email format patterns (first.last@domain, etc.) to verify identity
  * Cross-reference with search results
- For location: Search "company name + location" and "industry + location trends" - find local market context
- Multi-platform research: Search GitHub, Twitter, publications, conferences, patents
  * Use name variations: ${nameVariations.length > 0 ? nameVariations.join(', ') : name || emailPrefix}
  * Cross-reference findings across platforms for verification
- Cross-reference multiple sources to verify information (LinkedIn + company site + news + location + other platforms)
- SMART MATCHING: Always verify person identity by matching:
  1. Name variations with email domain company
  2. Email prefix patterns with name
  3. Company domain with profile's CURRENT company (check employment dates!)
  4. Location consistency across sources
- EMPLOYMENT DATE VERIFICATION (CRITICAL):
  * When extracting company/role from LinkedIn, ALWAYS check the employment date range
  * Only use positions marked as "Present" or with end dates in 2024-2025
  * If a company appears with end date before 2023, it's a PAST position - do NOT use as current company
  * If profile shows "${companyNameFromDomain || domain}" ended in 2016, 2017, etc., that's historical data, not current
  * Look for the most recent position in the Experience section
  * If unsure about dates, prioritize profiles with recent activity (posts, updates in last 6 months)
- If information conflicts, note uncertainty but provide best assessment
- If LinkedIn shows old employment (ended years ago), search for more recent information or note that current company is unknown
- Build the STRONGEST possible profile - don't settle for surface-level data
- Return structured data matching the schema exactly with maximum detail
- Include profileUrl (LinkedIn URL) if found - this is critical for verification`

      // Analyze company URL first if provided (parallel with search)
      let urlAnalysis: Awaited<ReturnType<typeof analyzeUrl>> | null = null
      if (companyUrl) {
        try {
          logger.debug('🔍 [Lead Research] Analyzing company URL', { url: companyUrl })
          urlAnalysis = await analyzeUrl(companyUrl)
          logger.debug('✅ [Lead Research] URL analysis complete', { 
            summary: urlAnalysis.pageSummary.substring(0, 100),
            initiatives: urlAnalysis.keyInitiatives.length 
          })
        } catch (err) {
          logger.warn('⚠️ [Lead Research] URL analysis failed', { 
            url: companyUrl, 
            error: err instanceof Error ? err.message : String(err) 
          })
          // Continue without URL analysis
        }
      }

      // Enhance prompt with URL analysis if available
      const synthesisPrompt = `
You are analyzing search results for a potential lead.

INPUTS:
Name: ${name || emailPrefix}
Company: ${companyNameFromDomain || domain}

TASK:
1. Identify Location First: Look for city/country in snippets (Dubai, Oslo, NY, etc.).
2. Resolve Ambiguity:
   - If company name is generic (e.g., "Eve"), use location + role context to disambiguate.
   - If multiple matches, prefer the one aligning with LinkedIn anchor and registry/location signals.
3. Extract Industry: Be specific (e.g., "Media Production" vs "Event Planning").

OUTPUT JSON:
{
  "location": "City, Country",
  "industry": "Specific Industry",
  "confidence": 0-100
}`

      let enhancedPrompt = `${contextBlock}

${instructionBlock}

LOCATION/INDUSTRY SYNTHESIS:
${synthesisPrompt}`
      
      if (urlAnalysis) {
        enhancedPrompt += `\n\nCOMPANY WEBSITE ANALYSIS (from ${companyUrl}):
- Summary: ${urlAnalysis.pageSummary}
- Key Initiatives: ${urlAnalysis.keyInitiatives.join(', ')}
${urlAnalysis.techStackHints && urlAnalysis.techStackHints.length > 0 ? `- Tech Stack Hints: ${urlAnalysis.techStackHints.join(', ')}` : ''}
${urlAnalysis.hiringSignals && urlAnalysis.hiringSignals.length > 0 ? `- Hiring Signals: ${urlAnalysis.hiringSignals.join(', ')}` : ''}
${urlAnalysis.painPointsMentioned && urlAnalysis.painPointsMentioned.length > 0 ? `- Pain Points Mentioned: ${urlAnalysis.painPointsMentioned.join(', ')}` : ''}

Use this website analysis to enhance the company profile. Cross-reference with Google Search results.`
      }

      try {
        // Use Gemini 3 Pro for complex research with thinking_level high
        // Check if multimodal content is provided in options
        const hasMultimodal = options?.contents && options.contents.length > 0
        const modelSettings: any = {
          thinking_level: 'high',
          ...(hasMultimodal && { media_resolution: 'media_resolution_medium' })
        }
        const generateObjectParams: Parameters<typeof generateObject>[0] = {
          model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
          messages: [
            {
              role: 'system',
              content: 'You are an elite B2B researcher. Use Google Search aggressively and cite sources when available. Build the strongest possible profile by cross-referencing multiple sources.'
            },
            ...(options?.contents && options.contents.length > 0
              ? [
                  // Preserve system prompt above and append user content plus provided multimodal contents
                  {
                    role: 'user',
                    content: enhancedPrompt
                  },
                  ...options.contents
                ]
              : [
                  {
                    role: 'user',
                    content: enhancedPrompt
                  }
                ])
          ],
          schema: ResearchResultSchema,
          temperature: LeadResearchService.RESEARCH_TEMPERATURE // Keep in sync with cache key
        }
        
        const paramsWithTools = {
          ...generateObjectParams,
          tools: { googleSearch: {} } as any
        } as Parameters<typeof generateObject>[0]
        
        const { object: parsed, response } = await generateObject(paramsWithTools)
        
        // Type assertion: parsed should match ResearchResultSchema
        const typedParsed = parsed as z.infer<typeof ResearchResultSchema>
        if (!typedParsed) {
          throw new Error('Failed to parse research result from AI response')
        }

        // Extract grounding metadata with defensive checks for different response structures
        const groundingMetadata = 
          (response as any)?.groundingMetadata || 
          (response as any)?.candidates?.[0]?.groundingMetadata ||
          null
        
        const citations =
          groundingMetadata?.groundingChunks
            ?.map((chunk: any) => ({
              uri: chunk?.retrievedUri || chunk?.web?.uri || chunk?.uri,
              title: chunk?.title || chunk?.web?.title,
              description: chunk?.description || chunk?.snippet || chunk?.web?.snippet
            }))
            ?.filter((c: any) => c?.uri) || []

        const adjustedConfidence = this.adjustConfidence({
          rawConfidence: typedParsed.confidence,
          citationsCount: citations.length as number,
          emailDomain: domain,
          parsedCompanyDomain: typedParsed.company.domain,
          parsedPersonName: typedParsed.person.fullName,
          ...(typedParsed.person.company ? { parsedPersonCompany: typedParsed.person.company } : {}),
          ...(name ? { providedName: name } : {}),
          inferredFirstName,
          inferredLastName
        })

        // Build ResearchResult from parsed object
        const researchResult: ResearchResult = {
          company: {
            name: typedParsed.company.name,
            domain: typedParsed.company.domain,
            ...(typedParsed.company.industry && { industry: typedParsed.company.industry }),
            ...(typedParsed.company.size && { size: typedParsed.company.size }),
            ...(typedParsed.company.summary && { summary: typedParsed.company.summary }),
            ...(typedParsed.company.website && { website: typedParsed.company.website }),
            ...(typedParsed.company.linkedin && { linkedin: typedParsed.company.linkedin }),
            ...(typedParsed.company.country && { country: typedParsed.company.country })
          },
          person: {
            fullName: typedParsed.person.fullName,
            ...(typedParsed.person.role && { role: typedParsed.person.role }),
            ...(typedParsed.person.seniority && { seniority: typedParsed.person.seniority }),
            ...(typedParsed.person.profileUrl && { profileUrl: typedParsed.person.profileUrl }),
            ...(typedParsed.person.company && { company: typedParsed.person.company })
          },
          ...(typedParsed.strategic && { 
             strategic: {
               latest_news: typedParsed.strategic.latest_news || [],
               competitors: typedParsed.strategic.competitors || [],
               pain_points: typedParsed.strategic.pain_points || [],
               market_trends: typedParsed.strategic.market_trends || []
             }
          }),
          role: typedParsed.role,
          confidence: adjustedConfidence,
          citations,
          ...(groundingMetadata ? { groundingMetadata } : {})
        }
        
        logger.debug('✅ [Lead Research] Completed', {
            company: researchResult.company.name,
            person: researchResult.person.fullName,
            rawConfidence: typedParsed.confidence,
            confidence: researchResult.confidence,
            citations: researchResult.citations?.length || 0
        })
        
        return researchResult
      } catch (error) {
        logger.warn('Lead research failed, returning fallback', { error: error instanceof Error ? error.message : String(error), email, name, domain })
        throw error // Will be caught by outer try-catch
      }
    } catch (error) {
      console.error('❌ [Lead Research] Failed:', error)

      // Return fallback result
      const fallbackDomain = email.split('@')[1] || 'unknown.com'
      return {
        company: {
          name: fallbackDomain.split('.')[0] || 'Unknown Company',
          domain: fallbackDomain,
          summary: 'Company information unavailable',
          website: companyUrl || `https://${fallbackDomain}`
        },
        person: {
          fullName: name || 'Unknown Person',
          company: fallbackDomain.split('.')[0] || 'Unknown Company'
        },
        role: 'Unknown',
        confidence: 0,
        citations: []
      }
    }
  }
}
