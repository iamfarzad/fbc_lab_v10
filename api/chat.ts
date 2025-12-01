import type { VercelRequest, VercelResponse } from '@vercel/node';
import { routeToAgent } from 'src/core/agents/orchestrator';
import type { AgentContext, ChatMessage } from 'src/core/agents/types';
// import { ensureWorkersInitialized } from 'src/core/queue/redis-queue';

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
    console.log('[API /chat] Request received', { method: req.method, body: req.body });

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
        const { messages, sessionId, conversationFlow, intelligenceContext, trigger } = req.body;

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

        // Build agent context (already destructured above)
        const context: AgentContext = {
            sessionId: sessionId || `session-${Date.now()}`,
            ...(conversationFlow && { conversationFlow }),
            ...(intelligenceContext && { intelligenceContext })
        };

        // Route to appropriate agent with validated messages
        const result = await routeToAgent({
            messages: validMessages as ChatMessage[],
            context,
            trigger: trigger || 'chat'
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
        console.error('[API /chat] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
