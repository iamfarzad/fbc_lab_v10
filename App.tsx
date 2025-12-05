
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import AntigravityCanvas from './components/AntigravityCanvas';
import MultimodalChat from './components/MultimodalChat';
import { BrowserCompatibility } from './components/BrowserCompatibility';
import WebcamPreview from './components/chat/WebcamPreview';
import ScreenSharePreview from './components/chat/ScreenSharePreview';
import LandingPage from './components/LandingPage';
import { useScreenShare } from 'src/hooks/media/useScreenShare';
import TermsOverlay from './components/TermsOverlay';
import AdminDashboard from './components/AdminDashboard';
import { GeminiLiveService } from './services/geminiLiveService';
import { StandardChatService } from './services/standardChatService';
import { LeadResearchService } from 'src/core/intelligence/lead-research';
import { AIBrainService } from './services/aiBrainService';
import { ChromeAiService, ChromeAiCapabilities } from './services/chromeAiService';
import { unifiedContext } from './services/unifiedContext';
import { LiveConnectionState, TranscriptItem, VisualState, VisualShape, GroundingMetadata, ResearchResult } from './types';
import { GEMINI_MODELS } from "src/config/constants";
import { generatePDF } from './utils/pdfUtils';
import { Tool, Type } from '@google/genai';
import { logger } from 'src/lib/logger-client'
import { useToast } from './context/ToastContext';

// Routing Logic Types
interface ModelRoute {
    id: string;
    label: string;
    description: string;
    color: string; // Tailwind class for dot color
}

// User Profile Interface
interface UserProfile {
    name: string;
    email: string;
}

const agentToShape: Record<string, VisualShape> = {
    'Discovery Agent': 'discovery',
    'Scoring Agent': 'scoring',
    'Workshop Sales Agent': 'workshop',
    'Consulting Sales Agent': 'consulting',
    'Closer Agent': 'closer',
    'Summary Agent': 'summary',
    'Proposal Agent': 'proposal',
    'Admin Agent': 'admin',
    'Retargeting Agent': 'retargeting'
};

const stageToShape: Record<string, VisualShape> = {
    DISCOVERY: 'discovery',
    SCORING: 'scoring',
    WORKSHOP_PITCH: 'workshop',
    CONSULTING_PITCH: 'consulting',
    CLOSING: 'closer',
    SUMMARY: 'summary',
    PROPOSAL: 'proposal',
    ADMIN: 'admin',
    RETARGETING: 'retargeting',
    BOOKING_REQUESTED: 'consulting'
};

function resolveAgentShape(agent?: string | null, stage?: string | null): VisualShape {
    if (agent) {
        if (agentToShape[agent]) return agentToShape[agent];
        const lower = agent.toLowerCase();
        if (lower.includes('discovery')) return 'discovery';
        if (lower.includes('score')) return 'scoring';
        if (lower.includes('workshop')) return 'workshop';
        if (lower.includes('consult')) return 'consulting';
        if (lower.includes('close')) return 'closer';
        if (lower.includes('summary')) return 'summary';
        if (lower.includes('proposal')) return 'proposal';
        if (lower.includes('admin')) return 'admin';
        if (lower.includes('retarget')) return 'retargeting';
    }
    if (stage && stageToShape[stage]) return stageToShape[stage];
    return 'orb';
}

// import { runServiceVerification } from './scripts/verify-services'; // TODO: Create if needed

