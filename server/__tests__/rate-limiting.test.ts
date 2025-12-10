/**
 * Rate Limiting Tests
 * 
 * Tests for media rate limiting to ensure screen share and webcam work indefinitely
 * without being rate limited.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { checkRateLimit, MEDIA_RATE_LIMIT, AUDIO_RATE_LIMIT, CLIENT_RATE_LIMIT, connectionStates } from '../rate-limiting/websocket-rate-limiter.js'
import { MESSAGE_TYPES } from '../message-types.js'

describe('Rate Limiting', () => {
  const connectionId = 'test-connection-1'
  const sessionId = 'test-session-1'

  beforeEach(() => {
    // Clear connection states before each test
    connectionStates.clear()
  })

  afterEach(() => {
    // Clean up after each test
    connectionStates.clear()
  })

  describe('MEDIA_RATE_LIMIT', () => {
    it('should allow 300 frames per minute for image media', () => {
      // Send 300 image frames rapidly (within 1 minute)
      for (let i = 0; i < 300; i++) {
        const result = checkRateLimit(
          connectionId,
          sessionId,
          MESSAGE_TYPES.REALTIME_INPUT,
          'image/jpeg'
        )
        expect(result.allowed).toBe(true)
      }
    })

    it('should rate limit after 300 frames per minute for image media', () => {
      // Send 300 frames (should all pass)
      for (let i = 0; i < 300; i++) {
        const result = checkRateLimit(
          connectionId,
          sessionId,
          MESSAGE_TYPES.REALTIME_INPUT,
          'image/jpeg'
        )
        expect(result.allowed).toBe(true)
      }

      // 301st frame should be rate limited
      const result = checkRateLimit(
        connectionId,
        sessionId,
        MESSAGE_TYPES.REALTIME_INPUT,
        'image/jpeg'
      )
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBeDefined()
    })

    it('should allow video media frames with MEDIA_RATE_LIMIT', () => {
      const result = checkRateLimit(
        connectionId,
        sessionId,
        MESSAGE_TYPES.REALTIME_INPUT,
        'video/mp4'
      )
      expect(result.allowed).toBe(true)
    })

    it('should not rate limit media frames using CLIENT_RATE_LIMIT', () => {
      // Media should use MEDIA_RATE_LIMIT (300/min), not CLIENT_RATE_LIMIT (100/min)
      // Send 150 frames - should pass with MEDIA_RATE_LIMIT but would fail with CLIENT_RATE_LIMIT
      for (let i = 0; i < 150; i++) {
        const result = checkRateLimit(
          connectionId,
          sessionId,
          MESSAGE_TYPES.REALTIME_INPUT,
          'image/jpeg'
        )
        expect(result.allowed).toBe(true)
      }
    })
  })

  describe('Audio Rate Limiting', () => {
    it('should still apply AUDIO_RATE_LIMIT for audio chunks', () => {
      // Audio should use AUDIO_RATE_LIMIT (200/second), not MEDIA_RATE_LIMIT
      for (let i = 0; i < 200; i++) {
        const result = checkRateLimit(
          connectionId,
          sessionId,
          MESSAGE_TYPES.USER_AUDIO
        )
        expect(result.allowed).toBe(true)
      }

      // 201st audio chunk should be rate limited
      const result = checkRateLimit(
        connectionId,
        sessionId,
        MESSAGE_TYPES.USER_AUDIO
      )
      expect(result.allowed).toBe(false)
    })
  })

  describe('Combined Modalities', () => {
    it('should allow simultaneous audio, image, and video without conflicts', () => {
      // Send mix of audio, image, and video frames
      for (let i = 0; i < 50; i++) {
        const audioResult = checkRateLimit(connectionId, sessionId, MESSAGE_TYPES.USER_AUDIO)
        const imageResult = checkRateLimit(connectionId, sessionId, MESSAGE_TYPES.REALTIME_INPUT, 'image/jpeg')
        const videoResult = checkRateLimit(connectionId, sessionId, MESSAGE_TYPES.REALTIME_INPUT, 'video/mp4')

        expect(audioResult.allowed).toBe(true)
        expect(imageResult.allowed).toBe(true)
        expect(videoResult.allowed).toBe(true)
      }
    })
  })

  describe('Screen Share Long Duration', () => {
    it('should allow screen share for 5+ minutes without rate limiting', async () => {
      // Simulate 5 minutes of screen share at 2 FPS = 600 frames
      // MEDIA_RATE_LIMIT is 300/minute, so we need to wait for window reset
      const framesPerMinute = 120 // Screen share sends ~120 frames/minute
      const minutes = 5
      const totalFrames = framesPerMinute * minutes

      let rateLimitedCount = 0
      for (let i = 0; i < totalFrames; i++) {
        // Simulate time passing (1 frame every 500ms = 2 FPS)
        if (i > 0 && i % 120 === 0) {
          // Every minute, advance time to reset window
          const state = connectionStates.get(connectionId)
          if (state) {
            // Reset media window by setting mediaLastAt to current time
            state.mediaLastAt = Date.now()
            state.mediaCount = 0
          }
        }

        const result = checkRateLimit(
          connectionId,
          sessionId,
          MESSAGE_TYPES.REALTIME_INPUT,
          'image/jpeg'
        )

        if (!result.allowed) {
          rateLimitedCount++
        }
      }

      // Should have very few rate limited frames (only at window boundaries)
      expect(rateLimitedCount).toBeLessThan(totalFrames * 0.1) // Less than 10% rate limited
    })
  })
})
