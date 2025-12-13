import { useState, useEffect, useCallback } from 'react';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { GeminiLiveService } from '../../../services/geminiLiveService';
import { unifiedContext } from '../../../services/unifiedContext';
import { TranscriptItem, ResearchResult, LiveConnectionState } from '../../../types';
import { logger } from 'src/lib/logger-client';
import { buildLeadProfile } from 'src/core/intelligence/profile-builder';
import type { AgentStrategicContext } from 'src/core/intelligence/types';

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
    const [sessionPermissions, setSessionPermissions] = useState<{
        voice: boolean;
        webcam: boolean;
        location: boolean;
        research: boolean;
    } | null>(null);
    
    // Internal refs removed


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

    const deriveStrategicContext = (research: ResearchResult): AgentStrategicContext => {
        const role = (research.role || research.person?.role || '').toLowerCase();
        const industry = (research.company?.industry || '').toLowerCase();
        const seniority = (research.person?.seniority || '').toLowerCase();

        let privacySensitivity: AgentStrategicContext['privacySensitivity'] = 'LOW';
        if (industry.match(/finance|bank|health|medical|legal|defense|gov/i)) {
            privacySensitivity = 'HIGH';
        } else if (industry.match(/enterprise|insurance|telecom/i)) {
            privacySensitivity = 'MEDIUM';
        }

        let technicalLevel: AgentStrategicContext['technicalLevel'] = 'LOW';
        if (role.match(/cto|cio|developer|engineer|architect|data|scientist|product/i)) {
            technicalLevel = 'HIGH';
        }

        let authorityLevel: AgentStrategicContext['authorityLevel'] = 'RESEARCHER';
        if (role.match(/founder|ceo|vp|director|head of/i) || seniority === 'c-level') {
            authorityLevel = 'DECISION_MAKER';
        } else if (role.match(/manager|lead/i)) {
            authorityLevel = 'INFLUENCER';
        }

        return { privacySensitivity, technicalLevel, authorityLevel };
    };

    const applyResearchToContext = (
        email: string,
        name: string | undefined,
        companyUrl: string | undefined,
        rawResult: ResearchResult
    ) => {
        const profile = buildLeadProfile(rawResult as any, email, name);
        const strategicContext = deriveStrategicContext(rawResult);
        const citationsCount = rawResult.citations?.length || 0;

        // Trust gate: avoid "confident but wrong" personalization when identity signals are weak.
        // Require a strong name signal (full name or structured email prefix) plus high confidence + grounding.
        const emailPrefix = (email.split('@')[0] || '').trim();
        const providedNameTokens = (name || '').trim().split(/\s+/).filter(Boolean);
        const emailDomain = (email.split('@')[1] || '').trim().toLowerCase();
        const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com', 'aol.com', 'protonmail.com'];
        const hasCorporateEmailSignal = Boolean(emailDomain) && !genericDomains.includes(emailDomain);
        const hasStrongNameSignal =
            providedNameTokens.length >= 2 || /[._-]/.test(emailPrefix) || !!(companyUrl && companyUrl.includes('linkedin.com'));

        const trustedIdentity =
            hasStrongNameSignal &&
            hasCorporateEmailSignal &&
            profile.identity.verified &&
            profile.identity.confidenceScore >= 85 &&
            rawResult.confidence >= 0.75 &&
            citationsCount > 0;

        const researchForContext = trustedIdentity
            ? rawResult
            : buildFallbackResearchResult(email, name, companyUrl);

        if (!trustedIdentity) {
            logger.warn('[LeadResearch] Unverified identity, using fallback context', {
                email,
                rawConfidence: rawResult.confidence,
                citationsCount,
                profileVerified: profile.identity.verified,
                profileConfidence: profile.identity.confidenceScore
            });
        }

        // Only expose trusted (or fallback) research to prompt layers
        researchResultRef.current = researchForContext;
        services.liveServiceRef.current?.setResearchContext(researchForContext);
        unifiedContext.setResearchContext(researchForContext);

        // Persist raw research separately, but only merge identity fields when trusted
        const companyForIntelligence = trustedIdentity && rawResult.company
            ? {
                name: rawResult.company.name,
                domain: rawResult.company.domain,
                ...(rawResult.company.website ? { website: rawResult.company.website } : {}),
                ...(rawResult.company.linkedin ? { linkedin: rawResult.company.linkedin } : {})
            }
            : undefined;

        const personForIntelligence = trustedIdentity && rawResult.person
            ? {
                fullName: rawResult.person.fullName,
                ...(rawResult.person.seniority ? { seniority: rawResult.person.seniority } : {}),
                ...(rawResult.person.profileUrl ? { profileUrl: rawResult.person.profileUrl } : {})
            }
            : undefined;

        const identityConfirmed = (intelligenceContextRef.current as any)?.identityConfirmed === true;

        intelligenceContextRef.current = {
            ...intelligenceContextRef.current,
            email,
            name: name || profile.identity.name || emailPrefix || 'Unknown',
            identityConfirmed,
            ...(companyForIntelligence ? { company: companyForIntelligence } : {}),
            ...(personForIntelligence ? { person: personForIntelligence } : {}),
            // Store citations separately so downstream guardrails can require grounding before treating identity as verified.
            research: {
                citations: trustedIdentity ? (rawResult.citations || []) : []
            },
            researchConfidence: rawResult.confidence,
            profile,
            strategicContext,
            lastUpdated: new Date().toISOString()
        };

        unifiedContext.setIntelligenceContext(intelligenceContextRef.current);
    };

    const performBackgroundResearch = useCallback(async (email: string, name: string, companyUrl?: string) => {
        if (!services.researchServiceRef.current) return;

        const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
        const domain = email.split('@')[1]?.toLowerCase();

        if (domain && genericDomains.includes(domain) && !companyUrl) {
            logger.debug("Generic email detected without override, using fallback research context.");
            const fallback = buildFallbackResearchResult(email, name, companyUrl);
            applyResearchToContext(email, name, companyUrl, fallback);
            return;
        }

        logger.debug("Triggering Background Lead Research for:", { email, hasLocation: Boolean(locationData) });
        setIsResearching(true);

        try {
            const linkedInOverride = companyUrl && companyUrl.includes('linkedin.com') ? companyUrl : undefined;
            const result = await services.researchServiceRef.current.researchLead(
                email,
                name,
                companyUrl,
                undefined, // sessionId
                locationData || undefined, // Pass location data when available
                {
                    forceFresh: true, // always bypass stale cache for correctness
                    ...(linkedInOverride ? { linkedInUrl: linkedInOverride } : {})
                }
            );
            
            applyResearchToContext(email, name, companyUrl, result);

        // Do not inject low-value system transcript items.
        // Research status is surfaced via isResearching + context/sources UI.

        } catch (e) {
            console.error("Background Research failed", e);
            researchResultRef.current = null;
        } finally {
            setIsResearching(false);
        }
    }, [services, setTranscript, locationData]);

    const performResearch = useCallback(async (input: string) => {
        if (!services.researchServiceRef.current) return;
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
            const result = await services.researchServiceRef.current.researchLead(email);
            const inferredName =
                userProfile?.name ||
                (intelligenceContextRef.current?.name as string | undefined);
            applyResearchToContext(email, inferredName, undefined, result);

            // Do not inject low-value system transcript items.
            // Research status is surfaced via isResearching + context/sources UI.
        } catch (e) {
            console.error("Research failed", e);
        }
    }, [services, userProfile, setTranscript, sessionPermissions]);

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

        const shouldRunBackgroundResearch = Boolean(permissions?.research);

        // Always clear stale research unless we are explicitly running it for this session.
        if (!shouldRunBackgroundResearch) {
            researchResultRef.current = null;
            unifiedContext.setResearchContext(null);
        }

        const researchPromise = shouldRunBackgroundResearch
            ? performBackgroundResearch(email, name, companyUrl)
            : null;

        if (permissions?.voice) {
            if (researchPromise) {
                logger.debug('[App] Voice permission granted, waiting for research to complete before connecting...');
                await researchPromise;
                logger.debug('[App] Research complete, now connecting voice...');
            }
            onVoiceConnect();
        } else if (researchPromise) {
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
