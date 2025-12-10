import { describe, it, expect } from 'vitest'
import { AppConfig } from '../../config'

describe('AppConfig', () => {
  it('should have correct audio settings', () => {
    expect(AppConfig.api.audio.inputSampleRate).toBe(16000)
    expect(AppConfig.api.audio.outputSampleRate).toBe(24000)
  })

  it('should have correct model IDs', () => {
    expect(AppConfig.api.models.default).toBe('gemini-2.5-flash')
    expect(AppConfig.api.models.flash).toBe('gemini-2.5-flash')
  })
})

