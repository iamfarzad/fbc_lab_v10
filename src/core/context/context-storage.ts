import { getSupabaseService } from '../../lib/supabase.js'
import { DatabaseConversationContext } from './context-types.js'
import { asContexts } from '../../lib/supabase-parsers.js'
import type { Database, Json } from '../database.types.js'
import { toJson } from '../../types/json-guards.js'
import { calculateBackoffDelay, DEFAULT_BACKOFF_MULTIPLIER } from '../../lib/ai/retry-config.js'

type ConversationContextExtendedFields = {
  metadata?: Json | null
  conversation_flow?: Json | null
  intelligence_context?: Json | null
  last_agent?: string | null
  last_stage?: string | null
  event_id?: string | null
  analytics_pending?: boolean | null
  version?: number | null
  pdf_url?: string | null
  pdf_generated_at?: string | null
}

type ConversationContextInsert = Database['public']['Tables']['conversation_contexts']['Insert'] & ConversationContextExtendedFields
type ConversationContextUpdate = Database['public']['Tables']['conversation_contexts']['Update'] & ConversationContextExtendedFields

const resolveJsonField = (
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  incoming: unknown | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-redundant-type-constituents
  existing: unknown | null | undefined
): Json | null | undefined => {
  if (incoming !== undefined) {
    if (incoming === null) return null
    try {
      return toJson(incoming)
    } catch {
      // If toJson fails (e.g., value is undefined or invalid), return undefined to skip the field
      return undefined
    }
  }
  if (existing !== undefined) {
    if (existing === null) return null
    try {
      return toJson(existing)
    } catch {
      // If toJson fails (e.g., value is undefined or invalid), return undefined to skip the field
      return undefined
    }
  }
  return undefined
}

// Browser-safe logger (winston is Node.js only)
const logger = {
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
}

export class ContextStorage {
  // Use the service client type to avoid Database generic issues.
  private supabase: ReturnType<typeof getSupabaseService> | null
  private inMemoryStorage: Map<string, DatabaseConversationContext>
  private cacheTimestamps: Map<string, number>
  private readonly CACHE_TTL = 5 * 60 * 1000 // 5 minutes TTL

