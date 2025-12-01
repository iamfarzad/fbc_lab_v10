/**
 * Supabase Boundary Helpers
 * Schema-validated parsers for Supabase query results
 */

import type { ConversationRow, LeadSummaryRow, AdminSessionRow, AdminConversationRow, MeetingRow, EmailCampaignRow, ConversationContextRow } from 'src/schemas/supabase'
import { ConversationRow as ConversationRowSchema, LeadSummaryRow as LeadSummaryRowSchema, AdminSessionRow as AdminSessionRowSchema, AdminConversationRow as AdminConversationRowSchema, MeetingRow as MeetingRowSchema, EmailCampaignRow as EmailCampaignRowSchema, ConversationContextRow as ConversationContextRowSchema } from 'src/schemas/supabase'
import { getString, getNumber, getRecord, getArray } from 'src/lib/guards'

/**
 * Parse conversations data from Supabase
 */
export function asConversations(data: unknown): ConversationRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return ConversationRowSchema.parse(d)
    } catch {
      // Return partial data if parsing fails
      const id = getString(d, 'id')
      return {
        id: id ?? '',
        name: getString(d, 'name'),
        email: getString(d, 'email'),
        summary: getString(d, 'summary'),
        lead_score: getNumber(d, 'lead_score'),
        research_json: getRecord(d, 'research_json'),
        created_at: getString(d, 'created_at'),
      }
    }
  })
}

/**
 * Parse lead summaries data from Supabase
 */
export function asLeadSummaries(data: unknown): LeadSummaryRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return LeadSummaryRowSchema.parse(d)
    } catch {
      return {
        id: getString(d, 'id'),
        lead_score: getNumber(d, 'lead_score'),
        ai_capabilities_shown: getArray(d, 'ai_capabilities_shown'),
        created_at: getString(d, 'created_at'),
      }
    }
  })
}

/**
 * Parse admin session data from Supabase
 */
export function asAdminSession(data: unknown): AdminSessionRow | null {
  if (!data || typeof data !== 'object') return null
  try {
    return AdminSessionRowSchema.parse(data)
  } catch {
    return null
  }
}

/**
 * Parse admin conversations data from Supabase
 */
export function asAdminConversations(data: unknown): AdminConversationRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return AdminConversationRowSchema.parse(d)
    } catch {
      const contextLeads = getArray(d, 'context_leads')
      return {
        id: getString(d, 'id'),
        conversation_id: getString(d, 'conversation_id'),
        admin_id: getString(d, 'admin_id'),
        session_id: getString(d, 'session_id'),
        message_type: getString(d, 'message_type'),
        message_content: getString(d, 'message_content'),
        message_metadata: getRecord(d, 'message_metadata'),
        embeddings: getString(d, 'embeddings'),
        context_leads: Array.isArray(contextLeads) ? contextLeads as string[] : undefined,
        created_at: getString(d, 'created_at'),
      }
    }
  })
}

/**
 * Parse meetings data from Supabase
 */
export function asMeetings(data: unknown): MeetingRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return MeetingRowSchema.parse(d)
    } catch {
      return {
        id: getString(d, 'id'),
        conversation_id: getString(d, 'conversation_id'),
        scheduled_at: getString(d, 'scheduled_at'),
        status: getString(d, 'status'),
        created_at: getString(d, 'created_at'),
      }
    }
  })
}

/**
 * Parse email campaigns data from Supabase
 */
export function asEmailCampaigns(data: unknown): EmailCampaignRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return EmailCampaignRowSchema.parse(d)
    } catch {
      return {
        id: getString(d, 'id'),
        status: getString(d, 'status'),
        created_at: getString(d, 'created_at'),
      }
    }
  })
}

/**
 * Parse conversation context data from Supabase
 */
export function asContext(data: unknown): ConversationContextRow | null {
  if (!data || typeof data !== 'object') return null
  try {
    return ConversationContextRowSchema.parse(data)
  } catch {
    return null
  }
}

/**
 * Parse conversation contexts array from Supabase
 */
export function asContexts(data: unknown): ConversationContextRow[] {
  if (!Array.isArray(data)) return []
  return data.map((d) => {
    try {
      return ConversationContextRowSchema.parse(d)
    } catch {
      return {
        session_id: getString(d, 'session_id') ?? '',
        email: getString(d, 'email') ?? '',
        name: getString(d, 'name'),
        company_context: getRecord(d, 'company_context'),
        person_context: getRecord(d, 'person_context'),
        role: getString(d, 'role'),
        role_confidence: getNumber(d, 'role_confidence'),
        intent_data: getRecord(d, 'intent_data'),
        ai_capabilities_shown: (() => {
          const arr = getArray(d, 'ai_capabilities_shown')
          return Array.isArray(arr) ? arr.filter((item): item is string => typeof item === 'string') : null
        })(),
        last_user_message: getString(d, 'last_user_message'),
        company_url: getString(d, 'company_url'),
        created_at: getString(d, 'created_at'),
        updated_at: getString(d, 'updated_at'),
        preferences: getRecord(d, 'preferences'),
        multimodal_context: getRecord(d, 'multimodal_context'),
        tool_outputs: getRecord(d, 'tool_outputs'),
        version: getNumber(d, 'version'),
        last_agent: getString(d, 'last_agent'),
        last_stage: getString(d, 'last_stage'),
        event_id: getString(d, 'event_id'),
        analytics_pending: (() => {
          const val = (d as Record<string, unknown>).analytics_pending
          return typeof val === 'boolean' ? val : null
        })(),
        conversation_flow: getRecord(d, 'conversation_flow'),
        intelligence_context: getRecord(d, 'intelligence_context'),
      }
    }
  })
}

