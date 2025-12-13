import { safeGenerateText } from '../../lib/gemini-safe.js'
import { streamText, google } from '../../lib/ai-client.js'
import { formatMessagesForAI } from '../../lib/format-messages.js'
import { buildModelSettings } from '../../lib/multimodal-helpers.js'
import { detectExitIntent } from '../../lib/exit-detection.js'
import type { AgentContext, ChatMessage, ChainOfThoughtStep, AgentResult, FunnelStage } from './types.js'
import type { ConversationFlowState, ConversationCategory } from '../../types/conversation-flow-types.js'
import { GEMINI_MODELS, CALENDAR_CONFIG } from '../../config/constants.js'
import { PHRASE_BANK } from '../chat/conversation-phrases.js'
import { extractCompanySize, extractBudgetSignals, extractTimelineUrgency } from './utils/index.js'
// analyzeUrl no longer used - using shared detectAndAnalyzeUrls utility instead
import { extractGeminiMetadata } from '../../lib/extract-gemini-metadata.js'
import { getAgentTools, extractToolNames } from './utils/agent-tools.js'
import { logger } from '../../lib/logger.js'
import type { LeadProfile } from '../intelligence/types.js'

/**
 * Discovery Agent - Systematically qualifies leads through conversation
 * 
 * Covers 6 categories: goals, pain, data, readiness, budget, success
 * Uses conversation flow to steer questions naturally
 * Multimodal-aware: references voice, screen, webcam, uploads
 */
