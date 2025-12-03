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

describe('LeadResearchService', () => {
  let service: LeadResearchService

  beforeEach(() => {
    vi.spyOn(Storage.prototype, 'getItem').mockReturnValue(null)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {})
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
      const cacheKey = `lead_research_test@example.com_`
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => {
        return key === cacheKey ? cachedResult : null
      })

      const result = await service.researchLead('test@example.com')

      // Should return cached result without calling AI
        expect(result).toEqual(mockResearchResult)
      expect(generateObject).not.toHaveBeenCalled()
    })

    it('uses hardcoded fallback for test email', async () => {
      const result = await service.researchLead('farzad@talktoeve.com')
      expect(result.person.fullName).toBe('Farzad Bayat')
      expect(generateObject).not.toHaveBeenCalled()
    })

    it('calls generateObject for new leads', async () => {
      (generateObject as any).mockResolvedValue({
        object: {
          company: { name: 'Test Co', domain: 'test.com' },
          person: { fullName: 'Test Person' },
          role: 'Test Role',
          confidence: 0.9
        }
      })

      await service.researchLead('test@example.com')
      expect(generateObject).toHaveBeenCalled()
    })

    it('handles API errors gracefully', async () => {
      (generateObject as any).mockRejectedValue(new Error('API Error'))

      // Should return fallback structure
      const result = await service.researchLead('test@example.com')
      expect(result.company.domain).toBe('example.com')
      expect(result.confidence).toBe(0.2)
    })
  })
})
