import { GoogleGenAI, Schema, Type } from '@google/genai';
import { ResearchResult } from 'types';
import { GEMINI_MODELS } from 'src/config/constants';

export class LeadResearchService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    private buildFallback(email: string, name?: string): ResearchResult {
        const domain = email.split('@')[1] || 'example.com';
        const companyName = domain.split('.')[0] || 'example';
        return {
            company: {
                name: companyName,
                domain,
                industry: null,
                size: null,
                summary: '',
                website: `https://${domain}`,
                linkedin: null,
                country: null
            },
            person: {
                fullName: name || email.split('@')[0],
                role: null,
                seniority: null,
                profileUrl: null,
                company: companyName
            },
            role: 'Unknown',
            confidence: 0.0,
            strategic: null,
            citations: []
        } as ResearchResult;
    }

    /**
     * Performs deep research on a lead using Google Search Grounding and strict JSON schema output.
     * Caches results in localStorage to save tokens/latency and persist across reloads.
     * Follows the architecture defined in fbc_lead_setup.md.
     */
    async researchLead(email: string, name?: string, companyUrl?: string): Promise<ResearchResult> {
        if (email.toLowerCase() === 'farzad@talktoeve.com') {
            return {
                company: {
                    name: 'Talk to EVE',
                    domain: 'talktoeve.com',
                    industry: 'AI',
                    size: 'Startup',
                    summary: 'AI-driven communication tools',
                    website: 'https://talktoeve.com',
                    linkedin: 'https://www.linkedin.com/company/talktoeve',
                    country: 'USA'
                },
                person: {
                    fullName: 'Farzad Bayat',
                    role: 'Founder',
                    seniority: 'Founder',
                    profileUrl: 'https://www.linkedin.com/in/farzadbayat/',
                    company: 'Talk to EVE'
                },
                role: 'Founder',
                confidence: 1.0,
                strategic: null,
                citations: []
            };
        }

        const cacheKey = `lead_research_${email}_${name || ''}`;

        if (typeof window !== 'undefined') {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                console.log('Using cached research for:', email);
                try {
                    return JSON.parse(cached) as ResearchResult;
                } catch (e) {
                    console.warn('Failed to parse cached research, re-fetching', e);
                    localStorage.removeItem(cacheKey);
                }
            }
        }

        console.log('🔍 Starting Lead Research for:', email);

        // 1. Construct Schema for Strict JSON Output
        const responseSchema: Schema = {
            type: Type.OBJECT,
            properties: {
                company: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        domain: { type: Type.STRING },
                        industry: { type: Type.STRING, nullable: true },
                        size: { type: Type.STRING, nullable: true },
                        summary: { type: Type.STRING, nullable: true },
                        website: { type: Type.STRING, nullable: true },
                        linkedin: { type: Type.STRING, nullable: true },
                        country: { type: Type.STRING, nullable: true, description: "Headquarters country e.g. Norway, USA" }
                    },
                    required: ["name", "domain"]
                },
                person: {
                    type: Type.OBJECT,
                    properties: {
                        fullName: { type: Type.STRING },
                        role: { type: Type.STRING, nullable: true },
                        seniority: { type: Type.STRING, nullable: true },
                        profileUrl: { type: Type.STRING, nullable: true },
                        company: { type: Type.STRING, nullable: true }
                    },
                    required: ["fullName"]
                },
                strategic: {
                    type: Type.OBJECT,
                    properties: {
                        latest_news: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 recent news headlines about the company or industry" },
                        competitors: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 3 direct competitors" },
                        pain_points: { type: Type.ARRAY, items: { type: Type.STRING }, description: "3 likely business challenges for this specific role/industry" },
                        market_trends: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Current trends affecting this sector" }
                    },
                    nullable: true
                },
                role: { type: Type.STRING },
                confidence: { type: Type.NUMBER }
            },
            required: ["company", "person", "role", "confidence"]
        };

        const domain = email.split('@')[1];

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
    
    Return ONLY valid JSON, no markdown code blocks or extra text. Return a structured profile matching the schema.
    `;

        // 2. Generate Content with Google Grounding Search
        // Note: responseMimeType cannot be used with tools, so we parse JSON from text response
        const storeCache = (key: string, value: string) => {
            if (typeof window === 'undefined') return;
            try {
                localStorage.setItem(key, value);
                if (typeof Storage !== 'undefined' && Storage.prototype.setItem) {
                    Storage.prototype.setItem.call(localStorage, key, value);
                }
            } catch (err) {
                console.warn('Failed to cache research result:', err);
            }
        };

        try {
            const response = await this.ai.models.generateContent({
                model: GEMINI_MODELS.DEFAULT_RELIABLE,
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                    tools: [{ googleSearch: {} }]  // Enables Google Grounding Search
                }
            });

            // 3. Parse & Return
            const text = (response as any)?.text;
            if (text) {
                // Enhanced JSON parsing - handle markdown code blocks and edge cases
                let jsonText = text.trim();
                
                // Remove markdown code blocks if present
                if (jsonText.startsWith('```json')) {
                    jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '');
                } else if (jsonText.startsWith('```')) {
                    jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '');
                }
                
                let data: any;
                try {
                    data = JSON.parse(jsonText);
                } catch (parseError) {
                    console.error('Failed to parse JSON response:', parseError);
                    console.error('Response text:', jsonText.substring(0, 200));
                    data = this.buildFallback(email, name);
                }

                // Extract citations from grounding metadata
                const citations = response.candidates?.[0]?.groundingMetadata?.groundingChunks
                    ?.map(c => ({
                        uri: c.web?.uri || '',
                        title: c.web?.title,
                        description: `Source for ${c.web?.title}`
                    }))
                    .filter(c => c.uri !== '');

                const result: ResearchResult = {
                    ...data,
                    citations: citations || []
                };

                storeCache(cacheKey, JSON.stringify(result));
                return result;
            }

            const fallback = this.buildFallback(email, name);
            storeCache(cacheKey, JSON.stringify(fallback));
            return fallback;

        } catch (error) {
            console.error("Research failed:", error);
            const fallback = this.buildFallback(email, name);
            storeCache(cacheKey, JSON.stringify(fallback));
            return fallback;
        }
    }

}
