import { useEffect, useRef } from 'react';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { AIBrainService } from '../../../services/aiBrainService';
import { unifiedContext } from '../../../services/unifiedContext';

export function useServiceRegistry(sessionId: string) {
    const researchServiceRef = useRef<LeadResearchService | null>(null);
    const aiBrainRef = useRef<AIBrainService | null>(null);

    // Initialize Services
    useEffect(() => {
        const storedKey = localStorage.getItem('fbc_api_key');
        const envKey = process.env.API_KEY;
        const apiKey = storedKey || envKey;

        if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
            console.warn("API_KEY is missing. Admin configuration required.");
        } else {
            researchServiceRef.current = new LeadResearchService();
            aiBrainRef.current = new AIBrainService();
        }
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
