import { describe, it, expect } from 'vitest'
import { generateAgentBriefing, generateSystemPromptSupplement } from '../context-briefing.js'
import type { IntelligenceContext } from '../../types.js'
import { createMockStrategicContext } from '../../__tests__/test-helpers/agent-test-helpers.js'

describe('context-briefing', () => {
  describe('generateAgentBriefing', () => {
    it('should return empty string for invalid context', () => {
      expect(generateAgentBriefing(undefined)).toBe('')
      expect(generateAgentBriefing({} as IntelligenceContext)).toBe('')
      expect(generateAgentBriefing({ email: 'test@test.com', name: 'Test' } as IntelligenceContext)).toBe('')
    })

    it('should generate briefing with company context', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com',
          industry: 'Technology',
          size: '51-200'
        },
        person: {
          fullName: 'Test User',
          role: 'CTO',
          seniority: 'C-Level'
        }
      }

      const briefing = generateAgentBriefing(context)
      expect(briefing).toContain('Test User')
      expect(briefing).toContain('CTO')
      expect(briefing).toContain('Test Company')
      expect(briefing).toContain('Technology')
      expect(briefing).toContain('TECHNICAL')
    })

    it('should detect technical level from role', () => {
      const technicalContext: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com',
          industry: 'Technology'
        },
        person: {
          fullName: 'Test User',
          role: 'Senior Developer'
        }
      }

      const briefing = generateAgentBriefing(technicalContext)
      expect(briefing).toContain('TECHNICAL')
    })

    it('should detect business-focused from non-technical role', () => {
      const businessContext: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com',
          industry: 'Retail'
        },
        person: {
          fullName: 'Test User',
          role: 'Marketing Manager'
        }
      }

      const briefing = generateAgentBriefing(businessContext)
      expect(briefing).toContain('BUSINESS-FOCUSED')
    })

    it('should include company summary if available', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com',
          summary: 'A leading technology company focused on AI innovation'
        }
      }

      const briefing = generateAgentBriefing(context)
      expect(briefing).toContain('A leading technology company')
    })
  })

  describe('generateSystemPromptSupplement', () => {
    it('should return empty string if no strategic context', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com'
        }
      }

      expect(generateSystemPromptSupplement(context)).toBe('')
      expect(generateSystemPromptSupplement(undefined)).toBe('')
    })

    it('should generate HIGH privacy instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Bank Corp',
          domain: 'bank.com',
          industry: 'Finance'
        },
        strategicContext: {
          privacySensitivity: 'HIGH',
          technicalLevel: 'LOW',
          authorityLevel: 'DECISION_MAKER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toMatch(/high/i)
      expect(supplement).toContain('CRITICAL CONTEXT')
      expect(supplement).toContain('Local LLMs')
      expect(supplement).toContain('GDPR')
      expect(supplement).toContain('Do NOT suggest sending sensitive data')
    })

    it('should generate MEDIUM privacy instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Enterprise Corp',
          domain: 'enterprise.com',
          industry: 'Enterprise Software'
        },
        strategicContext: {
          privacySensitivity: 'MEDIUM',
          technicalLevel: 'HIGH',
          authorityLevel: 'INFLUENCER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toMatch(/medium/i)
      expect(supplement).toContain('PRIVACY NOTE')
      expect(supplement).toContain('enterprise-grade security')
    })

    it('should generate HIGH technical level instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Tech Corp',
          domain: 'tech.com'
        },
        strategicContext: {
          privacySensitivity: 'LOW',
          technicalLevel: 'HIGH',
          authorityLevel: 'RESEARCHER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toContain('USER IS TECHNICAL')
      expect(supplement).toContain('Context Window')
      expect(supplement).toContain('RAG')
      expect(supplement).toContain('Fine-tuning')
      expect(supplement).toContain('Skip basic definitions')
    })

    it('should generate LOW technical level instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Business Corp',
          domain: 'business.com'
        },
        strategicContext: {
          privacySensitivity: 'LOW',
          technicalLevel: 'LOW',
          authorityLevel: 'DECISION_MAKER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toContain('USER IS BUSINESS-FOCUSED')
      expect(supplement).toContain('ROI')
      expect(supplement).toContain('Efficiency')
      expect(supplement).toContain('Avoid technical jargon')
    })

    it('should generate DECISION_MAKER authority instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com'
        },
        strategicContext: {
          privacySensitivity: 'LOW',
          technicalLevel: 'LOW',
          authorityLevel: 'DECISION_MAKER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toContain('DECISION MAKER')
      expect(supplement).toContain('discuss budget')
      expect(supplement).toContain('timelines')
      expect(supplement).toContain('strategic decisions')
    })

    it('should generate INFLUENCER authority instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com'
        },
        strategicContext: {
          privacySensitivity: 'LOW',
          technicalLevel: 'LOW',
          authorityLevel: 'INFLUENCER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toContain('INFLUENCER')
      expect(supplement).toContain('present ideas')
      expect(supplement).toContain('decision makers')
      expect(supplement).toContain('quick wins')
    })

    it('should generate RESEARCHER authority instructions', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Test Company',
          domain: 'example.com'
        },
        strategicContext: {
          privacySensitivity: 'LOW',
          technicalLevel: 'HIGH',
          authorityLevel: 'RESEARCHER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toContain('RESEARCHER')
      expect(supplement).toContain('gathering information')
      expect(supplement).toContain('comprehensive information')
      expect(supplement).toContain('educational')
    })

    it('should combine multiple strategic context elements', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          name: 'Bank Corp',
          domain: 'bank.com',
          industry: 'Finance'
        },
        strategicContext: {
          privacySensitivity: 'HIGH',
          technicalLevel: 'HIGH',
          authorityLevel: 'DECISION_MAKER'
        }
      }

      const supplement = generateSystemPromptSupplement(context)
      expect(supplement).toMatch(/high/i)
      expect(supplement).toContain('CRITICAL CONTEXT')
      expect(supplement).toContain('USER IS TECHNICAL')
      expect(supplement).toContain('DECISION MAKER')
    })
  })
})
