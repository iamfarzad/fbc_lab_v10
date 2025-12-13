import { useEffect, useRef } from 'react';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { AIBrainService } from '../../../services/aiBrainService';
import { unifiedContext } from '../../../services/unifiedContext';

export function useServiceRegistry(sessionId: string) {
    const researchServiceRef = useRef<LeadResearchService | null>(null);
    const aiBrainRef = useRef<AIBrainService | null>(null);

    // Initialize Services
    useEffect(() => {
        // AIBrainService only talks to our server `/api/chat` and does not need a client-side API key.
        aiBrainRef.current = new AIBrainService();

        // Lead research runs server-side (via `/api/intelligence/*`) to avoid client-side keys and hallucination.
        // Keep this ref for backward compatibility, but do not initialize it by default in the browser.
        researchServiceRef.current = null;
    }, []);

    // Sync Session ID
    useEffect(() => {
        if (sessionId) {
            if (aiBrainRef.current) aiBrainRef.current.setSessionId(sessionId);
            unifiedContext.setSessionId(sessionId);
        }
    }, [sessionId]);

    return {
        researchServiceRef,
        aiBrainRef,
        unifiedContext
    };
}
