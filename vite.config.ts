import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'types': path.resolve(__dirname, './types.ts'),
      'config': path.resolve(__dirname, './config.ts'),
      'utils': path.resolve(__dirname, './utils'),
      'components': path.resolve(__dirname, './components'),
      'services': path.resolve(__dirname, './services'),
      'src': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})

