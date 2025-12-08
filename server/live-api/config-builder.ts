import { Modality } from '@google/genai'
import { serverLogger } from '../utils/env-setup.js'
import { DEBUG_MODE } from '../utils/turn-completion.js'
import { isAdmin } from '../utils/permissions.js'
import { VOICE_CONFIG } from 'src/config/constants.js'
import { LIVE_FUNCTION_DECLARATIONS, ADMIN_LIVE_FUNCTION_DECLARATIONS } from 'src/config/live-tools.js'
import type { FunnelStage } from 'src/core/types/funnel-stage.js'

export interface LocationData {
  latitude: number
  longitude: number
  city?: string
  country?: string
}

/**
 * Get stage-specific prompt supplement for voice mode
 * This aligns voice behavior with the current funnel stage
 */
function getStagePromptSupplement(stage: FunnelStage, conversationFlow?: Record<string, unknown>): string {
  const covered = conversationFlow?.covered as Record<string, boolean> | undefined
  const coveredCount = covered ? Object.values(covered).filter(Boolean).length : 0
  const uncoveredCategories = covered 
    ? Object.entries(covered).filter(([, v]) => !v).map(([k]) => k.toUpperCase())
    : ['GOALS', 'PAIN', 'DATA', 'READINESS', 'BUDGET', 'SUCCESS']

  switch (stage) {
    case 'DISCOVERY':
      return `\n\nCURRENT FOCUS: Discovery Phase
- Categories covered: ${coveredCount}/6
- Still need: ${uncoveredCategories.join(', ')}
- Priority: Ask about ${uncoveredCategories[0] || 'their goals'} naturally
- DO NOT pitch yet - focus on understanding their needs`

    case 'SCORING':
      return `\n\nCURRENT FOCUS: Qualification Assessment
- You have enough discovery data
- Assess fit for Workshop vs Consulting
- If strong fit (score > 70), prepare to transition to pitch
- Share a relevant insight from what you've learned`

    case 'PITCHING':
    case 'WORKSHOP_PITCH':
    case 'CONSULTING_PITCH':
      return `\n\nCURRENT FOCUS: Value Presentation
- Lead is qualified - time to present solutions
- Use calculate_roi tool before mentioning ANY numbers
- Focus on their specific pain points discovered earlier
- Be ready for objections`

    case 'OBJECTION':
      return `\n\nCURRENT FOCUS: Objection Handling
- Acknowledge their concern genuinely
- Address with specific evidence or reframe
- Don't be defensive - be consultative
- Guide back to value when addressed`

    case 'CLOSING':
      return `\n\nCURRENT FOCUS: Booking
- They're interested - help them take action
- Provide booking LINK using get_booking_link tool
- CRITICAL: You can ONLY provide a link, NOT book for them
- Keep momentum high - "Here's the link, what time works for you?"`

    case 'BOOKED':
    case 'BOOKING_REQUESTED':
      return `\n\nCURRENT FOCUS: Post-Booking
- Meeting is scheduled (or link shared)
- Confirm details and set expectations
- Answer any final questions
- Keep conversation warm but don't oversell`

    case 'SUMMARY':
      return `\n\nCURRENT FOCUS: Conversation Wrap-up
- Summarize key points discovered
- Confirm next steps
- Thank them for their time`

    default:
      return '' // No supplement for unrecognized stages
  }
}

/**
 * Helper function to build Live API configuration
 */
