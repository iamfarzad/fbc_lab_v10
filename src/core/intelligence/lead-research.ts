import { GoogleGenAI } from '@google/genai'
import { GEMINI_MODELS } from 'src/config/constants'
import { createGoogleGenAI } from 'src/config/env'
import { GoogleGroundingProvider } from './providers/search/google-grounding'
import { createCachedFunction, CACHE_TTL } from 'src/lib/ai-cache'
import { z } from 'zod'

export interface ResearchResult {
  company: CompanyContext
  person: PersonContext
  role: string
  confidence: number
  citations?: Array<{
    uri: string
    title?: string
    description?: string
  }>
}

export interface CompanyContext {
  name: string
  domain: string
  industry?: string
  size?: string
  summary?: string
  website?: string
  linkedin?: string
}

export interface PersonContext {
  fullName: string
  role?: string
  seniority?: string
  profileUrl?: string
  company?: string
}

export class LeadResearchService {
  private genAI: GoogleGenAI
  private groundingProvider: GoogleGroundingProvider

  // Cached research function
  private cachedResearch: (email: string, name?: string, companyUrl?: string, sessionId?: string) => Promise<ResearchResult>

  constructor() {
    this.genAI = createGoogleGenAI()
    this.groundingProvider = new GoogleGroundingProvider()

    // Wrap the internal method with caching (24 hour TTL)
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
    // Use cached version - cache key based on email, name, companyUrl
    return await this.cachedResearch(email, name, companyUrl, sessionId)
  }

  private async researchLeadInternal(email: string, name?: string, companyUrl?: string, sessionId?: string): Promise<ResearchResult> {
    void sessionId

    try {
      console.log('🔍 [Lead Research] Starting for:', email)

      const domain = email.split('@')[1]

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
            linkedin: 'https://www.linkedin.com/company/talktoeve/'
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

      // Use Google Grounding for comprehensive research
      const researchResult = await this.researchWithGrounding(email, name, domain ?? undefined, companyUrl)

      console.log('✅ [Lead Research] Completed:', {
        company: researchResult.company.name,
        person: researchResult.person.fullName,
        confidence: researchResult.confidence
      })
      return researchResult

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

  private async researchWithGrounding(email: string, name: string | undefined, domain: string | undefined, companyUrl: string | undefined): Promise<ResearchResult> {
    const allCitations: Array<{ uri: string; title?: string; description?: string }> = []

    // Use comprehensive research for deeper analysis
    const query = `Analyze the professional profile of ${name || email.split('@')[0]} and the company at ${domain}.
    Provide detailed information about:
    1. The company: Industry, approximate size (employees), key products/services, and a summary.
    2. The person: Current role, seniority level, and professional background.
    3. Key context: Any recent news or relevant details.`

    const research = await this.groundingProvider.comprehensiveResearch(query, {
      ...(email && { email }),
      ...(domain && { company: domain })
    })

    if (research.allCitations && Array.isArray(research.allCitations)) {
      allCitations.push(...research.allCitations)
    }

    // Use Gemini to synthesize the research results
    const prompt = `
You are a professional research assistant. Analyze the following search results and extract structured information.

Email: ${email}
Name: ${name || 'Unknown'}
Domain: ${domain}
Company URL: ${companyUrl || 'Not provided'}

Research Results:
${research.combinedAnswer}

URL Context:
${research.urlContext.map((ctx: { text: string }) => ctx.text).join('\n\n')}

Extract and return ONLY a valid JSON object. Do not include any text before or after the JSON. Use this exact structure:
{
  "company": {
    "name": "Company Name",
    "domain": "${domain}",
    "industry": "Industry",
    "size": "Company size",
    "summary": "Company description",
    "website": "Website URL",
    "linkedin": "LinkedIn company URL"
  },
  "person": {
    "fullName": "Full Name",
    "role": "Professional role",
    "seniority": "Seniority level",
    "profileUrl": "LinkedIn profile URL",
    "company": "Company name"
  },
  "role": "Detected role",
  "confidence": 0.85
}

Be thorough and accurate. If information is not available, use null for that field. Ensure the output is valid JSON without any invalid characters.
`

    const result = await this.genAI.models.generateContent({
      model: GEMINI_MODELS.DEFAULT_CHAT,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    })

    interface GenerateContentResult {
      text?: string | (() => string)
      candidates?: Array<{
        content?: {
          parts?: Array<{ text?: string }>
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
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const raw = JSON.parse(jsonMatch[0]) as unknown

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
          }),
          person: z.object({
            fullName: z.string(),
            role: z.string().optional(),
            seniority: z.string().optional(),
            profileUrl: z.string().optional(),
            company: z.string().optional(),
          }),
          role: z.string(),
          confidence: z.number().min(0).max(1),
        })

        const parsed = ResearchResultSchema.parse(raw)
        return {
          company: {
            name: parsed.company.name,
            domain: parsed.company.domain,
            ...(parsed.company.industry && { industry: parsed.company.industry }),
            ...(parsed.company.size && { size: parsed.company.size }),
            ...(parsed.company.summary && { summary: parsed.company.summary }),
            ...(parsed.company.website && { website: parsed.company.website }),
            ...(parsed.company.linkedin && { linkedin: parsed.company.linkedin })
          },
          person: {
            fullName: parsed.person.fullName,
            ...(parsed.person.role && { role: parsed.person.role }),
            ...(parsed.person.seniority && { seniority: parsed.person.seniority }),
            ...(parsed.person.profileUrl && { profileUrl: parsed.person.profileUrl }),
            ...(parsed.person.company && { company: parsed.person.company })
          },
          role: parsed.role,
          confidence: parsed.confidence,
          citations: allCitations
        }
      }
    } catch (parseError) {
      console.error('JSON parsing or validation failed:', parseError, 'Raw text:', text)
    }

    // Fallback if no JSON found
    if (!domain) {
      throw new Error('Domain is required for lead research')
    }
    const domainParts = domain.split('.');
    const companyName = domainParts[0] || 'Unknown';
    const emailParts = email.split('@');
    const personName = name || emailParts[0] || 'Unknown';
    
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
      citations: allCitations
    }
  }

}
