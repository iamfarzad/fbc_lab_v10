import type { VercelRequest, VercelResponse } from '@vercel/node';
import { multimodalContextManager } from '../../src/core/context/multimodal-context.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { sessionId, messages } = req.body;

        if (!sessionId || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        for (const msg of messages) {
            await multimodalContextManager.addConversationTurn(sessionId as string, {
                role: msg.role === 'user' ? 'user' : 'assistant',
                text: msg.content as string,
                isFinal: true,
                timestamp: new Date(msg.timestamp as string | number | Date).toISOString()
            });
        }

        return res.status(200).json({ success: true, count: messages.length });
    } catch (error) {
        console.error('[persist-batch] Error:', error);
        return res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
