import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../core/database.types.js';

// 🔧 MASTER FLOW: Static env access for Vite build-time replacement
// CRITICAL: Vite's `define` ONLY works with static `process.env.VAR_NAME` access
// Dynamic access like `process.env[name]` will NOT be replaced at build time

// Static env var access - Vite replaces these at build time
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_URL = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SUPABASE_URL) || 
                     (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || '';
// eslint-disable-next-line @typescript-eslint/no-explicit-any  
const SUPABASE_ANON_KEY = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 
                          (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || '';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SUPABASE_SERVICE_KEY = (typeof process !== 'undefined' && (process as any).env?.SUPABASE_SERVICE_ROLE_KEY) || '';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const IS_PRODUCTION = (typeof process !== 'undefined' && (process as any).env?.NODE_ENV === 'production') ||
                      (typeof import.meta !== 'undefined' && import.meta.env?.PROD);

// Validation helper for static env vars
function validateEnv(value: string | undefined, name: string): string {
  if (value && value !== '' && value !== 'undefined') {
    return value;
  }
  
  if (IS_PRODUCTION) {
    // Log warning but don't throw - let the app degrade gracefully
    console.error(`[Supabase] Missing required env var: ${name}. Add it to Vercel environment variables.`);
    return '';
  } else {
    console.warn(`⚠️ Missing env: ${name} (using placeholder for development)`);
    console.warn(`   Add ${name} to .env.local for full functionality`);
    return name === 'NEXT_PUBLIC_SUPABASE_URL' ? 'https://placeholder.supabase.co' : 'placeholder-key';
  }
}

// Singleton instances - cached to prevent multiple GoTrueClient instances
// Use globalThis for browser context to survive HMR/fast refresh
declare global {
  interface Window {
    __fbc_supabaseServer?: SupabaseClient<Database>;
    __fbc_supabaseService?: SupabaseClient<Database>;
  }
}

let supabaseServerInstance: SupabaseClient<Database> | null = null;
let supabaseServiceInstance: SupabaseClient<Database> | null = null;

/**
 * Get or create the Supabase server client (anon key) - singleton pattern
 * This prevents multiple GoTrueClient instances from being created
 * Uses window global in browser to survive HMR/fast refresh
 */
export function getSupabaseServer(): SupabaseClient<Database> {
  // CRITICAL: Always check window global FIRST (survives HMR/fast refresh)
  // During HMR, module-level variables reset but window global persists
  if (typeof window !== 'undefined') {
    if (window.__fbc_supabaseServer) {
      // Sync module-level cache with window global for consistency
      supabaseServerInstance = window.__fbc_supabaseServer;
      return window.__fbc_supabaseServer;
    }
  }
  
  // Return cached module-level instance if available (server-side or first load)
  if (supabaseServerInstance) {
    // Also cache in window for browser context (if not already cached)
    if (typeof window !== 'undefined' && !window.__fbc_supabaseServer) {
      window.__fbc_supabaseServer = supabaseServerInstance;
    }
    return supabaseServerInstance;
  }

  try {
    const url = validateEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
    const anon = validateEnv(SUPABASE_ANON_KEY, "NEXT_PUBLIC_SUPABASE_ANON_KEY");
    
    if (!url || url === 'https://placeholder.supabase.co') {
      console.warn('⚠️ Supabase not configured - using placeholder. Data persistence disabled.');
      return null as unknown as SupabaseClient<Database>;
    }
    
    // Create and cache the instance
    supabaseServerInstance = createClient<Database>(url, anon);
    
    // Also cache in window for browser context
    if (typeof window !== 'undefined') {
      window.__fbc_supabaseServer = supabaseServerInstance;
    }
    
    return supabaseServerInstance;
  } catch (error) {
    console.warn('Supabase server client unavailable:', error);
    return null as unknown as SupabaseClient<Database>; // Return null for graceful degradation
  }
}

/**
 * Get or create the Supabase service client (service role key) - singleton pattern
 * This prevents multiple GoTrueClient instances from being created
 * NOTE: Service role key should only be used server-side
 */
export function getSupabaseService(): SupabaseClient<Database> {
  // Return cached instance if available
  if (supabaseServiceInstance) {
    return supabaseServiceInstance;
  }

  try {
    const url = validateEnv(SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
    const svc = validateEnv(SUPABASE_SERVICE_KEY, "SUPABASE_SERVICE_ROLE_KEY");
    
    if (!url || url === 'https://placeholder.supabase.co') {
      console.warn('⚠️ Supabase not configured - using placeholder. WAL logging disabled.');
      return null as unknown as SupabaseClient<Database>;
    }
    
    // Create and cache the instance
    supabaseServiceInstance = createClient<Database>(url, svc);
    return supabaseServiceInstance;
  } catch (error) {
    console.warn('Supabase service client unavailable:', error);
    return null as unknown as SupabaseClient<Database>; // Return null for graceful degradation
  }
}
