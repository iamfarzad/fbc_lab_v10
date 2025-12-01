import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getBrowserInfo, browserSupport } from './browser-compat'

describe('browser-compat', () => {
  beforeEach(() => {
    // Reset browser detection
    vi.clearAllMocks()
  })

  describe('getBrowserInfo', () => {
    it('should detect Chrome', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      })
      
      const result = getBrowserInfo()
      expect(result.name).toBe('Chrome')
      expect(result.version).toBe('120')
    })

    it('should detect Safari', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
      })
      
      const result = getBrowserInfo()
      expect(result.name).toBe('Safari')
      expect(result.version).toBe('17')
    })

    it('should detect Firefox', () => {
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
      })
      
      const result = getBrowserInfo()
      expect(result.name).toBe('Firefox')
      expect(result.version).toBe('121')
    })
  })

  describe('browserSupport', () => {
    it('should check for WebSocket support', () => {
      expect(browserSupport.webSocket).toBeDefined()
      expect(typeof browserSupport.webSocket).toBe('boolean')
    })

    it('should check for AudioContext support', () => {
      expect(browserSupport.audioContext).toBeDefined()
      expect(typeof browserSupport.audioContext).toBe('boolean')
    })

    it('should check for getUserMedia support', () => {
      expect(browserSupport.getUserMedia).toBeDefined()
      expect(typeof browserSupport.getUserMedia).toBe('boolean')
    })
  })
})

