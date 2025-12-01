/**
 * Agent Metadata Schemas
 * Schemas for agent results and metadata
 */

import { z } from 'zod'

// Agent metadata schema
export const AgentMetadata = z.object({
  stage: z.string().optional(),
  leadScore: z.number().optional(),
  fitScore: z.union([
    z.number(),
    z.object({
      workshop: z.number(),
      consulting: z.number(),
    }),
  ]).optional(),
  multimodalUsed: z.boolean().optional(),
  enhancedConversationFlow: z.record(z.string(), z.unknown()).nullable().optional(),
  conversationsAnalyzed: z.number().optional(),
  leadsAnalyzed: z.number().optional(),
  analyticsFetched: z.boolean().optional(),
  toolsUsed: z.number().optional(),
  summary: z.record(z.string(), z.unknown()).nullable().optional(),
})

export type AgentMetadata = z.infer<typeof AgentMetadata>

// Agent result schema
export const AgentResult = z.object({
  output: z.string(),
  agent: z.string(),
  model: z.string().optional(),
  metadata: AgentMetadata.optional(),
})

export type AgentResult = z.infer<typeof AgentResult>

// Intelligence context schema
export const IntelligenceContext = z.object({
  leadScore: z.number().optional(),
  fitScore: z.union([
    z.number(),
    z.object({
      workshop: z.number(),
      consulting: z.number(),
    }),
  ]).optional(),
  pitchDelivered: z.boolean().optional(),
  pitchType: z.string().optional(),
  email: z.string().optional(),
  email_hash: z.string().optional(),
  company: z.object({
    name: z.string().nullable().optional(),
  }).optional(),
  person: z.object({
    role: z.string().nullable().optional(),
  }).optional(),
})

export type IntelligenceContext = z.infer<typeof IntelligenceContext>