export async function discoveryAgent(
  messages: ChatMessage[],
  context: AgentContext
): Promise<AgentResult> {
  const { intelligenceContext: intelligenceContextRaw, conversationFlow, multimodalContext, voiceActive } = context
  // Use raw intelligenceContext to access extended fields (budget, timeline, etc.)
  const intelligenceContext = intelligenceContextRaw

  const steps: ChainOfThoughtStep[] = []

  // CRITICAL FIX: Exit detection at start of discovery agent
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  if (lastUserMessage) {
    const exitIntent = detectExitIntent(lastUserMessage.content);

    if (exitIntent === 'BOOKING') {
      const calendarLink = CALENDAR_CONFIG.getLink('consultation')
      return {
        output: `Absolutely! Here's your booking link.\n\nYou can schedule a time that works for you. What specific areas would you like to focus on in our consultation?`,
        agent: 'Discovery Agent (Booking Mode)',
        metadata: {
          stage: 'BOOKING_REQUESTED' as FunnelStage,
          triggerBooking: true,
          action: 'show_calendar_widget',
          calendarLink
        }
      };
    }

    if (exitIntent === 'WRAP_UP') {
      const recap = generateRecap(conversationFlow);
      const calendarLink = CALENDAR_CONFIG.getLink('consultation')
      return {
        output: `Got it. Quick recap: ${recap}. Sound right? Let's schedule a call with Farzad to map this out: ${calendarLink}`,
        agent: 'Discovery Agent (Wrap-up Mode)',
        metadata: {
          stage: 'WRAP_UP' as FunnelStage,
          triggerBooking: true,
          calendarLink
        }
      };
    }
  }

  // === URL DETECTION & ANALYSIS ===
  const conversationText = messages
    .filter((m): m is ChatMessage & { content: string } => typeof m.content === 'string')
    .map(m => m.content)
    .join('\n')
  
  // Validate intelligence context before using it
  let validatedIntelligenceContext = intelligenceContext
  if (intelligenceContext) {
    try {
      const { validateIntelligenceContext } = await import('../../../server/utils/validate-intelligence-context.js')
      const validation = validateIntelligenceContext(intelligenceContext, context.sessionId)
      if (!validation.valid) {
        logger.warn('[Discovery Agent] Invalid intelligence context', {
          errors: validation.errors,
          sessionId: context.sessionId
        })
        // Don't use invalid context
        validatedIntelligenceContext = undefined
      }
    } catch (err) {
      logger.warn('[Discovery Agent] Failed to validate intelligence context', {
        error: err instanceof Error ? err.message : String(err),
        sessionId: context.sessionId
      })
      // Continue with context but log warning
    }
  }
  
  // Use shared URL analysis utility
  const { detectAndAnalyzeUrls } = await import('../utils/url-analysis.js')
  const urlContext = await detectAndAnalyzeUrls(conversationText, validatedIntelligenceContext)
  
  // Extract URLs for later use
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = conversationText.match(urlRegex) || []
  
  // Auto-fill company website if URL matches company domain
  if (validatedIntelligenceContext && urlContext && urls.length > 0) {
    if (validatedIntelligenceContext.company?.domain) {
      const primaryUrl = urls[0]
      const companyDomain = validatedIntelligenceContext.company.domain
      if (primaryUrl?.includes(companyDomain)) {
        if (!validatedIntelligenceContext.company.website) {
          validatedIntelligenceContext.company.website = primaryUrl
        }
      }
    }
  }
  
  // === STRUCTURED EXTRACTION (parallel) ===
  if (intelligenceContext) {
    try {
      const lower = conversationText.toLowerCase()
      const hasCompanySizeCue =
        /\b(employee|employees|headcount|staff)\b/i.test(conversationText) ||
        /\bteam\s+of\s+\d+\b/i.test(conversationText) ||
        /\b\d+\s+(people|employees|person)\b/i.test(conversationText)
      const hasBudgetCue =
        /\$/.test(conversationText) || /\b(budget|cost|price|pricing|expens|invest|spend)\b/i.test(conversationText)
      const hasTimelineCue =
        /\b(timeline|deadline|asap|soon|quarter|q[1-4])\b/i.test(conversationText) ||
        /\b(next|this)\s+(week|month|quarter)\b/i.test(conversationText) ||
        /\bin\s+\d+\s+(day|days|week|weeks|month|months)\b/i.test(conversationText) ||
        /\bby\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec|202\d)\b/i.test(lower)

      const tasks: Array<Promise<void>> = []

      // Company size: only extract when unknown and there's a cue.
      const existingSize = (intelligenceContext.company as any)?.size
      if ((!existingSize || existingSize === 'unknown') && hasCompanySizeCue) {
        tasks.push(
          extractCompanySize(conversationText).then((companySize) => {
            if (!intelligenceContext.company) {
              intelligenceContext.company = { domain: '' }
            }
            intelligenceContext.company.size = companySize.size
            if (companySize.employeeCount !== undefined) {
              intelligenceContext.company.employeeCount = companySize.employeeCount
            }
          })
        )
      }

      // Budget: only extract when not explicit and there's a cue.
      const hasExplicitBudget = Boolean((intelligenceContext as any)?.budget?.hasExplicit)
      if (!hasExplicitBudget && hasBudgetCue) {
        tasks.push(
          extractBudgetSignals(conversationText).then((budget) => {
            ;(intelligenceContext as any).budget = {
              ...((intelligenceContext as any).budget || {}),
              ...budget
            }
          })
        )
      }

      // Timeline: only extract when missing and there's a cue.
      const hasTimeline = typeof (intelligenceContext as any)?.timeline?.urgency === 'number'
      if (!hasTimeline && hasTimelineCue) {
        tasks.push(
          extractTimelineUrgency(conversationText).then((timeline) => {
            ;(intelligenceContext as any).timeline = timeline
          })
        )
      }

      if (tasks.length > 0) {
        await Promise.all(tasks)
      }
    } catch (err) {
      console.warn('Structured extraction failed', err)
      // Continue without extracted data
    }
  }

  // Step 1: Analyze conversation flow
  steps.push({
    label: 'Analyzing conversation flow',
    description: conversationFlow ? `Covered: ${formatConversationStatus(conversationFlow)}` : 'Starting discovery',
    status: 'complete',
    timestamp: Date.now()
  })

  // Extract profile for subtle personalization
  const profile: LeadProfile | undefined = intelligenceContext?.profile
  const citationsCount = (((intelligenceContext as any)?.research?.citations?.length as number | undefined) || 0)
  const identityVerified =
    profile?.identity.verified === true &&
    (intelligenceContext?.researchConfidence || 0) >= 0.85 &&
    citationsCount > 0
  const identityConfirmed = (intelligenceContext as any)?.identityConfirmed === true
  const identityTrusted = identityConfirmed

  // Build context-first prompt, then anchor instructions at the end
  let contextSection = `CONTEXT:
${conversationFlow ? formatConversationStatus(conversationFlow) : 'Starting discovery'}

INTELLIGENCE CONTEXT:
${intelligenceContext?.company?.name ? `Company: ${(intelligenceContext.company).name}${identityTrusted ? '' : ' (unverified)'}` : '(No company identified yet)'}
${(intelligenceContext?.company)?.industry ? `Industry: ${(intelligenceContext.company).industry}` : ''}
${(intelligenceContext?.company)?.size ? `Size: ${(intelligenceContext.company).size}` : ''}
${intelligenceContext?.person?.fullName ? `Person: ${(intelligenceContext.person).fullName}${identityTrusted ? '' : ' (unverified)'}` : ''}
${identityTrusted && intelligenceContext?.person?.role ? `Role: ${(intelligenceContext.person).role}` : ''}
${(intelligenceContext)?.budget?.hasExplicit ? `Budget: explicit (${(intelligenceContext).budget.minUsd ? `$${(intelligenceContext).budget.minUsd}k+` : 'mentioned'})` : 'Budget: none yet'}
${(intelligenceContext)?.timeline?.urgency ? `Timeline urgency: ${((intelligenceContext).timeline.urgency).toFixed(2)}` : ''}
${intelligenceContext?.leadScore ? `Lead Score: ${intelligenceContext.leadScore}` : ''}
${intelligenceContext?.location ? `Location: ${typeof intelligenceContext.location === 'object' && 'city' in intelligenceContext.location ? (intelligenceContext.location as {city?: string}).city : 'Unknown'}` : ''}
${urlContext ? `${urlContext}\nReference this naturally in your response.` : ''}`

  // Inject profile subtly if available (for Turn 2+ or when research completes)
  if (profile) {
    const technicalLevel = profile.digitalFootprint.hasGitHub || profile.digitalFootprint.hasPublications
      ? 'High (Has GitHub/Publications)'
      : 'Business/Creative'
    
    contextSection += `\n\n### USER PROFILE:
	- Verification: ${identityVerified ? 'High-confidence match (NOT user-confirmed)' : 'Unverified'} (score ${profile.identity.confidenceScore}%)
	- Name: ${profile.identity.name}
	- Do not use inferred role/company as facts. Ask the user to confirm their role/company before referencing it.
	- Technical: ${technicalLevel}
	${identityTrusted && profile.professional.yearsExperience ? `- Experience: ~${profile.professional.yearsExperience} years` : ''}
	${identityTrusted && profile.contexthooks.length > 0 ? `- Context Hooks: ${profile.contexthooks.join(', ')}` : ''}`
  }

  if (multimodalContext?.hasRecentImages) {
    contextSection += `\n- Screen/webcam active: Reference specific elements naturally`
    if (multimodalContext.recentAnalyses.length > 0 && multimodalContext.recentAnalyses[0]) {
      contextSection += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
    }
  }

  if (multimodalContext?.hasRecentUploads) {
    contextSection += `\n- Documents uploaded: Reference insights from uploaded docs`
  }

  if (voiceActive) {
    contextSection += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
  }

  const instructionSection = `INSTRUCTIONS:
You are F.B/c Discovery AI. Your job is to understand the user's goals and constraints quickly.

	OUTPUT RULES:
	- No emojis.
	- Do not claim personal/company facts unless the user explicitly stated them OR the context indicates identity was user-confirmed (identityConfirmed).
	- If identity is not user-confirmed, ask the user to confirm name, company, and role before referencing inferred details.

TONE:
- Clear, direct, professional. No hype.
- Ask one focused question per turn.

USER CORRECTION DETECTION (CRITICAL):
- If the user corrects any information about themselves:
  1. IMMEDIATELY acknowledge: "Got it, thanks for the correction!"
  2. Ask them to clarify their actual role/information naturally
  3. NEVER use the incorrect information again in this conversation
  4. Do NOT reference the old incorrect data in any future responses
- If you used wrong information, apologize briefly and move on - don't dwell on the mistake
- Example: "Ah, my mistake - I had outdated info. So what's your current role?"

HANDLING OFF-TOPIC QUESTIONS:
- If they ask something unrelated (testing you, random questions, etc.):
  - Answer briefly and naturally if it's quick
  - Then steer back to discovery with one question

MISSION (DISCOVERY CATEGORIES - guide naturally, don't force):
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

LANGUAGE RULES:
- ALWAYS respond in English unless the user explicitly switches languages
- If the user writes in another language, respond in English and politely note you'll continue in English
- Never automatically switch to another language based on a few words
- Maintain consistent language throughout the conversation

STYLE:
- Sound like a sharp, friendly consultant who's easy to talk to
${voiceActive ? '- Two sentences max per turn (voice mode)' : ''}
- Ask ONE focused question at a time
- Mirror user's language style (not language) and build on latest turn
- If they shared a URL, do NOT pretend you read it. Either reference the explicit analysis you have, or ask for the key points.
- Natural integration of multimodal context:
  Good: "I noticed your dashboard shows revenue declining..."
  Bad: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}
${conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]
	      ? `Suggested phrasing: "${PHRASE_BANK[conversationFlow.recommendedNext][0]}"`
	      : ''}
${conversationFlow?.shouldOfferRecap
	      ? 'Deliver a two-sentence recap of what you learned, then ask your next question.'
	      : ''}`

  const { generateSalesConstraintInstructions } = await import('./utils/context-briefing.js')
  
  const systemPrompt = `${contextSection}

${instructionSection}
${context.systemPromptSupplement || ''}
${generateSalesConstraintInstructions()}`

  // Step 2: Check for question fatigue
  const consecutiveQuestions = countConsecutiveQuestions(messages);
  const shouldOfferRecap = consecutiveQuestions >= 3 || (conversationFlow?.shouldOfferRecap === true);

  if (shouldOfferRecap) {
    const recap = generateRecap(conversationFlow);
    return {
      output: `I've asked quite a few questions. Let me recap what I've learned: ${recap}. Does this sound right? And would you like to schedule a deeper dive with Farzad?`,
      agent: 'Discovery Agent (Recap Mode)',
      metadata: {
        stage: 'DISCOVERY',
        triggerBooking: true,
        recapProvided: true
      }
    };
  }

  // Step 3: Identify knowledge gaps
  const categoriesCovered = conversationFlow
    ? Object.values(conversationFlow.covered).filter(Boolean).length
    : 0
  const nextCategory = conversationFlow?.recommendedNext || 'goals'

  steps.push({
    label: 'Identifying knowledge gaps',
    description: `${categoriesCovered}/6 categories covered. Next: ${nextCategory}`,
    status: 'complete',
    timestamp: Date.now()
  })

  // Step 4: Formulate strategic question
  steps.push({
    label: 'Formulating strategic question',
    description: `Targeting ${nextCategory} discovery`,
    status: 'active',
    timestamp: Date.now()
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type StreamPart = any

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any
  let generatedText = ''
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let extractedMetadata: { groundingMetadata?: any; reasoning?: string } = {}
  const sessionId = context.sessionId || 'anonymous'
  const tools: any = getAgentTools(sessionId, 'Discovery Agent')
  let toolsUsed: string[] = []
  const isStreaming = context.streaming === true && context.onChunk

  try {
    if (isStreaming) {
      // Streaming mode: use streamText
      const modelSettings = buildModelSettings(context, messages, { thinkingLevel: 'high' })
      const stream = await streamText({
        model: google(GEMINI_MODELS.GEMINI_3_PRO_PREVIEW, modelSettings),
        system: systemPrompt,
        messages: formatMessagesForAI(messages),
        temperature: 1.0,
        tools
      })

      // Stream all events (text, tool calls, reasoning, etc.) in real-time
      for await (const part of stream.fullStream as AsyncIterable<StreamPart>) {
        if (part.type === 'text-delta') {
          // Stream text tokens as they arrive
          generatedText += part.text
          if (context.onChunk) {
            context.onChunk(part.text)
          }
        } else if (part.type === 'tool-call' && context.onMetadata) {
          // Stream tool calls in real-time
          context.onMetadata({
            type: 'tool_call',
            toolCall: part
          })
        } else if (part.type === 'tool-result' && context.onMetadata) {
          // Stream tool results in real-time
          context.onMetadata({
            type: 'tool_result',
            toolResult: part
          })
        } else if (part.type === 'reasoning-delta' && context.onMetadata) {
          // Stream reasoning in real-time (if supported by model)
          context.onMetadata({
            type: 'reasoning',
            reasoning: part.delta || part.text
          })
        } else if (part.type === 'reasoning-start' && context.onMetadata) {
          // Stream reasoning start event
          context.onMetadata({
            type: 'reasoning_start',
            message: 'AI is thinking...'
          })
        }
      }

      // Get final result for metadata extraction
      const streamResult = await stream
      // Extract text from stream result (text is already accumulated in generatedText)
      // streamResult.text is a Promise<string>, so we use the accumulated text
      // Try to extract metadata (streamText result may have different structure)
      try {
        // Extract metadata from stream result
        // Note: streamResult may not have the exact same structure as GenerateTextResult
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        extractedMetadata = extractGeminiMetadata(streamResult as any)

        try {
          const tc = await streamResult.toolCalls
          toolsUsed = extractToolNames(tc)
        } catch {
          toolsUsed = []
        }
        
        // Stream tool calls if they occurred (from final result)
        if (context.onMetadata) {
          try {
            const toolCalls = await streamResult.toolCalls
            if (toolCalls && toolCalls.length > 0) {
              for (const toolCall of toolCalls) {
                context.onMetadata({
                  type: 'tool_call',
                  toolCall: toolCall
                })
              }
            }
          } catch {
            // Ignore if toolCalls not available
          }
        }
        
        // Send final metadata if available
        if (context.onMetadata && extractedMetadata) {
          context.onMetadata({
            type: 'final_metadata',
            reasoning: extractedMetadata.reasoning,
            groundingMetadata: extractedMetadata.groundingMetadata
          })
        }
      } catch {
        // If extraction fails, continue without metadata
        extractedMetadata = {}
      }
    } else {
      // Non-streaming mode: use safeGenerateText
      const modelSettings = buildModelSettings(context, messages, { thinkingLevel: 'high' })
      result = await safeGenerateText({
        system: systemPrompt,
        messages: formatMessagesForAI(messages),
        temperature: 1.0,
        modelId: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
        modelSettings,
        tools
      })

      generatedText = result.text || ''
      
      // Extract metadata (groundingMetadata, reasoning) from response
      extractedMetadata = extractGeminiMetadata(result)
      toolsUsed = extractToolNames(result.toolCalls)
    }

    // If empty, use fallback
    if (!generatedText || generatedText.trim() === '') {
      console.warn('[Discovery Agent] generateText returned empty, using fallback')
      const fallbackQuestion = (conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]?.[0])
        ? PHRASE_BANK[conversationFlow.recommendedNext][0]
        : "What's the main goal you're trying to achieve with AI?"
      generatedText = fallbackQuestion || "What's the main goal you're trying to achieve with AI?"
      
      // If streaming, send fallback text
      if (isStreaming && context.onChunk) {
        context.onChunk(fallbackQuestion || "What's the main goal you're trying to achieve with AI?")
      }
    }
  } catch (error) {
    // Enhanced error logging
    logger.error(
        '[Discovery Agent] generateText/streamText failed',
        error instanceof Error ? error : new Error(String(error)),
        {
            sessionId: context.sessionId,
            messageCount: messages.length,
            hasConversationFlow: !!conversationFlow,
            isStreaming
        }
    );
    
    // Always return a valid question
    const fallbackQuestion = conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]?.[0]
      ? PHRASE_BANK[conversationFlow.recommendedNext][0]
      : "What's the main goal you're trying to achieve with AI?"
    
    generatedText = fallbackQuestion || "What's the main goal you're trying to achieve with AI?"
    
    // If streaming, send fallback text
    if (isStreaming && context.onChunk) {
      context.onChunk(fallbackQuestion || "What's the main goal you're trying to achieve with AI?")
    }
    
    // Mark this as an error so frontend knows not to retry
    steps.push({
      label: 'Error occurred, using fallback',
      description: error instanceof Error ? error.message : 'Unknown error',
      status: 'complete',
      timestamp: Date.now()
    })
  }

  // Mark the currently active step as complete (guard against missing index)
  const activeIdx = steps.findIndex(s => s.status === 'active')
  if (activeIdx >= 0) {
    const activeStep = steps[activeIdx]
    if (activeStep) activeStep.status = 'complete'
  }

  // Step 5: Incorporate multimodal context
  if (multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio || multimodalContext?.hasRecentUploads) {
    steps.push({
      label: 'Incorporating multimodal context',
      description: [
        multimodalContext.hasRecentImages && 'screen/webcam',
        multimodalContext.hasRecentAudio && 'voice',
        multimodalContext.hasRecentUploads && 'uploads'
      ].filter(Boolean).join(', ') + ' detected',
      status: 'complete',
      timestamp: Date.now()
    })
  }

  // NEW: Extract categories from agent's understanding and enhance flow
  const enhancedFlow = enhanceConversationFlow(
    conversationFlow,
    generatedText,
    messages
  )

  interface EnhancedFlow {
    recommendedNext?: string | null
  }

  // Determine next stage based on extracted data
  const hasCompanySize = (intelligenceContext?.company)?.size && (intelligenceContext.company).size !== 'unknown'
  const hasBudget = (intelligenceContext)?.budget?.hasExplicit
  const hasUrlContext = urls.length > 0
  // If we have all required data, metadata will indicate next stage
  const shouldFastTrack = hasCompanySize && hasBudget && hasUrlContext

  return {
    output: generatedText,
    agent: 'Discovery Agent',
    model: GEMINI_MODELS.DEFAULT_CHAT,
    metadata: {
      stage: shouldFastTrack ? ('QUALIFIED' as FunnelStage) : ('DISCOVERY' as FunnelStage),
      chainOfThought: { steps },
      categoriesCovered,
      toolsUsed,
      ...(((enhancedFlow as EnhancedFlow | null)?.recommendedNext !== undefined || conversationFlow?.recommendedNext !== undefined) && {
        recommendedNext: (enhancedFlow as EnhancedFlow | null)?.recommendedNext || conversationFlow?.recommendedNext || null
      }),
      ...((multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio) && {
        multimodalUsed: multimodalContext?.hasRecentImages || multimodalContext?.hasRecentAudio
      }),
      enhancedConversationFlow: enhancedFlow, // NEW
      // Pass through extracted metadata
      ...(extractedMetadata.reasoning && { reasoning: extractedMetadata.reasoning }),
      ...(extractedMetadata.groundingMetadata && { groundingMetadata: extractedMetadata.groundingMetadata })
    }
  }
}

