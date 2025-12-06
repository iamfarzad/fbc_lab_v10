/**
 * Test Environment Configuration
 * 
 * Environment variable handling and test configuration for E2E tests
 */

/**
 * Check if E2E integration tests should run
 */
export function shouldRunIntegrationTests(): boolean {
  return process.env.ENABLE_E2E_TOOL_TESTS === '1' || process.env.ENABLE_E2E_TOOL_TESTS === 'true'
}

/**
 * Check if real tool implementations should be used
 */
export function shouldUseRealTools(): boolean {
  return process.env.USE_REAL_TOOLS === '1' || process.env.USE_REAL_TOOLS === 'true'
}

/**
 * Check if real WebSocket server should be used
 */
export function shouldUseRealWebSocket(): boolean {
  return process.env.USE_REAL_WEBSOCKET === '1' || process.env.USE_REAL_WEBSOCKET === 'true'
}

/**
 * Check if real API server should be used
 */
export function shouldUseRealAPI(): boolean {
  return process.env.USE_REAL_API === '1' || process.env.USE_REAL_API === 'true'
}

/**
 * Get test timeout in milliseconds
 */
export function getTestTimeout(): number {
  const timeout = parseInt(process.env.TEST_TIMEOUT || '30000', 10)
  return timeout > 0 ? timeout : 30000
}

/**
 * Get test configuration
 */
export interface TestConfig {
  useRealTools: boolean
  useRealWebSocket: boolean
  useRealAPI: boolean
  timeout: number
  wsUrl: string
  apiUrl: string
}

export function getTestConfig(): TestConfig {
  return {
    useRealTools: shouldUseRealTools(),
    useRealWebSocket: shouldUseRealWebSocket(),
    useRealAPI: shouldUseRealAPI(),
    timeout: getTestTimeout(),
    wsUrl: process.env.TEST_WS_URL || 'ws://localhost:3001',
    apiUrl: process.env.TEST_API_URL || 'http://localhost:3002',
  }
}

/**
 * Skip test if server not available
 * Returns a function that can be used in test setup
 */
export function skipIfNoServer(serverType: 'websocket' | 'api'): () => void {
  return () => {
    const config = getTestConfig()
    const shouldUseReal = serverType === 'websocket' ? config.useRealWebSocket : config.useRealAPI
    
    if (shouldUseReal) {
      // In a real implementation, you might ping the server here
      // For now, we'll just check the environment variable
      // Tests should handle connection failures gracefully
    }
  }
}

/**
 * Check if API keys are available for real tool execution
 */
export function hasRequiredAPIKeys(): boolean {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.API_KEY
  const searchKey = process.env.GOOGLE_SEARCH_API_KEY
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID

  // For basic tools, we need at least Gemini API key
  // For search_web, we need Google Search API key and engine ID
  return !!geminiKey && !!searchKey && !!searchEngineId
}

/**
 * Get describe function based on test configuration
 * Returns describe.skip if tests should be skipped
 */
export function getDescribeFunction() {
  if (shouldRunIntegrationTests()) {
    return describe
  }
  return describe.skip
}



