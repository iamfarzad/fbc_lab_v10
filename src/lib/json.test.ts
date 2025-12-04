import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { safeParseJson, safeParseJsonObject, parseJsonSafe } from './json.js'

describe('JSON utilities', () => {
  describe('safeParseJson', () => {
    it('should parse valid JSON', () => {
      const result = safeParseJson('{"key": "value"}', {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should return fallback for invalid JSON', () => {
      const fallback = { default: true }
      const result = safeParseJson('invalid json', fallback)
      expect(result).toBe(fallback)
    })

    it('should return fallback for null/undefined', () => {
      const fallback = { default: true }
      expect(safeParseJson(null, fallback)).toBe(fallback)
      expect(safeParseJson(undefined, fallback)).toBe(fallback)
    })
  })

  describe('safeParseJsonObject', () => {
    it('should parse valid object', () => {
      const result = safeParseJsonObject({ key: 'value' }, {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should parse JSON string', () => {
      const result = safeParseJsonObject('{"key": "value"}', {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should return fallback for invalid input', () => {
      const fallback = { default: true }
      expect(safeParseJsonObject([], fallback)).toBe(fallback)
      expect(safeParseJsonObject('invalid', fallback)).toBe(fallback)
    })
  })

  describe('parseJsonSafe', () => {
    it('should parse valid Response with schema', async () => {
      const schema = z.object({ key: z.string() })
      const response = new Response(JSON.stringify({ key: 'value' }))
      const result = await parseJsonSafe(response, schema, {})
      expect(result).toEqual({ key: 'value' })
    })

    it('should return fallback for invalid schema', async () => {
      const schema = z.object({ key: z.string() })
      const response = new Response(JSON.stringify({ wrong: 'value' }))
      const fallback = { default: true }
      const result = await parseJsonSafe(response, schema, fallback)
      expect(result).toBe(fallback)
    })
  })
})

