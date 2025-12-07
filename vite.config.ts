import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars - matches v9 approach
  const env = loadEnv(mode, '.', '')

  return {
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
    // Define process.env replacements - matches v9 approach
    // This allows browser code to use process.env.* which gets replaced at build time
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY || env.API_KEY || ''),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_URL || env.VITE_SUPABASE_URL || ''),
      'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify(env.NEXT_PUBLIC_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.SUPABASE_SERVICE_ROLE_KEY': JSON.stringify(env.SUPABASE_SERVICE_ROLE_KEY || ''),
      'process.env.ENABLE_AGENT_AUDIT': JSON.stringify(env.ENABLE_AGENT_AUDIT || 'false'),
      'process.env.NEXT_PUBLIC_VOICE_VERBOSE_LOGS': JSON.stringify(env.NEXT_PUBLIC_VOICE_VERBOSE_LOGS || env.VITE_VOICE_VERBOSE_LOGS || 'false'),
      'process.env.NEXT_PUBLIC_CLIENT_LIVE_LOG': JSON.stringify(env.NEXT_PUBLIC_CLIENT_LIVE_LOG || env.VITE_CLIENT_LIVE_LOG || '0'),
      'process.env.TOOL_RETRY_MAX': JSON.stringify(env.TOOL_RETRY_MAX || '3'),
      'process.env.ENABLE_TOOL_CACHING': JSON.stringify(env.ENABLE_TOOL_CACHING || 'true'),
      'process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL': JSON.stringify(env.NEXT_PUBLIC_LIVE_SERVER_DEV_URL || env.VITE_LIVE_SERVER_DEV_URL || 'ws://localhost:3001'),
      'process.env.NEXT_PUBLIC_LIVE_SERVER_DEV_PORT': JSON.stringify(env.NEXT_PUBLIC_LIVE_SERVER_DEV_PORT || env.VITE_LIVE_SERVER_DEV_PORT || '3001'),
      'process.env.NEXT_PUBLIC_LIVE_SERVER_URL': JSON.stringify(env.NEXT_PUBLIC_LIVE_SERVER_URL || env.VITE_LIVE_SERVER_URL || ''),
      'process.env.NODE_ENV': JSON.stringify(mode === 'production' ? 'production' : 'development'),
    },
    server: {
      port: 3000,
      host: true,
      proxy: {
        '/api': {
          // Use 127.0.0.1 to avoid rare localhost resolution issues in some dev setups
          target: 'http://127.0.0.1:3002',
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
      target: 'es2015', // Better browser compatibility (matches v9)
      minify: 'esbuild',
      cssMinify: true,
    },
  }
})

