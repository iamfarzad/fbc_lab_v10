import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeToAgent } from '../src/core/agents/orchestrator.js';
import type { ChatMessage } from '../src/core/agents/types.js';
import type { FunnelStage } from '../src/core/types/funnel-stage.js';
import { logger } from '../src/lib/logger.js'
import { multimodalContextManager } from '../src/core/context/multimodal-context.js';
import { rateLimit } from '../src/lib/rate-limiter.js';
import { supabaseService } from '../src/core/supabase/client.js';
// import { ensureWorkersInitialized } from 'src/core/queue/redis-queue';

/**
 * Determine current funnel stage based on intelligence context and triggers
 * 
 * Single source of truth for stage determination in the API layer.
 * This keeps the orchestrator pure and testable.
 */
function determineCurrentStage(
  intelligenceContext: any,
  trigger?: string
): FunnelStage {
  if (trigger === 'conversation_end') return 'SUMMARY'
  if (trigger === 'booking') return 'CLOSING'
  if (trigger === 'admin') return 'PITCHING' // Will be handled by orchestrator

  // ONLY fast-track if ALL THREE criteria are met (not just one)
  // This prevents skipping Discovery just because we know the company website
  const isFullyQualified =
    intelligenceContext?.company?.size &&
    intelligenceContext.company.size !== 'unknown' &&
    intelligenceContext?.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes((intelligenceContext?.person?.seniority || '') as string)

  // ALWAYS start with DISCOVERY unless fully qualified
  // Having a website alone is NOT enough to skip discovery
  return isFullyQualified ? 'SCORING' : 'DISCOVERY'
}

/**
 * Main chat endpoint for AI Brain agent orchestration
 * 
 * Security: Runs server-side with SERVICE_ROLE_KEY
 * Handles: Agent routing, context management, response streaming
 */
export default async function handler(
    req: VercelRequest,
    res: VercelResponse
) {
    logger.debug('[API /chat] Request received', { method: req.method, body: req.body });

    // TODO: Re-enable when redis-queue is available
    // await ensureWorkersInitialized();

    // CORS headers for frontend
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // Check API key before processing
        const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
        if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
            logger.error('[API /chat] API key not configured');
            return res.status(500).json({
                success: false,
                error: 'API key not configured. Please set GEMINI_API_KEY in Vercel environment variables.',
                output: "I'm unable to process requests because the API key is not configured. Please contact the administrator."
            });
        }

        const { messages, sessionId, intelligenceContext, trigger, multimodalContext } = req.body;

        // Rate limiting - check before processing
        const effectiveSessionId = (sessionId || `session-${Date.now()}`) as string
        if (!rateLimit(effectiveSessionId, 'message')) {
            return res.status(429).json({
                success: false,
                output: "Whoa, slow down! I'm getting flooded — give me 15 seconds and try again.",
                agent: 'RateLimiter',
                error: 'Rate limit exceeded'
            })
        }

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Messages array is required' });
        }

        // Validate and normalize message structure
        const validMessages = messages
            .filter((m: any) => {
                if (!m || typeof m !== 'object') return false
                if (!m.role || typeof m.role !== 'string') return false
                // Must have content (string) OR attachments
                const hasContent = m.content && (typeof m.content === 'string' ? m.content.trim() : true)
                const hasAttachments = m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0
                return hasContent || hasAttachments
            })
            .map((m: any) => {
                // Normalize role: 'model' (Gemini API) -> 'assistant' (AI SDK)
                const normalizedRole = m.role === 'model'
                    ? 'assistant'
                    : (m.role === 'user' || m.role === 'system' || m.role === 'assistant'
                        ? m.role
                        : 'user')

                // Remove attachments from non-user messages (only user can send images)
                const attachments = (normalizedRole === 'user' && m.attachments && Array.isArray(m.attachments))
                    ? m.attachments
                    : undefined

                return {
                    ...m,
                    role: normalizedRole,
                    attachments
                }
            })

        if (validMessages.length === 0) {
            return res.status(400).json({ error: 'No valid messages found. Messages must have content or attachments.' })
        }

        if (validMessages.length !== messages.length) {
            console.warn(`[API /chat] Filtered out ${messages.length - validMessages.length} invalid messages`)
        }

        // Determine current stage (single source of truth in API layer)
        const currentStage = determineCurrentStage(
            intelligenceContext,
            trigger as string | undefined
        )

        // Persist stage so reloads don't reset (safe fallback if table/column missing)
        if (sessionId && supabaseService && typeof (supabaseService as { from?: (table: string) => unknown })?.from === 'function') {
          try {
            const { error } = await supabaseService
              .from('conversations')
              .update({ stage: currentStage as string })
              .eq('session_id', sessionId as string)
            
            if (error) throw error
          } catch (err) {
            // Non-blocking — survives if column/table missing (pre-deploy safety)
            logger.debug('Stage persistence failed (safe):', { 
              error: err instanceof Error ? err.message : String(err), 
              sessionId 
            })
          }
        }

        // Load multimodal context if not provided and sessionId exists
        let finalMultimodalContext = multimodalContext
        if (!finalMultimodalContext && sessionId) {
            try {
                const contextData = await multimodalContextManager.prepareChatContext(
                    sessionId as string,
                    true, // include visual
                    true  // include audio
                )
                finalMultimodalContext = contextData.multimodalContext
            } catch (err) {
                logger.debug('Failed to load multimodal context, using empty', { error: err })
                finalMultimodalContext = {
                    hasRecentImages: false,
                    hasRecentAudio: false,
                    hasRecentUploads: false,
                    recentAnalyses: [],
                    recentUploads: []
                }
            }
        }

        try {
            // Extract conversationFlow if provided (crucial for Discovery Agent)
            const conversationFlow = req.body.conversationFlow || null;

            // Route to appropriate agent with validated messages
            const result = await routeToAgent({
                messages: validMessages as ChatMessage[],
                sessionId: sessionId || `session-${Date.now()}`,
                currentStage,
                intelligenceContext: intelligenceContext || {},
                multimodalContext: finalMultimodalContext || {
                    hasRecentImages: false,
                    hasRecentAudio: false,
                    hasRecentUploads: false,
                    recentAnalyses: [],
                    recentUploads: []
                },
                trigger: trigger || 'chat',
                conversationFlow // Pass flow context to orchestrator
            });

            // Return agent response
            return res.status(200).json({
                success: true,
                output: result.output,
                agent: result.agent,
                model: result.model,
                metadata: result.metadata
            });
        } catch (error) {
            // Enhanced error logging with full stack trace
            const errorDetails = error instanceof Error 
                ? {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                  }
                : { raw: String(error) };
            
            logger.error(
                '[API /chat] Agent routing failed',
                error instanceof Error ? error : new Error(String(error)),
                {
                    sessionId,
                    currentStage,
                    messageCount: validMessages.length,
                    hasIntelligenceContext: !!intelligenceContext,
                    errorDetails
                }
            );

            // Always return JSON error to prevent parsing failures on client
            const isDev = process.env.NODE_ENV !== 'production';
            return res.status(500).json({
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error executing agent',
                agent: 'Orchestrator (Error Fallback)',
                ...(isDev && { details: errorDetails })
            });
        }

    } catch (error) {
        console.error('[API /chat] Global Error:', error);
        if (error instanceof Error && error.stack) {
            console.error('[API /chat] Stack:', error.stack);
        }
        
        // In development, expose more error details
        const isDev = process.env.NODE_ENV !== 'production';
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error',
            ...(isDev && error instanceof Error && {
                details: error.stack,
                name: error.name
            })
        });
    }
}
