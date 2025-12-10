/**
 * URL Analysis Tests
 * 
 * Tests for URL detection and analysis in chat and voice modes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { detectAndAnalyzeUrls } from '../core/utils/url-analysis.js'

// Mock the analyzeUrl function
vi.mock('../core/intelligence/url-context-tool.js', () => ({
  analyzeUrl: vi.fn().mockResolvedValue({
    pageSummary: 'Test page summary',
    keyInitiatives: ['Initiative 1', 'Initiative 2'],
    techStackHints: ['React', 'TypeScript'],
    hiringSignals: ['We are hiring'],
    painPointsMentioned: ['Pain point 1'],
    confidence: 0.9
  })
}))

describe('URL Analysis', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect URLs in message content', async () => {
    const message = 'Check out https://example.com for more info'
    const result = await detectAndAnalyzeUrls(message)
    
    expect(result).toBeTruthy()
    expect(result).toContain('example.com')
    expect(result).toContain('Summary:')
  })

  it('should return empty string when no URLs are detected', async () => {
    const message = 'This is a regular message with no URLs'
    const result = await detectAndAnalyzeUrls(message)
    
    expect(result).toBe('')
  })

  it('should analyze multiple URLs in a message', async () => {
    const message = 'Check https://example.com and https://test.com'
    const result = await detectAndAnalyzeUrls(message)
    
    expect(result).toContain('URL 1')
    expect(result).toContain('URL 2')
    expect(result).toContain('example.com')
    expect(result).toContain('test.com')
  })

  it('should work without intelligenceContext', async () => {
    const message = 'Visit https://example.com'
    const result = await detectAndAnalyzeUrls(message, undefined)
    
    expect(result).toBeTruthy()
    expect(result.length).toBeGreaterThan(0)
  })

  it('should handle URLs with query parameters', async () => {
    const message = 'See https://example.com/page?param=value'
    const result = await detectAndAnalyzeUrls(message)
    
    expect(result).toBeTruthy()
    expect(result).toContain('example.com')
  })
})
