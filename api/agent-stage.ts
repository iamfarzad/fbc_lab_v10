import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeToAgent } from '../src/core/agents/orchestrator.js';
import type { ChatMessage } from '../src/core/agents/types.js';
import type { FunnelStage } from '../src/core/types/funnel-stage.js';
import { logger } from '../src/lib/logger.js';
import { multimodalContextManager } from '../src/core/context/multimodal-context.js';
import { ContextStorage } from '../src/core/context/context-storage.js';

const contextStorage = new ContextStorage();

/**
 * Determine current funnel stage based on intelligence context and triggers
 * (Same logic as /api/chat for consistency)
 */
function determineCurrentStage(
  intelligenceContext: any,
  trigger?: string
): FunnelStage {
  if (trigger === 'conversation_end') return 'SUMMARY'
  if (trigger === 'booking') return 'CLOSING'
  if (trigger === 'admin') return 'PITCHING'

  const isFullyQualified =
    intelligenceContext?.company?.size &&
    intelligenceContext.company.size !== 'unknown' &&
    intelligenceContext?.budget?.hasExplicit &&
    ['C-Level', 'VP', 'Director'].includes((intelligenceContext?.person?.seniority || '') as string)

  return isFullyQualified ? 'SCORING' : 'DISCOVERY'
}

/**
 * Metadata-only Agent Stage Endpoint
 * 
 * Purpose: Returns agent routing metadata WITHOUT generating text response.
 * Used by voice mode to sync with orchestrator without duplicate responses.
 * 
 * Returns: { stage, agent, conversationFlow, recommendedNext, metadata }
 * Does NOT return: output text (prevents "two voices" issue)
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  const startTime = Date.now();
  logger.debug('[API /agent-stage] Request received', { method: req.method });

  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
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
    const { messages, sessionId, intelligenceContext, conversationFlow, trigger } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Validate and normalize messages (simplified - no attachments needed for metadata)
    const validMessages = messages
      .filter((m: any) => m?.role && (m?.content || m?.attachments))
      .map((m: any) => ({
        ...m,
        role: m.role === 'model' ? 'assistant' : m.role,
        // Strip attachments for faster processing - metadata only needs text
        attachments: undefined
      }));

    if (validMessages.length === 0) {
      return res.status(400).json({ error: 'No valid messages found' });
    }

    // Determine stage
    const currentStage = determineCurrentStage(intelligenceContext, trigger);

    // Load multimodal context (lightweight - summary only)
    let multimodalContext = {
      hasRecentImages: false,
      hasRecentAudio: false,
      hasRecentUploads: false,
      recentAnalyses: [] as string[],
      recentUploads: [] as string[]
    };

    try {
      const contextData = await multimodalContextManager.prepareChatContext(
        sessionId,
        false, // Don't include full visual data - just flags
        false  // Don't include audio
      );
      if (contextData?.multimodalContext) {
        multimodalContext = contextData.multimodalContext;
      }
    } catch (err) {
      logger.debug('[agent-stage] Multimodal context load failed (non-fatal)', { error: err });
    }

    // Route to agent to get metadata (agent will generate text, but we won't return it)
    const result = await routeToAgent({
      messages: validMessages as ChatMessage[],
      sessionId,
      currentStage,
      intelligenceContext: intelligenceContext || {},
      multimodalContext,
      trigger: trigger || 'voice'
    });

    // Extract conversation flow from metadata
    const enhancedFlow = result.metadata?.enhancedConversationFlow || conversationFlow;
    const recommendedNext = enhancedFlow?.recommendedNext || result.metadata?.recommendedNext || null;

    // Persist stage and flow to database (non-blocking)
    try {
      await contextStorage.update(sessionId, {
        last_agent: result.agent,
        last_stage: result.metadata?.stage || currentStage,
        conversation_flow: enhancedFlow,
        updated_at: new Date().toISOString()
      });
    } catch (err) {
      logger.debug('[agent-stage] Context persistence failed (non-fatal)', { error: err });
    }

    const duration = Date.now() - startTime;
    logger.info('[API /agent-stage] Metadata returned', {
      sessionId,
      stage: result.metadata?.stage || currentStage,
      agent: result.agent,
      duration,
      recommendedNext
    });

    // Return metadata only - NO output text
    return res.status(200).json({
      success: true,
      stage: result.metadata?.stage || currentStage,
      agent: result.agent,
      conversationFlow: enhancedFlow,
      recommendedNext,
      metadata: {
        // Include useful metadata for client
        leadScore: result.metadata?.leadScore,
        fitScore: result.metadata?.fitScore,
        categoriesCovered: result.metadata?.categoriesCovered,
        multimodalUsed: result.metadata?.multimodalUsed,
        triggerBooking: result.metadata?.triggerBooking,
        // Performance tracking
        processingTime: duration
      }
    });

  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('[API /agent-stage] Error:', error instanceof Error ? error : undefined);

    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      processingTime: duration
    });
  }
}

