import { safeGenerateText } from '../../lib/gemini-safe.js'
import { formatMessagesForAI } from '../../lib/format-messages.js'
import { detectExitIntent } from '../../lib/exit-detection.js'
import type { AgentContext, ChatMessage, ChainOfThoughtStep, AgentResult, FunnelStage } from './types.js'
import type { ConversationFlowState, ConversationCategory } from '../../types/conversation-flow-types.js'
import { GEMINI_MODELS, CALENDAR_CONFIG } from '../../config/constants.js'
import { PHRASE_BANK } from '../chat/conversation-phrases.js'
import { extractCompanySize, extractBudgetSignals, extractTimelineUrgency } from './utils/index.js'
import { analyzeUrl } from '../intelligence/url-context-tool.js'
import { extractGeminiMetadata } from '../../lib/extract-gemini-metadata.js'
import { logger } from '../../lib/logger.js'

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
  const lastMessage = messages[messages.length - 1]?.content || ''
  const urlRegex = /https?:\/\/[^\s]+/g
  const urls = lastMessage.match(urlRegex) || []
  let urlContext = ''

  if (urls.length > 0 && intelligenceContext) {
    try {
      const primaryUrl = urls[0]
      if (!primaryUrl) {
        throw new Error('No URL found')
      }
      const primaryUrlStr = String(primaryUrl)
      const analysis = await analyzeUrl(primaryUrlStr)
      urlContext = `
URL ANALYSIS (${primaryUrlStr}):
- Summary: ${analysis.pageSummary}
- Key initiatives: ${analysis.keyInitiatives.join(', ')}
- Tech stack hints: ${analysis.techStackHints?.join(', ') || 'none detected'}
- Hiring: ${analysis.hiringSignals?.join(', ') || 'none'}
- Pain points mentioned: ${analysis.painPointsMentioned?.join(', ') || 'none'}
`.trim()

      // Auto-fill company website if missing
      const companyDomain = (intelligenceContext.company)?.domain || ''
      if (companyDomain && primaryUrlStr.includes(companyDomain)) {
        if (!intelligenceContext.company) {
          (intelligenceContext).company = { domain: companyDomain }
        }
        intelligenceContext.company.website = primaryUrlStr
      }
    } catch (err) {
      console.warn('URL analysis failed', err)
      urlContext = `I tried to review the page you shared but couldn't load it.`
    }
  }

  // === STRUCTURED EXTRACTION (parallel) ===
  if (intelligenceContext) {
    try {
      const [companySize, budget, timeline] = await Promise.all([
        extractCompanySize(conversationText),
        extractBudgetSignals(conversationText),
        extractTimelineUrgency(conversationText),
      ])

      // Update intelligence context with extracted data
      if (!intelligenceContext.company) {
        intelligenceContext.company = { domain: '' }
      }
      intelligenceContext.company.size = companySize.size
      if (companySize.employeeCount !== undefined) {
      intelligenceContext.company.employeeCount = companySize.employeeCount
      }

      (intelligenceContext).budget = {
        ...((intelligenceContext).budget || {}),
        ...budget
      }

      ;(intelligenceContext).timeline = timeline
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

  // Build system prompt with all context
  let systemPrompt = `You are F.B/c Discovery AI - a lead qualification specialist.

CRITICAL PERSONALIZATION RULES:
- ALWAYS use the company name and person's role in your responses when available
- NEVER give generic responses - every response should reference specific context
- If research shows company info, USE IT in your response (e.g., "Since [Company] is in [Industry]...")
- Avoid generic phrases like "many leaders feel that way" - instead, personalize based on their role/industry

USER CORRECTION DETECTION (CRITICAL):
- If the user says "I'm not the [role]", "I'm not a [title]", "That's not my role", or corrects ANY information about themselves:
  1. IMMEDIATELY acknowledge the correction apologetically
  2. Ask them to clarify their actual role/information
  3. NEVER use the incorrect information again in this conversation
  4. Do NOT reference the old incorrect data in any future responses
- Examples of corrections to watch for:
  - "I'm not the CEO" → Stop using "CEO" and ask for their actual role
  - "That's not my company" → Ask for correct company
  - "I don't work there anymore" → Acknowledge and update understanding
- If you used wrong information, apologize briefly and move on - don't dwell on the mistake

INTELLIGENCE CONTEXT:
${intelligenceContext?.company?.name ? `Company: ${(intelligenceContext.company).name} (USE THIS NAME IN YOUR RESPONSE!)` : '(No company identified yet)'}
${(intelligenceContext?.company)?.industry ? `Industry: ${(intelligenceContext.company).industry}` : ''}
${(intelligenceContext?.company)?.size ? `Size: ${(intelligenceContext.company).size}` : ''}
${intelligenceContext?.person?.fullName ? `Person: ${(intelligenceContext.person).fullName}` : ''}
${intelligenceContext?.person?.role ? `Role: ${(intelligenceContext.person).role} (REFERENCE THIS ROLE IN YOUR RESPONSE!)` : ''}
${(intelligenceContext)?.budget?.hasExplicit ? `Budget: explicit (${(intelligenceContext).budget.minUsd ? `$${(intelligenceContext).budget.minUsd}k+` : 'mentioned'})` : 'Budget: none yet'}
${(intelligenceContext)?.timeline?.urgency ? `Timeline urgency: ${((intelligenceContext).timeline.urgency).toFixed(2)}` : ''}
${intelligenceContext?.leadScore ? `Lead Score: ${intelligenceContext.leadScore}` : ''}
${intelligenceContext?.location ? `Location: ${typeof intelligenceContext.location === 'object' && 'city' in intelligenceContext.location ? (intelligenceContext.location as {city?: string}).city : 'Unknown'}` : ''}
${urlContext ? `${urlContext}\n\nReference this naturally in your response.` : ''}

YOUR MISSION:
Systematically discover lead's needs across 6 categories:
1. GOALS - What are they trying to achieve?
2. PAIN - What's broken/frustrating?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics matter?

CONVERSATION FLOW STATUS:
${conversationFlow ? formatConversationStatus(conversationFlow) : 'Starting discovery'}

MULTIMODAL AWARENESS:`

  if (multimodalContext?.hasRecentImages) {
    systemPrompt += `\n- Screen/webcam active: Reference specific elements naturally`
    if (multimodalContext.recentAnalyses.length > 0 && multimodalContext.recentAnalyses[0]) {
      systemPrompt += `\n  Recent analysis: ${multimodalContext.recentAnalyses[0].substring(0, 150)}...`
    }
  }

  if (multimodalContext?.hasRecentUploads) {
    systemPrompt += `\n- Documents uploaded: Reference insights from uploaded docs`
  }

  if (voiceActive) {
    systemPrompt += `\n- Voice active: Keep responses concise for voice playback (2 sentences max)`
  }

  systemPrompt += `

LANGUAGE RULES:
- ALWAYS respond in English unless the user explicitly switches languages
- If the user writes in another language, respond in English and politely note you'll continue in English
- Never automatically switch to another language based on a few words
- Maintain consistent language throughout the conversation

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Two sentences max per turn
- Ask ONE focused question at a time
- Mirror user's language style (not language) and build on latest turn
- If they shared a URL, act like you deeply read it
- Reference hiring, tech stack, initiatives naturally
- Natural integration of multimodal context:
  ✅ GOOD: "I noticed your dashboard shows revenue declining..."
  ❌ BAD: "Based on the screen share tool output..."

NEXT QUESTION:
${conversationFlow?.recommendedNext ? `Focus on: ${conversationFlow.recommendedNext}` : 'Start with goals'}
${conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]
      ? `Suggested phrasing: "${PHRASE_BANK[conversationFlow.recommendedNext][0]}"`
      : ''}

${conversationFlow?.shouldOfferRecap
      ? 'Deliver a two-sentence recap of what you learned, then ask your next question.'
      : ''}`

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

  let result
  let generatedText = ''
  let extractedMetadata: { groundingMetadata?: any; reasoning?: string } = {}

  try {
    result = await safeGenerateText({
      system: systemPrompt,
      messages: formatMessagesForAI(messages),
      temperature: context.thinkingLevel === 'high' ? 1.0 : 0.7
    })

    generatedText = result.text || ''
    
    // Extract metadata (groundingMetadata, reasoning) from response
    extractedMetadata = extractGeminiMetadata(result)

    // If empty, use fallback
    if (!generatedText || generatedText.trim() === '') {
      console.warn('[Discovery Agent] generateText returned empty, using fallback')
      const fallbackQuestion = (conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]?.[0])
        ? PHRASE_BANK[conversationFlow.recommendedNext][0]
        : "What's the main goal you're trying to achieve with AI?"
      generatedText = fallbackQuestion || "What's the main goal you're trying to achieve with AI?"
    }
  } catch (error) {
    // Enhanced error logging
    logger.error(
        '[Discovery Agent] generateText failed',
        error instanceof Error ? error : new Error(String(error)),
        {
            sessionId: context.sessionId,
            messageCount: messages.length,
            hasConversationFlow: !!conversationFlow
        }
    );
    
    // Always return a valid question
    const fallbackQuestion = conversationFlow?.recommendedNext && PHRASE_BANK[conversationFlow.recommendedNext]?.[0]
      ? PHRASE_BANK[conversationFlow.recommendedNext][0]
      : "What's the main goal you're trying to achieve with AI?"
    
    generatedText = fallbackQuestion || "What's the main goal you're trying to achieve with AI?"
    
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
  if (activeIdx >= 0 && steps[activeIdx]) {
    steps[activeIdx].status = 'complete'
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
