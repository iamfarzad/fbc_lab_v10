import { generateObject, google } from 'src/lib/ai-client'
import { GEMINI_MODELS } from 'src/config/constants'
import { createCachedFunction, CACHE_TTL } from 'src/lib/ai-cache'
import { z } from 'zod'
import { logger } from 'src/lib/logger'

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

export class LeadResearchService {
  // Cached research function
  private cachedResearch: (email: string, name?: string, companyUrl?: string, sessionId?: string) => Promise<ResearchResult>

  constructor() {
    // Wrap the internal method with caching (24 hour TTL)
    // This handles server-side/memory caching via the stub or future implementation
    this.cachedResearch = createCachedFunction(
      this.researchLeadInternal.bind(this),
      {
        ttl: CACHE_TTL.VERY_LONG, // 24 hours
        keyPrefix: 'lead-research:',
        keyGenerator: (email: string, name: string | undefined, companyUrl: string | undefined) => `${email}|${name || ''}|${companyUrl || ''}`
      }
    )
  }

  async researchLead(email: string, name?: string, companyUrl?: string, sessionId?: string): Promise<ResearchResult> {
    // Client-side Caching (localStorage)
    // This preserves the behavior from the old service for browser environments
    const cacheKey = `lead_research_${email}_${name || ''}`
    
    if (typeof window !== 'undefined') {
        const cached = localStorage.getItem(cacheKey)
        if (cached) {
            logger.debug('Using cached research', { email })
            try {
                return JSON.parse(cached) as ResearchResult
            } catch (e) {
                console.warn('Failed to parse cached research, re-fetching', e)
                localStorage.removeItem(cacheKey)
            }
        }
    }

    // Execute research (using server-side cache wrapper)
    const result = await this.cachedResearch(email, name, companyUrl, sessionId)

    // Update client-side cache
    if (typeof window !== 'undefined' && result) {
      try {
          localStorage.setItem(cacheKey, JSON.stringify(result))
      } catch (err) {
          console.warn('Failed to cache research result locally:', err)
      }
    }

    return result
  }

  private async researchLeadInternal(email: string, name?: string, companyUrl?: string, sessionId?: string): Promise<ResearchResult> {
    void sessionId

    try {
      logger.debug('🔍 [Lead Research] Starting', { email })

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

      // Use generateObject with Google Grounding Search
      const prompt = `Research the following individual and company using Google Search.

    Target:
Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
    Company Context: ${companyUrl || 'Use email domain'}
    
    Task:
    1. Identify the company details (Industry, Size, Summary, Country).
    2. Identify the person's role and seniority.
    3. STRATEGIC ANALYSIS:
       - Find recent news/events about the company.
       - Identify key competitors.
       - Infer likely pain points based on the role and industry trends.
    
Return structured data matching the schema.`

      try {
        const { object: parsed } = await generateObject({
          model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
          messages: [
            {
              role: 'system',
              content: 'You are an elite B2B researcher. Use Google Search aggressively.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          schema: ResearchResultSchema,
          temperature: 0.3
          // Note: Google Grounding Search may work via model/prompt configuration
        })

        // Build ResearchResult from parsed object
        const researchResult: ResearchResult = {
          company: {
            name: parsed.company.name,
            domain: parsed.company.domain,
            ...(parsed.company.industry && { industry: parsed.company.industry }),
            ...(parsed.company.size && { size: parsed.company.size }),
            ...(parsed.company.summary && { summary: parsed.company.summary }),
            ...(parsed.company.website && { website: parsed.company.website }),
            ...(parsed.company.linkedin && { linkedin: parsed.company.linkedin }),
            ...(parsed.company.country && { country: parsed.company.country })
          },
          person: {
            fullName: parsed.person.fullName,
            ...(parsed.person.role && { role: parsed.person.role }),
            ...(parsed.person.seniority && { seniority: parsed.person.seniority }),
            ...(parsed.person.profileUrl && { profileUrl: parsed.person.profileUrl }),
            ...(parsed.person.company && { company: parsed.person.company })
          },
          ...(parsed.strategic && { 
             strategic: {
               latest_news: parsed.strategic.latest_news || [],
               competitors: parsed.strategic.competitors || [],
               pain_points: parsed.strategic.pain_points || [],
               market_trends: parsed.strategic.market_trends || []
             }
          }),
          role: parsed.role,
          confidence: parsed.confidence,
          citations: [] // Citations would come from grounding metadata if available
        }
        
        logger.debug('✅ [Lead Research] Completed', {
            company: researchResult.company.name,
            person: researchResult.person.fullName,
            confidence: researchResult.confidence
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