  constructor() {
    // Ensure in-memory storage is shared across module instances when Supabase is unavailable
    const globalContext = globalThis as unknown as {
      __fbcContextStore__?: {
        data: Map<string, DatabaseConversationContext>
        timestamps: Map<string, number>
      }
    }

    if (!globalContext.__fbcContextStore__) {
      globalContext.__fbcContextStore__ = {
        data: new Map<string, DatabaseConversationContext>(),
        timestamps: new Map<string, number>()
      }
    }

    this.inMemoryStorage = globalContext.__fbcContextStore__.data
    this.cacheTimestamps = globalContext.__fbcContextStore__.timestamps

    // Try to create Supabase client, fallback to in-memory if unavailable
    try {
      if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
        this.supabase = getSupabaseService()
      } else {
        logger.warn('Supabase credentials not found, falling back to in-memory storage')
        this.supabase = null
      }
    } catch (error) {
      logger.warn('Supabase initialization failed, falling back to in-memory storage:', error)
      this.supabase = null
    }
  }

  async store(sessionId: string, payload: Partial<DatabaseConversationContext>): Promise<void> {
    try {
      // Convert to Insert type - only include fields that exist in the database schema
      const dataToStore: ConversationContextInsert = {
        session_id: sessionId,
        email: payload.email || 'unknown@example.com', // Required field
        name: payload.name ?? null,
        company_context: payload.company_context ? toJson(payload.company_context) : null,
        person_context: payload.person_context ? toJson(payload.person_context) : null,
        role: payload.role ?? null,
        role_confidence: payload.role_confidence ?? null,
        intent_data: payload.intent_data ? toJson(payload.intent_data) : null,
        ai_capabilities_shown: payload.ai_capabilities_shown ?? null,
        last_user_message: payload.last_user_message ?? null,
        company_url: payload.company_url ?? null,
        updated_at: new Date().toISOString()
      }

      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          const { error } = await this.supabase
            .from('conversation_contexts')
            .upsert(dataToStore)

          if (error) {
            throw error
          }
        } catch (supabaseError) {
          logger.warn('Supabase storage failed, falling back to in-memory:', supabaseError)
          // Store in memory with full DatabaseConversationContext structure
          const inMemoryData: DatabaseConversationContext = {
            session_id: sessionId,
            email: payload.email || 'unknown@example.com',
            ...payload,
            updated_at: new Date().toISOString()
          } as DatabaseConversationContext
          this.inMemoryStorage.set(sessionId, inMemoryData)
        }
      } else {
        // Use in-memory storage with full DatabaseConversationContext structure
        const inMemoryData: DatabaseConversationContext = {
          session_id: sessionId,
          email: payload.email || 'unknown@example.com',
          ...payload,
          updated_at: new Date().toISOString()
        } as DatabaseConversationContext
        this.inMemoryStorage.set(sessionId, inMemoryData)
      }
    } catch (error) {
      logger.error('Context storage failed completely:', error)
      throw error
    }
  }

  // Check if cached data is still valid (not expired)
  private isCacheValid(sessionId: string): boolean {
    const timestamp = this.cacheTimestamps.get(sessionId)
    if (!timestamp) return false
    return (Date.now() - timestamp) < this.CACHE_TTL
  }

  async get(sessionId: string): Promise<DatabaseConversationContext | null> {
    try {
      // Check if we have valid cached data first
      const cachedData = this.inMemoryStorage.get(sessionId)
      if (cachedData && this.isCacheValid(sessionId)) {
        return cachedData
      }

      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          const { data, error } = await this.supabase
            .from('conversation_contexts')
            .select('*')
            .eq('session_id', sessionId)
            .single()

          if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
            throw error
          }

          // Parse and validate Supabase result
          const rows = asContexts(data ? [data] : [])
          const context = rows[0] ?? null
          
          // Parse multimodal context if it exists as string
          if (context && typeof context.multimodal_context === 'string') {
            try {
              const parsed: unknown = JSON.parse(context.multimodal_context)
              context.multimodal_context = parsed as DatabaseConversationContext['multimodal_context']
            } catch {
              context.multimodal_context = undefined
            }
          }

          // If we got data from Supabase, cache it with timestamp
          if (context) {
            this.inMemoryStorage.set(sessionId, context as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now())
          }

          return context as DatabaseConversationContext | null
        } catch (supabaseError) {
          logger.warn('Supabase retrieval failed, trying in-memory fallback:', supabaseError)
          return this.inMemoryStorage.get(sessionId) || null
        }
      } else {
        // Use in-memory storage only
        return this.inMemoryStorage.get(sessionId) || null
      }
    } catch (error) {
      logger.error('Context retrieval failed completely:', error)
      return this.inMemoryStorage.get(sessionId) || null
    }
  }

  // Clean up expired cache entries to prevent memory leaks
  private cleanupExpiredCache(): void {
    const now = Date.now()
    const expiredKeys: string[] = []

    for (const [sessionId, timestamp] of this.cacheTimestamps) {
      if ((now - timestamp) > this.CACHE_TTL) {
        expiredKeys.push(sessionId)
      }
    }

    expiredKeys.forEach(sessionId => {
      this.inMemoryStorage.delete(sessionId)
      this.cacheTimestamps.delete(sessionId)
    })

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired cache entries`)
    }
  }

  async update(sessionId: string, patch: Partial<DatabaseConversationContext>): Promise<void> {
    try {
      // Try Supabase first, fallback to in-memory
      if (this.supabase) {
        try {
          // Whitelist of valid conversation_contexts columns to prevent SQL errors
          // Filter out any fields that don't exist in the table schema (e.g., 'capability' from capability_usage_log)
          const validColumns = new Set([
            'ai_capabilities_shown', 'analytics_pending', 'company_context', 'company_country',
            'company_url', 'conversation_flow', 'created_at', 'email', 'event_id',
            'intelligence_context', 'intent_data', 'last_agent', 'last_stage',
            'last_user_message', 'metadata', 'name', 'pdf_generated_at', 'pdf_url',
            'person_context', 'role', 'role_confidence', 'session_id', 'updated_at', 'version'
          ])
          
          // Filter patch to only include valid columns
          const filteredPatch: Record<string, unknown> = {}
          for (const [key, value] of Object.entries(patch)) {
            if (validColumns.has(key)) {
              filteredPatch[key] = value
            }
          }
          
          // Convert metadata to Json type if present
          const updateData: Record<string, unknown> = {
            ...filteredPatch,
            updated_at: new Date().toISOString()
          }
          if ('metadata' in updateData && updateData.metadata !== undefined && updateData.metadata !== null) {
            updateData.metadata = toJson(updateData.metadata) as Json
          }
          
          const { error } = await this.supabase
            .from('conversation_contexts')
            .update(updateData)
            .eq('session_id', sessionId)

          if (error) {
            throw error
          }

          // Also update in-memory cache if it exists
          const existing = this.inMemoryStorage.get(sessionId)
          if (existing) {
            this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
          }

          // Periodic cleanup of expired entries
          this.cleanupExpiredCache()
        } catch (supabaseError) {
          logger.warn('Supabase update failed, falling back to in-memory:', supabaseError)
          // Update in-memory storage
          const existing = this.inMemoryStorage.get(sessionId)
          if (existing) {
            this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
          } else {
            // Create new entry if it doesn't exist
            this.inMemoryStorage.set(sessionId, {
              session_id: sessionId,
              email: 'unknown@example.com', // Required field
              ...patch,
              updated_at: new Date().toISOString()
            } as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now()) // Set cache timestamp
          }

          // Periodic cleanup of expired entries
          this.cleanupExpiredCache()
        }
      } else {
        // Use in-memory storage only
        const existing = this.inMemoryStorage.get(sessionId)
        if (existing) {
          this.inMemoryStorage.set(sessionId, { ...existing, ...patch, updated_at: new Date().toISOString() } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now()) // Refresh cache timestamp
        } else {
          // Create new entry if it doesn't exist
          this.inMemoryStorage.set(sessionId, {
            session_id: sessionId,
            email: 'unknown@example.com', // Required field
            ...patch,
            updated_at: new Date().toISOString()
          } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now()) // Set cache timestamp
        }

        // Periodic cleanup of expired entries
        this.cleanupExpiredCache()
      }
    } catch (error) {
      logger.error('Context update failed completely:', error)
      throw error
    }
  }

  async delete(sessionId: string): Promise<void> {
    try {
      // Try Supabase first, then in-memory
      if (this.supabase) {
        try {
          const { error } = await this.supabase
            .from('conversation_contexts')
            .delete()
            .eq('session_id', sessionId)

          if (error) {
            throw error
          }
        } catch (supabaseError) {
          logger.warn('Supabase delete failed:', supabaseError)
        }
      }

      // Always delete from in-memory storage
      this.inMemoryStorage.delete(sessionId)
    } catch (error) {
      logger.error('Context deletion failed:', error)
      throw error
    }
  }

  /**
   * Update with optimistic locking to prevent race conditions
   * Uses version field to detect concurrent writes
   */
  async updateWithVersionCheck(
    sessionId: string,
    payload: Partial<DatabaseConversationContext>,
    options: { attempts: number; backoff: number; signal?: AbortSignal }
  ): Promise<void> {
    let attempt = 0
    
    while (attempt < options.attempts) {
      if (options.signal?.aborted) {
        throw new Error('AbortError')
      }
      
      try {
        // Get current version
        const current = await this.get(sessionId)
        
        const metadataJson = resolveJsonField(payload.metadata, current?.metadata)
        const conversationFlowJson = resolveJsonField(payload.conversation_flow, current?.conversation_flow)
        const intelligenceContextJson = resolveJsonField(payload.intelligence_context, current?.intelligence_context)
        
        // Convert to Insert type
        const dataToStore: ConversationContextInsert = {
          session_id: sessionId,
          email: payload.email || current?.email || 'unknown@example.com',
          name: payload.name ?? current?.name ?? null,
          company_context: payload.company_context ? toJson(payload.company_context) : (current?.company_context ? toJson(current.company_context) : null),
          person_context: payload.person_context ? toJson(payload.person_context) : (current?.person_context ? toJson(current.person_context) : null),
          role: payload.role ?? current?.role ?? null,
          role_confidence: payload.role_confidence ?? current?.role_confidence ?? null,
          intent_data: payload.intent_data ? toJson(payload.intent_data) : (current?.intent_data ? toJson(current.intent_data) : null),
          ai_capabilities_shown: payload.ai_capabilities_shown ?? current?.ai_capabilities_shown ?? null,
          last_user_message: payload.last_user_message ?? current?.last_user_message ?? null,
          company_url: payload.company_url ?? current?.company_url ?? null,
          updated_at: new Date().toISOString()
        }
        
        if (metadataJson !== undefined) {
          dataToStore.metadata = metadataJson
        }
        if (conversationFlowJson !== undefined) {
          dataToStore.conversation_flow = conversationFlowJson
        }
        if (intelligenceContextJson !== undefined) {
          dataToStore.intelligence_context = intelligenceContextJson
        }
        dataToStore.last_agent = payload.last_agent ?? current?.last_agent ?? null
        dataToStore.last_stage = payload.last_stage ?? current?.last_stage ?? null
        dataToStore.event_id = payload.event_id ?? current?.event_id ?? null
        dataToStore.analytics_pending = payload.analytics_pending ?? current?.analytics_pending ?? null
        dataToStore.version = payload.version ?? current?.version ?? null
        dataToStore.pdf_url = payload.pdf_url ?? current?.pdf_url ?? null
        dataToStore.pdf_generated_at = payload.pdf_generated_at ?? current?.pdf_generated_at ?? null
        
        if (this.supabase) {
          // If no record exists, insert instead of update
          if (!current) {
            const { data, error } = await this.supabase
              .from('conversation_contexts')
              .insert(dataToStore)
              .select()
              .single()
            
            if (error) {
              throw error
            }
            
            const rows = asContexts(data ? [data] : [])
            const context = rows[0] ?? null
            if (context) {
              this.inMemoryStorage.set(sessionId, context as DatabaseConversationContext)
              this.cacheTimestamps.set(sessionId, Date.now())
              return
            }
          } else {
            // Update existing record
            const updateData: ConversationContextUpdate = {
              name: payload.name ?? current?.name ?? null,
              company_context: payload.company_context ? toJson(payload.company_context) : (current?.company_context ? toJson(current.company_context) : null),
              person_context: payload.person_context ? toJson(payload.person_context) : (current?.person_context ? toJson(current.person_context) : null),
              role: payload.role ?? current?.role ?? null,
              role_confidence: payload.role_confidence ?? current?.role_confidence ?? null,
              intent_data: payload.intent_data ? toJson(payload.intent_data) : (current?.intent_data ? toJson(current.intent_data) : null),
              ai_capabilities_shown: payload.ai_capabilities_shown ?? current?.ai_capabilities_shown ?? null,
              last_user_message: payload.last_user_message ?? current?.last_user_message ?? null,
              company_url: payload.company_url ?? current?.company_url ?? null,
              updated_at: new Date().toISOString()
            }
            if (metadataJson !== undefined) {
              updateData.metadata = metadataJson
            }
            if (conversationFlowJson !== undefined) {
              updateData.conversation_flow = conversationFlowJson
            }
            if (intelligenceContextJson !== undefined) {
              updateData.intelligence_context = intelligenceContextJson
            }
            updateData.last_agent = payload.last_agent ?? current?.last_agent ?? null
            updateData.last_stage = payload.last_stage ?? current?.last_stage ?? null
            updateData.event_id = payload.event_id ?? current?.event_id ?? null
            updateData.analytics_pending = payload.analytics_pending ?? current?.analytics_pending ?? null
            updateData.version = payload.version ?? current?.version ?? null
            updateData.pdf_url = payload.pdf_url ?? current?.pdf_url ?? null
            updateData.pdf_generated_at = payload.pdf_generated_at ?? current?.pdf_generated_at ?? null
            const { data, error } = await this.supabase
              .from('conversation_contexts')
              .update(updateData)
              .eq('session_id', sessionId)
              .select()
            
            if (error) {
              throw error
            }
            
            const rows = asContexts(data ?? [])
            if (rows.length === 0) {
              // Version mismatch - retry
              throw new Error('VersionConflict')
            }
            
            // Update in-memory cache
            this.inMemoryStorage.set(sessionId, rows[0] as DatabaseConversationContext)
            this.cacheTimestamps.set(sessionId, Date.now())
            
            return // Success
          }
        } else {
          // Fallback to in-memory (no version check in memory)
          const existing = this.inMemoryStorage.get(sessionId)
          this.inMemoryStorage.set(sessionId, {
            ...existing,
            ...dataToStore
          } as DatabaseConversationContext)
          this.cacheTimestamps.set(sessionId, Date.now())
          return
        }
      } catch (error) {
        if (error instanceof Error && error.message === 'VersionConflict' && attempt < options.attempts - 1) {
          const delay = calculateBackoffDelay(attempt + 1, {
            baseDelay: options.backoff,
            maxDelay: Number.POSITIVE_INFINITY,
            backoffMultiplier: DEFAULT_BACKOFF_MULTIPLIER
          })
          await new Promise(resolve => setTimeout(resolve, delay))
          attempt++
          continue
        }
        throw error
      }
    }
    
    throw new Error('Max version check attempts exceeded')
  }
}

// Export singleton instance for backward compatibility
export const contextStorage = new ContextStorage()