// Count consecutive questions from assistant
function countConsecutiveQuestions(messages: ChatMessage[]): number {
  let count = 0;
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (message && message.role === 'assistant' && message.content && message.content.includes('?')) {
      count++;
    } else if (message && message.role === 'user') {
      break; // Stop counting when we hit a user message
    }
  }
  return count;
}

// Generate recap from conversation flow
function generateRecap(conversationFlow: ConversationFlowState | undefined): string {
  if (!conversationFlow?.evidence) return 'We discussed your AI needs and challenges.';

  const categories: ConversationCategory[] = ['goals', 'pain', 'data', 'readiness', 'budget', 'success'];
  const coveredCategories = categories.filter(cat => conversationFlow.covered?.[cat]);

  if (coveredCategories.length === 0) return 'We just started discussing your AI needs.';

  const recapParts = coveredCategories.map(cat => {
    const evidenceRecord = conversationFlow.evidence
    if (!evidenceRecord || typeof evidenceRecord !== 'object') return `${cat}: (no evidence)`

    const evidenceValue = cat in evidenceRecord ? (evidenceRecord as Record<string, unknown>)[cat] : undefined
    const evidenceArray = Array.isArray(evidenceValue) ? evidenceValue : undefined
    const firstItem = evidenceArray && evidenceArray.length > 0 ? (evidenceArray[0] as unknown) : undefined
    const evidence = typeof firstItem === 'string' ? firstItem : ''
    const evidenceStr = typeof evidence === 'string' ? evidence : String(evidence || '')
    return `${cat}: ${evidenceStr.substring(0, 100)}${evidenceStr.length > 100 ? '...' : ''}`;
  });

  return recapParts.join('; ');
}