export const App: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { showToast } = useToast();
    
    // View State: 'landing' | 'chat' | 'admin'
    // Sync with URL pathname
    const getViewFromPath = (pathname: string): 'landing' | 'chat' | 'admin' => {
        if (pathname === '/admin') return 'admin';
        if (pathname === '/chat') return 'chat';
        return 'landing';
    };
    
    const [view, setView] = useState<'landing' | 'chat' | 'admin'>(() => getViewFromPath(location.pathname));
    
    // Sync view state with URL changes
    useEffect(() => {
        const newView = getViewFromPath(location.pathname);
        setView(newView);
    }, [location.pathname]);
    
    // Update URL when view changes (but not from URL change)
    const setViewAndNavigate = useCallback((newView: 'landing' | 'chat' | 'admin') => {
        setView(newView);
        if (newView === 'admin') {
            void navigate('/admin', { replace: true });
        } else if (newView === 'chat') {
            void navigate('/chat', { replace: true });
        } else {
            void navigate('/', { replace: true });
        }
    }, [navigate]);
    
    // Modal State
    const [showTerms, setShowTerms] = useState(false);

    const [connectionState, setConnectionState] = useState<LiveConnectionState>(LiveConnectionState.DISCONNECTED);
    const [sessionId] = useState<string>(`session-${Date.now()}`); // Persistent Session ID

    // UI State
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(false);

    // User & Research Context
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

    // Sync dark mode class to body for global scrollbars/bg
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.add('dark');
        } else {
            document.body.classList.remove('dark');
        }
    }, [isDarkMode]);

    // Lifted State for Context Awareness
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
    // Ref to avoid stale closures in callbacks
    const isWebcamActiveRef = useRef(isWebcamActive);

    // Screen Share State
    const [screenShareSessionId] = useState<string>(`session-${Date.now()}`);
    const screenShare = useScreenShare({
        sessionId: screenShareSessionId,
        enableAutoCapture: true,
        captureInterval: 4000,
        onAnalysis: (analysis, _imageData, _capturedAt) => {
            logger.debug('[App] Screen share analysis:', { analysis });
        }
    });

    // Location State  
    const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; city?: string; country?: string } | null>(null);

    const [visualState, setVisualState] = useState<VisualState>({
        isActive: false,
        audioLevel: 0,
        mode: 'idle',
        shape: 'wave'
    });
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);

    const [backendStatus, setBackendStatus] = useState<{
        mode: 'idle' | 'agents' | 'fallback' | 'voice';
        message: string;
        severity: 'info' | 'warn' | 'error';
    }>({
        mode: 'idle',
        message: 'Ready - waiting for input',
        severity: 'info'
    });

    // Active Route State (Replaces activeModelDisplay)
    const [activeRoute, setActiveRoute] = useState<ModelRoute>({
        id: GEMINI_MODELS.DEFAULT_CHAT,
        label: 'READY',
        description: 'System initialized. Waiting for input.',
        color: 'bg-gray-400'
    });

    // Local AI State
    const [localAiCaps, setLocalAiCaps] = useState<ChromeAiCapabilities>({ hasModel: false, hasSummarizer: false, hasRewriter: false, status: 'unsupported' });

    // Store the current semantic theme (default wave - gentler than orb spiral)
    const semanticShapeRef = useRef<VisualShape>('wave');
    // Store data refs to persist across updates
    const weatherDataRef = useRef<VisualState['weatherData']>(undefined);
    const chartDataRef = useRef<VisualState['chartData']>(undefined);
    const mapDataRef = useRef<VisualState['mapData']>(undefined);
    const textContentRef = useRef<string | undefined>(undefined);

    // Refs for services and state to ensure stable callbacks
    const liveServiceRef = useRef<GeminiLiveService | null>(null);
    const standardChatRef = useRef<StandardChatService | null>(null);
    const researchServiceRef = useRef<LeadResearchService | null>(null);
    const aiBrainRef = useRef<AIBrainService | null>(null);
    const chromeAiRef = useRef<ChromeAiService>(new ChromeAiService());
    const transcriptRef = useRef<TranscriptItem[]>([]);
    const researchResultRef = useRef<ResearchResult | null>(null);
    const conversationFlowRef = useRef<any>(null);
    const intelligenceContextRef = useRef<any>(null);
    const latestWebcamFrameRef = useRef<string | null>(null); // Store latest webcam frame for chat mode

    // Abort Controller for stopping text generation
    const abortControllerRef = useRef<AbortController | null>(null);

    // Sync transcript ref + shared context
    useEffect(() => {
        transcriptRef.current = transcript;
        unifiedContext.setTranscript(transcript);
    }, [transcript]);

    // Sync webcam ref
    useEffect(() => {
        isWebcamActiveRef.current = isWebcamActive;
    }, [isWebcamActive]);

    // Initialize Services with dynamic API Key support
    useEffect(() => {
        const storedKey = localStorage.getItem('fbc_api_key');
        const envKey = process.env.API_KEY;
        const apiKey = storedKey || envKey;

        if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
            console.warn("API_KEY is missing. Admin configuration required.");
        } else {
            // Initialize with a default, but logic will override
            standardChatRef.current = new StandardChatService(apiKey);
            researchServiceRef.current = new LeadResearchService();
            aiBrainRef.current = new AIBrainService();

            // Restore session context if available
            const savedProfile = sessionStorage.getItem('fbc_user_profile');
            if (savedProfile) {
                setUserProfile(JSON.parse(savedProfile) as UserProfile | null);
            }
        }
    }, []);

    // Sync Session ID across services
    useEffect(() => {
        if (sessionId) {
            if (aiBrainRef.current) aiBrainRef.current.setSessionId(sessionId);
            // StandardChatService doesn't have setSessionId - session is managed via unifiedContext
            if (liveServiceRef.current) liveServiceRef.current.setSessionId?.(sessionId);
            unifiedContext.setSessionId(sessionId);
        }
    }, [sessionId]);

    useEffect(() => {
        if (connectionState === LiveConnectionState.CONNECTED) {
            setBackendStatus({
                mode: 'voice',
                message: 'Voice: Gemini Live connected',
                severity: 'info'
            });
        } else if (connectionState === LiveConnectionState.ERROR) {
            setBackendStatus({
                mode: 'fallback',
                message: 'Voice connection error - text will use chat backend',
                severity: 'warn'
            });
        } else if (connectionState === LiveConnectionState.DISCONNECTED) {
            setBackendStatus(prev => prev.mode === 'voice'
                ? {
                    mode: 'idle',
                    message: 'Voice disconnected - text chat ready',
                    severity: 'info'
                }
                : prev);
        }
    }, [connectionState]);

    const persistMessageToServer = useCallback(async (
        sessionId: string,
        role: 'user' | 'model',
        content: string,
        timestamp: Date,
        attachment?: { mimeType: string; data: string }
    ) => {
        try {
            await fetch('/api/chat/persist-message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId,
                    role,
                    content,
                    timestamp: timestamp.toISOString(),
                    attachment: attachment ? {
                        mimeType: attachment.mimeType,
                        data: attachment.data
                    } : undefined,
                    metadata: { source: 'text_chat' }
                })
            });
        } catch (err) {
            console.warn('Failed to persist message:', err);
        }
    }, []);

    // --- LEAD RESEARCH FLOW ---

    const handleStartChatRequest = () => {
        // If we already have a profile, go straight to chat
        if (userProfile) {
            setView('chat');
        } else {
            setShowTerms(true);
        }
    };

    const handleTermsComplete = async (name: string, email: string, companyUrl?: string, permissions?: { voice: boolean; webcam: boolean; location: boolean }) => {
        // 1. Save Profile
        const profile = { name, email };
        setUserProfile(profile);
        sessionStorage.setItem('fbc_user_profile', JSON.stringify(profile));
        setShowTerms(false);

        // 2. Apply Permissions
        if (permissions) {
            logger.debug('[App] Applying user permissions:', permissions);

            // Auto-enable webcam if user granted permission
            if (permissions.webcam) {
                setIsWebcamActive(true);
                logger.debug('[App] Webcam permission granted, enabling camera');
            }

            // Auto-request location if granted
            if (permissions.location && navigator.geolocation) {
                try {
                    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                    });
                    logger.debug('[App] Location access granted:', { lat: pos.coords.latitude, lng: pos.coords.longitude });
                    const geoLocation = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    // Store location in state and unified context
                    setLocationData(geoLocation);
                    unifiedContext.setLocation(geoLocation);
                    // Sync location to StandardChatService proactively
                    if (standardChatRef.current) {
                        standardChatRef.current.setLocation(geoLocation);
                    }
                } catch (err) {
                    console.warn('[App] Location access failed:', err);
                }
            }

            // Voice is handled by the live service connection
            if (permissions.voice) {
                logger.debug('[App] Voice permission granted');
            }

            // Store permissions for reference
            sessionStorage.setItem('fbc_permissions', JSON.stringify(permissions));
        }

        // 3. Enter Chat Immediately (Fast Path)
        setView('chat');

        // 4. Trigger Background Research (Deep Path)
        void performBackgroundResearch(email, name, companyUrl);
    };

    const performBackgroundResearch = async (email: string, name: string, companyUrl?: string) => {
        if (!researchServiceRef.current) return;

        // Basic check for generic emails to skip expensive research if no override
        const genericDomains = ['gmail.com', 'outlook.com', 'hotmail.com', 'yahoo.com', 'icloud.com'];
        const domain = email.split('@')[1]?.toLowerCase();

        if (domain && genericDomains.includes(domain) && !companyUrl) {
            logger.debug("Generic email detected without override, skipping deep research.");
            return;
        }

        logger.debug("Triggering Background Lead Research for:", { email });

        try {
            const result = await researchServiceRef.current.researchLead(email, name, companyUrl);
            researchResultRef.current = result;

            // Sync Context to ALL Services
            // Update services with new context
            if (standardChatRef.current) {
                standardChatRef.current.setResearchContext(result);
            }
            if (liveServiceRef.current) {
                liveServiceRef.current.setResearchContext(result);
            }
            // Pass research context as intelligence context for agents (flattened)
            intelligenceContextRef.current = {
                ...intelligenceContextRef.current,
                // Flatten research data for direct agent access
                ...(result.company ? { company: result.company } : {}),
                ...(result.person ? { person: result.person } : {}),
                ...(result.strategic ? { strategic: result.strategic } : {}),
                // Also keep full research object for backward compatibility
                research: result
            };
            unifiedContext.setResearchContext(result);
            unifiedContext.setIntelligenceContext(intelligenceContextRef.current);

            // Inject "Verified Handshake" Card into Transcript
            // This replaces the plain text system message with a visual card
            setTranscript(prev => [...prev, {
                id: Date.now().toString(),
                role: 'model',
                text: `[System: Context Loaded]`, // Fallback text
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
            // Don't set researchResultRef.current if research fails
            // This ensures code that checks researchResultRef.current can safely assume it's valid
            researchResultRef.current = null;
        }
    };

    // Re-use logic for manual research triggers in chat
    const performResearch = useCallback(async (input: string) => {
        if (!researchServiceRef.current) return;
        const emailMatch = input.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi);

        if (emailMatch && !researchResultRef.current) {
            const email = emailMatch[0];
            // Only trigger if it's different from the user's email we already researched
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
                const result = await researchServiceRef.current.researchLead(email);
                researchResultRef.current = result;

                if (standardChatRef.current) standardChatRef.current.setResearchContext(result);
                if (liveServiceRef.current) liveServiceRef.current.setResearchContext(result);
                // Pass research context as intelligence context for agents (flattened)
                intelligenceContextRef.current = {
                    ...intelligenceContextRef.current,
                    // Flatten research data for direct agent access
                    ...(result.company ? { company: result.company } : {}),
                    ...(result.person ? { person: result.person } : {}),
                    ...(result.strategic ? { strategic: result.strategic } : {}),
                    // Also keep full research object for backward compatibility
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
    }, [userProfile]);

    // Check for Local AI Support on Mount
    useEffect(() => {
        const checkLocalAi = async () => {
            const caps = await chromeAiRef.current.getCapabilities();
            setLocalAiCaps(caps);
        };
        void checkLocalAi();
    }, []);

    // --- MODEL ROUTING LOGIC ---
    const smartRouteModel = useCallback((text: string, hasAttachment: boolean): ModelRoute => {
        const t = text.toLowerCase();

        // 1. Navigation / Maps / Location -> Flash (Better Maps support)
        if (t.includes('where is') || t.includes('route') || t.includes('distance') || t.includes('map') || t.includes('navigate') || t.includes('location of') || t.includes('directions')) {
            return {
                id: GEMINI_MODELS.FLASH_2025_09, // gemini-2.5-flash
                label: 'LIVE NAVIGATION',
                description: 'Routing query detected. Using standard engine with Google Maps integration.',
                color: 'bg-orange-500'
            };
        }

        // 2. Complex Reasoning / Code / Math -> Pro (Reasoning Budget & Code Execution)
        if (t.includes('code') || t.includes('function') || t.includes('script') || t.includes('program') || t.includes('math') || t.includes('calculate') || t.includes('solve') || t.includes('analyze') || t.includes('why') || t.includes('strategy') || t.includes('plan')) {
            return {
                id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
                label: 'DEEP REASONING',
                description: 'Complex query detected. Using high-intelligence reasoning engine.',
                color: 'bg-indigo-500'
            };
        }

        // 3. Multimodal (Images) -> Pro (Better Vision)
        if (hasAttachment) {
            return {
                id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
                label: 'VISUAL ANALYSIS',
                description: 'Visual context detected. Using multimodal processing engine.',
                color: 'bg-purple-500'
            };
        }

        // 4. Length Heuristic
        if (text.length > 150) {
            return {
                id: GEMINI_MODELS.GEMINI_3_PRO_PREVIEW,
                label: 'COMPLEX CONTEXT',
                description: 'Long context detected. Upgrading to larger context window.',
                color: 'bg-indigo-500'
            };
        }

        // 5. Default -> Flash (Speed)
        return {
            id: GEMINI_MODELS.DEFAULT_CHAT,
            label: 'STANDARD',
            description: 'Standard query. Using high-speed response engine.',
            color: 'bg-gray-400'
        };
    }, []);

    // Helper for strict word matching to prevent "brainstorm" triggering "storm"
    const hasWord = useCallback((text: string, word: string) => new RegExp(`\\b${word}\\b`, 'i').test(text), []);

    const extractWeatherData = useCallback((text: string): VisualState['weatherData'] | undefined => {
        const t = text.toLowerCase();

        // Extract temperature with improved regex - handles "0°C", "0°", "0 degrees", etc.
        const tempRegex = /(-?\d+)\s*(?:°|degrees?|deg)\s*[CF]?(?!\s*[NSEW])/i;
        const match = text.match(tempRegex);
        // Also try simpler pattern like "0°C" or "0°"
        const simpleMatch = !match ? text.match(/(-?\d+)\s*°\s*[CF]?/i) : null;
        const finalMatch = match || simpleMatch;
        const temperature = finalMatch ? finalMatch[0].replace(/\s+/g, '').toUpperCase() : undefined;

        let condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' = 'cloudy';

        if (hasWord(t, 'snow') || hasWord(t, 'flurries') || hasWord(t, 'blizzard') || hasWord(t, 'freezing')) condition = 'snowy';
        else if (hasWord(t, 'rain') || hasWord(t, 'rainy') || hasWord(t, 'drizzle') || hasWord(t, 'shower') || hasWord(t, 'wet')) condition = 'rainy';
        else if (hasWord(t, 'storm') || hasWord(t, 'stormy') || hasWord(t, 'thunder') || hasWord(t, 'lightning')) condition = 'stormy';
        else if (hasWord(t, 'sun') || hasWord(t, 'sunny') || hasWord(t, 'clear') || hasWord(t, 'bright')) condition = 'sunny';

        const hasContext =
            hasWord(t, 'weather') ||
            hasWord(t, 'temperature') ||
            hasWord(t, 'forecast') ||
            hasWord(t, 'climate') ||
            hasWord(t, 'celsius') ||
            hasWord(t, 'fahrenheit') ||
            hasWord(t, 'degrees') ||
            !!temperature;

        if (hasContext && (condition !== 'cloudy' || temperature)) {
            return { condition, ...(temperature ? { temperature } : {}) };
        }
        return undefined;
    }, [hasWord]);

    const extractChartData = useCallback((text: string): VisualState['chartData'] | undefined => {
        const t = text.toLowerCase();
        let trend: 'up' | 'down' | 'neutral' = 'neutral';

        if (hasWord(t, 'up') || hasWord(t, 'rose') || hasWord(t, 'increase') || hasWord(t, 'gain') || hasWord(t, 'bull') || hasWord(t, 'high') || /\+\d/.test(text)) trend = 'up';
        else if (hasWord(t, 'down') || hasWord(t, 'fell') || hasWord(t, 'drop') || hasWord(t, 'loss') || hasWord(t, 'bear') || hasWord(t, 'low') || /-\d/.test(text)) trend = 'down';

        const valueRegex = /(\$\d[\d,.]*|\d[\d,.]*%)/;
        const match = text.match(valueRegex);
        const value = match ? match[0] : undefined;

        if (trend !== 'neutral' || value) {
            return { trend, ...(value ? { value } : {}) };
        }
        return undefined;
    }, [hasWord]);

    const extractMapCoords = useCallback((uri: string): { lat: number, lng: number } | undefined => {
        const atMatch = uri.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (atMatch && atMatch[1] && atMatch[2]) return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };

        const llMatch = uri.match(/[?&]ll=(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (llMatch && llMatch[1] && llMatch[2]) return { lat: parseFloat(llMatch[1]), lng: parseFloat(llMatch[2]) };

        return undefined;
    }, []);

    const detectVisualIntent = useCallback((text: string): VisualShape | null => {
        const t = text.toLowerCase();
        const hasPhrase = (phrase: string) => t.includes(phrase);

        if (hasPhrase('what is your name') || hasPhrase('who are you') || hasPhrase('your identity') || hasPhrase('f.b/c')) {
            textContentRef.current = "F.B/c";
            return 'text';
        }

        if (
            hasWord(t, 'analyze') || hasWord(t, 'scan') || hasWord(t, 'read') || hasPhrase('check this') || hasWord(t, 'review') ||
            hasPhrase('image displays') || hasPhrase('file contains') || hasPhrase('report details') || hasPhrase('summary of') || hasWord(t, 'report') || hasWord(t, 'summary') ||
            (hasWord(t, 'analyzed') && (hasWord(t, 'image') || hasWord(t, 'file') || hasWord(t, 'document') || hasWord(t, 'content')))
        ) {
            textContentRef.current = undefined;
            return 'scanner';
        }

        if (
            hasWord(t, 'function') || hasWord(t, 'const') || hasWord(t, 'import') || hasWord(t, 'class') ||
            hasWord(t, 'python') || hasWord(t, 'javascript') || hasPhrase('code block') || hasWord(t, 'algorithm') ||
            hasWord(t, 'api') || text.includes('```')
        ) {
            textContentRef.current = undefined;
            return 'code';
        }

        // Check for weather FIRST (before map/chart) to prioritize weather visualization
        const weatherData = extractWeatherData(text);
        if (weatherData) {
            weatherDataRef.current = weatherData;
            textContentRef.current = undefined;
            return 'weather';
        }

        // Also check for weather keywords even if extractWeatherData didn't find structured data
        if (
            (hasWord(t, 'weather') || hasWord(t, 'temperature') || hasWord(t, 'forecast') ||
             hasWord(t, 'celsius') || hasWord(t, 'fahrenheit') || hasWord(t, 'degrees') ||
             hasWord(t, 'cloudy') || hasWord(t, 'sunny') || hasWord(t, 'rainy') || hasWord(t, 'snowy') || hasWord(t, 'stormy')) &&
            (/\d+\s*°/.test(text) || hasWord(t, 'temperature') || hasWord(t, 'weather'))
        ) {
            // Try to extract basic weather info even if regex didn't match
            const tempMatch = text.match(/(-?\d+)\s*°?\s*[CF]?/i);
            const temp = tempMatch ? tempMatch[0].replace(/\s+/g, '') : undefined;
            let condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'stormy' = 'cloudy';
            if (hasWord(t, 'snow') || hasWord(t, 'flurries')) condition = 'snowy';
            else if (hasWord(t, 'rain') || hasWord(t, 'rainy') || hasWord(t, 'drizzle')) condition = 'rainy';
            else if (hasWord(t, 'storm') || hasWord(t, 'thunder')) condition = 'stormy';
            else if (hasWord(t, 'sun') || hasWord(t, 'sunny') || hasWord(t, 'clear')) condition = 'sunny';
            
            weatherDataRef.current = { condition, ...(temp ? { temperature: temp } : {}) };
            textContentRef.current = undefined;
            return 'weather';
        }

        if (
            hasPhrase('where is') || hasWord(t, 'location') || hasWord(t, 'map') || hasWord(t, 'direction') ||
            hasWord(t, 'navigate') || hasWord(t, 'gps') || hasWord(t, 'route')
        ) {
            textContentRef.current = undefined;
            return 'map';
        }

        if (
            hasWord(t, 'stock') || hasWord(t, 'price') || hasWord(t, 'market') || hasWord(t, 'chart') ||
            hasWord(t, 'graph') || hasWord(t, 'bitcoin') || hasWord(t, 'crypto') || hasWord(t, 'currency') ||
            hasWord(t, 'trading') || hasWord(t, 'data') || hasWord(t, 'trend') || hasWord(t, 'finance')
        ) {
            const data = extractChartData(text);
            if (data) chartDataRef.current = data;
            textContentRef.current = undefined;
            return 'chart';
        }

        if (hasWord(t, 'planet') || hasWord(t, 'space') || hasWord(t, 'orbit') || hasWord(t, 'cosmos') || hasWord(t, 'solar') || hasWord(t, 'galaxy') || hasWord(t, 'universe') || hasWord(t, 'moon')) {
            textContentRef.current = undefined;
            return 'planet';
        }

        if (hasWord(t, 'time') || hasWord(t, 'clock') || hasPhrase('what hour')) {
            textContentRef.current = undefined;
            return 'clock';
        }

        if (hasWord(t, 'search') || hasWord(t, 'google') || hasWord(t, 'web') || hasWord(t, 'internet') || hasWord(t, 'online') || hasWord(t, 'find') || hasWord(t, 'browser')) { textContentRef.current = undefined; return 'globe'; }
        if (hasWord(t, 'reason') || hasWord(t, 'think') || hasWord(t, 'logic') || hasWord(t, 'plan') || hasWord(t, 'solve') || hasWord(t, 'compare') || hasWord(t, 'study') || hasWord(t, 'neural') || hasWord(t, 'ai') || hasWord(t, 'brainstorm')) { textContentRef.current = undefined; return 'brain'; }
        if (hasWord(t, 'face') || hasWord(t, 'eye') || hasWord(t, 'vision') || hasWord(t, 'sight') || hasPhrase('look like') || hasWord(t, 'avatar') || hasWord(t, 'self') || hasWord(t, 'mirror')) { textContentRef.current = undefined; return 'face'; }
        if (hasWord(t, 'love') || hasWord(t, 'heart') || hasWord(t, 'feel') || hasWord(t, 'care') || hasWord(t, 'happy') || hasWord(t, 'sad')) { textContentRef.current = undefined; return 'heart'; }
        if (hasWord(t, 'matrix') || hasWord(t, 'grid') || hasWord(t, 'system') || hasWord(t, 'computer') || hasWord(t, 'digital')) { textContentRef.current = undefined; return 'grid'; }
        if (hasWord(t, 'dna') || hasWord(t, 'life') || hasWord(t, 'bio') || hasWord(t, 'gene') || hasWord(t, 'cell') || hasWord(t, 'health')) { textContentRef.current = undefined; return 'dna'; }
        if (hasWord(t, 'atom') || hasWord(t, 'physics') || hasWord(t, 'energy') || hasWord(t, 'nuclear') || hasWord(t, 'science') || hasWord(t, 'quantum')) { textContentRef.current = undefined; return 'atom'; }
        if (hasWord(t, 'history') || hasWord(t, 'wait') || hasWord(t, 'ancient') || hasWord(t, 'future')) { textContentRef.current = undefined; return 'hourglass'; }

        if (hasWord(t, 'why') || hasWord(t, 'mystery') || hasWord(t, 'philosophy') || hasWord(t, 'confuse') || hasWord(t, 'connect')) { textContentRef.current = undefined; return 'constellation'; }

        if (hasWord(t, 'secure') || hasWord(t, 'safe') || hasWord(t, 'protect') || hasWord(t, 'shield') || hasWord(t, 'private') || hasWord(t, 'lock')) { textContentRef.current = undefined; return 'shield'; }
        if (hasWord(t, 'idea') || hasWord(t, 'star') || hasWord(t, 'magic') || hasWord(t, 'success') || hasWord(t, 'win') || hasWord(t, 'spark')) { textContentRef.current = undefined; return 'star'; }

        // Missing Geometric Shapes
        if (hasWord(t, 'rectangle') || hasWord(t, 'rect') || hasWord(t, 'box') || hasWord(t, 'square') || hasWord(t, 'frame') || hasWord(t, 'shape')) { textContentRef.current = undefined; return 'rect'; }
        if (hasWord(t, 'wave') || hasWord(t, 'ocean') || hasWord(t, 'water') || hasWord(t, 'flow') || hasWord(t, 'current') || hasWord(t, 'tide') || hasWord(t, 'ripple')) { textContentRef.current = undefined; return 'wave'; }
        if (hasWord(t, 'vortex') || hasWord(t, 'spiral') || hasWord(t, 'whirlpool') || hasWord(t, 'tornado') || hasWord(t, 'swirl') || hasWord(t, 'twist') || hasWord(t, 'cyclone')) { textContentRef.current = undefined; return 'vortex'; }
        if (hasWord(t, 'firework') || hasWord(t, 'celebration') || hasWord(t, 'party') || hasWord(t, 'explosion') || hasWord(t, 'festival') || hasWord(t, 'firecracker') || hasWord(t, 'sparkler')) { textContentRef.current = undefined; return 'fireworks'; }
        if (hasWord(t, 'lightning') || hasWord(t, 'thunder') || hasWord(t, 'bolt') || hasWord(t, 'electric') || hasWord(t, 'flash') || hasWord(t, 'zap') || hasWord(t, 'strike')) { textContentRef.current = undefined; return 'lightning'; }
        if (hasWord(t, 'flower') || hasWord(t, 'bloom') || hasWord(t, 'petal') || hasWord(t, 'garden') || hasWord(t, 'rose') || hasWord(t, 'nature') || hasWord(t, 'blossom')) { textContentRef.current = undefined; return 'flower'; }

        // Agent Shapes
        if (hasWord(t, 'discover') || hasWord(t, 'explore') || hasWord(t, 'research') || hasWord(t, 'investigate')) { textContentRef.current = undefined; return 'discovery'; }
        if (hasWord(t, 'score') || hasWord(t, 'rating') || hasWord(t, 'evaluate') || hasWord(t, 'assess') || hasWord(t, 'grade') || hasWord(t, 'points')) { textContentRef.current = undefined; return 'scoring'; }
        if (hasWord(t, 'workshop') || hasWord(t, 'training') || hasWord(t, 'session') || hasWord(t, 'course') || hasWord(t, 'learn') || hasWord(t, 'teach')) { textContentRef.current = undefined; return 'workshop'; }
        if (hasWord(t, 'consult') || hasWord(t, 'advice') || hasWord(t, 'guidance') || hasWord(t, 'expert') || hasWord(t, 'advisor') || hasWord(t, 'counsel')) { textContentRef.current = undefined; return 'consulting'; }
        if (hasWord(t, 'close') || hasWord(t, 'deal') || hasWord(t, 'urgent') || hasWord(t, 'finalize') || hasWord(t, 'complete') || hasWord(t, 'seal')) { textContentRef.current = undefined; return 'closer'; }
        if (hasWord(t, 'summarize') || hasWord(t, 'recap') || hasWord(t, 'overview') || hasWord(t, 'brief') || hasWord(t, 'synopsis')) { textContentRef.current = undefined; return 'summary'; }
        if (hasWord(t, 'proposal') || hasWord(t, 'offer') || hasWord(t, 'quote') || hasWord(t, 'bid') || hasWord(t, 'suggest') || hasWord(t, 'recommend')) { textContentRef.current = undefined; return 'proposal'; }
        if (hasWord(t, 'admin') || hasWord(t, 'manage') || hasWord(t, 'control') || hasWord(t, 'settings') || hasWord(t, 'configure') || hasWord(t, 'system')) { textContentRef.current = undefined; return 'admin'; }
        if (hasWord(t, 'retarget') || hasWord(t, 'remarket') || hasWord(t, 'reengage') || hasPhrase('follow-up') || hasWord(t, 'reconnect') || hasWord(t, 'nurture')) { textContentRef.current = undefined; return 'retargeting'; }

        const highlightRegex = /(\*\*|["'])([A-Za-z0-9\s]{2,15})\1/;
        const match = text.match(highlightRegex);

        if (match && match[2]) {
            const keyword = match[2].trim();
            const ignore = ['this', 'that', 'here', 'note', 'user', 'model', 'system', 'text', 'code', 'image', 'data', 'file', 'report'];

            if (!ignore.includes(keyword.toLowerCase()) && keyword.split(' ').length <= 2) {
                textContentRef.current = keyword.toUpperCase();
                return 'text';
            }
        }

        return null;
    }, [hasWord, extractChartData, extractWeatherData]);

    useEffect(() => {
        const last = transcript[transcript.length - 1];

        if (last?.role === 'model' && last?.reasoning && (last.status === 'streaming' || !last.isFinal)) {
            if (semanticShapeRef.current !== 'constellation') {
                semanticShapeRef.current = 'constellation';
                setVisualState(prev => ({ ...prev, shape: 'constellation' }));
            }
        }
        else if (last?.role === 'model' && last?.isFinal) {
            const detected = detectVisualIntent(last.text);
            if (detected) {
                semanticShapeRef.current = detected;
                setVisualState(prev => ({
                    ...prev,
                    // isActive stays false for text chat (only true for voice)
                    shape: detected,
                    mode: 'speaking', // Show speaking mode
                    ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                    ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                    ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                    ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
                }));
            }
        }
    }, [transcript, detectVisualIntent]);

    // const hasAudio = connectionState === LiveConnectionState.CONNECTED;
    // const hasVision = isWebcamActive;
    // const hasFiles = transcript.some(t => t.attachment);

    const handleVolumeChange = useCallback((inputVol: number, outputVol: number) => {
        setVisualState(prev => {
            // Normalize audio levels (they come in as 0-1, amplify for better visual response)
            const micLevel = Math.min(inputVol * 3.0, 1.0);
            const speakerLevel = Math.min(outputVol * 3.0, 1.0);

            let mode: 'idle' | 'listening' | 'thinking' | 'speaking' = prev.mode;
            let activeLevel = 0;

            if (!prev.isActive) {
                mode = 'idle';
                activeLevel = 0;
            } else if (speakerLevel > 0.01) {
                mode = 'speaking';
                activeLevel = speakerLevel;
            } else if (micLevel > 0.02) {
                mode = 'listening';
                activeLevel = micLevel;
            } else {
                mode = 'thinking';
                activeLevel = 0.1;
            }

            let shape: VisualShape = semanticShapeRef.current;

            // Priority: webcam > nano route > voice mode > agent shape
            if (isWebcamActiveRef.current) {
                shape = 'face';
            } else if (activeRoute.id.includes('nano')) {
                shape = 'shield';
            } else if (mode === 'speaking') {
                // Always switch to wave when speaking (unless overridden by agent)
                // Only override if current shape is a default/neutral shape
                if (['orb', 'wave', 'brain', 'idle'].includes(prev.shape) || prev.shape === semanticShapeRef.current) {
                    shape = 'wave';
                }
            } else if (mode === 'listening') {
                // Keep current shape or use orb
                if (['wave', 'brain'].includes(prev.shape)) {
                    shape = 'orb';
                }
            } else if (mode === 'thinking') {
                // Switch to brain when thinking
                if (['orb', 'wave'].includes(prev.shape)) {
                    shape = 'brain';
                }
            }

            return {
                ...prev,
                audioLevel: activeLevel,
                mode: mode,
                shape: shape,
                ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
            };
        });
    }, [activeRoute]);

    const handleTranscript = useCallback((text: string, isUser: boolean, isFinal: boolean, groundingMetadata?: GroundingMetadata, agentMetadata?: { agent?: string; stage?: string }) => {
        if (isFinal) {
            // Parse agent metadata for shape changes (same as text mode)
            if (agentMetadata?.agent || agentMetadata?.stage) {
                const agentShape = resolveAgentShape(agentMetadata.agent, agentMetadata.stage);
                semanticShapeRef.current = agentShape;
                setVisualState(prev => ({ ...prev, shape: agentShape }));
            }

            const detected = detectVisualIntent(text);
            if (detected) {
                semanticShapeRef.current = detected;
            }

            if (groundingMetadata?.groundingChunks?.some(c => c.maps)) {
                const mapChunk = groundingMetadata.groundingChunks.find(c => c.maps);
                if (mapChunk?.maps?.title) {
                    semanticShapeRef.current = 'map';
                    const coords = mapChunk.maps.uri ? extractMapCoords(mapChunk.maps.uri) : undefined;
                    mapDataRef.current = {
                        title: mapChunk.maps.title,
                        ...(coords?.lat !== undefined && { lat: coords.lat }),
                        ...(coords?.lng !== undefined && { lng: coords.lng })
                    };
                    setVisualState(prev => ({
                        ...prev,
                        shape: 'map',
                        ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
                    }));
                }
            }

            // Fly.io server automatically persists transcripts - no action needed
        }

        setTranscript(prev => {
            const newTranscript = [...prev];
            const lastItemIndex = newTranscript.length - 1;
            const lastItem = newTranscript[lastItemIndex];

            if (lastItem && lastItem.role === (isUser ? 'user' : 'model') && !lastItem.isFinal) {
                const updatedItem = {
                    ...lastItem,
                    text: lastItem.text + text,
                    isFinal: isFinal,
                    status: isFinal ? 'complete' : 'streaming',
                    ...(groundingMetadata ? { groundingMetadata } : lastItem.groundingMetadata ? { groundingMetadata: lastItem.groundingMetadata } : {})
                };
                newTranscript[lastItemIndex] = updatedItem as TranscriptItem;
                return newTranscript;
            } else {
                return [...newTranscript, {
                    id: Date.now().toString(),
                    role: isUser ? 'user' : 'model',
                    text: text,
                    timestamp: new Date(),
                    isFinal: isFinal,
                    status: 'complete',
                    ...(groundingMetadata && { groundingMetadata })
                }];
            }
        });
    }, [detectVisualIntent, extractMapCoords]);

    const handleToolCall = useCallback(async (functionCalls: any[]) => {
        const results: any[] = [];
        const serverCalls: any[] = [];

        // Detect agent from tool calls (if metadata available)
        let detectedAgent: string | null = null;

        for (const call of functionCalls) {
            if (call.name === 'update_dashboard') {
                const { shape, data, text } = call.args;

                semanticShapeRef.current = shape;

                if (text) textContentRef.current = text;
                else textContentRef.current = undefined;

                if (data) {
                    if (shape === 'weather') weatherDataRef.current = data;
                    if (shape === 'chart') {
                        chartDataRef.current = {
                            trend: data.stockTrend || 'neutral',
                            value: data.stockValue
                        };
                    }
                    if (shape === 'map') {
                        mapDataRef.current = {
                            title: data.locationTitle || 'Location',
                            ...(data.latitude !== undefined && { lat: data.latitude }),
                            ...(data.longitude !== undefined && { lng: data.longitude }),
                            ...(data.endLat && data.endLng && {
                                destination: {
                                    lat: data.endLat,
                                    lng: data.endLng,
                                    title: data.destinationTitle || 'Destination'
                                }
                            })
                        };
                        if (data.startLat && data.startLng) {
                            const current = mapDataRef.current || { title: 'Location' };
                            mapDataRef.current = {
                                ...current,
                                ...(data.startLat !== undefined && { lat: data.startLat }),
                                ...(data.startLng !== undefined && { lng: data.startLng })
                            };
                        }
                    }
                }

                setVisualState(prev => ({
                    ...prev,
                    shape: shape,
                    ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                    ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                    ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                    ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
                }));

                results.push({ id: call.id, name: call.name, result: { success: true } });
            } else if (call.name === 'create_calendar_widget') {
                // NEW: Handle calendar widget creation
                const { title, description, url } = call.args;

                logger.debug('[App] Creating calendar widget:', { title, description, url });

                // Inject widget into transcript
                setTranscript(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: '', // No text, just the widget
                    timestamp: new Date(),
                    isFinal: true,
                    status: 'complete',
                    attachment: {
                        type: 'calendar_widget',
                        data: JSON.stringify({
                            title: title || 'Book a Free Consultation',
                            description: description || 'Schedule a 30-minute strategy call',
                            url: url || undefined
                        }),
                        name: 'Booking Widget'
                    }
                }]);

                results.push({ id: call.id, name: call.name, result: { success: true } });
            } else {
                // Map tool names to agents (if applicable)
                if (call.name === 'get_dashboard_stats' || call.name === 'analyze_performance') {
                    detectedAgent = 'Admin Agent';
                } else if (call.name === 'generate_proposal' || call.name === 'draft_proposal') {
                    detectedAgent = 'Proposal Agent';
                } else if (call.name === 'extract_action_items' || call.name === 'summarize_conversation') {
                    detectedAgent = 'Summary Agent';
                } else if (call.name === 'calculate_roi' || call.name === 'score_lead') {
                    detectedAgent = 'Scoring Agent';
                } else if (call.name === 'draft_follow_up_email' || call.name === 'retarget_lead') {
                    detectedAgent = 'Retargeting Agent';
                }

                // Queue for server-side execution
                serverCalls.push(call);
            }
        }

        // Set agent shape if detected
        if (detectedAgent) {
            const agentShape = resolveAgentShape(detectedAgent, null);
            semanticShapeRef.current = agentShape;
            setVisualState(prev => ({ ...prev, shape: agentShape }));
        }

        // Fly.io server handles server-side tool execution automatically
        // Tool results will come back via TOOL_RESULT event from LiveClientWS
        if (serverCalls.length > 0) {
            logger.debug('[App] Server executing tools:', { tools: serverCalls.map(c => c.name).join(', ') });
        }

        return results;
    }, []);

    const handleConnect = useCallback(async () => {
        const storedKey = localStorage.getItem('fbc_api_key');
        const apiKey = storedKey || process.env.API_KEY;

        if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
            showToast("API Key not configured. Please set it in Admin Dashboard or configure GEMINI_API_KEY in Vercel.", 'error');
            setConnectionState(LiveConnectionState.ERROR);
            return;
        }

        const liveModelId = GEMINI_MODELS.DEFAULT_VOICE;
        setActiveRoute({
            id: liveModelId,
            label: 'LIVE UPLINK',
            description: 'Real-time audio/visual stream active.',
            color: 'bg-orange-500'
        });

        setIsChatVisible(false);

        let locationContext = "";
        if (navigator.geolocation) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 2000 });
                });
                locationContext = `User Location: Lat ${pos.coords.latitude}, Lng ${pos.coords.longitude}. `;
            } catch (e) { /* ignore */ }
        }

        // Check for Admin Override for System Instructions
        const adminInstructions = localStorage.getItem('fbc_system_prompt');

        let systemInstruction = adminInstructions || (
            `You are F.B/c AI, a helpful, ethereal AI consultant. ${locationContext}` +
            `You are multimodal: you can see what the user shares via their camera. ` +
            `Use 'googleSearch' for real-time information (weather, news, stocks). ` +
            `Use 'update_dashboard' to change the visual interface when discussing data (e.g. set shape='weather' for weather, shape='map' for routes). ` +
            `Use 'googleMaps' for navigation queries. ` +
            `If the user asks about the weather, ALWAYS check the location and then call update_dashboard({ shape: 'weather', ... }).`
        );

        // INJECT RESEARCH CONTEXT (MATCH SPEC)
        // Only inject if research completed successfully (researchResultRef.current is only set on success)
        if (researchResultRef.current?.person?.fullName && researchResultRef.current?.company?.name) {
            const rc = researchResultRef.current;
            systemInstruction += `\n\n[CRITICAL CONTEXT: INTERLOCUTOR PROFILE]\n` +
                `You are speaking with: ${rc.person.fullName} (${rc.role})\n` +
                `Company: ${rc.company.name} (${rc.company.industry || 'Industry unknown'})\n` +
                `Summary: ${rc.company.summary || 'N/A'}\n` +
                `Strategic Context: ${JSON.stringify(rc.strategic || {})}\n` +
                `Adapt your tone to be relevant to their industry and role.`;
        } else if (userProfile) {
            systemInstruction += `\n\n[USER CONTEXT]\nName: ${userProfile.name}\nEmail: ${userProfile.email}\n`;
        }

        const tools: Tool[] = [
            { googleSearch: {} },
            { googleMaps: {} },
            {
                functionDeclarations: [{
                    name: "update_dashboard",
                    description: "Updates the AI dashboard visual state. Use this to display weather, stock charts, code snippets, or change the abstract shape.",
                    parameters: {
                        type: Type.OBJECT,
                        properties: {
                            shape: {
                                type: Type.STRING,
                                enum: ["orb", "chart", "map", "weather", "face", "brain", "clock", "code", "text", "dna", "shield", "hourglass", "planet", "constellation", "scanner"],
                                description: "The visual shape to display. Use 'code' for programming, 'text' for emphasized keywords, 'scanner' for analysis."
                            },
                            text: { type: Type.STRING },
                            data: {
                                type: Type.OBJECT,
                                properties: {
                                    temperature: { type: Type.STRING },
                                    condition: { type: Type.STRING },
                                    stockValue: { type: Type.STRING },
                                    stockTrend: { type: Type.STRING },
                                    locationTitle: { type: Type.STRING },
                                    latitude: { type: Type.NUMBER },
                                    longitude: { type: Type.NUMBER },
                                    startLat: { type: Type.NUMBER },
                                    startLng: { type: Type.NUMBER },
                                    endLat: { type: Type.NUMBER },
                                    endLng: { type: Type.NUMBER },
                                    destinationTitle: { type: Type.STRING }
                                }
                            }
                        },
                        required: ["shape"]
                    }
                }]
            }
        ];

        // Prevent double instantiation
        if (liveServiceRef.current) {
            console.warn('[App] Disconnecting existing LiveService before creating new one');
            void liveServiceRef.current.disconnect();
        }

        liveServiceRef.current = new GeminiLiveService({
            apiKey: apiKey,
            modelId: liveModelId,
            tools: tools,
            systemInstruction: systemInstruction,
            onStateChange: (state) => {
                setConnectionState(state as LiveConnectionState);
                setVisualState(prev => ({ ...prev, isActive: state === 'CONNECTED' }));
            },
            onVolumeChange: handleVolumeChange,
            onTranscript: handleTranscript,
            onToolCall: handleToolCall
        });

        // Ensure research context is synced to all services
        if (researchResultRef.current) {
            if (standardChatRef.current) {
                standardChatRef.current.setResearchContext(researchResultRef.current);
            }
            if (liveServiceRef.current) {
                liveServiceRef.current.setResearchContext(researchResultRef.current);
            }
            // Pass research context as intelligence context for agents (flattened)
            const researchData = researchResultRef.current;
            intelligenceContextRef.current = {
                ...intelligenceContextRef.current,
                // Flatten research data for direct agent access
                ...(researchData?.company ? { company: researchData.company } : {}),
                ...(researchData?.person ? { person: researchData.person } : {}),
                ...(researchData?.strategic ? { strategic: researchData.strategic } : {}),
                // Also keep full research object for backward compatibility
                research: researchData
            };
        }

        try {
            await liveServiceRef.current.connect();

            if (transcriptRef.current.length > 0) {
                // Wait for session to actually be ready (not just connecting)
                const isReady = await liveServiceRef.current.waitForSessionReady(5000);
                if (isReady) {
                const unifiedSnapshot = unifiedContext.getSnapshot();
                void liveServiceRef.current.sendContext(transcriptRef.current, {
                    ...(unifiedSnapshot.location ? { location: unifiedSnapshot.location } : {}),
                    ...(unifiedSnapshot.researchContext ? { research: unifiedSnapshot.researchContext } : {}),
                    ...(unifiedSnapshot.intelligenceContext ? { intelligenceContext: unifiedSnapshot.intelligenceContext } : {})
                });
                } else {
                    logger.warn('[App] Session not ready after 5s, skipping context send');
                }
            }
        } catch (err) {
            console.error("Failed to connect to Live API", err);
            setConnectionState(LiveConnectionState.ERROR);
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            if (errorMsg.includes('API key') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
                showToast("API Key authentication failed. Please check your API key configuration.", 'error');
            } else {
                showToast("Network Error: Could not connect to Gemini Live API. Please check your connection.", 'error');
            }
        }

    }, [handleVolumeChange, handleTranscript, handleToolCall, userProfile]);

    // Auto-connect Live API when webcam is activated (if not already connected)
    const webcamConnectAttemptedRef = useRef(false);
    useEffect(() => {
        if (isWebcamActive && 
            connectionState !== LiveConnectionState.CONNECTED && 
            connectionState !== LiveConnectionState.CONNECTING &&
            !webcamConnectAttemptedRef.current &&
            liveServiceRef.current) {
            webcamConnectAttemptedRef.current = true;
            logger.debug('[App] Webcam activated, connecting to Live API for multimodal conversation');
            void handleConnect().finally(() => {
                // Reset after connection attempt completes (success or failure)
                setTimeout(() => {
                    webcamConnectAttemptedRef.current = false;
                }, 2000);
            });
        } else if (connectionState === LiveConnectionState.CONNECTED) {
            webcamConnectAttemptedRef.current = false;
        }
    }, [isWebcamActive, connectionState, handleConnect]);

    const handleDisconnect = useCallback(() => {
        void liveServiceRef.current?.disconnect();
        setActiveRoute({
            id: GEMINI_MODELS.DEFAULT_CHAT,
            label: 'READY',
            description: 'System ready.',
            color: 'bg-gray-400'
        });
        setIsChatVisible(true);
    }, []);

    const handleStopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setTranscript(prev => prev.map(item => {
            if (!item.isFinal) {
                return { ...item, isFinal: true, status: 'complete', text: item.text };
            }
            return item;
        }));
    }, []);

    const handleSendMessage = useCallback(async (text: string, file?: { mimeType: string, data: string }) => {
        const route = smartRouteModel(text, !!file);
        setActiveRoute(route);

        let targetShape: VisualShape = file ? 'scanner' : 'brain';

        const detected = detectVisualIntent(text);
        if (detected) {
            semanticShapeRef.current = detected;
            targetShape = detected;
        } else if (!file) {
            semanticShapeRef.current = 'brain';
        } else {
            semanticShapeRef.current = 'scanner';
        }

        setVisualState(prev => ({
            ...prev,
            // isActive stays false for text chat (only true for voice)
            shape: targetShape,
            mode: 'thinking', // Show thinking mode while processing
            ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
            ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
            ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
            ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current })
        }));

        const isImage = file?.mimeType.startsWith('image/');

        const userItem: TranscriptItem = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: new Date(),
            isFinal: true,
            status: 'complete',
            ...(file && {
                attachment: {
                    type: isImage ? 'image' : 'file',
                    url: isImage ? `data:${file.mimeType};base64,${file.data}` : '',
                    mimeType: file.mimeType,
                    data: file.data,
                    name: isImage ? 'Image' : 'Document'
                }
            })
        };

        setTranscript(prev => [...prev, userItem]);

        // Persist user message
        if (sessionId) {
            await persistMessageToServer(sessionId, 'user', text, userItem.timestamp, file);
        }

        await performResearch(text);

        // Use voice if connected (webcam and voice can work together)
        const shouldUseVoice = connectionState === LiveConnectionState.CONNECTED &&
            liveServiceRef.current;

        if (shouldUseVoice) {
            setBackendStatus({
                mode: 'voice',
                message: file ? 'Voice + media sent via Live WebSocket' : 'Voice message sent via Live WebSocket',
                severity: 'info'
            });
            if (file) {
                liveServiceRef.current?.sendRealtimeMedia(file);
                if (!text.trim()) {
                    liveServiceRef.current?.sendText("Analyze this image.");
                }
            }
            if (text.trim()) {
                liveServiceRef.current?.sendText(text);
            }
        } else if (aiBrainRef.current) { // Use AIBrainService instead of StandardChatService
            // Check API key before making API calls
            const storedKey = localStorage.getItem('fbc_api_key');
            const apiKey = storedKey || process.env.API_KEY;
            if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
                showToast("API Key not configured. Please set it in Admin Dashboard or configure GEMINI_API_KEY in Vercel.", 'error');
                setTranscript(prev => [...prev, {
                    id: Date.now().toString(),
                    role: 'model',
                    text: "I need an API key to function. Please configure your Gemini API key in the Admin Dashboard (click 'Admin Access' in the footer) or set GEMINI_API_KEY in your Vercel environment variables.",
                    timestamp: new Date(),
                    isFinal: true,
                    status: 'complete'
                }]);
                return;
            }

            try {
                abortControllerRef.current = new AbortController();
                setBackendStatus({
                    mode: 'agents',
                    message: 'Routing via Multi-Agent (/api/chat)...',
                    severity: 'info'
                });

                const loadingId = Date.now() + 1;
                setTranscript(prev => [...prev, {
                    id: loadingId.toString(),
                    role: 'model',
                    text: '',
                    timestamp: new Date(),
                    isFinal: false,
                    status: 'streaming'
                }]);

                const currentHistory = [...transcriptRef.current, userItem];

                // Ensure updated context is passed
                if (researchResultRef.current) {
                    // Pass research context as intelligence context (flattened)
                    const researchData = researchResultRef.current;
                    intelligenceContextRef.current = {
                        ...intelligenceContextRef.current,
                        // Flatten research data for direct agent access
                        ...(researchData.company ? { company: researchData.company } : {}),
                        ...(researchData.person ? { person: researchData.person } : {}),
                        ...(researchData.strategic ? { strategic: researchData.strategic } : {}),
                        // Also keep full research object for backward compatibility
                        research: researchData
                    };
                    unifiedContext.setResearchContext(researchResultRef.current);
                    unifiedContext.setIntelligenceContext(intelligenceContextRef.current);
                }

                // Ensure location is captured once and shared
                const location = await unifiedContext.ensureLocation();
                // Sync location to StandardChatService proactively
                // Update services with new location
                if (standardChatRef.current && location) {
                    standardChatRef.current.setLocation(location);
                }
                if (liveServiceRef.current && location) {
                    liveServiceRef.current.setLocation(location);
                }
                const unifiedSnapshot = unifiedContext.getSnapshot();
                // Flatten research data for agent access - agents expect intelligenceContext.company.name directly
                const researchData = unifiedSnapshot.researchContext || intelligenceContextRef.current?.research;
                const intelligencePayload = {
                    ...(unifiedSnapshot.intelligenceContext || {}),
                    ...(intelligenceContextRef.current || {}),
                    // Flatten research data to top level for agent access
                    ...(researchData?.company ? { company: researchData.company } : {}),
                    ...(researchData?.person ? { person: researchData.person } : {}),
                    ...(researchData?.strategic ? { strategic: researchData.strategic } : {}),
                    ...(researchData?.citations ? { citations: researchData.citations } : {}),
                    // Also keep full research object for backward compatibility
                    ...(researchData ? { research: researchData } : {}),
                    ...(location ? { location } : {})
                };

                // Prepare messages for AIBrain
                const messages = AIBrainService.transcriptToMessages(currentHistory);
                const lastMsg = messages[messages.length - 1];

                if (file && lastMsg) {
                    // Add file attachment to last message
                    lastMsg.attachments = [{
                        mimeType: file.mimeType,
                        data: file.data
                    }];
                } else if (isWebcamActive && latestWebcamFrameRef.current && lastMsg) {
                    // If webcam is active and no file attached, attach latest webcam frame
                    // This allows AI to see what user is showing via webcam
                    lastMsg.attachments = [{
                        mimeType: 'image/jpeg',
                        data: latestWebcamFrameRef.current
                    }];
                }

                const agentResponse = await aiBrainRef.current.chat(messages, {
                    conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
                    intelligenceContext: intelligencePayload
                });

                if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;

                // Log agent response for debugging
                logger.debug('[App] Agent response received:', {
                    success: agentResponse.success,
                    agent: agentResponse.agent,
                    hasOutput: !!agentResponse.output,
                    error: agentResponse.error,
                    metadata: agentResponse.metadata
                });

                if (!agentResponse.success) {
                    // Fallback to StandardChatService if agent fails
                    console.warn('[App] Agent system failed, falling back to standard chat:', agentResponse.error);
                    setBackendStatus({
                        mode: 'fallback',
                        message: `Fell back to StandardChat: ${agentResponse.error || 'unknown /api/chat error'}`,
                        severity: 'warn'
                    });
                    if (standardChatRef.current) {
                        // Seed fallback with shared context
                        const unifiedSnapshotForFallback = unifiedContext.getSnapshot();
                        if (unifiedSnapshotForFallback.location) {
                            standardChatRef.current.setLocation(unifiedSnapshotForFallback.location);
                        }
                        if (unifiedSnapshotForFallback.researchContext) {
                            standardChatRef.current.setResearchContext(unifiedSnapshotForFallback.researchContext);
                        }

                        const response = await standardChatRef.current.sendMessage(currentHistory, text, file, route.id);
                        setBackendStatus({
                            mode: 'fallback',
                            message: 'StandardChat response used (agent unavailable)',
                            severity: 'warn'
                        });
                        // Handle standard response (same as before)
                        setTranscript(prev => prev.map(item =>
                            item.id === loadingId.toString()
                                ? {
                                    ...item,
                                    text: response.text,
                                    ...(response.reasoning !== undefined && { reasoning: response.reasoning }),
                                    ...(response.groundingMetadata !== undefined && { groundingMetadata: response.groundingMetadata }),
                                    isFinal: true,
                                    status: 'complete'
                                }
                                : item
                        ));

                        if (sessionId) {
                            await persistMessageToServer(sessionId, 'model', response.text, new Date());
                        }
                        return;
                    }
                }

                // If orchestrator returned an error payload, fall back to standard chat
                if (agentResponse.metadata?.error && standardChatRef.current) {
                    console.warn('Agent returned error metadata, using StandardChat fallback:', agentResponse.metadata.error);
                    setBackendStatus({
                        mode: 'fallback',
                        message: `Agent error: ${String(agentResponse.metadata.error)}`,
                        severity: 'warn'
                    });

                    const response = await standardChatRef.current.sendMessage(currentHistory, text, file, route.id);
                    setTranscript(prev => prev.map(item =>
                        item.id === loadingId.toString()
                            ? {
                                ...item,
                                text: response.text,
                                ...(response.reasoning !== undefined && { reasoning: response.reasoning }),
                                ...(response.groundingMetadata !== undefined && { groundingMetadata: response.groundingMetadata }),
                                isFinal: true,
                                status: 'complete'
                            }
                            : item
                    ));

                    if (sessionId) {
                        await persistMessageToServer(sessionId, 'model', response.text, new Date());
                    }
                    return;
                }

                // Handle Agent Response
                const responseText = agentResponse.output || '';

                // If agent returned empty output, fallback to standard chat
                if (!responseText || responseText.trim() === '') {
                    console.warn('[App] Agent returned empty output, falling back to StandardChat');
                    setBackendStatus({
                        mode: 'fallback',
                        message: 'Agent returned empty response, using StandardChat fallback',
                        severity: 'warn'
                    });
                    if (standardChatRef.current) {
                        const unifiedSnapshotForFallback = unifiedContext.getSnapshot();
                        if (unifiedSnapshotForFallback.location) {
                            standardChatRef.current.setLocation(unifiedSnapshotForFallback.location);
                        }
                        if (unifiedSnapshotForFallback.researchContext) {
                            standardChatRef.current.setResearchContext(unifiedSnapshotForFallback.researchContext);
                        }

                        const response = await standardChatRef.current.sendMessage(currentHistory, text, file, route.id);
                        setTranscript(prev => prev.map(item =>
                            item.id === loadingId.toString()
                                ? {
                                    ...item,
                                    text: response.text,
                                    ...(response.reasoning !== undefined && { reasoning: response.reasoning }),
                                    ...(response.groundingMetadata !== undefined && { groundingMetadata: response.groundingMetadata }),
                                    isFinal: true,
                                    status: 'complete'
                                }
                                : item
                        ));

                        if (sessionId) {
                            await persistMessageToServer(sessionId, 'model', response.text, new Date());
                        }
                        return;
                    }
                }

                setBackendStatus({
                    mode: 'agents',
                    message: `Agent response: ${agentResponse.agent || 'Orchestrator'}${agentResponse.metadata?.stage ? ` · Stage ${agentResponse.metadata.stage}` : ''}`,
                    severity: 'info'
                });

                // Update conversation flow and intelligence context
                if (agentResponse.metadata?.conversationFlow) {
                    conversationFlowRef.current = agentResponse.metadata.conversationFlow;
                    unifiedContext.setConversationFlow(agentResponse.metadata.conversationFlow);
                }
                if (agentResponse.metadata?.intelligenceContext) {
                    intelligenceContextRef.current = agentResponse.metadata.intelligenceContext;
                    unifiedContext.setIntelligenceContext(agentResponse.metadata.intelligenceContext);
                }

                // Trigger agent-specific animation
                if (agentResponse.agent) {
                    const agentShape = resolveAgentShape(agentResponse.agent, agentResponse.metadata?.stage);
                    semanticShapeRef.current = agentShape;
                    setVisualState(prev => ({ ...prev, shape: agentShape }));
                } else if (agentResponse.metadata?.stage) {
                    const stageShape = resolveAgentShape(null, agentResponse.metadata.stage);
                    semanticShapeRef.current = stageShape;
                    setVisualState(prev => ({ ...prev, shape: stageShape }));
                }

                // Always include research citations if available (user asked about sources)
                const researchCitations = researchResultRef.current?.citations;
                logger.debug('[App] Research citations available:', { count: researchCitations?.length || 0, citations: researchCitations });
                
                // Build grounding metadata with citations
                let enhancedGroundingMetadata: GroundingMetadata | undefined = agentResponse.metadata?.groundingMetadata as GroundingMetadata | undefined;
                
                // Add research citations to grounding metadata if they exist
                if (researchCitations && researchCitations.length > 0) {
                    // Convert research citations to grounding chunks format for display
                    const citationChunks = researchCitations.map(cite => ({
                        web: {
                            uri: cite.uri,
                            title: cite.title || cite.uri,
                            ...(cite.description && { snippet: cite.description })
                        }
                    }));
                    
                    logger.debug('[App] Adding citations to grounding metadata:', { count: citationChunks.length });
                    
                    enhancedGroundingMetadata = {
                        groundingChunks: [
                            ...(enhancedGroundingMetadata?.groundingChunks || []),
                            ...citationChunks
                        ],
                        ...(enhancedGroundingMetadata?.webSearchQueries && { webSearchQueries: enhancedGroundingMetadata.webSearchQueries }),
                        ...(enhancedGroundingMetadata?.searchEntryPoint && { searchEntryPoint: enhancedGroundingMetadata.searchEntryPoint })
                    };
                }
                
                logger.debug('[App] Final grounding metadata:', {
                    hasMetadata: !!enhancedGroundingMetadata,
                    chunksCount: enhancedGroundingMetadata?.groundingChunks?.length || 0,
                    chunks: enhancedGroundingMetadata?.groundingChunks
                });
                
                setTranscript(prev => prev.map(item =>
                    item.id === loadingId.toString()
                        ? {
                            ...item,
                            text: responseText,
                            ...(agentResponse.metadata?.reasoning && typeof agentResponse.metadata.reasoning === 'string' ? { reasoning: agentResponse.metadata.reasoning } : {}),
                            // Always set groundingMetadata if we have citations, even if empty structure
                            ...(enhancedGroundingMetadata ? { 
                                groundingMetadata: {
                                    groundingChunks: enhancedGroundingMetadata.groundingChunks || [],
                                    ...(enhancedGroundingMetadata.webSearchQueries && { webSearchQueries: enhancedGroundingMetadata.webSearchQueries }),
                                    ...(enhancedGroundingMetadata.searchEntryPoint && { searchEntryPoint: enhancedGroundingMetadata.searchEntryPoint })
                                } as GroundingMetadata
                            } : {}),
                            isFinal: true,
                            status: 'complete'
                        }
                        : item
                ));

                // Persist model response
                if (sessionId) {
                    await persistMessageToServer(sessionId, 'model', responseText, new Date());
                }

                if (agentResponse.metadata?.tools && Array.isArray(agentResponse.metadata.tools)) {
                    const toolResults = await handleToolCall(agentResponse.metadata.tools);
                    // Tool results are handled, visual state should already be updated
                    // But ensure agent shape persists if tool doesn't override it
                    if (agentResponse.agent && !toolResults.some((r: any) => r.name === 'update_dashboard')) {
                        // Keep agent shape if no dashboard update tool was called
                        const agentShape = resolveAgentShape(agentResponse.agent, agentResponse.metadata?.stage as string | undefined);
                        semanticShapeRef.current = agentShape;
                        setVisualState(prev => ({ ...prev, shape: agentShape }));
                    }
                }

                const modelIntent = detectVisualIntent(responseText);

                if (!Array.isArray(agentResponse.metadata?.tools) || !agentResponse.metadata.tools.length) {
                    if (modelIntent) {
                        semanticShapeRef.current = modelIntent;
                    } else {
                        if (semanticShapeRef.current === 'scanner' && (responseText.includes('report') || responseText.includes('summary'))) {
                            // Keep scanner active
                        } else if (!agentResponse.agent) {
                            semanticShapeRef.current = 'wave';
                        }
                    }
                }

                // Calculate metadata for visualizations
                const citationCount = enhancedGroundingMetadata?.groundingChunks?.length || 0;
                const sourceCount = citationCount; // Same as citations for now
                const researchActive = !!(enhancedGroundingMetadata?.webSearchQueries && enhancedGroundingMetadata.webSearchQueries.length > 0);
                
                // Calculate reasoning complexity (0.0 to 1.0)
                let reasoningComplexity = 0;
                if (agentResponse.metadata?.reasoning) {
                    const reasoningLength = typeof agentResponse.metadata.reasoning === 'string' 
                        ? agentResponse.metadata.reasoning.length 
                        : 0;
                    // Normalize: 0-500 chars = 0.0-0.5, 500-2000 = 0.5-0.9, 2000+ = 0.9-1.0
                    if (reasoningLength < 500) {
                        reasoningComplexity = (reasoningLength / 500) * 0.5;
                    } else if (reasoningLength < 2000) {
                        reasoningComplexity = 0.5 + ((reasoningLength - 500) / 1500) * 0.4;
                    } else {
                        reasoningComplexity = Math.min(0.9 + ((reasoningLength - 2000) / 1000) * 0.1, 1.0);
                    }
                }

                // Switch to research mode shape if research is active
                if (researchActive && semanticShapeRef.current !== 'scanner') {
                    semanticShapeRef.current = 'scanner'; // Use scanner as research mode
                }

                setVisualState(prev => ({
                    ...prev,
                    // isActive stays false for text chat (only true for voice)
                    shape: semanticShapeRef.current,
                    ...(textContentRef.current !== undefined && { textContent: textContentRef.current }),
                    ...(weatherDataRef.current !== undefined && { weatherData: weatherDataRef.current }),
                    ...(chartDataRef.current !== undefined && { chartData: chartDataRef.current }),
                    ...(mapDataRef.current !== undefined && { mapData: mapDataRef.current }),
                    // Metadata visualizations
                    ...(citationCount > 0 && { citationCount }),
                    ...(sourceCount > 0 && { sourceCount }),
                    ...(researchActive && { researchActive }),
                    ...(reasoningComplexity > 0 && { reasoningComplexity })
                }));

            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error("Chat failed", error);
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    setBackendStatus({
                        mode: 'fallback',
                        message: `Chat failed: ${errorMsg}`,
                        severity: 'error'
                    });
                    
                    // Show appropriate error message based on error type
                    if (errorMsg.includes('API key') || errorMsg.includes('authentication') || errorMsg.includes('401') || errorMsg.includes('403')) {
                        showToast("API Key authentication failed. Please check your API key configuration.", 'error');
                        setTranscript(prev => prev.map(item =>
                            !item.isFinal ? {
                                ...item,
                                text: "I need a valid API key to function. Please configure your Gemini API key in the Admin Dashboard or set GEMINI_API_KEY in your Vercel environment variables.",
                                isFinal: true,
                                status: 'complete'
                            } : item
                        ));
                    } else {
                        showToast("Network error. Please check your connection and try again.", 'error');
                        setTranscript(prev => prev.map(item =>
                            !item.isFinal ? {
                                ...item,
                                text: "I encountered a network error. Please check your connection and try again.",
                                isFinal: true,
                                status: 'complete'
                            } : item
                        ));
                    }
                }
            } finally {
                abortControllerRef.current = null;
            }
        }
    }, [connectionState, handleToolCall, sessionId, detectVisualIntent, persistMessageToServer, performResearch, smartRouteModel, showToast]);

    const handleSendVideoFrame = useCallback((base64: string) => {
        // Store latest frame for chat mode (agents) - will be attached to next message
        // This ensures AI can see webcam in both voice and chat modes
        latestWebcamFrameRef.current = base64;

        // Send video frames to Live API when connected (for real-time multimodal conversation)
        if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
            try {
                liveServiceRef.current.sendRealtimeMedia({ mimeType: 'image/jpeg', data: base64 });
                logger.debug('[App] Webcam frame sent to Live API', { size: base64.length });
            } catch (err) {
                console.error('[App] Failed to send webcam frame to Live API:', err);
            }
        } else if (isWebcamActive && connectionState === LiveConnectionState.DISCONNECTED) {
            // If webcam is active but Live API not connected, try to connect
            logger.debug('[App] Webcam active but Live API disconnected, attempting connection');
            void handleConnect();
        }
    }, [connectionState, isWebcamActive]);

    // Clear stale webcam frames when webcam is disabled
    useEffect(() => {
        if (!isWebcamActive) {
            latestWebcamFrameRef.current = null;
        }
    }, [isWebcamActive]);

    const handleLocalAction = useCallback(async (text: string, action: 'rewrite' | 'proofread') => {
        try {
            const currentContext = researchResultRef.current || undefined;

            if (localAiCaps.hasModel || localAiCaps.hasRewriter) {
                let result = "";
                if (action === 'rewrite') {
                    result = await chromeAiRef.current.rewrite(text, 'more-formal', currentContext);
                } else if (action === 'proofread') {
                    result = await chromeAiRef.current.proofread(text);
                }
                if (result) return result;
            }
            if (standardChatRef.current) {
                logger.debug("Local AI unavailable, using Cloud Fallback (Flash Lite) for edit.");
                return await standardChatRef.current.performQuickAction(text, action);
            }
            return text;
        } catch (e) {
            console.error("Edit action failed", e);
            return text;
        }
    }, [localAiCaps]);

    const backendLabel = backendStatus.mode === 'agents'
        ? 'Agents'
        : backendStatus.mode === 'fallback'
            ? 'Fallback'
            : backendStatus.mode === 'voice'
                ? 'Voice'
                : 'Idle';

    const backendPillClass = backendStatus.severity === 'error'
        ? 'bg-rose-500/10 border-rose-400/40 text-rose-100'
        : backendStatus.severity === 'warn'
            ? 'bg-amber-500/10 border-amber-400/40 text-amber-100'
            : isDarkMode
                ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-100'
                : 'bg-emerald-100 border-emerald-200 text-emerald-800';

    return (
        <div className={`relative w-full h-[100dvh] bg-transparent overflow-hidden font-sans selection:bg-black/10 transition-colors duration-500`}>
            <BrowserCompatibility isDarkMode={isDarkMode} />
            <AntigravityCanvas visualState={visualState} isDarkMode={isDarkMode} />

            {/* LEAD CAPTURE MODAL */}
            {showTerms && (
                <TermsOverlay
                    onComplete={(name, email, companyUrl, permissions) => { void handleTermsComplete(name, email, companyUrl, permissions) }}
                    onCancel={() => setShowTerms(false)}
                    isDarkMode={isDarkMode}
                />
            )}

            {/* ADMIN DASHBOARD */}
            {view === 'admin' && (
                <AdminDashboard
                    onClose={() => setViewAndNavigate('landing')}
                    researchService={researchServiceRef.current}
                    isDarkMode={isDarkMode}
                />
            )}

            {/* VIEW 1: LANDING PAGE */}
            {view === 'landing' && (
                <LandingPage
                    onStartChat={handleStartChatRequest}
                    onSectionChange={(shape) => {
                        if (visualState.shape !== shape) {
                            setVisualState(prev => ({ ...prev, shape }));
                            semanticShapeRef.current = shape;
                        }
                    }}
                    isDarkMode={isDarkMode}
                    onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                    onAdminAccess={() => setViewAndNavigate('admin')}
                />
            )}

            {/* VIEW 2: CHAT INTERFACE */}
            {view === 'chat' && (
                <>
                    {/* Floating Webcam */}
                    {isWebcamActive && (
                        <div className={`fixed z-50 transition-all duration-500 ease-in-out ${'top-16 right-4 w-28 md:top-auto md:bottom-32 md:right-8 md:w-64'
                            }`}>
                            <WebcamPreview
                                isWebcamActive={isWebcamActive}
                                facingMode={facingMode}
                                onFacingModeToggle={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                                onClose={() => setIsWebcamActive(false)}
                                onSendFrame={handleSendVideoFrame}
                                className="rounded-2xl shadow-2xl border border-white/20"
                            />
                        </div>
                    )}

                    {/* Floating Screen Share Preview */}
                    {(screenShare.isActive || screenShare.isInitializing) && (
                        <div className={`fixed z-50 transition-all duration-500 ease-in-out ${
                            isWebcamActive 
                                ? 'top-16 left-4 w-40 md:top-auto md:bottom-32 md:left-8 md:w-72' 
                                : 'top-16 right-4 w-40 md:top-auto md:bottom-32 md:right-8 md:w-72'
                        }`}>
                            <ScreenSharePreview
                                isScreenShareActive={screenShare.isActive}
                                isInitializing={screenShare.isInitializing}
                                stream={screenShare.stream}
                                error={screenShare.error}
                                onToggle={() => void screenShare.toggleScreenShare()}
                                onCapture={() => void screenShare.captureFrame()}
                                className="rounded-2xl shadow-2xl border border-purple-500/20"
                            />
                        </div>
                    )}

                    <div className="relative z-10 w-full h-full flex flex-col pointer-events-none">
                        {/* HEADER */}
                        <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex flex-row justify-between items-center z-50 pointer-events-auto gap-2 md:gap-0">
                            <div className="flex items-center gap-3">
                                {/* Back to Home Button */}
                                <button
                                    type="button"
                                    onClick={() => setViewAndNavigate('landing')}
                                    className="mr-2 p-2 rounded-full hover:bg-white/20 transition-colors group/home"
                                    title="Back to Home"
                                >
                                    <span className={`font-bold tracking-tighter text-lg transition-colors ${isDarkMode ? 'text-white group-hover/home:text-orange-400' : 'text-black group-hover/home:text-orange-700'}`}>F.B/c</span>
                                </button>

                                {/* Single System Status Pill */}
                                <div className="relative group">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-full border shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-white/30 border-white/30 hover:bg-white/50'}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${activeRoute.color} ${connectionState === LiveConnectionState.CONNECTED ? 'animate-pulse' : ''}`} />
                                        <span className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                                            {activeRoute.label}
                                        </span>
                                    </div>
                                    {/* Contextual Tooltip */}
                                    <div className={`absolute top-full mt-2 left-0 w-56 p-3 backdrop-blur-md rounded-lg border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0 duration-200 ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                                        <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                            {activeRoute.description}
                                        </p>
                                        <div className={`mt-1.5 pt-1.5 border-t flex items-center gap-1.5 ${isDarkMode ? 'border-white/10' : 'border-black/5'}`}>
                                            <span className="text-[9px] uppercase tracking-wider text-gray-400">Routing Engine</span>
                                            <span className={`w-1 h-1 rounded-full ${activeRoute.color}`}></span>
                                        </div>
                                    </div>
                                </div>

                                {/* Backend Route Status */}
                                <div className="relative group">
                                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${backendPillClass}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${backendStatus.severity === 'error' ? 'bg-rose-400' : backendStatus.severity === 'warn' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                                        <span className="text-[10px] font-mono font-medium tracking-[0.2em] uppercase">{backendLabel}</span>
                                    </div>
                                    <div className={`absolute top-full mt-2 left-0 w-72 p-3 backdrop-blur-md rounded-lg border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0 duration-200 ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                                        <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                            {backendStatus.message}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {!isChatVisible && (
                                <div className="animate-fade-in-up">
                                    <button
                                        type="button"
                                        onClick={() => setIsChatVisible(true)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
                                    >
                                        <span className="text-xs font-bold uppercase tracking-wider">Open Chat</span>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Chat icon"><title>Chat</title><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></svg>
                                    </button>
                                </div>
                            )}
                        </header>

                        <div className="flex-1 flex items-center justify-center">
                            {connectionState !== LiveConnectionState.CONNECTED && transcript.length === 0 && (
                                <div className="text-center space-y-2 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                    <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full backdrop-blur-sm border shadow-sm ${isDarkMode ? 'bg-white/10 border-white/10' : 'bg-white/40 border-white/40'}`}>
                                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                                            {userProfile ? `Welcome, ${userProfile.name.split(' ')[0]}` : 'Ready to Chat'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <MultimodalChat
                            items={transcript}
                            connectionState={connectionState}
                            onSendMessage={(...args) => void handleSendMessage(...args)}
                            onSendVideoFrame={(...args) => void handleSendVideoFrame(...args)}
                            onConnect={() => void handleConnect()}
                            onDisconnect={() => void handleDisconnect()}
                            isWebcamActive={isWebcamActive}
                            onWebcamChange={setIsWebcamActive}
                            localAiAvailable={localAiCaps.hasModel || !!process.env.API_KEY}
                            onLocalAction={handleLocalAction}
                            onStopGeneration={handleStopGeneration}
                            visible={isChatVisible}
                            onToggleVisibility={setIsChatVisible}
                            isDarkMode={isDarkMode}
                            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                            onGeneratePDF={() => {
                                void generatePDF({
                                    transcript,
                                    userProfile,
                                    researchContext: researchResultRef.current
                                });
                            }}
                            onEmailPDF={async () => {
                                if (!userProfile?.email) {
                                    alert('No email address available. Please provide your email first.');
                                    return;
                                }
                                try {
                                    // Generate PDF data URL
                                    const pdfDataUrl = generatePDF({
                                        transcript,
                                        userProfile,
                                        researchContext: researchResultRef.current
                                    });
                                    // Send via API
                                    const response = await fetch('/api/send-pdf-summary', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            email: userProfile.email,
                                            name: userProfile.name,
                                            pdfData: pdfDataUrl,
                                            sessionId
                                        })
                                    });
                                    if (response.ok) {
                                        alert(`PDF sent to ${userProfile.email}`);
                                    } else {
                                        const error = await response.json();
                                        alert(`Failed to send email: ${error.message || 'Unknown error'}`);
                                    }
                                } catch (err) {
                                    console.error('Failed to send PDF email:', err);
                                    alert('Failed to send email. Please try downloading the PDF instead.');
                                }
                            }}
                            userEmail={userProfile?.email}
                            userName={userProfile?.name}
                            isScreenShareActive={screenShare.isActive}
                            isScreenShareInitializing={screenShare.isInitializing}
                            onScreenShareToggle={() => void screenShare.toggleScreenShare()}
                            isLocationShared={!!locationData}
                        />

                    </div>
                </>
            )}
        </div>
    );
};
