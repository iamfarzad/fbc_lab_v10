import { generateObject, google } from '../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../config/constants.js'
import { createCachedFunction, CACHE_TTL } from '../../lib/ai-cache.js'
import { z } from 'zod'
import { logger } from '../../lib/logger.js'

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
  // Cached research function
  private cachedResearch: (email: string, name?: string, companyUrl?: string, sessionId?: string, location?: LocationData, options?: { contents?: any[] }) => Promise<ResearchResult>

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
          `${email}|${name || ''}|${companyUrl || ''}|${location?.city || ''}|${options?.contents ? 'has-contents' : 'no-contents'}|temp-1.0`
      }
    )
  }

  async researchLead(
    email: string,
    name?: string,
    companyUrl?: string,
    sessionId?: string,
    location?: LocationData,
    options?: { contents?: any[] }
  ): Promise<ResearchResult> {
    // Client-side Caching (localStorage)
    // This preserves the behavior from the old service for browser environments
    const cacheKey = `lead_research_${email}_${name || ''}_${location?.city || ''}`
    
    let clientCacheHit = false
    if (typeof window !== 'undefined') {
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
      result = await this.cachedResearch(email, name, companyUrl, sessionId, location, options)
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
    options?: { contents?: any[] }
  ): Promise<ResearchResult> {
    void sessionId

    try {
      logger.debug('🔍 [Lead Research] Starting', { email, hasLocation: Boolean(location) })

      const domain = email.split('@')[1] || 'unknown.com'

      // Known profile fallback for Farzad Bayat
      if (email === 'farzad@talktoeve.com' && (name?.toLowerCase().includes('farzad') || !name)) {
        logger.debug('🎯 Using known profile for Farzad Bayat')
        return {
          company: {
            name: 'Talk to EVE',
            domain: 'talktoeve.com',
            industry: 'Artificial Intelligence, Mental Health Technology',
            size: '2-10 employees',
            summary: 'Talk to EVE is an AI-powered platform focused on mental health and well-being, providing virtual companionship and support.',
            website: 'https://talktoeve.com',
            linkedin: 'https://www.linkedin.com/company/talktoeve/',
            country: 'USA'
          },
          person: {
            fullName: 'Farzad Bayat',
            role: 'Founder & CEO',
            seniority: 'Founder',
            profileUrl: 'https://www.linkedin.com/in/farzad-bayat/',
            company: 'Talk to EVE'
          },
          role: 'Founder & CEO',
          confidence: 1.0,
          citations: [
            {
              uri: 'https://www.linkedin.com/in/farzad-bayat/',
              title: 'Farzad Bayat - LinkedIn Profile',
              description: 'Founder & CEO at Talk to EVE'
            }
          ]
        }
      }

      // Build location context for prompt
      const locationContext = location 
        ? `User Location: ${location.city || 'Unknown city'}, ${location.country || 'Unknown country'} (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`
        : ''

      // Use generateObject with Google Grounding Search
      // Build context block first (end-anchored structure)
      const contextBlock = `Research the following individual and company using Google Search.

Target:
Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company Context: ${companyUrl || 'Use email domain'}
${locationContext ? `${locationContext}` : ''}

Task:
1) Identify the company details (Industry, Size, Summary, Country).
2) Identify the person's role and seniority.
3) Strategic analysis:
   - Find recent news/events about the company.
   - Identify key competitors.
   - Infer likely pain points based on the role and industry trends.
${location ? `4) Location-based insights:
   - Search for any local business presence or offices near the user's location.
   - Find relevant local market information.
   - Identify any location-specific opportunities or challenges.` : ''}`

      const instructionBlock = `INSTRUCTIONS:
- Use Google Search aggressively (grounded facts only).
- Be concise unless detail is essential.
- If unsure, state uncertainty instead of guessing.
- Return structured data matching the schema exactly.`

      const prompt = `${contextBlock}

${instructionBlock}`

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
              content: 'You are an elite B2B researcher. Use Google Search aggressively and cite sources when available.'
            },
            ...(options?.contents && options.contents.length > 0
              ? [
                  // Preserve system prompt above and append user content plus provided multimodal contents
                  {
                    role: 'user',
                    content: prompt
                  },
                  ...options.contents
                ]
              : [
                  {
                    role: 'user',
                    content: prompt
                  }
                ])
          ],
          schema: ResearchResultSchema,
          temperature: 1.0 // Explicit to match cache key
        }
        
        // Add tools if supported (may not be in type definitions for generateObject)
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
          confidence: typedParsed.confidence,
          citations,
          ...(groundingMetadata ? { groundingMetadata } : {})
        }
        
        logger.debug('✅ [Lead Research] Completed', {
            company: researchResult.company.name,
            person: researchResult.person.fullName,
            confidence: researchResult.confidence,
            citations: researchResult.citations?.length || 0
        })
        
        return researchResult
      } catch (error) {
        logger.warn('Lead research failed, returning fallback', { error: error instanceof Error ? error.message : String(error), email, name, domain })
        throw error // Will be caught by outer try-catch
    }

      // Fallback if no JSON found or parsing failed
      const domainParts = domain.split('.')
      const companyName = domainParts[0] || 'Unknown'
      const emailParts = email.split('@')
      const personName = name || emailParts[0] || 'Unknown'
    
    return {
      company: {
        name: companyName,
        domain,
        website: companyUrl || `https://${domain}`,
        summary: 'Company information unavailable'
      },
      person: {
        fullName: personName,
        company: companyName
      },
      role: 'Business Professional',
      confidence: 0.2,
        citations: []
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
