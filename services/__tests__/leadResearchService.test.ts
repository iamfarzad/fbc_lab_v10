import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { LeadResearchService } from 'src/core/intelligence/lead-research'
import { generateObject } from 'src/lib/ai-client'
import { mockResearchResult } from '../../test/helpers/test-data'

// Mock src/lib/ai-client
vi.mock('src/lib/ai-client', () => ({
  generateObject: vi.fn(),
  google: vi.fn()
}))

// Mock src/config/env
vi.mock('src/config/env', () => ({
  getResolvedGeminiApiKey: () => 'test-key'
}))

// Mock ai-cache to disable caching in tests
vi.mock('src/lib/ai-cache', () => ({
  createCachedFunction: vi.fn().mockImplementation((fn: any) => fn), // Return function directly, no caching
  CACHE_TTL: {}
}))

describe('LeadResearchService', () => {
  let service: LeadResearchService

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
    // Reset generateObject mock and set default implementation
    ;(generateObject as any).mockReset()
    ;(generateObject as any).mockResolvedValue({
      object: {
        company: { name: 'Test Co', domain: 'test.com' },
        person: { fullName: 'Test Person' },
        role: 'Test Role',
        confidence: 0.9
      },
      response: {
        headers: new Headers({
          'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
        }),
        rawResponse: new Response(null, { status: 200 })
      }
    })
    service = new LeadResearchService()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('Constructor', () => {
    it('initializes successfully', () => {
      expect(service).toBeDefined()
    })
  })

  describe('researchLead()', () => {
    it('returns cached result from sessionStorage', async () => {
      const cachedResult = JSON.stringify(mockResearchResult)
      // Cache key format: lead_research_${email}_${name || ''}_${location?.city || ''}
      const cacheKey = `lead_research_test@example.com__` // Two underscores for empty name and location
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        return key === cacheKey ? cachedResult : null
      })

      const result = await service.researchLead('test@example.com')

      // Should return cached result without calling AI
        expect(result).toEqual(mockResearchResult)
      expect(generateObject).not.toHaveBeenCalled()
    })

    it('calls generateObject for farzad@talktoeve.com email', async () => {
      // Ensure no cache
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
      // Set up mock response
      ;(generateObject as any).mockResolvedValue({
        object: {
          company: { name: 'TalkToEve', domain: 'talktoeve.com' },
          person: { fullName: 'Farzad Bayat' },
          role: 'Founder',
          confidence: 0.9
        },
        response: {
          headers: new Headers({
            'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
          }),
          rawResponse: new Response(null, { status: 200 })
        }
      })
      
      const result = await service.researchLead('farzad@talktoeve.com')
      expect(result.person.fullName).toBe('Farzad Bayat')
      expect(generateObject).toHaveBeenCalled()
    })

    it('calls generateObject for new leads', async () => {
      // Ensure no cache for this test
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
      ;(generateObject as any).mockResolvedValue({
        object: {
          company: { name: 'Test Co', domain: 'test.com' },
          person: { fullName: 'Test Person' },
          role: 'Test Role',
          confidence: 0.9
        },
        response: {
          headers: new Headers({
            'x-goog-ai-generative-usage': JSON.stringify({ promptTokenCount: 100 })
          }),
          rawResponse: new Response(null, { status: 200 })
        }
      })

      // Use an email that's not the hardcoded fallback
      await service.researchLead('newlead@testcompany.com')
      expect(generateObject).toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      // Ensure no cache
      vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
      // Reset and mock to reject
      ;(generateObject as any).mockReset()
      ;(generateObject as any).mockRejectedValue(new Error('API Error'))

      // Should return fallback structure with domain extracted from email
      const result = await service.researchLead('error@example.com')
      expect(result.company.domain).toBe('example.com')
      expect(result.confidence).toBe(0) // Fallback returns confidence: 0
    })
  })
})
