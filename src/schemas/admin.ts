/**
 * Admin-Specific Schemas
 * Schemas for admin-related data structures
 */

import { z } from 'zod'

// Agent analytics response
export const AgentAnalyticsResponse = z.object({
  totalExecutions: z.number(),
  successRate: z.number(),
  averageDuration: z.number(),
  agentBreakdown: z.record(z.string(), z.number()).optional(),
  stageBreakdown: z.record(z.string(), z.number()).optional(),
})

export type AgentAnalyticsResponse = z.infer<typeof AgentAnalyticsResponse>

// Tool analytics response
export const ToolAnalyticsResponse = z.object({
  totalExecutions: z.number(),
  successRate: z.number(),
  averageDuration: z.number(),
  cacheHitRate: z.number(),
  toolBreakdown: z.record(z.string(), z.object({
    count: z.number(),
    successRate: z.number(),
    averageDuration: z.number(),
  })).optional(),
})

export type ToolAnalyticsResponse = z.infer<typeof ToolAnalyticsResponse>

// Analytics data (combined agent + tool)
export const AnalyticsData = z.object({
  agent: AgentAnalyticsResponse,
  tool: ToolAnalyticsResponse,
})

export type AnalyticsData = z.infer<typeof AnalyticsData>

// Sessions query schema
export const SessionsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50).optional(),
})

// Sessions POST body schema
export const SessionsPostBodySchema = z.object({
  sessionId: z.string(),
  adminId: z.string().optional(),
  sessionName: z.string().optional(),
})

export type SessionsQuery = z.infer<typeof SessionsQuerySchema>
export type SessionsPostBody = z.infer<typeof SessionsPostBodySchema>

// Email Campaign schemas
export const EmailCampaignRow = z.object({
  id: z.string(),
  name: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
  sent_count: z.number().int().nonnegative().optional().nullable(),
  created_at: z.string().optional(),
  subject: z.string().optional(),
  template: z.string().optional(),
  target_segment: z.string().optional().nullable(),
  scheduled_at: z.string().optional().nullable(),
  total_recipients: z.number().int().nonnegative().optional(),
  updated_at: z.string().optional(),
})

export const EmailCampaignList = z.array(EmailCampaignRow)

export const EmailCampaignPostBody = z.object({
  name: z.string(),
  subject: z.string(),
  template: z.string(),
  target_segment: z.string().optional(),
  scheduled_at: z.string().optional(),
})

export const EmailCampaignPatchBody = z.object({
  id: z.string(),
  name: z.string().optional(),
  subject: z.string().optional(),
  template: z.string().optional(),
  target_segment: z.string().optional(),
  scheduled_at: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'sent']).optional(),
})

export type EmailCampaignRow = z.infer<typeof EmailCampaignRow>
export type EmailCampaignPostBody = z.infer<typeof EmailCampaignPostBody>
export type EmailCampaignPatchBody = z.infer<typeof EmailCampaignPatchBody>
