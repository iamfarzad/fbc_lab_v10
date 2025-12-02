import { GoogleGenAI } from '@google/genai'
import { GEMINI_MODELS } from 'src/config/constants'
import { createGoogleGenAI } from 'src/config/env'
import { createCachedFunction, CACHE_TTL } from 'src/lib/ai-cache'
import { z } from 'zod'

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

export class LeadResearchService {
  private genAI: GoogleGenAI

  // Cached research function
  private cachedResearch: (email: string, name?: string, companyUrl?: string, sessionId?: string) => Promise<ResearchResult>

  constructor() {
    this.genAI = createGoogleGenAI()

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
            console.log('Using cached research for:', email)
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
      console.log('🔍 [Lead Research] Starting for:', email)

      const domain = email.split('@')[1] || 'unknown.com'

      // Known profile fallback for Farzad Bayat
      if (email === 'farzad@talktoeve.com' && (name?.toLowerCase().includes('farzad') || !name)) {
        console.log('🎯 Using known profile for Farzad Bayat')
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

      // Prompt structure designed for synthesis
    const prompt = `
    Research the following individual and company using Google Search.

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
    
    Return ONLY valid JSON, no markdown code blocks or extra text. Return a structured profile matching the schema:
{
  "company": {
    "name": "Company Name",
    "domain": "${domain}",
    "industry": "Industry",
    "size": "Company size",
    "summary": "Company description",
    "website": "Website URL",
        "linkedin": "LinkedIn company URL",
        "country": "Country"
  },
  "person": {
    "fullName": "Full Name",
    "role": "Professional role",
    "seniority": "Seniority level",
    "profileUrl": "LinkedIn profile URL",
    "company": "Company name"
  },
      "strategic": {
        "latest_news": ["news item 1", "news item 2"],
        "competitors": ["competitor 1", "competitor 2"],
        "pain_points": ["pain point 1", "pain point 2"],
        "market_trends": ["trend 1", "trend 2"]
      },
  "role": "Detected role",
  "confidence": 0.85
}
`

      // Generate Content with Google Grounding Search
    const result = await this.genAI.models.generateContent({
        model: GEMINI_MODELS.DEFAULT_CHAT, // Use DEFAULT_CHAT which is likely Pro or Flash supporting tools
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
            tools: [{ googleSearch: {} }]  // Enables Google Grounding Search
        }
    })

    interface GenerateContentResult {
      text?: string | (() => string)
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
          },
          groundingMetadata?: {
            groundingChunks?: Array<{
              web?: {
                uri?: string
                title?: string
              }
            }>
        }
      }>
    }

    const resultRecord = result as unknown as GenerateContentResult
    const text = typeof resultRecord.text === 'function'
      ? resultRecord.text()
      : typeof resultRecord.text === 'string'
        ? resultRecord.text
        : (resultRecord.candidates?.[0]?.content?.parts || [])
          .map((p: { text?: string }) => p.text || '')
          .filter(Boolean)
          .join('\n')

    // Extract JSON from response and validate with schema
    try {
        let jsonText = text.trim()
        // Remove markdown code blocks if present
        if (jsonText.startsWith('```json')) {
            jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
        } else if (jsonText.startsWith('```')) {
            jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
        }

        const raw = JSON.parse(jsonText) as unknown

        // Schema for research result structure
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

        const parsed = ResearchResultSchema.parse(raw)

        // Extract citations from grounding metadata
        const allCitations = resultRecord.candidates?.[0]?.groundingMetadata?.groundingChunks
            ?.map(c => {
                const uri = c.web?.uri || ''
                if (!uri) return null
        return {
                    uri,
                    ...(c.web?.title && { title: c.web.title }),
                    description: `Source for ${c.web?.title || 'unknown'}`
                }
            })
            .filter((c): c is NonNullable<typeof c> => c !== null) || []

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
          citations: allCitations
        }
        
        console.log('✅ [Lead Research] Completed:', {
            company: researchResult.company.name,
            person: researchResult.person.fullName,
            confidence: researchResult.confidence
        })
        
        return researchResult

    } catch (parseError) {
      console.error('JSON parsing or validation failed:', parseError, 'Raw text:', text)
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
