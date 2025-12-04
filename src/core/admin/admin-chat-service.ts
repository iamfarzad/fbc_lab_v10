import { supabaseService } from '../supabase/client.js'
import { asAdminSession, asAdminConversations, asConversations } from '../../lib/supabase-parsers.js'
import type { AdminSessionRow, AdminConversationRow } from '../../schemas/supabase.js'
import type { Database } from '../database.types.js'
import { logger } from '../../lib/logger.js'

type AdminMessageType = 'user' | 'assistant' | 'system'

// Use generated Database types for admin schema
type AdminSessionInsert = Database['admin']['Tables']['admin_sessions']['Insert']
type AdminSessionUpdate = Database['admin']['Tables']['admin_sessions']['Update']
type AdminConversationInsert = Database['admin']['Tables']['admin_conversations']['Insert']

export interface AdminMessage {
  id: string // Changed to required string to match usage/error, using fallback if needed
  sessionId: string
  conversationId?: string
  adminId?: string | null
  type: AdminMessageType
  content: string
  metadata?: Record<string, unknown> | null
  contextLeads?: string[] | null
  embeddings?: number[] | undefined
}

export interface AdminChatContext {
  sessionId: string
  messages: AdminMessage[]
  relevantHistory: AdminMessage[]
  leadContext?: {
    conversationId: string
    name: string
    email: string
    summary: string
    leadScore: number
    researchData: Record<string, unknown>
  }[]
}

export class AdminChatService {
  private static instance: AdminChatService

  static getInstance(): AdminChatService {
    if (!AdminChatService.instance) {
      AdminChatService.instance = new AdminChatService()
    }
    return AdminChatService.instance
  }

  /**
   * Create or get admin session
   */
  async getOrCreateSession(sessionId: string, adminId?: string, sessionName?: string): Promise<AdminSessionRow> {
    // Check if session exists
    const { data: existingSessionRaw } = await supabaseService
      .schema('admin')
      .from('admin_sessions')
      .select('*')
      .eq('id', sessionId)
      .single()

    if (existingSessionRaw) {
      const existingSession = asAdminSession(existingSessionRaw)
      if (existingSession) {
        // Update last activity
        await supabaseService
          .schema('admin')
          .from('admin_sessions')
          .update({ last_activity: new Date().toISOString() })
          .eq('id', sessionId)

        return existingSession
      }
    }

    // Create new session with explicit ID
    const insertData: AdminSessionInsert = {
      id: sessionId,
      admin_id: adminId || '',
      session_name: sessionName || `Session ${new Date().toLocaleDateString()}`,
      is_active: true
    }
    const { data: newSessionRaw, error } = await supabaseService
      .schema('admin')
      .from('admin_sessions')
      .insert(insertData)
      .select()
      .single()

    if (error) throw error
    const newSession = asAdminSession(newSessionRaw)
    if (!newSession) {
      throw new Error('Failed to create admin session')
    }
    return newSession
  }

