import { generateObject, generateText } from 'ai'
import { google } from '@ai-sdk/google'
import { z } from 'zod'
import { GEMINI_MODELS } from '../../config/constants'
import { logger } from '../../lib/logger'

// Schemas
const ActionItemsSchema = z.object({
  items: z.array(z.string()).describe('List of action items'),
  priority: z.enum(['high', 'medium', 'low']).describe('Overall priority'),
  nextMeetingNeed: z.boolean().describe('Whether a follow-up meeting is needed')
})

const EmailDraftSchema = z.object({
  subject: z.string().describe('Email subject line'),
  body: z.string().describe('Email body text'),
  tone: z.string().describe('Tone used')
})

/**
 * Extract action items from a conversation transcript
 */
export async function extractActionItems(transcript: string): Promise<z.infer<typeof ActionItemsSchema>> {
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      system: 'You are an expert project manager. Extract clear, actionable tasks from the conversation.',
      prompt: `Analyze this transcript and extract action items:\n\n${transcript}`,
      schema: ActionItemsSchema
    })
    return object
  } catch (error) {
    logger.error('❌ [Analysis] Failed to extract action items', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Generate a summary of the conversation
 */
export async function generateSummary(transcript: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      system: 'You are an expert executive assistant. Summarize the conversation concisely.',
      prompt: `Summarize this conversation, highlighting key decisions and topics:\n\n${transcript}`
    })
    return text
  } catch (error) {
    logger.error('❌ [Analysis] Failed to generate summary', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Draft a follow-up email
 */
export async function draftFollowUpEmail(
  transcript: string, 
  recipient: string, 
  tone: string = 'professional'
): Promise<z.infer<typeof EmailDraftSchema>> {
  try {
    const { object } = await generateObject({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      system: `You are an expert communicator. Draft a ${tone} follow-up email.`,
      prompt: `Draft a follow-up email to ${recipient} based on this conversation:\n\n${transcript}`,
      schema: EmailDraftSchema
    })
    return object
  } catch (error) {
    logger.error('❌ [Analysis] Failed to draft email', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

/**
 * Generate a proposal draft
 */
export async function generateProposal(transcript: string): Promise<string> {
  try {
    const { text } = await generateText({
      model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW),
      system: 'You are an expert sales consultant. Create a proposal structure.',
      prompt: `Create a markdown proposal draft based on the requirements discussed in this transcript:\n\n${transcript}`,
    })
    return text
  } catch (error) {
    logger.error('❌ [Analysis] Failed to generate proposal', error instanceof Error ? error : new Error(String(error)))
    throw error
  }
}

