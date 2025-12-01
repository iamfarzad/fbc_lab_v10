/**
 * Supabase Table Schemas
 * Runtime validation for all Supabase query results
 */

import { z } from 'zod'

// Conversation table schema
export const ConversationRow = z.object({
  id: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  lead_score: z.number().nullable().optional(),
  research_json: z.record(z.string(), z.unknown()).nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  email_status: z.string().nullable().optional(),
})

export type ConversationRow = z.infer<typeof ConversationRow>

// Lead summaries table schema
export const LeadSummaryRow = z.object({
  id: z.string().optional(),
  lead_score: z.number().nullable().optional(),
  ai_capabilities_shown: z.array(z.unknown()).nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type LeadSummaryRow = z.infer<typeof LeadSummaryRow>

// Admin sessions table schema
export const AdminSessionRow = z.object({
  id: z.string(),
  created_at: z.string().nullable().optional(),
  admin_id: z.string().nullable().optional(),
  session_name: z.string().nullable().optional(),
  is_active: z.boolean().nullable().optional(),
  last_activity: z.string().nullable().optional(),
  context_summary: z.string().nullable().optional(),
})

export type AdminSessionRow = z.infer<typeof AdminSessionRow>

// Admin conversations table schema
export const AdminConversationRow = z.object({
  id: z.string().optional(),
  conversation_id: z.string().nullable().optional(),
  admin_id: z.string().nullable().optional(),
  session_id: z.string().nullable().optional(),
  message_type: z.string().nullable().optional(),
  message_content: z.string().nullable().optional(),
  message_metadata: z.record(z.string(), z.unknown()).nullable().optional(),
  embeddings: z.string().nullable().optional(), // JSON string
  context_leads: z.array(z.string()).nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type AdminConversationRow = z.infer<typeof AdminConversationRow>

// Meetings table schema
export const MeetingRow = z.object({
  id: z.string().optional(),
  conversation_id: z.string().nullable().optional(),
  scheduled_at: z.string().nullable().optional(),
  status: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type MeetingRow = z.infer<typeof MeetingRow>

// Email campaigns table schema
export const EmailCampaignRow = z.object({
  id: z.string().optional(),
  status: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
})

export type EmailCampaignRow = z.infer<typeof EmailCampaignRow>

// Conversation contexts table schema
export const ConversationContextRow = z.object({
  session_id: z.string(),
  email: z.string(),
  name: z.string().nullable().optional(),
  company_context: z.unknown().nullable().optional(),
  person_context: z.unknown().nullable().optional(),
  role: z.string().nullable().optional(),
  role_confidence: z.number().nullable().optional(),
  intent_data: z.unknown().nullable().optional(),
  ai_capabilities_shown: z.array(z.string()).nullable().optional(),
  last_user_message: z.string().nullable().optional(),
  company_url: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
  preferences: z.record(z.string(), z.unknown()).nullable().optional(),
  webcamAnalysisCount: z.number().nullable().optional(),
  lastWebcamAnalysis: z.string().nullable().optional(),
  multimodal_context: z.unknown().nullable().optional(),
  tool_outputs: z.unknown().nullable().optional(),
  version: z.number().nullable().optional(),
  last_agent: z.string().nullable().optional(),
  last_stage: z.string().nullable().optional(),
  event_id: z.string().nullable().optional(),
  analytics_pending: z.boolean().nullable().optional(),
  conversation_flow: z.unknown().nullable().optional(),
  intelligence_context: z.unknown().nullable().optional(),
})

export type ConversationContextRow = z.infer<typeof ConversationContextRow>

