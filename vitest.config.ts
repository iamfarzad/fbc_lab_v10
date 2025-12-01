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
      '**/stubs/**',
      '**/*.stub.ts',
      '**/e2e/**',
      '**/*.spec.ts'
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      include: ['src/**/*.ts', 'services/**/*.ts', 'server/**/*.ts'],
      exclude: ['**/__tests__/**', '**/*.test.ts', '**/*.spec.ts', '**/node_modules/**']
    }
  },
  resolve: {
    alias: {
      // Support both absolute and relative imports
      '@': path.resolve(__dirname, './src'),
      // Mock Next.js for tests
      'next/server': path.resolve(__dirname, './src/core/session/__tests__/stubs/next-server.ts')
    }
  }
})

