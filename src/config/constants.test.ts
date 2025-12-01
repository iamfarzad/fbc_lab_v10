import { describe, it, expect } from 'vitest'
import { WEBSOCKET_CONFIG, GEMINI_MODELS } from './constants'

describe('constants', () => {
  describe('WEBSOCKET_CONFIG', () => {
    it('should have production URL', () => {
      expect(WEBSOCKET_CONFIG.PRODUCTION_URL).toBeDefined()
      expect(WEBSOCKET_CONFIG.PRODUCTION_URL).toMatch(/^wss?:\/\//)
    })

    it('should have development URL', () => {
      expect(WEBSOCKET_CONFIG.DEVELOPMENT_URL).toBeDefined()
      expect(WEBSOCKET_CONFIG.DEVELOPMENT_URL).toMatch(/^wss?:\/\//)
    })

    it('should have URL getter', () => {
      expect(WEBSOCKET_CONFIG.URL).toBeDefined()
      expect(WEBSOCKET_CONFIG.URL).toMatch(/^wss?:\/\//)
    })

    it('should have reconnect configuration', () => {
      expect(WEBSOCKET_CONFIG.RECONNECT_DELAY).toBeGreaterThan(0)
      expect(WEBSOCKET_CONFIG.MAX_RECONNECT_ATTEMPTS).toBeGreaterThan(0)
    })
  })

  describe('GEMINI_MODELS', () => {
    it('should have model definitions', () => {
      expect(GEMINI_MODELS.FLASH_LATEST).toBeDefined()
      expect(GEMINI_MODELS.FLASH_LITE_LATEST).toBeDefined()
    })

    it('should have model names as strings', () => {
      expect(typeof GEMINI_MODELS.FLASH_LATEST).toBe('string')
      expect(typeof GEMINI_MODELS.FLASH_LITE_LATEST).toBe('string')
    })
  })
})

