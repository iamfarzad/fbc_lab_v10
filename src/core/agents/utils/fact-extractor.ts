import { generateObject, google } from '../../../lib/ai-client.js'
import { GEMINI_MODELS } from '../../../config/constants.js'
import { z } from 'zod'
import { logger } from '../../../lib/logger.js'
import { getSupabaseService } from '../../../lib/supabase.js'

/**
 * Extracted fact schema
 */
const ExtractedFactsSchema = z.object({
  facts: z.array(z.object({
    fact: z.string().describe('Atomic fact about the user (constraints, preferences, stack, etc.)'),
    category: z.enum(['constraints', 'preferences', 'stack', 'budget', 'timeline', 'goals', 'pain_points', 'other']).optional(),
    confidence: z.number().min(0).max(1).optional().describe('Confidence in this fact (0-1)')
  }))
})

type ExtractedFact = z.infer<typeof ExtractedFactsSchema>['facts'][number]

/**
 * Extract permanent facts from conversation messages
 * 
 * Runs silently after every 3-4 turns to build semantic memory.
 * Facts are stored per email (not just session) for cross-session recall.
 */
export async function extractKeyFacts(
  messages: Array<{ role: string; content: string }>,
  existingFacts: string[],
  sessionId: string,
  email: string
): Promise<void> {
  if (!email || email === 'unknown@example.com') {
    logger.debug('[FactExtractor] Skipping fact extraction - no valid email')
    return
  }

  try {
    // Only extract from recent messages (last 10 turns)
    const recentMessages = messages.slice(-20)
    if (recentMessages.length < 2) {
      logger.debug('[FactExtractor] Not enough messages to extract facts')
      return
    }

    const existingFactsContext = existingFacts.length > 0
      ? `\n\nEXISTING FACTS (avoid duplicates):\n${existingFacts.map((f, i) => `${i + 1}. ${f}`).join('\n')}`
      : ''

    const prompt = `Extract permanent facts about the user from this conversation.

Focus on:
- Constraints (privacy requirements, budget limits, technical constraints)
- Preferences (communication style, tool preferences, local vs cloud)
- Tech stack (tools, platforms, frameworks they use)
- Budget/timeline information (explicit mentions)
- Goals and pain points (what they're trying to achieve, what's blocking them)

EXCLUDE:
- Temporary states ("I'm testing X")
- Questions they asked (unless it reveals a constraint)
- Generic statements without specifics

${existingFactsContext}

Conversation:
${recentMessages.map(m => `${m.role}: ${m.content.substring(0, 500)}`).join('\n\n')}

Extract only NEW facts that aren't already in the existing facts list.`

    const result = await generateObject({
      model: google(GEMINI_MODELS.DEFAULT_FAST),
      schema: ExtractedFactsSchema,
      prompt,
      temperature: 0.3 // Lower temperature for factual extraction
    })

    if (!result.object || !result.object.facts || result.object.facts.length === 0) {
      logger.debug('[FactExtractor] No new facts extracted')
      return
    }

    // Store facts in Supabase
    const supabase = getSupabaseService()
    if (!supabase) {
      logger.warn('[FactExtractor] Supabase not available, skipping fact storage')
      return
    }

    const factsToInsert = result.object.facts
      .filter((f: ExtractedFact) => f.fact && f.fact.trim().length > 0)
      .map((f: ExtractedFact) => ({
        session_id: sessionId,
        email,
        fact_text: f.fact.trim(),
        category: f.category || null,
        confidence: f.confidence ?? 0.7,
        source_message_id: null // Could track which message this came from
      }))

    if (factsToInsert.length === 0) {
      logger.debug('[FactExtractor] No valid facts to insert')
      return
    }

    const { error } = await (supabase as any)
      .from('lead_facts')
      .insert(factsToInsert)

    if (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      logger.error('[FactExtractor] Failed to store facts', error instanceof Error ? error : new Error(errorMsg))
      return
    }

    logger.info('[FactExtractor] Stored facts', { 
      count: factsToInsert.length, 
      email,
      sessionId 
    })
  } catch (err) {
    // Non-fatal - fact extraction shouldn't break the conversation
    logger.warn('[FactExtractor] Fact extraction failed', {
      error: err instanceof Error ? err.message : String(err),
      sessionId,
      email
    })
  }
}

/**
 * Retrieve facts for a lead (by email, across all sessions)
 */
export async function retrieveLeadFacts(email: string): Promise<string[]> {
  if (!email || email === 'unknown@example.com') {
    return []
  }

  try {
    const supabase = getSupabaseService()
    if (!supabase) {
      logger.debug('[FactExtractor] Supabase not available, returning empty facts')
      return []
    }

    const { data, error } = await (supabase as any)
      .from('lead_facts')
      .select('fact_text, confidence, category')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .limit(50) // Get most recent 50 facts

    if (error) {
      logger.warn('[FactExtractor] Failed to retrieve facts', { error: error instanceof Error ? error.message : String(error) })
      return []
    }

    if (!data || data.length === 0) {
      return []
    }

    // Filter by confidence threshold and return fact texts
    const facts = (data as Array<{ fact_text: string; confidence?: number; category?: string }>)
      .filter(f => (f.confidence ?? 0.5) >= 0.5)
      .map(f => f.fact_text)

    logger.debug('[FactExtractor] Retrieved facts', { count: facts.length, email })
    return facts
  } catch (err) {
    logger.warn('[FactExtractor] Fact retrieval failed', {
      error: err instanceof Error ? err.message : String(err),
      email
    })
    return []
  }
}
