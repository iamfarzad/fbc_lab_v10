/**
 * Intelligence Context Validation Tests
 * 
 * Tests for intelligence context validation, freshness checking, and session matching
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { validateIntelligenceContext } from '../utils/validate-intelligence-context.js'
import { loadIntelligenceContextFromDB } from '../utils/intelligence-context-loader.js'
import type { IntelligenceContext } from '../../src/core/agents/types.js'

// Mock ContextStorage
vi.mock('../../src/core/context/context-storage.js', () => ({
  ContextStorage: vi.fn().mockImplementation(() => ({
    get: vi.fn().mockResolvedValue({
      email: 'test@example.com',
      name: 'Test User',
      role: 'Manager',
      company_context: {
        name: 'Test Company',
        domain: 'test.com',
        industry: 'Technology'
      },
      professional_profile: {
        fullName: 'Test User',
        role: 'Manager',
        seniority: 'Manager'
      }
    })
  }))
}))

describe('Intelligence Context Validation', () => {
  describe('validateIntelligenceContext', () => {
    it('should validate context with email and name', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User'
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should reject context without email or name', () => {
      const context = {} as IntelligenceContext
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should validate email format', () => {
      const context: IntelligenceContext = {
        email: 'invalid-email',
        name: 'Test User'
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('email'))).toBe(true)
    })

    it('should validate company structure', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          domain: 'test.com'
        }
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(true)
    })

    it('should reject company without domain', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        company: {
          domain: '' // Empty domain
        } as IntelligenceContext['company']
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('domain'))).toBe(true)
    })

    it('should validate session match', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        sessionId: 'session-1'
      }
      const result = validateIntelligenceContext(context, 'session-1')
      expect(result.valid).toBe(true)

      const mismatched = validateIntelligenceContext(context, 'session-2')
      expect(mismatched.valid).toBe(false)
      expect(mismatched.errors.some(e => e.includes('sessionId'))).toBe(true)
    })

    it('should detect stale context', () => {
      const oneHourAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString() // 2 hours ago
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        lastUpdated: oneHourAgo
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.includes('stale'))).toBe(true)
    })

    it('should accept fresh context', () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString() // 5 minutes ago
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        lastUpdated: fiveMinutesAgo
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(true)
    })

    it('should validate research confidence range', () => {
      const context: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        researchConfidence: 0.8
      }
      const result = validateIntelligenceContext(context)
      expect(result.valid).toBe(true)

      const invalidContext: IntelligenceContext = {
        email: 'test@example.com',
        name: 'Test User',
        researchConfidence: 1.5 // Invalid: > 1.0
      } as IntelligenceContext
      const invalidResult = validateIntelligenceContext(invalidContext)
      expect(invalidResult.valid).toBe(false)
      expect(invalidResult.errors.some(e => e.includes('confidence'))).toBe(true)
    })
  })

  describe('loadIntelligenceContextFromDB', () => {
    it('should load intelligence context from database', async () => {
      const context = await loadIntelligenceContextFromDB('test-session')
      expect(context).toBeTruthy()
      expect(context?.email).toBe('test@example.com')
      expect(context?.name).toBe('Test User')
    })

    it('should return null for anonymous session', async () => {
      const context = await loadIntelligenceContextFromDB('anonymous')
      expect(context).toBeNull()
    })

    it('should return null for invalid session', async () => {
      const context = await loadIntelligenceContextFromDB('')
      expect(context).toBeNull()
    })
  })
})
