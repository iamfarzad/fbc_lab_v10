import { vi } from 'vitest'

export interface MockChromeAI {
  languageModel?: {
    create: (options?: any) => Promise<any>
    capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>
  }
  summarizer?: {
    create: (options?: any) => Promise<any>
    capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>
  }
  rewriter?: {
    create: (options?: any) => Promise<any>
    capabilities: () => Promise<{ available: 'readily' | 'after-download' | 'no' }>
  }
}

export function createMockChromeAI(caps: {
  hasModel?: boolean
  hasSummarizer?: boolean
  hasRewriter?: boolean
  modelStatus?: 'readily' | 'after-download' | 'no'
} = {}): MockChromeAI {
  const { hasModel = true, hasSummarizer = true, hasRewriter = true, modelStatus = 'readily' } = caps

  const mockSession = {
    prompt: vi.fn(async (text: string) => `Generated: ${text}`),
    destroy: vi.fn()
  }

  const mockSummarizer = {
    summarize: vi.fn(async (text: string) => `Summary: ${text}`),
    destroy: vi.fn()
  }

  const mockRewriter = {
    rewrite: vi.fn(async (text: string) => `Rewritten: ${text}`),
    destroy: vi.fn()
  }

  const ai: MockChromeAI = {}

  if (hasModel) {
    ai.languageModel = {
      create: vi.fn(async () => mockSession),
      capabilities: vi.fn(async () => ({ available: modelStatus }))
    }
  }

  if (hasSummarizer) {
    ai.summarizer = {
      create: vi.fn(async () => mockSummarizer),
      capabilities: vi.fn(async () => ({ available: 'readily' }))
    }
  }

  if (hasRewriter) {
    ai.rewriter = {
      create: vi.fn(async () => mockRewriter),
      capabilities: vi.fn(async () => ({ available: 'readily' }))
    }
  }

  return ai
}

export function setupChromeAIMock(ai: MockChromeAI) {
  (globalThis as any).window = {
    ...globalThis.window,
    ai
  }
}

export function clearChromeAIMock() {
  if ((globalThis as any).window) {
    delete (globalThis as any).window.ai
  }
}

