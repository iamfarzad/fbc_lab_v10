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