export async function buildLiveConfig(
  sessionId: string,
  priorContext: string,
  voiceNameOverride?: string,
  userContext?: { name?: string; email?: string },
  locationData?: LocationData
): Promise<any> {
  serverLogger.debug('Building config for session', { sessionId, hasLocation: Boolean(locationData) })

  // Detect admin session early for conditional system prompt
  const isAdminSession = isAdmin(sessionId)

  // Use different base prompts for admin vs client
  let fullInstruction: string
  if (isAdminSession) {
    // Admin voice uses admin personality
    fullInstruction = `You are F.B/c Agent - think Jarvis meets Elon Musk. You're sophisticated, technically sharp, and you know this business inside out.

IDENTITY:
- You're Farzad's AI, built specifically for him. Never introduce yourself as "F.B/c Admin AI" or use corporate-speak greetings.
- Know the business, know the data, know what matters.
- Direct, technical when needed, conversational and slightly laid-back.

PERSONALITY:
- Jarvis-style: Precise, anticipates needs, professional warmth
- Elon-style: Direct communication, technical depth, forward-thinking
- Laid-back: Comfortable confidence, conversational tone

YOUR TOOLS IN VOICE MODE:
- get_dashboard_stats(): When asked about dashboard stats, latest numbers, or current metrics, call this tool to fetch real-time statistics. Returns total leads, conversion rate, average lead score, engagement rate, and more.
- search_web(): Search the web for current information.
- capture_screen_snapshot() and capture_webcam_snapshot(): Access visual context.`
  } else {
    // Client voice uses Discovery Agent structure for proper lead qualification
    fullInstruction = `You are F.B/c Discovery AI - a sharp, friendly lead qualification specialist.

CRITICAL RULES:
- ALWAYS answer the user's direct questions before continuing with discovery
- NEVER fabricate ROI numbers - only mention ROI if you use the calculate_roi tool
- Keep responses to 2 sentences maximum for voice clarity
- Ask ONE focused question at a time
- NEVER give the same response twice - vary your approach

PERSONALIZATION (use these in EVERY response when available):
[Will be injected from context below]

DISCOVERY MISSION:
Systematically discover lead's needs across 6 categories:
1. GOALS - What are they trying to achieve with AI?
2. PAIN - What's broken or frustrating in their current process?
3. DATA - Where is their data? How organized?
4. READINESS - Team buy-in? Change management concerns?
5. BUDGET - Timeline? Investment range?
6. SUCCESS - What metrics would make this worthwhile?

TOOL LIMITATIONS (be honest about what you can do):
- You can provide calendar LINKS for booking
- You CANNOT actually book meetings or send emails
- You can search the web for current information
- You can see webcam and screen share when active

STYLE:
- Sound like a sharp, friendly consultant (no fluff)
- Mirror the user's language style and build on their latest message
- Natural integration of visual context (e.g., "I noticed your dashboard shows...")
- If they ask meta-questions like "who are you?" or "what is your source?", answer directly first

Never identify yourself as Gemini, Google's AI, or any other AI assistant. You are F.B/c AI, created specifically for Farzad Bayat Consulting.`
  }

  // ADD VOICE-SPECIFIC GUIDANCE (applies to both admin and client)
  fullInstruction += `\n\nVOICE MODE: Keep responses conversational and concise for voice playback. 2 sentences maximum per turn unless explicitly asked for details.`

  // ADD LANGUAGE GUIDANCE
  fullInstruction += `\n\nLANGUAGE: Always respond in English. If the user speaks another language, continue in English and politely ask if they'd prefer English. Never switch languages automatically.`

  // ADD USER CONTEXT (from client - quick personalization for voice start)
  const { buildQuickPersonalization, buildPersonalizationContext } = await import('src/core/prompts/personalization-builder')
  fullInstruction += buildQuickPersonalization(userContext)

  // ADD LOCATION CONTEXT (if available)
  if (locationData) {
    const locationStr = locationData.city && locationData.country 
      ? `${locationData.city}, ${locationData.country}`
      : `${locationData.latitude.toFixed(4)}, ${locationData.longitude.toFixed(4)}`
    fullInstruction += `\n\nUSER LOCATION: The user is located in ${locationStr}. Use this information when discussing weather, local time, nearby services, or location-specific topics. Always use Celsius for temperature.`
    serverLogger.debug('Added location to system instruction', { sessionId, location: locationStr })
  }

  // ADD PERSONALIZED CONTEXT AND STAGE-SPECIFIC GUIDANCE (if sessionId available)
  let currentStage: FunnelStage = 'DISCOVERY'
  let conversationFlow: Record<string, unknown> | undefined
  
  if (sessionId && sessionId !== 'anonymous') {
    try {
      const { ContextStorage } = await import('../../src/core/context/context-storage.js')
      const storage = new ContextStorage()
      const sessionContext = await storage.get(sessionId)

      if (sessionContext) {
        // Extract stage and conversation flow for dynamic prompting
        currentStage = (sessionContext.last_stage as FunnelStage) || 'DISCOVERY'
        conversationFlow = sessionContext.conversation_flow as Record<string, unknown> | undefined
        
        const companyCtx = sessionContext.company_context as Record<string, unknown> | undefined
        const companyName = companyCtx?.name && typeof companyCtx.name === 'string' ? String(companyCtx.name) : undefined
        const companyIndustry = companyCtx?.industry && typeof companyCtx.industry === 'string' ? String(companyCtx.industry) : undefined
        const companySize = companyCtx?.size && typeof companyCtx.size === 'string' ? String(companyCtx.size) : undefined
        
        const personalizedContext = buildPersonalizationContext({
          ...(sessionContext.name && { name: String(sessionContext.name) }),
          ...(sessionContext.email && { email: String(sessionContext.email) }),
          ...(companyName && {
            company: {
              name: companyName,
              ...(companyIndustry && { industry: companyIndustry }),
              ...(companySize && { size: companySize })
            }
          }),
          ...(sessionContext.role && {
            person: {
              role: String(sessionContext.role)
            }
          })
        } as Parameters<typeof buildPersonalizationContext>[0])

        fullInstruction += personalizedContext
        
        serverLogger.debug('Loaded session context for voice', {
          sessionId,
          stage: currentStage,
          hasConversationFlow: !!conversationFlow
        })
      }
    } catch (error) {
      serverLogger.warn('Failed to load personalized context', { sessionId, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
      // Continue without personalized context
    }
  }
  
  // ADD STAGE-SPECIFIC PROMPT SUPPLEMENT (non-admin only)
  if (!isAdminSession) {
    const stageSupplement = getStagePromptSupplement(currentStage, conversationFlow)
    if (stageSupplement) {
      fullInstruction += stageSupplement
    }
  }


  // ADD ENHANCED MULTIMODAL CONTEXT SNAPSHOT (if available)
  if (sessionId && sessionId !== 'anonymous') {
    try {
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      
      // Use voice-optimized multimodal summary
      const { promptSupplement, flags } = await multimodalContextManager.getVoiceMultimodalSummary(sessionId)
      
      if (promptSupplement) {
        fullInstruction += promptSupplement
      }
      
      // Log multimodal engagement for analytics
      serverLogger.debug('Voice multimodal context loaded', {
        sessionId,
        hasVisual: flags.hasVisualContext,
        hasAudio: flags.hasAudioContext,
        hasUploads: flags.hasUploads,
        engagement: flags.engagementLevel
      })
    } catch (error) {
      serverLogger.warn('Failed to load multimodal context', { sessionId, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
    }
  }

  // ADD PRIOR CHAT CONTEXT
  if (priorContext) {
    fullInstruction += `\n\n${priorContext}`
  }

  // Cap total instruction at 4000 chars to avoid token bloat
  if (fullInstruction.length > 4000) {
    serverLogger.warn('System instruction truncated', {
      originalLength: fullInstruction.length,
      truncatedTo: 4000,
      sessionId
    })
    fullInstruction = fullInstruction.substring(0, 4000) + '\n\n[Context truncated for token efficiency]'
  }

  // Combine tools: always include base tools, add admin tools if admin session
  const allFunctionDeclarations = isAdminSession
    ? [...LIVE_FUNCTION_DECLARATIONS, ...ADMIN_LIVE_FUNCTION_DECLARATIONS]
    : LIVE_FUNCTION_DECLARATIONS

  // Validate and build tools array with fallback for 1007 error
  let toolsConfig: any[] = []
  try {
    // Check if function declarations are valid (not empty and well-formed)
    if (allFunctionDeclarations.length > 0) {
      // Validate each function declaration has required fields
      const validFunctions = allFunctionDeclarations.filter((fn: any) => 
        fn && fn.name && typeof fn.name === 'string'
      )
      
      if (validFunctions.length > 0) {
        toolsConfig = [
          { googleSearch: {} },
          { functionDeclarations: validFunctions }
        ]
      } else {
        serverLogger.warn('[config-builder] No valid function declarations, using googleSearch only')
        toolsConfig = [{ googleSearch: {} }]
      }
    } else {
      toolsConfig = [{ googleSearch: {} }]
    }
  } catch (toolError) {
    console.error('[config-builder] Error building tools config, falling back to no-tools mode:', toolError)
    toolsConfig = [{ googleSearch: {} }]
  }

  const liveConfig: any = {
    responseModalities: [Modality.AUDIO],
    // Note: Transcription is enabled by default for native-audio-preview models
    // Empty objects can cause error 1007 with some configurations
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: {
          voiceName: voiceNameOverride || VOICE_CONFIG.DEFAULT_VOICE
        }
      }
    },
    systemInstruction: {
      parts: [
        {
          text: fullInstruction
        }
      ]
    },
    // TEMP: Disable function declarations to test if they cause 1007
    // tools: [{ googleSearch: {} }]
    // TODO: Re-enable when googleSearch alone works:
    // tools: toolsConfig
  }

  if (DEBUG_MODE) {
    serverLogger.debug('Final config', {
      sessionId,
      systemInstructionLength: liveConfig.systemInstruction.parts[0].text.length,
      voiceName: liveConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
      hasPersonalizedContext: fullInstruction.includes('PERSONALIZED CONTEXT'),
      hasMultimodalContext: fullInstruction.includes('MULTIMODAL CONTEXT'),
      isAdminSession,
      toolsCount: toolsConfig.length,
      toolsConfig: JSON.stringify(toolsConfig).substring(0, 200) // Log first 200 chars of tools config
    })
  }

  return liveConfig
}