function formatConversationStatus(flow: ConversationFlowState | undefined): string {
  if (!flow) return 'Starting discovery'

  const categories: ConversationCategory[] = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  const covered = categories.filter(cat => flow.covered?.[cat])
  const pending = categories.filter(cat => !flow.covered?.[cat])

  const totalUserTurns = typeof flow.totalUserTurns === 'number' ? flow.totalUserTurns : 0
  const recommendedNext = typeof flow.recommendedNext === 'string' ? flow.recommendedNext : null

  return `
Covered (${covered.length}/6): ${covered.join(', ')}
Pending: ${pending.join(', ')}
Total user turns: ${totalUserTurns}
${recommendedNext ? `Next recommended: ${recommendedNext}` : 'All categories covered'}
`
}

/**
 * Enhance conversation flow with agent's deeper understanding
 * Combines client-side pattern matching with agent reasoning
 */
interface EnhancedConversationFlow {
  covered: Record<string, boolean>
  recommendedNext?: string | null
  evidence?: Record<string, string[]>
  insights?: Record<string, unknown>
  coverageOrder?: Array<{ category: string;[key: string]: unknown }>
  totalUserTurns?: number
  firstUserTimestamp?: number | null
  latestUserTimestamp?: number | null
  shouldOfferRecap?: boolean
  [key: string]: unknown // Allow additional properties from ConversationFlowState
}

