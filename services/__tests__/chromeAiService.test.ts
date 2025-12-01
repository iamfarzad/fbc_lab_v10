import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ChromeAiService } from '../chromeAiService'
import {
  clearChromeAIMock,
  createMockChromeAI,
  setupChromeAIMock
} from '../../test/helpers/mock-chrome-ai'
import { mockResearchResult } from '../../test/helpers/test-data'

describe('ChromeAiService', () => {
  let service: ChromeAiService

  beforeEach(() => {
    service = new ChromeAiService()
    clearChromeAIMock()
  })

  afterEach(() => {
    clearChromeAIMock()
    vi.clearAllMocks()
  })

  describe('getCapabilities()', () => {
    it('returns unsupported when window.ai missing', async () => {
      const g = globalThis as typeof globalThis & { window?: { ai?: unknown } }
      delete g.window?.ai

      const caps = await service.getCapabilities()

      expect(caps.hasModel).toBe(false)
      expect(caps.hasSummarizer).toBe(false)
      expect(caps.hasRewriter).toBe(false)
      expect(caps.status).toBe('unsupported')
    })

    it('detects languageModel availability', async () => {
      const mockAI = createMockChromeAI({ hasModel: true, modelStatus: 'readily' })
      setupChromeAIMock(mockAI)

      const caps = await service.getCapabilities()

      expect(caps.hasModel).toBe(true)
      expect(caps.status).toBe('ready')
    })

    it('detects summarizer availability', async () => {
      const mockAI = createMockChromeAI({ hasSummarizer: true })
      setupChromeAIMock(mockAI)

      const caps = await service.getCapabilities()

      expect(caps.hasSummarizer).toBe(true)
    })

    it('detects rewriter availability', async () => {
      const mockAI = createMockChromeAI({ hasRewriter: true })
      setupChromeAIMock(mockAI)

      const caps = await service.getCapabilities()

      expect(caps.hasRewriter).toBe(true)
    })

    it('handles readily vs after-download status', async () => {
      const mockAI = createMockChromeAI({ hasModel: true, modelStatus: 'after-download' })
      setupChromeAIMock(mockAI)

      const caps = await service.getCapabilities()

      expect(caps.hasModel).toBe(true)
      expect(caps.status).toBe('downloading')
    })

    it('handles errors gracefully', async () => {
      const mockAI = {
        languageModel: {
          capabilities: vi.fn(() => Promise.reject(new Error('Test error')))
        }
      }
      setupChromeAIMock(mockAI as unknown as ReturnType<typeof createMockChromeAI>)

      const caps = await service.getCapabilities()

      expect(caps.hasModel).toBe(false)
      expect(caps.status).toBe('unsupported')
    })
  })

  describe('generateText()', () => {
    it('creates session with system prompt', async () => {
      const mockAI = createMockChromeAI({ hasModel: true })
      setupChromeAIMock(mockAI)

      await service.generateText('Hello', 'You are helpful')

      expect(mockAI.languageModel?.create).toHaveBeenCalledWith({
        systemPrompt: 'You are helpful'
      })
    })

    it('returns generated text', async () => {
      const mockAI = createMockChromeAI({ hasModel: true })
      setupChromeAIMock(mockAI)

      const result = await service.generateText('Hello')

      expect(result).toContain('Generated: Hello')
    })

    it('handles errors gracefully', async () => {
      const mockAI = createMockChromeAI({ hasModel: true })
      setupChromeAIMock(mockAI)
      if (mockAI.languageModel) {
        mockAI.languageModel.create = vi.fn(() =>
          Promise.reject(new Error('Generation failed'))
        )
      }

      await expect(service.generateText('Hello')).rejects.toThrow()
    })

    it('throws when languageModel not supported', async () => {
      const g2 = globalThis as typeof globalThis & { window?: { ai?: unknown } }
      delete g2.window?.ai

      await expect(service.generateText('Hello')).rejects.toThrow(
        'Language Model not supported'
      )
    })
  })

  describe('rewrite()', () => {
    it('uses rewriter API when available', async () => {
      const mockAI = createMockChromeAI({ hasRewriter: true, hasModel: true })
      setupChromeAIMock(mockAI)

      const result = await service.rewrite('Original text', 'more-formal')

      expect(mockAI.rewriter?.create).toHaveBeenCalled()
      expect(result).toContain('Rewritten: Original text')
    })

    it('falls back to generateText when rewriter missing', async () => {
      const mockAI = createMockChromeAI({ hasModel: true, hasRewriter: false })
      setupChromeAIMock(mockAI)

      const result = await service.rewrite('Original text', 'more-formal')

      expect(mockAI.languageModel?.create).toHaveBeenCalled()
      expect(result).toContain('Generated:')
    })

    it('includes context in fallback prompt', async () => {
      const mockAI = createMockChromeAI({ hasModel: true, hasRewriter: false })
      setupChromeAIMock(mockAI)

      await service.rewrite('Text', 'more-formal', mockResearchResult)

      expect(mockAI.languageModel?.create).toHaveBeenCalled()
      const createCall = (mockAI.languageModel?.create as ReturnType<typeof vi.fn>)
        ?.mock.calls[0]
      const systemPrompt = createCall?.[0]?.systemPrompt
      expect(systemPrompt).toBeDefined()
      if (systemPrompt) {
        expect(systemPrompt).toContain(mockResearchResult.person.fullName)
      }
    })

    it('handles shorter tone', async () => {
      const mockAI = createMockChromeAI({ hasRewriter: true })
      setupChromeAIMock(mockAI)

      await service.rewrite('Long text here', 'shorter')

      expect(mockAI.rewriter?.create).toHaveBeenCalledWith(
        expect.objectContaining({
          length: 'shorter'
        })
      )
    })

    it('handles rewriter errors and falls back', async () => {
      const mockAI = createMockChromeAI({ hasRewriter: true, hasModel: true })
      setupChromeAIMock(mockAI)
      if (mockAI.rewriter) {
        mockAI.rewriter.create = vi.fn(() =>
          Promise.reject(new Error('Rewriter failed'))
        )
      }

      const result = await service.rewrite('Text', 'more-formal')

      expect(result).toContain('Generated:')
    })
  })

  describe('summarize()', () => {
    it('uses summarizer API when available', async () => {
      const mockAI = createMockChromeAI({ hasSummarizer: true })
      setupChromeAIMock(mockAI)

      const result = await service.summarize('Long text to summarize')

      expect(mockAI.summarizer?.create).toHaveBeenCalled()
      expect(result).toContain('Summary:')
    })

    it('falls back to generateText', async () => {
      const mockAI = createMockChromeAI({ hasModel: true, hasSummarizer: false })
      setupChromeAIMock(mockAI)

      const result = await service.summarize('Text')

      expect(mockAI.languageModel?.create).toHaveBeenCalled()
      expect(result).toContain('Generated:')
    })

    it('handles summarizer errors and falls back', async () => {
      const mockAI = createMockChromeAI({ hasSummarizer: true, hasModel: true })
      setupChromeAIMock(mockAI)
      if (mockAI.summarizer) {
        mockAI.summarizer.create = vi.fn(() =>
          Promise.reject(new Error('Summarizer failed'))
        )
      }

      const result = await service.summarize('Text')

      expect(result).toContain('Generated:')
    })
  })

  describe('proofread()', () => {
    it('uses correct system prompt', async () => {
      const mockAI = createMockChromeAI({ hasModel: true })
      setupChromeAIMock(mockAI)

      await service.proofread('Text with erors')

      const createCall = (mockAI.languageModel?.create as ReturnType<typeof vi.fn>)
        ?.mock.calls[0][0]
      expect(createCall.systemPrompt).toContain('professional copy editor')
    })
  })
})

