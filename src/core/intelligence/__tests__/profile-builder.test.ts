import { describe, it, expect } from 'vitest'
import { buildLeadProfile } from '../profile-builder.js'
import type { ResearchResult } from '../lead-research.js'

describe('Profile Builder', () => {
  const baseResearch: ResearchResult = {
    company: {
      name: 'Acme Corp',
      domain: 'acme.com',
      industry: 'SaaS',
      size: '50-200 employees',
      summary: 'Enterprise software provider',
      website: 'https://acme.com'
    },
    person: {
      fullName: 'John Doe',
      role: 'VP of Engineering',
      seniority: 'VP',
      profileUrl: 'https://linkedin.com/in/johndoe',
      company: 'Acme Corp'
    },
    role: 'VP of Engineering',
    confidence: 0.85,
    citations: []
  }

  describe('Identity Verification', () => {
    it('should verify identity when email domain matches LinkedIn company', () => {
      const research: ResearchResult = {
        ...baseResearch,
        company: {
          ...baseResearch.company,
          domain: 'acme.com'
        },
        person: {
          ...baseResearch.person,
          company: 'Acme Corp'
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.identity.verified).toBe(true)
      expect(profile.identity.confidenceScore).toBeGreaterThan(85) // Should have verification bonus
    })

    it('should not verify when email domain does not match', () => {
      const research: ResearchResult = {
        ...baseResearch,
        company: {
          ...baseResearch.company,
          domain: 'acme.com',
          website: 'https://acme.com'
        },
        person: {
          ...baseResearch.person,
          company: 'XYZ Industries', // No shared substring with 'acme' or 'different'
          profileUrl: 'https://linkedin.com/in/johndoe' // Has profileUrl to trigger verification logic
        }
      }

      const profile = buildLeadProfile(research, 'john@different.com', 'John Doe')

      expect(profile.identity.verified).toBe(false)
    })

    it('should handle missing LinkedIn profile', () => {
      const research: ResearchResult = {
        ...baseResearch,
        person: {
          ...baseResearch.person,
          profileUrl: undefined
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.identity.verified).toBe(false)
      expect(profile.identity.name).toBe('John Doe')
    })
  })

  describe('Digital Footprint Detection', () => {
    it('should detect GitHub presence', () => {
      const research: ResearchResult = {
        ...baseResearch,
        citations: [
          {
            uri: 'https://github.com/johndoe',
            title: 'John Doe - GitHub',
            description: 'Software engineer profile'
          }
        ]
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.digitalFootprint.hasGitHub).toBe(true)
    })

    it('should detect publications', () => {
      const research: ResearchResult = {
        ...baseResearch,
        citations: [
          {
            uri: 'https://scholar.google.com/citations?user=johndoe',
            title: 'John Doe - Google Scholar',
            description: 'Research publications'
          }
        ]
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.digitalFootprint.hasPublications).toBe(true)
    })

    it('should detect recent speaking', () => {
      const research: ResearchResult = {
        ...baseResearch,
        citations: [
          {
            uri: 'https://conference.com/speakers/johndoe',
            title: 'John Doe - Conference Speaker',
            description: 'Keynote speaker at TechConf 2024'
          }
        ]
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.digitalFootprint.recentSpeaking).toBe(true)
    })
  })

  describe('Years Experience Inference', () => {
    it('should infer years from C-Level seniority', () => {
      const research: ResearchResult = {
        ...baseResearch,
        person: {
          ...baseResearch.person,
          seniority: 'C-Level'
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.professional.yearsExperience).toBe(15)
    })

    it('should infer years from VP seniority', () => {
      const research: ResearchResult = {
        ...baseResearch,
        person: {
          ...baseResearch.person,
          seniority: 'VP'
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.professional.yearsExperience).toBe(15)
    })

    it('should infer years from Director seniority', () => {
      const research: ResearchResult = {
        ...baseResearch,
        person: {
          ...baseResearch.person,
          seniority: 'Director'
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.professional.yearsExperience).toBe(10)
    })

    it('should infer years from Manager seniority', () => {
      const research: ResearchResult = {
        ...baseResearch,
        person: {
          ...baseResearch.person,
          seniority: 'Manager'
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.professional.yearsExperience).toBe(7)
    })
  })

  describe('Context Hooks Generation', () => {
    it('should generate hooks from recent news', () => {
      const research: ResearchResult = {
        ...baseResearch,
        strategic: {
          latest_news: ['Raised $10M Series A'],
          competitors: [],
          pain_points: []
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.contexthooks.length).toBeGreaterThan(0)
      expect(profile.contexthooks.some(hook => hook.toLowerCase().includes('series a'))).toBe(true)
    })

    it('should generate hooks from professional background', () => {
      const profile = buildLeadProfile(baseResearch, 'john@acme.com', 'John Doe')

      expect(profile.contexthooks.length).toBeGreaterThan(0)
      expect(profile.contexthooks.some(hook => 
        hook.toLowerCase().includes('vp') || hook.toLowerCase().includes('engineering')
      )).toBe(true)
    })

    it('should generate hooks from industry trends', () => {
      const research: ResearchResult = {
        ...baseResearch,
        strategic: {
          latest_news: [],
          competitors: [],
          pain_points: [],
          market_trends: ['AI adoption']
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.contexthooks.length).toBeGreaterThan(0)
      expect(profile.contexthooks.some(hook => hook.toLowerCase().includes('ai'))).toBe(true)
    })

    it('should limit hooks to 3', () => {
      const research: ResearchResult = {
        ...baseResearch,
        strategic: {
          latest_news: ['News 1', 'News 2', 'News 3', 'News 4'],
          competitors: [],
          pain_points: [],
          market_trends: ['Trend 1', 'Trend 2']
        }
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.contexthooks.length).toBeLessThanOrEqual(3)
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing data gracefully', () => {
      const research: ResearchResult = {
        company: {
          name: 'Unknown Company',
          domain: 'unknown.com'
        },
        person: {
          fullName: 'Unknown Person'
        },
        role: 'Unknown',
        confidence: 0.3
      }

      const profile = buildLeadProfile(research, 'test@unknown.com')

      expect(profile.identity.name).toBe('Unknown Person')
      expect(profile.professional.company).toBe('Unknown Company')
      expect(profile.identity.verified).toBe(false)
      expect(profile.contexthooks.length).toBeGreaterThan(0) // Should have fallback hook
    })

    it('should handle partial data', () => {
      const research: ResearchResult = {
        company: {
          name: 'Acme Corp',
          domain: 'acme.com'
        },
        person: {
          fullName: 'John Doe'
          // Missing role, seniority, etc.
        },
        role: 'Unknown',
        confidence: 0.5
      }

      const profile = buildLeadProfile(research, 'john@acme.com', 'John Doe')

      expect(profile.professional.currentRole).toBe('Unknown')
      expect(profile.professional.yearsExperience).toBeUndefined()
    })
  })
})
