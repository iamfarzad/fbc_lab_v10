import { useState, useEffect, useCallback } from 'react';
import type { LeadResearchService } from 'src/core/intelligence/lead-research';
import { GeminiLiveService } from '../../../services/geminiLiveService';
import { unifiedContext } from '../../../services/unifiedContext';
import { TranscriptItem, ResearchResult, LiveConnectionState } from '../../../types';
import { logger } from 'src/lib/logger-client';
import type { LocationData } from 'src/core/intelligence/lead-research';

export interface UserProfile {
    name: string;
    email: string;
}

interface UseLeadResearchProps {
    services: {
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
    setTranscript: _setTranscript,
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
    const [sessionPermissions, setSessionPermissions] = useState<{
        voice: boolean;
        webcam: boolean;
        location: boolean;
        research: boolean;
    } | null>(null);
    
    // Internal refs removed


    const postJson = useCallback(async <T,>(path: string, payload: unknown): Promise<T> => {
        const res = await fetch(path, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const text = await res.text();
        try {
            return JSON.parse(text) as T;
        } catch {
            throw new Error(text || `Request failed: ${res.status}`);
        }
    }, []);

    // Restore profile on mount
    useEffect(() => {
        const savedProfile = sessionStorage.getItem('fbc_user_profile');
        if (savedProfile) {
            const parsedProfile = JSON.parse(savedProfile) as UserProfile | null;
            setUserProfile(parsedProfile);

            // Prevent stale identity leakage across reloads/sessions by rehydrating a minimal,
            // user-confirmed identity from the saved profile (name/email only).
            if (parsedProfile?.email || parsedProfile?.name) {
                const freshIntelligence = {
                    name: parsedProfile?.name || '',
                    email: parsedProfile?.email || '',
                    identityConfirmed: true
                };
                intelligenceContextRef.current = freshIntelligence;
                unifiedContext.setIntelligenceContext(freshIntelligence);
            }
        }

        const savedPermissions = sessionStorage.getItem('fbc_permissions');
        if (savedPermissions) {
            try {
                const parsed = JSON.parse(savedPermissions) as Record<string, unknown>;
                const nextPermissions = {
                    voice: Boolean(parsed.voice),
                    webcam: Boolean(parsed.webcam),
                    location: Boolean(parsed.location),
                    research: Boolean(parsed.research)
                };
                setSessionPermissions(nextPermissions);

                // If research isn't explicitly permitted for this session, clear any persisted/stale research context.
                if (!nextPermissions.research) {
                    researchResultRef.current = null;
                    unifiedContext.setResearchContext(null);
                }
            } catch {
                // Ignore malformed permissions
            }
        } else {
            // No stored permissions => treat research as not permitted, and clear any stale state.
            researchResultRef.current = null;
            unifiedContext.setResearchContext(null);
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

    const applyServerResearchToContext = (
        email: string,
        name: string | undefined,
        _companyUrl: string | undefined,
        payload: { research?: ResearchResult; intelligenceContext?: any; trustedIdentity?: boolean }
    ) => {
        const research = payload.research;
        if (research) {
            researchResultRef.current = research;
            services.liveServiceRef.current?.setResearchContext(research);
            unifiedContext.setResearchContext(research);
        } else {
            researchResultRef.current = null;
            unifiedContext.setResearchContext(null);
        }

        if (payload.intelligenceContext) {
            intelligenceContextRef.current = payload.intelligenceContext;
            unifiedContext.setIntelligenceContext(payload.intelligenceContext);
        } else {
            const minimal = { email, name: name || email.split('@')[0] || 'Unknown', identityConfirmed: true };
            intelligenceContextRef.current = minimal;
            unifiedContext.setIntelligenceContext(minimal);
        }
    };

    const performBackgroundResearch = useCallback(async (email: string, name: string, companyUrl?: string) => {
        const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
        const domain = email.split('@')[1]?.toLowerCase();

        if (domain && genericDomains.includes(domain) && !companyUrl) {
            logger.debug("Generic email detected without override, using fallback research context.");
            const fallback = buildFallbackResearchResult(email, name, companyUrl);
            applyServerResearchToContext(email, name, companyUrl, { research: fallback });
            return;
        }

        logger.debug("Triggering Background Lead Research for:", { email, hasLocation: Boolean(locationData) });
        setIsResearching(true);

        try {
            const snapshot = unifiedContext.getSnapshot();
            const sessionId = snapshot.sessionId || `session-${Date.now()}`;
            if (!snapshot.sessionId) unifiedContext.setSessionId(sessionId);

            const response = await postJson<{
                ok: boolean;
                allowResearch?: boolean;
                trustedIdentity?: boolean;
                research?: ResearchResult;
                intelligenceContext?: any;
                error?: string;
            }>('/api/intelligence/init-session', {
                sessionId,
                email,
                name,
                companyUrl,
                ...(locationData ? { location: locationData as LocationData } : {}),
                forceFresh: true
            });

            if (!response.ok) throw new Error(response.error || 'Research failed');
            applyServerResearchToContext(email, name, companyUrl, response);

        // Do not inject low-value system transcript items.
        // Research status is surfaced via isResearching + context/sources UI.

        } catch (e) {
            console.error("Background Research failed", e);
            researchResultRef.current = null;
        } finally {
            setIsResearching(false);
        }
    }, [locationData, postJson]);

    const performResearch = useCallback(async (input: string) => {
        const permissionGranted = sessionPermissions?.research === true;
        const explicitRequest =
            /\b(research|look up|lookup|find out|background check|what did you find|tell me about|who is|enrich)\b/i.test(input);

        // Only run research if user explicitly asks, or they granted research permission.
        if (!permissionGranted && !explicitRequest) return;

        const emailMatch = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);
        const email = (emailMatch?.[0] || userProfile?.email || '').trim();

        if (!email) return;
        if (researchResultRef.current) return;

        logger.debug("Triggering Lead Research for:", { email, explicitRequest, permissionGranted });

        // Do not inject low-value system transcript items.
        // Research status is surfaced via isResearching + context/sources UI.

        try {
            const snapshot = unifiedContext.getSnapshot();
            const sessionId = snapshot.sessionId || `session-${Date.now()}`;
            if (!snapshot.sessionId) unifiedContext.setSessionId(sessionId);

            const inferredName =
                userProfile?.name ||
                (intelligenceContextRef.current?.name as string | undefined) ||
                undefined;

            const response = await postJson<{
                ok: boolean;
                allowResearch?: boolean;
                trustedIdentity?: boolean;
                research?: ResearchResult;
                intelligenceContext?: any;
                error?: string;
            }>('/api/intelligence/init-session', {
                sessionId,
                email,
                ...(inferredName ? { name: inferredName } : {}),
                forceFresh: true
            });

            if (!response.ok) throw new Error(response.error || 'Research failed');
            applyServerResearchToContext(email, inferredName, undefined, response);

            // Do not inject low-value system transcript items.
            // Research status is surfaced via isResearching + context/sources UI.
        } catch (e) {
            console.error("Research failed", e);
        }
    }, [postJson, userProfile, sessionPermissions]);

    const handleTermsComplete = async (
        name: string,
        email: string,
        companyUrl?: string,
        permissions?: { voice: boolean; webcam: boolean; location: boolean; research: boolean }
    ) => {
        const profile = { name, email };
        setUserProfile(profile);
        sessionStorage.setItem('fbc_user_profile', JSON.stringify(profile));
        setShowTerms(false);

        if (permissions) {
            logger.debug('[App] Applying user permissions:', permissions);
            setSessionPermissions(permissions);

            if (permissions.webcam) {
                setIsWebcamActive(true);
            }

            if (permissions.location) {
                try {
                    logger.debug('[App] Requesting location access...');
                    const location = await unifiedContext.ensureLocation();
                    
                    if (location) {
                        logger.debug('[App] Location access granted:', location);
                        setLocationData(location);

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
            // Start fresh to avoid stale identity fields leaking across sessions.
            const updatedIntelligence = { name, email, identityConfirmed: true };
            intelligenceContextRef.current = updatedIntelligence;
            unifiedContext.setIntelligenceContext(updatedIntelligence);
            
            if (services.liveServiceRef.current) {
               services.liveServiceRef.current.setResearchContext(researchResultRef.current);
            }
        }

        setView('chat');

        const snapshot = unifiedContext.getSnapshot();
        const sessionId = snapshot.sessionId || `session-${Date.now()}`;
        if (!snapshot.sessionId) unifiedContext.setSessionId(sessionId);

        // Persist consent server-side so /api/chat can safely load it from DB.
        try {
            await postJson<{ ok: boolean; error?: string }>('/api/consent', {
                sessionId,
                email,
                name,
                companyUrl,
                allowResearch: Boolean(permissions?.research)
            });
        } catch (err) {
            logger.warn('[LeadResearch] Failed to persist consent (non-fatal)', { err });
        }

        // Always initialize session context on the server (this runs research only if consent allows it).
        const initPromise = (async () => {
            setIsResearching(Boolean(permissions?.research));
            try {
                const response = await postJson<{
                    ok: boolean;
                    allowResearch?: boolean;
                    trustedIdentity?: boolean;
                    research?: ResearchResult;
                    intelligenceContext?: any;
                    error?: string;
                }>('/api/intelligence/init-session', {
                    sessionId,
                    email,
                    name,
                    companyUrl,
                    ...(locationData ? { location: locationData as LocationData } : {}),
                    forceFresh: true
                });

                if (!response.ok) throw new Error(response.error || 'Init session failed');
                applyServerResearchToContext(email, name, companyUrl, response);
            } finally {
                setIsResearching(false);
            }
        })();

        if (permissions?.voice) {
            logger.debug('[App] Voice permission granted, waiting for session init before connecting...');
            await initPromise;
            logger.debug('[App] Session init complete, now connecting voice...');
            onVoiceConnect();
        } else {
            void initPromise;
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
        setIsResearching, // Expose setter for Glass Box UI (reasoning events)
        sessionPermissions,
        researchResultRef,
        intelligenceContextRef,
        performBackgroundResearch,
        performResearch,
        handleTermsComplete,
        handleStartChatRequest
    };
}
