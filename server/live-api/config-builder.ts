import { Modality } from '@google/genai'
import { serverLogger } from '../utils/env-setup.js'
import { DEBUG_MODE } from '../utils/turn-completion.js'
import { isAdmin } from '../utils/permissions.js'
import { GEMINI_CONFIG, VOICE_CONFIG } from '../../src/config/constants.js'
import { LIVE_FUNCTION_DECLARATIONS, ADMIN_LIVE_FUNCTION_DECLARATIONS } from '../../src/config/live-tools.js'

/**
 * Helper function to build Live API configuration
 */
export async function buildLiveConfig(
  sessionId: string,
  priorContext: string,
  voiceNameOverride?: string,
  userContext?: { name?: string; email?: string }
): Promise<any> {
  serverLogger.debug('Building config for session', { sessionId })

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
    // Client voice uses client personality
    fullInstruction = GEMINI_CONFIG.SYSTEM_PROMPT
    fullInstruction += `\n\nNever identify yourself as Gemini, Google's AI, or any other AI assistant. You are F.B/c AI, created specifically for Farzad Bayat Consulting.`
  }

  // ADD VOICE-SPECIFIC GUIDANCE (applies to both admin and client)
  fullInstruction += `\n\nVOICE MODE: Keep responses conversational and concise for voice playback. 2 sentences maximum per turn unless explicitly asked for details.`


  // ADD USER CONTEXT (from client - quick personalization for voice start)
  const { buildQuickPersonalization, buildPersonalizationContext } = await import('src/core/prompts/personalization-builder')
  fullInstruction += buildQuickPersonalization(userContext)

  // ADD PERSONALIZED CONTEXT (if sessionId available - full context from DB)
  if (sessionId && sessionId !== 'anonymous') {
    try {
      const { ContextStorage } = await import('../../src/core/context/context-storage.js')
      const storage = new ContextStorage()
      const sessionContext = await storage.get(sessionId)

      if (sessionContext) {
        const companyCtx = sessionContext.company_context as any
        const personalizedContext = buildPersonalizationContext({
          ...(sessionContext.name && { name: sessionContext.name }),
          ...(sessionContext.email && { email: sessionContext.email }),
          ...(companyCtx?.name && {
            company: {
              name: companyCtx.name,
              ...(companyCtx.industry && { industry: companyCtx.industry }),
              ...(companyCtx.size && { size: companyCtx.size })
            }
          }),
          ...(sessionContext.role && {
            person: {
              role: sessionContext.role
            }
          })
        })

        fullInstruction += personalizedContext
      }
    } catch (error) {
      serverLogger.warn('Failed to load personalized context', { sessionId, error: error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : String(error) })
      // Continue without personalized context
    }
  }


  // ADD MULTIMODAL CONTEXT SNAPSHOT (if available)
  if (sessionId && sessionId !== 'anonymous') {
    try {
      const { multimodalContextManager } = await import('src/core/context/multimodal-context')
      // Admin: can load broader context (analytics, transcripts across sessions)
      // Client: only own multimodal context
      const contextData = await multimodalContextManager.prepareChatContext(
        sessionId,
        false, // Don't include visual for initial prompt (too large)
        false  // Don't include audio
      )

      if (contextData.multimodalContext?.recentAnalyses?.length > 0) {
        const recentSummary = contextData.multimodalContext.recentAnalyses
          .slice(0, 2) // Last 2 analyses only
          .join('; ')

        if (recentSummary.length > 0 && recentSummary.length <= 300) {
          fullInstruction += `\n\nRECENT MULTIMODAL CONTEXT: ${recentSummary}`
        }
      }
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

  const liveConfig: any = {
    responseModalities: [Modality.AUDIO],  // ← Use enum like prototype
    inputAudioTranscription: {},  // Enable input transcription (empty object = use default model)
    outputAudioTranscription: {}, // Enable output transcription (empty object = use default model)
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
          text: fullInstruction  // ← Wrap in parts array like prototype
        }
      ]
    },
    tools: [
      { googleSearch: {} },
      { functionDeclarations: allFunctionDeclarations }
    ],
    generationConfig: {
      temperature: 1.0, // Recommended for Gemini 3.0 with high thinking
      // @ts-ignore - thinking field might not be in types yet
      candidateCount: 1
    }
  }

  if (DEBUG_MODE) {
    serverLogger.debug('Final config', {
      sessionId,
      systemInstructionLength: liveConfig.systemInstruction.parts[0].text.length,
      voiceName: liveConfig.speechConfig.voiceConfig.prebuiltVoiceConfig.voiceName,
      hasPersonalizedContext: fullInstruction.includes('PERSONALIZED CONTEXT'),
      hasMultimodalContext: fullInstruction.includes('MULTIMODAL CONTEXT'),
      isAdminSession,
      toolsCount: allFunctionDeclarations.length
    })
  }

  return liveConfig
}

