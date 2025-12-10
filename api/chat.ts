import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { ChatMessage, IntelligenceContext, MultimodalContextData, AgentMetadata, AgentResult } from '../src/core/agents/types.js';
import type { FunnelStage } from '../src/core/types/funnel-stage.js';
import type { ConversationFlowState } from '../src/types/conversation-flow-types.js';
// routeToAgent imported dynamically when needed
import { logger } from '../src/lib/logger.js';
import { multimodalContextManager } from '../src/core/context/multimodal-context.js';
import { rateLimit } from '../src/lib/rate-limiter.js';
import { supabaseService } from '../src/core/supabase/client.js';

interface ChatRequestBody {
  messages?: unknown[];
  sessionId?: string;
  intelligenceContext?: IntelligenceContext | Record<string, unknown>;
  trigger?: string;
  multimodalContext?: MultimodalContextData;
  stream?: boolean;
  conversationFlow?: ConversationFlowState;
}

interface IncomingMessage {
  role?: string;
  content?: string;
  attachments?: Array<{ mimeType?: string; data?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface ValidatedMessage {
  role: 'user' | 'assistant' | 'system';
  content?: string | undefined;
  attachments?: Array<{ mimeType?: string; data?: string; [key: string]: unknown }> | undefined;
  [key: string]: unknown;
}

/**
 * Determine current funnel stage based on intelligence context and triggers
 * 
 * Single source of truth for stage determination in the API layer.
 * This keeps the orchestrator pure and testable.
 */
function determineCurrentStage(
  intelligenceContext: IntelligenceContext | Record<string, unknown> | undefined,
  trigger?: string
): FunnelStage {
  if (trigger === 'conversation_end') return 'SUMMARY'
  if (trigger === 'booking') return 'CLOSING'
  if (trigger === 'admin') return 'PITCHING' // Will be handled by orchestrator

  // Type guard to check if it's a proper IntelligenceContext
  const hasCompany = intelligenceContext && typeof intelligenceContext === 'object' && 'company' in intelligenceContext;
  const hasBudget = intelligenceContext && typeof intelligenceContext === 'object' && 'budget' in intelligenceContext;
  const hasPerson = intelligenceContext && typeof intelligenceContext === 'object' && 'person' in intelligenceContext;

  if (!hasCompany || !hasBudget || !hasPerson) {
    return 'DISCOVERY';
  }

  const ctx = intelligenceContext as IntelligenceContext;

  // ONLY fast-track if ALL THREE criteria are met (not just one)
  // This prevents skipping Discovery just because we know the company website
  const isFullyQualified =
    ctx.company?.size &&
    ctx.company.size !== 'unknown' &&
    ctx.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes((ctx.person?.seniority || '') as string)

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
    // CORS headers for frontend - set first before any processing
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

    logger.debug('[API /chat] Request received', { method: req.method });

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

        const body = req.body as ChatRequestBody;
        const { messages, sessionId, intelligenceContext, trigger, multimodalContext, stream } = body;

        // Check if streaming is requested - extract early for SSE setup
        const shouldStream = stream === true;

        // Start SSE streaming immediately (before blocking operations)
        if (shouldStream) {
            logger.info('[API /chat] Starting SSE streaming', { sessionId });
            
            // Return SSE stream
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');
            res.setHeader('Access-Control-Allow-Origin', '*');
            
            // Send initial status message immediately
            res.write('data: {"type":"status","message":"Loading context..."}\n\n');
        }

        // Validate and load contexts in parallel for better performance
        // For streaming: Start with provided context immediately, load fresh in background
        // For non-streaming: Wait for full context before processing
        let finalIntelligenceContext = intelligenceContext as IntelligenceContext | undefined
        let finalMultimodalContext = multimodalContext
        
        // Context loading function (reusable for both streaming and non-streaming)
        const loadContexts = async (): Promise<void> => {
            if (!sessionId || sessionId === 'anonymous') return
            
            const contextPromises: Promise<unknown>[] = []
            
            // Intelligence context loading (with cache)
            contextPromises.push(
                (async () => {
                    try {
                        // Send status update if streaming
                        if (shouldStream) {
                            res.write('data: {"type":"status","message":"Loading intelligence context..."}\n\n');
                        }
                        
                        const { loadIntelligenceContextFromDB } = await import('../server/utils/intelligence-context-loader.js')
                        const { validateIntelligenceContext } = await import('../server/utils/validate-intelligence-context.js')
                        const { getCachedIntelligenceContext } = await import('../server/cache/intelligence-context-cache.js')
                        
                        // Load fresh context from database (with cache)
                        const freshContext = await getCachedIntelligenceContext(
                            sessionId,
                            loadIntelligenceContextFromDB
                        )
                        
                        if (finalIntelligenceContext) {
                            // Validate provided context
                            const validation = validateIntelligenceContext(finalIntelligenceContext, sessionId)
                            if (!validation.valid) {
                                logger.warn('[API /chat] Invalid intelligence context provided', {
                                    sessionId,
                                    errors: validation.errors
                                })
                                // Use fresh context instead
                                finalIntelligenceContext = freshContext || undefined
                            } else if (freshContext) {
                                // Compare provided context with fresh context
                                // Use JSON.stringify for deep comparison (simple but effective)
                                const providedStr = JSON.stringify(finalIntelligenceContext)
                                const freshStr = JSON.stringify(freshContext)
                                if (providedStr !== freshStr) {
                                    logger.warn('[API /chat] Intelligence context mismatch, using fresh context', { 
                                        sessionId,
                                        providedEmail: finalIntelligenceContext?.email,
                                        freshEmail: freshContext?.email
                                    })
                                    finalIntelligenceContext = freshContext
                                }
                            }
                        } else {
                            // No context provided - use fresh
                            finalIntelligenceContext = freshContext || undefined
                        }
                        
                        // Send status update when intelligence context is loaded
                        if (shouldStream && finalIntelligenceContext) {
                            res.write('data: {"type":"status","message":"Intelligence context loaded"}\n\n');
                        }
                    } catch (error) {
                        logger.warn('[API /chat] Failed to validate/load intelligence context', {
                            sessionId,
                            error: error instanceof Error ? error.message : String(error)
                        })
                        // Continue with provided context if validation fails
                    }
                })()
            )
            
            // Multimodal context loading
            if (!finalMultimodalContext) {
                contextPromises.push(
                    (async () => {
                        try {
                            // Send status update if streaming
                            if (shouldStream) {
                                res.write('data: {"type":"status","message":"Loading multimodal context..."}\n\n');
                            }
                            
                            const contextData = await multimodalContextManager.prepareChatContext(
                                sessionId,
                                true, // include visual
                                true  // include audio
                            )
                            finalMultimodalContext = contextData.multimodalContext
                            
                            // Send status update when multimodal context is loaded
                            if (shouldStream && finalMultimodalContext) {
                                res.write('data: {"type":"status","message":"Multimodal context loaded"}\n\n');
                            }
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
                    })()
                )
            }
            
            // Wait for all context loading to complete
            await Promise.all(contextPromises)
        }
        
        // For streaming: Start agent immediately with provided context, load fresh in background
        // For non-streaming: Wait for full context before processing
        if (shouldStream) {
            // Start context loading in background (non-blocking)
            void loadContexts().catch((error) => {
                logger.warn('[API /chat] Background context loading failed', {
                    sessionId,
                    error: error instanceof Error ? error.message : String(error)
                })
            })
            // Continue immediately with provided context
        } else {
            // Non-streaming: Wait for full context
            await loadContexts()
        }

        // Rate limiting - check before processing
        const effectiveSessionId = sessionId || `session-${Date.now()}`
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
        const validMessages: ValidatedMessage[] = messages
            .filter((m: unknown): m is IncomingMessage => {
                if (!m || typeof m !== 'object') return false
                const msg = m as IncomingMessage
                if (!msg.role || typeof msg.role !== 'string') return false
                // Must have content (string) OR attachments
                const hasContent = Boolean(msg.content && (typeof msg.content === 'string' ? msg.content.trim() : false))
                const hasAttachments = Boolean(msg.attachments && Array.isArray(msg.attachments) && msg.attachments.length > 0)
                return hasContent || hasAttachments
            })
            .map((m: IncomingMessage): ValidatedMessage => {
                // Normalize role: 'model' (Gemini API) -> 'assistant' (AI SDK)
                let normalizedRole: 'user' | 'assistant' | 'system' = 'user'
                if (m.role === 'model') {
                    normalizedRole = 'assistant'
                } else if (m.role === 'user') {
                    normalizedRole = 'user'
                } else if (m.role === 'system') {
                    normalizedRole = 'system'
                } else if (m.role === 'assistant') {
                    normalizedRole = 'assistant'
                }

                // Remove attachments from non-user messages (only user can send images)
                const hasAttachments = normalizedRole === 'user' && m.attachments && Array.isArray(m.attachments) && m.attachments.length > 0
                
                const result: ValidatedMessage = hasAttachments
                    ? {
                        role: normalizedRole,
                        content: m.content,
                        attachments: m.attachments as Array<{ mimeType?: string; data?: string; [key: string]: unknown }>
                    }
                    : {
                        role: normalizedRole,
                        content: m.content
                    }
                return result
            })

        if (validMessages.length === 0) {
            return res.status(400).json({ error: 'No valid messages found. Messages must have content or attachments.' })
        }

        if (validMessages.length !== messages.length) {
            console.warn(`[API /chat] Filtered out ${messages.length - validMessages.length} invalid messages`)
        }

        // Extract conversationFlow if provided (crucial for Discovery Agent)
        const conversationFlow = body.conversationFlow;

        // Determine current stage (single source of truth in API layer)
        // For streaming: Use provided context immediately (may be updated by background loading)
        // For non-streaming: Use final context after loading completes
        const currentStage = determineCurrentStage(
            finalIntelligenceContext || intelligenceContext as IntelligenceContext | undefined,
            trigger
        )

        // Persist stage so reloads don't reset (safe fallback if table/column missing) - fire and forget
        if (sessionId && supabaseService && typeof (supabaseService as { from?: (table: string) => unknown })?.from === 'function') {
          // Fire and forget - don't await
          void (async () => {
            try {
              await (supabaseService as any)
                .from('conversations')
                .update({ stage: currentStage })
                .eq('session_id', sessionId)
            } catch (err: unknown) {
              // Non-blocking — survives if column/table missing (pre-deploy safety)
              logger.debug('Stage persistence failed (safe):', { 
                error: err instanceof Error ? err.message : String(err), 
                sessionId 
              })
            }
          })()
        }

        // Multimodal context is now loaded in parallel above (if needed)

        // Import streaming orchestrator
        const { routeToAgentStream } = await import('../src/core/agents/orchestrator.js');
        
        try {
            if (shouldStream) {
                let accumulatedText = '';
                let chunkCount = 0;
                let metadataCount = 0;
                
                try {
                    // For streaming: Use provided context immediately (may be updated by background loading)
                    // For non-streaming: Use final context after loading completes
                    const agentIntelligenceContext = shouldStream 
                        ? (finalIntelligenceContext || intelligenceContext as IntelligenceContext | undefined || {})
                        : (finalIntelligenceContext || {})
                    
                    const agentMultimodalContext = shouldStream
                        ? (finalMultimodalContext || multimodalContext || {
                            hasRecentImages: false,
                            hasRecentAudio: false,
                            hasRecentUploads: false,
                            recentAnalyses: [],
                            recentUploads: []
                        })
                        : (finalMultimodalContext || {
                            hasRecentImages: false,
                            hasRecentAudio: false,
                            hasRecentUploads: false,
                            recentAnalyses: [],
                            recentUploads: []
                        })
                    
                    await routeToAgentStream({
                        messages: validMessages.map(msg => ({
                            role: msg.role,
                            content: msg.content || '',
                            ...(msg.attachments && { attachments: msg.attachments })
                        })) as ChatMessage[],
                        sessionId: sessionId || `session-${Date.now()}`,
                        currentStage,
                        intelligenceContext: agentIntelligenceContext,
                        multimodalContext: agentMultimodalContext,
                        trigger: trigger || 'chat',
                        conversationFlow
                    }, {
                        onChunk: (chunk: string) => {
                            accumulatedText += chunk;
                            chunkCount++;
                            logger.debug('[API /chat] Stream chunk', { 
                                chunkLength: chunk.length, 
                                accumulatedLength: accumulatedText.length,
                                chunkCount 
                            });
                            // Send each chunk immediately (not accumulated) for true streaming
                            res.write(`data: ${JSON.stringify({
                                type: 'content',
                                content: accumulatedText // Send accumulated for UI, but each chunk triggers a new event
                            })}\n\n`);
                        },
                        onMetadata: (metadata: AgentMetadata | Record<string, unknown>) => {
                            // Stream intermediate events: tool calls, reasoning, thinking states
                            metadataCount++;
                            const meta = metadata as AgentMetadata & { type?: string; toolCall?: unknown; reasoning?: string };
                            logger.debug('[API /chat] Stream metadata', { 
                                type: meta.type,
                                metadataCount,
                                hasToolCall: !!meta.toolCall,
                                hasReasoning: !!meta.reasoning
                            });
                            res.write(`data: ${JSON.stringify({
                                type: 'meta',
                                ...metadata
                            })}\n\n`);
                        },
                        onDone: (result: AgentResult) => {
                            logger.info('[API /chat] Stream complete', { 
                                agent: result.agent,
                                model: result.model,
                                totalChunks: chunkCount,
                                totalMetadata: metadataCount,
                                finalLength: accumulatedText.length
                            });
                            res.write(`data: ${JSON.stringify({
                                type: 'done',
                                agent: result.agent,
                                model: result.model,
                                metadata: result.metadata
                            })}\n\n`);
                            res.write('data: [DONE]\n\n');
                            res.end();
                        },
                        onError: (error: Error) => {
                            res.write(`data: ${JSON.stringify({
                                type: 'error',
                                error: error.message
                            })}\n\n`);
                            res.write('data: [DONE]\n\n');
                            res.end();
                        }
                    });
                } catch (streamError) {
                    logger.error('[API /chat] Streaming error', streamError instanceof Error ? streamError : undefined);
                    res.write(`data: ${JSON.stringify({
                        type: 'error',
                        error: streamError instanceof Error ? streamError.message : 'Streaming failed'
                    })}\n\n`);
                    res.write('data: [DONE]\n\n');
                    res.end();
                }
                return
            }

            // Non-streaming path (existing behavior)
            // Route to appropriate agent with validated messages
            const { routeToAgent } = await import('../src/core/agents/orchestrator.js')
            const result = await routeToAgent({
                messages: validMessages.map(msg => ({
                    role: msg.role,
                    content: msg.content || '',
                    ...(msg.attachments && { attachments: msg.attachments })
                })) as ChatMessage[],
                sessionId: sessionId || `session-${Date.now()}`,
                currentStage,
                intelligenceContext: finalIntelligenceContext || {},
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
