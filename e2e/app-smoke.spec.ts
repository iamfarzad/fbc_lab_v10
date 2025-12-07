import { test, expect } from '@playwright/test'

// Lightweight smoke test to verify the app boots and core UI renders
// Runs headless in CI. Uses Playwright webServer (pnpm dev) from playwright.config.ts

test.describe('App smoke test', () => {
  test('loads home page and shows chat input', async ({ page, baseURL }) => {
    await page.goto(baseURL || 'http://localhost:3000')

    // Wait until network is idle to ensure initial bundles loaded
    await page.waitForLoadState('networkidle')

    // Verify key UI elements exist
    // Chat input textarea is a stable selector in ChatInputDock
    const input = page.locator('[data-testid="chat-input-textarea"]')
    await expect(input).toBeVisible({ timeout: 15000 })

    // Basic typing check (do not submit/send)
    await input.fill('Hello world')
    await expect(input).toHaveValue('Hello world')
  })
})
