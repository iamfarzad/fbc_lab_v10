import { vi } from 'vitest'

export function createMockAudioContext() {
  const mockAnalyser = {
    fftSize: 128,
    smoothingTimeConstant: 0.1,
    frequencyBinCount: 64,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteFrequencyData: vi.fn((array: Uint8Array) => {
      // Fill with mock data
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 255)
      }
    })
  }

  const mockGainNode = {
    connect: vi.fn(),
    disconnect: vi.fn()
  }

  const mockBufferSource = {
    buffer: null as any,
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  }

  const mockMediaStreamSource = {
    connect: vi.fn(),
    disconnect: vi.fn()
  }

  const mockScriptProcessor = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    onaudioprocess: null as any
  }

  const mockAudioContext = {
    state: 'running' as AudioContextState,
    currentTime: 0,
    sampleRate: 16000,
    destination: {} as AudioDestinationNode,
    createAnalyser: vi.fn(() => mockAnalyser),
    createGain: vi.fn(() => mockGainNode),
    createBufferSource: vi.fn(() => mockBufferSource),
    createMediaStreamSource: vi.fn(() => mockMediaStreamSource),
    createScriptProcessor: vi.fn(() => mockScriptProcessor),
    createBuffer: vi.fn((channels: number, length: number, sampleRate: number) => ({
      numberOfChannels: channels,
      length,
      sampleRate,
      getChannelData: vi.fn(() => new Float32Array(length))
    })),
    resume: vi.fn(() => Promise.resolve()),
    close: vi.fn(() => Promise.resolve()),
    decodeAudioData: vi.fn(async (data: ArrayBuffer) => ({
      duration: 1.0,
      sampleRate: 24000,
      numberOfChannels: 1,
      getChannelData: vi.fn(() => new Float32Array(24000))
    }))
  }

  return {
    mockAudioContext,
    mockAnalyser,
    mockGainNode,
    mockBufferSource,
    mockMediaStreamSource,
    mockScriptProcessor
  }
}

export function setupAudioMocks() {
  const mocks = createMockAudioContext()

  // Mock AudioContext constructor
  global.AudioContext = vi.fn(() => mocks.mockAudioContext) as any
  ;(global as any).webkitAudioContext = global.AudioContext

  // Mock getUserMedia
  global.navigator = {
    ...global.navigator,
    mediaDevices: {
      getUserMedia: vi.fn(() =>
        Promise.resolve({
          getTracks: () => [],
          getAudioTracks: () => []
        } as MediaStream)
      )
    }
  } as Navigator

  // Mock requestAnimationFrame
  global.requestAnimationFrame = vi.fn((cb) => {
    setTimeout(cb, 16)
    return 1
  })
  global.cancelAnimationFrame = vi.fn()

  return mocks
}

