import { test, expect } from '@playwright/test'
import { chromium, Browser, Page, BrowserContext } from '@playwright/test'

// Production URL for real-world testing
const PRODUCTION_URL = 'https://fbc-ai-agent.vercel.app'

test.describe('Real-World Voice Browser Tests', () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  test.beforeAll(async () => {
    browser = await chromium.launch({
      headless: false, // Run with visible browser for microphone access
      args: [
        '--use-fake-ui-for-media-stream', // Allow microphone access without prompt
        '--use-fake-device-for-media-stream', // Use fake microphone
        '--allow-running-insecure-content',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    })
  })

  test.afterAll(async () => {
    await browser.close()
  })

  test.beforeEach(async () => {
    context = await browser.newContext({
      permissions: ['microphone'], // Grant microphone permission
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    page = await context.newPage()
  })

  test.afterEach(async () => {
    await context.close()
  })

  test('should load production voice interface', async () => {
    await page.goto(PRODUCTION_URL)

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Check if voice controls are present
    const voiceButton = await page
      .locator(
        '[data-testid="voice-button"], button:has-text("Voice"), button:has-text("🎤")'
      )
      .first()
    await expect(voiceButton).toBeVisible({ timeout: 10000 })
  })

  test('should handle microphone permission flow', async () => {
    await page.goto(PRODUCTION_URL)

    // Mock getUserMedia to simulate real microphone access
    await page.addInitScript(() => {
      // Override getUserMedia to return a mock stream
      const originalGetUserMedia = navigator.mediaDevices.getUserMedia
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        if (constraints.audio) {
          // Create a mock audio stream
          const mockStream = new MediaStream()
          const mockTrack = {
            enabled: true,
            muted: false,
            readyState: 'live',
            stop: () => {},
            getSettings: () => ({
              sampleRate: 16000,
              channelCount: 1,
              deviceId: 'mock-microphone'
            }),
            getCapabilities: () => ({
              sampleRate: { min: 8000, max: 48000 },
              channelCount: { min: 1, max: 2 }
            })
          } as MediaStreamTrack

          mockStream.addTrack(mockTrack)
          return mockStream
        }
        return originalGetUserMedia.call(navigator.mediaDevices, constraints)
      }
    })

    // Try to click voice button to trigger microphone access
    const voiceButton = await page
      .locator(
        'button:has-text("Voice"), button:has-text("🎤"), [data-testid="voice-button"]'
      )
      .first()
    if (await voiceButton.isVisible()) {
      await voiceButton.click()

      // Wait for any microphone permission dialog or UI changes
      await page.waitForTimeout(2000)
    }
  })
})

