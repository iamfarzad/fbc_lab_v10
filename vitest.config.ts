import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './test/setup.ts',
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
      '**/__tests__/**/*.{ts,tsx}',
      'test/**/*.test.{ts,tsx}',
      'e2e/**/*.spec.{ts,tsx}'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/test/helpers/**',
      '**/__tests__/test-helpers/**',
      '**/stubs/**',
      '**/*.stub.ts',
      '**/e2e/**',
      '**/*.spec.ts'
    ],
    testTimeout: 30000, // 30 seconds for API tests
    hookTimeout: 10000,
    // Separate timeout for API tests (can be set per test with test.setTimeout)
    coverage: {
      include: ['src/**/*.ts', 'services/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
    }
  },
  resolve: {
    alias: {
      'types': path.resolve(__dirname, './types.ts'),
      'config': path.resolve(__dirname, './config.ts'),
      'utils': path.resolve(__dirname, './utils'),
      'components': path.resolve(__dirname, './components'),
      'services': path.resolve(__dirname, './services'),
      'src': path.resolve(__dirname, './src'),
      // Support both absolute and relative imports
      '@': path.resolve(__dirname, './src'),
      // Mock Next.js for tests
      'next/server': path.resolve(__dirname, './src/core/session/__tests__/stubs/next-server.ts')
    }
  },
  define: {
    'process.env.API_KEY': JSON.stringify('test-api-key'),
    'process.env.GEMINI_API_KEY': JSON.stringify('test-gemini-key'),
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('https://test.supabase.co'),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('test-anon-key'),
    'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify('test-service-role-key'),
    'process.env.ENABLE_AGENT_AUDIT': JSON.stringify('false'),
    'process.env.NEXT_PUBLIC_VOICE_VERBOSE_LOGS': JSON.stringify('false'),
    'process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG': JSON.stringify('0'),
    'process.env.TOOL_RETRY_MAX': JSON.stringify('3'),
    'process.env.ENABLE_TOOL_CACHING': JSON.stringify('true'),
    'process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL': JSON.stringify('ws://localhost:3001'),
    'process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_PORT': JSON.stringify('3001'),
    'process.env.NEXT_PUBLIC_LIVE_SERVER_URL': JSON.stringify(''),
    'process.env.NODE_ENV': JSON.stringify('test'),
  }
})