  /**
   * Save message to persistent storage with embeddings
   */
  async saveMessage(message: AdminMessage): Promise<AdminConversationRow> {
    logger.debug('Saving admin message:', { sessionId: message.sessionId, type: message.type, contentLength: message.content.length })

    // Generate embeddings for the message content (optional - don't fail if it doesn't work)
    let embeddings: number[] | undefined
    try {
      embeddings = await this.generateEmbeddings(message.content)
    } catch (embeddingError) {
      console.warn('Embeddings generation failed, saving without embeddings:', embeddingError)
    }

    const insertData: AdminConversationInsert = {
      conversation_id: message.conversationId || message.sessionId, // Use sessionId as fallback (validates FK)
      admin_id: message.adminId || '',
      session_id: message.sessionId,
      message_type: message.type as Database['admin']['Enums']['message_type_enum'],
      message_content: message.content,
      embeddings: embeddings ? JSON.stringify(embeddings) : '[]', // Convert array to JSON string
      context_leads: message.contextLeads || null
    }
    const { data: dataRaw, error } = await supabaseService
      .schema('admin')
      .from('admin_conversations')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('Database error saving admin message:', error)
      throw error
    }
    const parsed = asAdminConversations(dataRaw ? [dataRaw] : [])
    if (parsed.length === 0) {
      throw new Error('Failed to parse saved message')
    }
    const result = parsed[0]
    if (!result) {
      throw new Error('Failed to parse saved message')
  }
    return result
  }

  /**
   * Get conversation context with semantic search
   */
  async getConversationContext(
    sessionId: string,
    currentMessage: string,
    limit: number = 20
  ): Promise<AdminChatContext> {
    // Get recent messages from current session
    const { data: recentMessagesRaw } = await supabaseService
      .schema('admin')
      .from('admin_conversations')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Generate embeddings for current message and find semantically similar messages
    let similarMessagesRaw: unknown[] = []
    try {
      // Note: RPC expects text query, not embedding vector
      const { data } = await supabaseService
        .schema('admin')
        .rpc('search_admin_conversations', {
          p_query: currentMessage, // Text query
          p_session_id: sessionId,
          p_limit: 5,
          p_thresh: 0.7
        })
      similarMessagesRaw = Array.isArray(data) ? data : []
    } catch (error) {
      // Semantic search is optional - log but don't fail
      console.warn('Semantic search failed (optional):', error)
    }

    // Parse with schemas
    const recentMessages = asAdminConversations(recentMessagesRaw)
    
    // Format messages
    const messages: AdminMessage[] = recentMessages.map((m) => {
      const message: AdminMessage = {
        id: m.id || crypto.randomUUID(), // Ensure ID is present
        sessionId: m.session_id || sessionId,
        adminId: m.admin_id ?? null,
        type: (m.message_type || 'user') as AdminMessageType,
        content: m.message_content || '',
        metadata: m.message_metadata ?? null,
        contextLeads: m.context_leads ?? null,
        embeddings: typeof m.embeddings === 'string' ? (JSON.parse(m.embeddings) as number[]) : undefined
      }
      if (m.conversation_id) {
        message.conversationId = m.conversation_id
      }
      return message
    }).reverse() // Reverse to chronological order
    
    const relevantHistory: AdminMessage[] = asAdminConversations(similarMessagesRaw).map((m) => {
      const message: AdminMessage = {
        id: m.id || crypto.randomUUID(), // Ensure ID is present
        sessionId: m.session_id || sessionId,
        adminId: m.admin_id ?? null,
        type: (m.message_type || 'user') as AdminMessageType,
        content: m.message_content || '',
        metadata: m.message_metadata ?? null,
        contextLeads: m.context_leads ?? null,
        embeddings: typeof m.embeddings === 'string' ? (JSON.parse(m.embeddings) as number[]) : undefined
      }
      if (m.conversation_id) {
        message.conversationId = m.conversation_id
      }
      return message
    })

    return {
      sessionId,
      messages,
      relevantHistory
    }
  }

  /**
   * Load lead context for admin conversation
   */
  async loadLeadContext(conversationIds: string[]): Promise<AdminChatContext['leadContext']> {
    if (!conversationIds.length) return []

    const { data: conversationsRaw } = await supabaseService
      .from('conversations')
      .select('id, name, email, summary, lead_score, research_json')
      .in('id', conversationIds)

    const conversations = asConversations(conversationsRaw)
    return conversations.map((c) => {
      return {
        conversationId: c.id || '',
        name: c.name || 'Unknown',
        email: c.email || '',
        summary: c.summary || '',
        leadScore: c.lead_score || 0,
        researchData: c.research_json && typeof c.research_json === 'object' && !Array.isArray(c.research_json)
          ? c.research_json
          : {}
      }
    })
  }

  /**
   * Build context for AI from conversation history and lead data
   */
  async buildAIContext(
    sessionId: string,
    currentMessage: string,
    conversationIds?: string[]
  ): Promise<string> {
    const context = await this.getConversationContext(sessionId, currentMessage)

    let contextString = `# Admin Conversation Context\n\n`

    // Add recent conversation history
    if (context.messages.length > 0) {
      contextString += `## Recent Conversation History\n`
      context.messages.forEach((msg: AdminMessage) => {
        contextString += `**${msg.type.toUpperCase()}:** ${msg.content}\n\n`
      })
    }

    // Add semantically relevant history
    if (context.relevantHistory.length > 0) {
      contextString += `## Relevant Historical Context\n`
      context.relevantHistory.forEach((msg: AdminMessage) => {
        contextString += `**${msg.type.toUpperCase()}:** ${msg.content}\n\n`
      })
    }

    // Add lead context if specific conversations requested
    if (conversationIds && conversationIds.length > 0) {
      const leadContext = await this.loadLeadContext(conversationIds)
      interface LeadContextItem {
        name?: string
        email?: string
        leadScore?: number
        summary?: string
        researchData?: {
          company?: { name?: string; industry?: string }
          person?: { role?: string }
        }
      }
      
      const list = Array.isArray(leadContext) ? leadContext : [];
      if (list.length > 0) {
        contextString += `## Lead Context\n`
        list.forEach((lead: unknown) => {
          const leadItem = lead as LeadContextItem
          const name = typeof leadItem.name === 'string' ? leadItem.name : 'Unknown'
          const email = typeof leadItem.email === 'string' ? leadItem.email : 'unknown@example.com'
          const leadScore = typeof leadItem.leadScore === 'number' ? leadItem.leadScore : 0
          const summary = typeof leadItem.summary === 'string' ? leadItem.summary : 'No summary available'
          
          contextString += `### Lead: ${name} (${email})\n`
          contextString += `**Lead Score:** ${leadScore}/100\n`
          contextString += `**Summary:** ${summary}\n\n`

          if (leadItem.researchData && typeof leadItem.researchData === 'object') {
            const company = (leadItem.researchData as { company?: { name?: string; industry?: string } }).company || {}
            const person = (leadItem.researchData as { person?: { role?: string } }).person || {}
            if (typeof company.name === 'string') {
              const industry = typeof company.industry === 'string' ? company.industry : 'Unknown industry'
              contextString += `**Company:** ${company.name} (${industry})\n`
            }
            if (typeof person.role === 'string') {
              const companyName = typeof company.name === 'string' ? company.name : 'company'
              contextString += `**Contact:** ${person.role} at ${companyName}\n`
            }
          }
          contextString += `\n`
        })
      }
    }

    return contextString
  }

  /**
   * Generate embeddings using OpenAI (placeholder - implement based on your setup)
   */
  private async generateEmbeddings(text: string): Promise<number[]> {
    try {
      // Import the embeddings service dynamically to avoid circular dependencies
      const { embedText } = await import('src/core/embeddings/gemini')

      // Generate embeddings using the Gemini service
      const embeddings = await embedText([text])

      // Return the first embedding array, or empty array if failed
      return embeddings?.[0] || []
    } catch (error) {
      console.warn('Embeddings generation failed:', error)
      // Return empty array to avoid breaking the admin chat
    return []
  }
  }

  /**
   * Search across all admin conversations
   */
  async searchAllConversations(
    query: string,
    limit: number = 10,
    adminId?: string
  ): Promise<AdminMessage[]> {
    // Try semantic search, fallback to empty array if RPC doesn't exist
    let rowsRaw: unknown[] = []
    try {
      const { data } = await supabaseService
        .schema('admin')
        .rpc('search_admin_conversations', {
          p_query: query,
          p_session_id: '', // Search all sessions
          p_limit: limit,
          p_thresh: 0.6
        })
      
      rowsRaw = Array.isArray(data) ? data : []
    } catch (error) {
      console.warn('search_admin_conversations RPC failed:', error)
    }

    const rows = asAdminConversations(rowsRaw)
    const filtered = adminId ? rows.filter((m) => m.admin_id === adminId) : rows
    
    return filtered.map((m) => {
      const message: AdminMessage = {
        id: m.id || crypto.randomUUID(), // Ensure ID is present
        sessionId: m.session_id || '',
        adminId: m.admin_id ?? null,
        type: (m.message_type || 'user') as AdminMessageType,
        content: m.message_content || '',
        metadata: m.message_metadata ?? null,
        contextLeads: m.context_leads ?? null,
        embeddings: typeof m.embeddings === 'string' ? (JSON.parse(m.embeddings) as number[]) : undefined
      }
      if (m.conversation_id) {
        message.conversationId = m.conversation_id
      }
      return message
    })
  }

  /**
   * Get session list for admin
   */
  async getAdminSessions(adminId?: string, limit: number = 20): Promise<AdminSessionRow[]> {
    let query = supabaseService
      .schema('admin')
      .from('admin_sessions')
      .select('*')
      .order('last_activity', { ascending: false })
      .limit(limit)

    if (adminId) {
      query = query.eq('admin_id', adminId)
    }

    const { data: dataRaw } = await query
    const sessions = Array.isArray(dataRaw) ? dataRaw.map((s) => asAdminSession(s)).filter((s): s is AdminSessionRow => s !== null) : []
    return sessions
  }

  /**
   * Update last activity timestamp for admin session
   */
  async updateLastActivity(sessionId: string): Promise<void> {
    const updateData: AdminSessionUpdate = { last_activity: new Date().toISOString() }
    const { error } = await supabaseService
      .schema('admin')
      .from('admin_sessions')
      .update(updateData)
      .eq('id', sessionId)

    if (error) {
      console.warn('Failed to update admin session activity:', error)
    }
  }

  /**
   * Clean up old sessions (optional maintenance)
   */
  async cleanupOldSessions(daysOld: number = 90): Promise<number> {
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysOld)

    const { count } = await supabaseService
      .schema('admin')
      .from('admin_sessions')
      .delete({ count: 'exact' })
      .eq('is_active', false)
      .lt('last_activity', cutoffDate.toISOString())

    return count || 0
  }

  /**
   * Delete a specific admin session and all its messages
   */
  async deleteSession(sessionId: string): Promise<void> {
    // Delete messages first (foreign key constraint)
    const { error: messagesError } = await supabaseService
      .schema('admin')
      .from('admin_conversations')
      .delete()
      .eq('session_id', sessionId)

    if (messagesError) {
      console.error('Failed to delete admin messages:', messagesError)
      throw messagesError
    }

    // Delete session
    const { error: sessionError } = await supabaseService
      .schema('admin')
      .from('admin_sessions')
      .delete()
      .eq('id', sessionId)

    if (sessionError) {
      console.error('Failed to delete admin session:', sessionError)
      throw sessionError
    }
  }
}

// Export singleton instance
export const adminChatService = AdminChatService.getInstance()
