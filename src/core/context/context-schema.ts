import { z } from 'zod'

export const ConsentInput = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyUrl: z.string().url().optional()
})

export const SessionInitInput = z.object({
  sessionId: z.string().min(1),
  email: z.string().email(),
  name: z.string().optional(),
  companyUrl: z.string().url().optional()
})

export type ConsentInput = z.infer<typeof ConsentInput>
export type SessionInitInput = z.infer<typeof SessionInitInput>


export const CompanySchema = z.object({
  name: z.string(),
  domain: z.string(),
  industry: z.string().nullable().optional(),
  size: z.string().nullable().optional(),
  summary: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  linkedin: z.string().url().nullable().optional(),
})

export const PersonSchema = z.object({
  fullName: z.string(),
  role: z.string().nullable().optional(),
  seniority: z.string().nullable().optional(),
  profileUrl: z.string().url().nullable().optional(),
  company: z.string().nullable().optional(),
})

export const ContextSnapshotSchema = z.object({
  lead: z.object({ email: z.string().email(), name: z.string().optional().default('') }),
  company: CompanySchema.optional(),
  person: PersonSchema.optional(),
  role: z.string().optional(),
  roleConfidence: z.number().min(0).max(1).optional(),
  intent: z.object({ type: z.string(), confidence: z.number(), slots: z.record(z.string(), z.unknown()) }).optional(),
  capabilities: z.array(z.string()).default([]),
})

export type ContextSnapshot = z.infer<typeof ContextSnapshotSchema>

