import type { VercelRequest, VercelResponse } from '@vercel/node';
import { multimodalContextManager } from '../../src/core/context/multimodal-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, role, content, timestamp, attachment } = req.body;

        // Allow empty content if attachment exists, or if content is empty string (for empty agent responses)
        if (!sessionId || !role || (content === undefined && !attachment)) {
            return res.status(400).json({ error: 'Missing required fields: sessionId, role, and either content or attachment required' });
        }

        // Skip if content is empty and no attachment (empty agent responses)
        if ((!content || content.trim() === '') && !attachment) {
            return res.status(200).json({ success: true, skipped: true, reason: 'Empty content, no attachment' });
        }

        try {
            await multimodalContextManager.addConversationTurn(sessionId as string, {
                role: role === 'user' ? 'user' : 'assistant',
                text: content as string,
                isFinal: true,
                timestamp: new Date(timestamp as string | number | Date).toISOString(),
                ...(attachment && { fileUpload: { name: attachment.filename || 'attachment' } })
            });

            return res.status(200).json({ success: true });
        } catch (persistError) {
            // Non-fatal: Log but don't fail the request
            console.warn('[persist-message] Failed to persist (non-fatal):', persistError);
            // Still return success - persistence is optimization, not critical
            return res.status(200).json({ 
                success: true, 
                warning: 'Message persisted in memory only',
                error: persistError instanceof Error ? persistError.message : String(persistError)
            });
        }
    } catch (error) {
        console.error('[persist-message] Fatal Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