function enhanceConversationFlow(
  clientFlow: ConversationFlowState | undefined,
  agentResponse: string,
  messages: ChatMessage[]
): EnhancedConversationFlow {
  // Start with client-detected flow if available
  const enhanced: EnhancedConversationFlow = clientFlow ? ({
    ...clientFlow,
    covered: { ...clientFlow.covered },
    evidence: clientFlow.evidence ? { ...clientFlow.evidence } : {},
    insights: clientFlow.insights ? { ...clientFlow.insights } : {},
    coverageOrder: clientFlow.coverageOrder ? [...clientFlow.coverageOrder] : []
  } as unknown as EnhancedConversationFlow) : {
    covered: {
      goals: false,
      pain: false,
      data: false,
      readiness: false,
      budget: false,
      success: false
    },
    evidence: {},
    insights: {},
    coverageOrder: [],
    totalUserTurns: messages.filter(m => m.role === 'user').length,
    firstUserTimestamp: null,
    latestUserTimestamp: null,
    shouldOfferRecap: false,
    recommendedNext: null
  }

  // Get last user message for analysis
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()
  const userContent = lastUserMsg?.content.toLowerCase() || ''
  const response = agentResponse.toLowerCase()

  // Enhanced detection: Goals
  if (!enhanced.covered.goals && (
    response.includes("your goal") ||
    response.includes("trying to achieve") ||
    response.includes("what are you") && (response.includes("looking") || response.includes("hoping")) ||
    userContent.includes("want to") ||
    userContent.includes("trying to") ||
    userContent.includes("looking to") ||
    userContent.includes("hoping to") ||
    userContent.includes("aim to") ||
    userContent.includes("plan to")
  )) {
    enhanced.covered.goals = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.goals) enhanced.evidence.goals = []
    enhanced.evidence.goals.push(lastUserMsg?.content || '')
  }

  // Enhanced detection: Pain
  if (!enhanced.covered.pain && (
    response.includes("struggling") ||
    response.includes("challenge") ||
    response.includes("problem") ||
    response.includes("pain point") ||
    response.includes("frustrating") ||
    userContent.includes("struggl") ||
    userContent.includes("problem") ||
    userContent.includes("issue") ||
    userContent.includes("challenge") ||
    userContent.includes("frustrat") ||
    userContent.includes("bottleneck") ||
    userContent.includes("difficult")
  )) {
    enhanced.covered.pain = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.pain) enhanced.evidence.pain = []
    enhanced.evidence.pain.push(lastUserMsg?.content || '')
  }

  // Enhanced detection: Data
  if (!enhanced.covered.data && (
    response.includes("your data") ||
    response.includes("where is") && (response.includes("data") || response.includes("information")) ||
    response.includes("stored") ||
    response.includes("crm") ||
    response.includes("spreadsheet") ||
    userContent.includes("data") ||
    userContent.includes("spreadsheet") ||
    userContent.includes("csv") ||
    userContent.includes("crm") ||
    userContent.includes("database") ||
    userContent.includes("excel") ||
    userContent.includes("stored") ||
    userContent.includes("files")
  )) {
    enhanced.covered.data = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.data) enhanced.evidence.data = []
    enhanced.evidence.data.push(lastUserMsg?.content || '')
  }

  // Enhanced detection: Readiness
  if (!enhanced.covered.readiness && (
    response.includes("your team") ||
    response.includes("buy-in") ||
    response.includes("adoption") ||
    response.includes("change management") ||
    response.includes("champion") ||
    userContent.includes("team") ||
    userContent.includes("buy-in") ||
    userContent.includes("adopt") ||
    userContent.includes("workflow") ||
    userContent.includes("change") ||
    userContent.includes("champion") ||
    userContent.includes("stakeholder")
  )) {
    enhanced.covered.readiness = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.readiness) enhanced.evidence.readiness = []
    enhanced.evidence.readiness.push(lastUserMsg?.content || '')
  }

  // Enhanced detection: Budget
  if (!enhanced.covered.budget && (
    response.includes("budget") ||
    response.includes("investment") ||
    response.includes("timeline") ||
    response.includes("when") && (response.includes("need") || response.includes("start")) ||
    response.includes("quarter") ||
    userContent.includes("budget") ||
    userContent.includes("cost") ||
    userContent.includes("price") ||
    userContent.includes("invest") ||
    userContent.includes("spend") ||
    userContent.includes("timeline") ||
    userContent.includes("quarter") ||
    userContent.includes("q1") ||
    userContent.includes("q2") ||
    userContent.includes("q3") ||
    userContent.includes("q4") ||
    userContent.includes("by ") && (userContent.includes("202") || userContent.includes("jan") || userContent.includes("feb"))
  )) {
    enhanced.covered.budget = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.budget) enhanced.evidence.budget = []
    enhanced.evidence.budget.push(lastUserMsg?.content || '')
  }

  // Enhanced detection: Success
  if (!enhanced.covered.success && (
    response.includes("success") ||
    response.includes("metric") ||
    response.includes("measure") ||
    response.includes("roi") ||
    response.includes("kpi") ||
    response.includes("outcome") ||
    userContent.includes("success") ||
    userContent.includes("metric") ||
    userContent.includes("measure") ||
    userContent.includes("roi") ||
    userContent.includes("kpi") ||
    userContent.includes("result") ||
    userContent.includes("outcome") ||
    userContent.includes("expect")
  )) {
    enhanced.covered.success = true
    if (!enhanced.evidence) enhanced.evidence = {}
    if (!enhanced.evidence.success) enhanced.evidence.success = []
    enhanced.evidence.success.push(lastUserMsg?.content || '')
  }

  // Update recommendedNext based on enhanced coverage
  const categories = ['goals', 'pain', 'data', 'readiness', 'budget', 'success']
  const nextUncovered = categories.find(cat => !enhanced.covered[cat])
  enhanced.recommendedNext = nextUncovered || null

  // Update totals
  enhanced.totalUserTurns = messages.filter(m => m.role === 'user').length
  if (messages.length > 0) {
    const userMessages = messages.filter(m => m.role === 'user')
    if (userMessages.length > 0) {
      const firstMsg = userMessages[0]
      const lastMsg = userMessages[userMessages.length - 1]
      if (firstMsg) {
        enhanced.firstUserTimestamp = typeof firstMsg.timestamp === 'number'
          ? firstMsg.timestamp
          : new Date(firstMsg.timestamp || Date.now()).getTime()
      }
      if (lastMsg) {
        enhanced.latestUserTimestamp = typeof lastMsg.timestamp === 'number'
          ? lastMsg.timestamp
          : new Date(lastMsg.timestamp || Date.now()).getTime()
      }
    }
  }
  enhanced.shouldOfferRecap = enhanced.totalUserTurns >= 6

  return enhanced
}
