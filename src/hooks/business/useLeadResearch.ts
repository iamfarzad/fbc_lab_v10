import { useState, useEffect, useCallback } from 'react';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { StandardChatService } from '../../../services/standardChatService';
import { GeminiLiveService } from '../../../services/geminiLiveService';
import { unifiedContext } from '../../../services/unifiedContext';
import { TranscriptItem, ResearchResult, LiveConnectionState } from '../../../types';
import { logger } from 'src/lib/logger-client';

export interface UserProfile {
    name: string;
    email: string;
}

interface UseLeadResearchProps {
    services: {
        standardChatRef: React.MutableRefObject<StandardChatService | null>;
        researchServiceRef: React.MutableRefObject<LeadResearchService | null>;
        liveServiceRef: React.MutableRefObject<GeminiLiveService | null>;
    };
    setTranscript: React.Dispatch<React.SetStateAction<TranscriptItem[]>>;
    setIsWebcamActive: (active: boolean) => void;
    connectionState: LiveConnectionState;
    onVoiceConnect: () => void;
    setView: (view: 'landing' | 'chat' | 'admin') => void;
}

export function useLeadResearch({
    services,
    setTranscript,
    setIsWebcamActive,
    connectionState,
    onVoiceConnect,
    setView,
    researchResultRef, // External Ref
    intelligenceContextRef // External Ref
}: UseLeadResearchProps & { 
    researchResultRef: React.MutableRefObject<ResearchResult | null>;
    intelligenceContextRef: React.MutableRefObject<any>;
}) {
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [showTerms, setShowTerms] = useState(false);
    const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; city?: string; country?: string } | null>(null);
    const [isResearching, setIsResearching] = useState(false);
    
    // Internal refs removed


    // Restore profile on mount
    useEffect(() => {
        const savedProfile = sessionStorage.getItem('fbc_user_profile');
        if (savedProfile) {
            setUserProfile(JSON.parse(savedProfile) as UserProfile | null);
        }
    }, []);

    const buildFallbackResearchResult = (email: string, name?: string, companyUrl?: string): ResearchResult => {
        const domain = email.split('@')[1] || 'unknown.com';
        const companyName = domain.split('.')[0] || 'Unknown';
        const personName = name || email.split('@')[0] || 'Unknown';
        return {
            company: {
                name: companyName,
                domain,
                website: companyUrl || `https://${domain}`,
                summary: 'Company information unavailable'
            },
            person: {
                fullName: personName,
                company: companyName
            },
            role: 'Business Professional',
            confidence: 0,
            citations: []
        };
    };

    const performBackgroundResearch = useCallback(async (email: string, name: string, companyUrl?: string) => {
        if (!services.researchServiceRef.current) return;

        const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
        const domain = email.split('@')[1]?.toLowerCase();

        if (domain && genericDomains.includes(domain) && !companyUrl) {
            logger.debug("Generic email detected without override, using fallback research context.");
            const fallback = buildFallbackResearchResult(email, name, companyUrl);
            researchResultRef.current = fallback;
            if (services.standardChatRef.current) {
                services.standardChatRef.current.setResearchContext(fallback);
            }
            if (services.liveServiceRef.current) {
                services.liveServiceRef.current.setResearchContext(fallback);
            }
            intelligenceContextRef.current = {
                ...intelligenceContextRef.current,
                ...(fallback.company ? { company: fallback.company } : {}),
                ...(fallback.person ? { person: fallback.person } : {}),
                research: fallback
            };
            unifiedContext.setResearchContext(fallback);
            unifiedContext.setIntelligenceContext(intelligenceContextRef.current);
            return;
        }

        logger.debug("Triggering Background Lead Research for:", { email, hasLocation: Boolean(locationData) });
        setIsResearching(true);

        try {
            const result = await services.researchServiceRef.current.researchLead(
                email, 
                name, 
                companyUrl,
                undefined, // sessionId
                locationData || undefined // Pass location data when available
            );
            researchResultRef.current = result;

            // Sync Context to ALL Services
            if (services.standardChatRef.current) {
                services.standardChatRef.current.setResearchContext(result);
            }
            if (services.liveServiceRef.current) {
                services.liveServiceRef.current.setResearchContext(result);
            }

            intelligenceContextRef.current = {
                ...intelligenceContextRef.current,
                ...(result.company ? { company: result.company } : {}),
                ...(result.person ? { person: result.person } : {}),
                ...(result.strategic ? { strategic: result.strategic } : {}),
                research: result
            };
            unifiedContext.setResearchContext(result);
            unifiedContext.setIntelligenceContext(intelligenceContextRef.current);

            setTranscript(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `[System: Context Loaded]`,
                timestamp: new Date(),
                isFinal: true,
                status: 'complete',
                attachment: {
                    type: 'research-card',
                    data: JSON.stringify(result),
                    name: 'Intelligence Summary'
                }
            }]);

        } catch (e) {
            console.error("Background Research failed", e);
            researchResultRef.current = null;
        } finally {
            setIsResearching(false);
        }
    }, [services, setTranscript, locationData]);

    const performResearch = useCallback(async (input: string) => {
        if (!services.researchServiceRef.current) return;
        const emailMatch = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

        if (emailMatch && !researchResultRef.current) {
            const email = emailMatch[0];
            if (userProfile && email === userProfile.email) return;

            logger.debug("Triggering Manual Lead Research for:", { email });

            setTranscript(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `[System: Gathering context on ${email}...]`,
                timestamp: new Date(),
                isFinal: true,
                status: 'complete'
            }]);

            try {
                const result = await services.researchServiceRef.current.researchLead(email);
                researchResultRef.current = result;

                if (services.standardChatRef.current) services.standardChatRef.current.setResearchContext(result);
                if (services.liveServiceRef.current) services.liveServiceRef.current.setResearchContext(result);

                intelligenceContextRef.current = {
                    ...intelligenceContextRef.current,
                    ...(result.company ? { company: result.company } : {}),
                    ...(result.person ? { person: result.person } : {}),
                    ...(result.strategic ? { strategic: result.strategic } : {}),
                    research: result
                };

                setTranscript(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: `[System: Context Loaded]`,
                    timestamp: new Date(),
                    isFinal: true,
                    status: 'complete',
                    attachment: {
                        type: 'research-card',
                        data: JSON.stringify(result),
                        name: 'Intelligence Summary'
                    }
                }]);
            } catch (e) {
                console.error("Research failed", e);
            }
        }
    }, [services, userProfile, setTranscript]);

    const handleTermsComplete = async (name: string, email: string, companyUrl?: string, permissions?: { voice: boolean; webcam: boolean; location: boolean }) => {
        const profile = { name, email };
        setUserProfile(profile);
        sessionStorage.setItem('fbc_user_profile', JSON.stringify(profile));
        setShowTerms(false);

        if (permissions) {
            logger.debug('[App] Applying user permissions:', permissions);

            if (permissions.webcam) {
                setIsWebcamActive(true);
                setTranscript(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'user',
                    text: '[System: Webcam enabled by user permission]',
                    timestamp: new Date(),
                    isFinal: true
                }]);
            }

            if (permissions.location) {
                try {
                    logger.debug('[App] Requesting location access...');
                    const location = await unifiedContext.ensureLocation();
                    
                    if (location) {
                        logger.debug('[App] Location access granted:', location);
                        setLocationData(location);

                        if (services.standardChatRef.current) services.standardChatRef.current.setLocation(location);
                        if (services.liveServiceRef.current) services.liveServiceRef.current.setLocation(location);
                        
                        if (connectionState === LiveConnectionState.CONNECTED && services.liveServiceRef.current) {
                            services.liveServiceRef.current.sendContext([], { location });
                        }
                    }
                } catch (err) {
                    console.warn('[App] Location access failed:', err);
                }
            }
            sessionStorage.setItem('fbc_permissions', JSON.stringify(permissions));
        }

        if (name || email) {
            const currentSnapshot = unifiedContext.getSnapshot();
            const updatedIntelligence = {
                ...currentSnapshot.intelligenceContext,
                name,
                email
            };
            unifiedContext.setIntelligenceContext(updatedIntelligence);
            
            if (services.liveServiceRef.current) {
               services.liveServiceRef.current.setResearchContext(researchResultRef.current);
            }
        }

        setView('chat');

        const researchPromise = performBackgroundResearch(email, name, companyUrl);

        if (permissions?.voice) {
            logger.debug('[App] Voice permission granted, waiting for research to complete before connecting...');
            await researchPromise;
            logger.debug('[App] Research complete, now connecting voice...');
            onVoiceConnect();
        } else {
            void researchPromise;
        }
    };

    const handleStartChatRequest = (startVoice: boolean = false) => {
        // Always transition to chat view first
        setView('chat');
        
        if (userProfile) {
            // Existing user - connect voice if requested
            if (startVoice) {
                setTimeout(() => {
                    onVoiceConnect();
                }, 100);
            }
        } else {
            // New user - show terms overlay (now visible since we're in chat view)
            setShowTerms(true);
        }
    };

    return {
        userProfile,
        setUserProfile,
        showTerms,
        setShowTerms,
        locationData,
        isResearching,
        researchResultRef,
        intelligenceContextRef,
        performBackgroundResearch,
        performResearch,
        handleTermsComplete,
        handleStartChatRequest
    };
}
