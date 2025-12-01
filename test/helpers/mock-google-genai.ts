import { vi } from 'vitest'

// Mock Type enum for schema definitions
export const Type = {
  OBJECT: 'object',
  STRING: 'string',
  NUMBER: 'number',
  ARRAY: 'array',
  BOOLEAN: 'boolean'
}

export function createMockGoogleGenAI() {
  const mockChat = {
    sendMessage: vi.fn(async () => ({
      text: 'Mock response',
      candidates: [
        {
          content: {
            parts: [{ text: 'Mock response' }]
          },
          groundingMetadata: {
            groundingChunks: []
          }
        }
      ]
    }))
  }

  const mockModels = {
    generateContent: vi.fn(async () => ({
      text: JSON.stringify({
        company: { name: 'Test Company', domain: 'test.com' },
        person: { fullName: 'Test Person' },
        role: 'Test Role',
        confidence: 0.9
      }),
      candidates: [
        {
          groundingMetadata: {
            groundingChunks: [
              {
                web: {
                  uri: 'https://example.com',
                  title: 'Example'
                }
              }
            ]
          }
        }
      ]
    }))
  }

  return {
    chats: {
      create: vi.fn(() => mockChat)
    },
    models: mockModels
  }
}

