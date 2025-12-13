import React, { useState, useEffect, useRef, useCallback } from 'react';
import AntigravityCanvas from './components/AntigravityCanvas';
import MultimodalChat from './components/MultimodalChat';
import { buildContextSources } from './components/chat/ContextSources';
import { BrowserCompatibility } from './components/BrowserCompatibility';
import LandingPage from './components/LandingPage';
import { useScreenShare } from 'src/hooks/media/useScreenShare';
import TermsOverlay from './components/TermsOverlay';
import AdminDashboard from './components/AdminDashboard';
import { unifiedContext } from './services/unifiedContext';
import { LiveConnectionState, TranscriptItem, VisualShape } from './types';
import { GEMINI_MODELS } from "src/config/constants";
import { logger } from 'src/lib/logger-client';
import { useToast } from './context/ToastContext';
import { useTheme } from './context/ThemeContext';
import { AIBrainService, type AgentResponse } from './services/aiBrainService';
import { GeminiLiveService } from './services/geminiLiveService';
import { ResearchResult } from './types';

// Logic & Hooks
import { ModelRoute } from 'src/logic/smartRouting';
import { detectVisualIntent, resolveAgentShape } from 'src/logic/visualIntent';
import { useAppRouting } from 'src/hooks/ui/useAppRouting';
import { useVisualState } from 'src/hooks/ui/useVisualState';
import { useServiceRegistry } from 'src/hooks/core/useServiceRegistry';
import { useChatSession } from 'src/hooks/core/useChatSession';
import { useGeminiLive } from 'src/hooks/media/useGeminiLive';
import { useLeadResearch } from 'src/hooks/business/useLeadResearch';
import { ChromeAiService, ChromeAiCapabilities } from './services/chromeAiService';
import { generatePDF } from './utils/pdfUtils';
import { 
  buildDiscoveryReportFromClient, 
  generateDiscoveryReportHTMLClient, 
  createDiscoveryReportTranscriptItem 
} from './utils/discoveryReportUtils';

/**
 * Calculate reasoning complexity score (0.0-1.0) based on reasoning string
 */
function calculateReasoningComplexity(reasoning?: string): number {
    if (!reasoning) return 0;
    
    const length = reasoning.length;
    const hasSteps = /step\s*\d+|step\s*[ivx]+/i.test(reasoning);
    const hasAnalysis = /\b(analyze|consider|evaluate|assess|examine|investigate)\b/i.test(reasoning);
    const hasChain = /\b(therefore|thus|consequently|hence|because|since)\b/i.test(reasoning);
    const hasMultipleQuestions = (reasoning.match(/\?/g) || []).length > 1;
    
    // Base complexity from length (normalize to 0-0.6)
    let complexity = Math.min(length / 2000, 0.6);
    
    // Add complexity for structure indicators
    if (hasSteps) complexity += 0.15;
    if (hasAnalysis) complexity += 0.1;
    if (hasChain) complexity += 0.1;
    if (hasMultipleQuestions) complexity += 0.05;
    
    return Math.min(complexity, 1.0);
}

function isLiveRealtimeMediaMime(mimeType?: string): boolean {
    if (!mimeType) return false;
    if (mimeType.startsWith('image/')) return true;
    if (mimeType.startsWith('audio/')) return true;
    if (mimeType.startsWith('video/')) return true;
    // Common audio mime patterns used by Gemini Live
    if (mimeType.includes('pcm') || mimeType.includes('rate=')) return true;
    return false;
}

export const App: React.FC = () => {
    const { showToast } = useToast();
    
    // 1. Routing & View State
    const { view, setView } = useAppRouting();

    // 2. Session & Service Registry
    const [sessionId] = useState<string>(() => unifiedContext.getSnapshot().sessionId || `session-${Date.now()}`);
    const { researchServiceRef, aiBrainRef } = useServiceRegistry(sessionId);

    // 3. Shared Refs for Dependency Injection
    const liveServiceRef = useRef<GeminiLiveService | null>(null);
    const researchResultRef = useRef<ResearchResult | null>(null);
    const intelligenceContextRef = useRef<any>({});
    const transcriptRef = useRef<TranscriptItem[]>([]);
    const latestWebcamFrameRef = useRef<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const conversationFlowRef = useRef<any>(null); // Added missing ref

    // 4. UI State
    const [isChatVisible, setIsChatVisible] = useState(true);
    const { isDarkMode, toggleTheme } = useTheme();
    
    // Add state to track chat width
    const [chatWidth, setChatWidth] = useState(450);
    
    // Glass Box UI: Active tools and reasoning state
    const [activeTools, setActiveTools] = useState<Array<{
        id: string;
        name: string;
        status: 'pending' | 'running' | 'complete' | 'error';
        startTime: number;
        endTime?: number;
        input?: Record<string, unknown>;
        output?: unknown;
        error?: string;
    }>>([]);
    const [currentReasoning, setCurrentReasoning] = useState<string>('');
    const currentReasoningRef = useRef<string>('');
    
    // Keep ref in sync with state
    useEffect(() => {
        currentReasoningRef.current = currentReasoning;
    }, [currentReasoning]);

    const [activeRoute, setActiveRoute] = useState<ModelRoute>({
        id: GEMINI_MODELS.DEFAULT_CHAT,
        label: 'READY',
        description: 'System initialized. Waiting for input.',
        color: 'bg-gray-400'
    });
    const chromeAiRef = useRef<ChromeAiService>(new ChromeAiService());

    // Webcam State
    const [isWebcamActive, setIsWebcamActive] = useState(false);
    const isWebcamActiveRef = useRef(isWebcamActive);
    useEffect(() => { isWebcamActiveRef.current = isWebcamActive; }, [isWebcamActive]);

    // 5. Visual State Hook
    const { 
        visualState, 
        setVisualState, 
        semanticShapeRef,
        handleVolumeChange,
        mapDataRef,
        weatherDataRef,
        chartDataRef,
        textContentRef
    } = useVisualState({ 
        transcript: transcriptRef.current, // Initial read, logic inside hook uses effect on transcript prop
        activeRoute, 
        isWebcamActiveRef 
    });

    // 6. Tool Call Handler
    const handleToolCall = useCallback(async (functionCalls: any[]) => {
        const results = [];
        const serverCalls = [];
        let detectedAgent: string | null = null;

        for (const call of functionCalls) {
            if (call.name === 'update_dashboard') {
                logger.debug('[App] Tool call: update_dashboard', call.args);
                const { shape, text, data } = call.args;
                
                if (shape) {
                    const newShape = shape as VisualShape;
                    semanticShapeRef.current = newShape;
                    
                    if (text) textContentRef.current = text;
                    if (data?.condition || data?.temperature) weatherDataRef.current = data;
                    if (data?.stockValue || data?.stockTrend) chartDataRef.current = data;
                    if (data?.locationTitle || data?.latitude) mapDataRef.current = data;
                    
                    setVisualState(prev => ({
                        ...prev,
                        shape: newShape,
                        ...(text && { textContent: text }),
                        ...(data?.condition && { weatherData: data }),
                        ...(data?.stockValue && { chartData: data }),
                        ...(data?.locationTitle && { mapData: data })
                    }));
                    
                    results.push({
                        id: call.id,
                        name: call.name,
                        result: { success: true, message: `Dashboard updated to ${shape}` }
                    });
                }
            } else if (call.name === 'switch_agent') {
                detectedAgent = call.args.agentName;
                serverCalls.push(call);
            } else {
                serverCalls.push(call);
            }
        }

        if (detectedAgent) {
            const agentShape = resolveAgentShape(detectedAgent, null);
            semanticShapeRef.current = agentShape;
            setVisualState(prev => ({ ...prev, shape: agentShape }));
        }

        return results;
    }, [setVisualState, semanticShapeRef, textContentRef, weatherDataRef, chartDataRef, mapDataRef]);

    // 7. Chat Session Hook (MUST be before useGeminiLive for transcript access)
    const { 
        transcript, 
        setTranscript, 
        backendStatus,
        setBackendStatus,
        persistMessageToServer 
    } = useChatSession({ connectionState: LiveConnectionState.DISCONNECTED }); // Initial state, will be updated

    // Sync transcriptRef
    useEffect(() => { transcriptRef.current = transcript; }, [transcript]);

    // 7b. Transcript Update Handler (defined BEFORE useGeminiLive needs it)
    const handleTranscriptUpdateRef = useRef<(text: string, isUser: boolean, isFinal: boolean, groundingMetadata?: any, agentMetadata?: any) => void>();
    
    const handleTranscriptUpdate = useCallback((text: string, isUser: boolean, isFinal: boolean, groundingMetadata?: any, agentMetadata?: any) => {
        if (isFinal) {
            if (agentMetadata?.agent || agentMetadata?.stage) {
                const agentShape = resolveAgentShape(agentMetadata.agent, agentMetadata.stage);
                semanticShapeRef.current = agentShape;
                setVisualState(prev => ({ ...prev, shape: agentShape }));
            }
            const detected = detectVisualIntent(text);
            if (detected && detected.shape) {
                semanticShapeRef.current = detected.shape;
            }
             if (groundingMetadata?.groundingChunks?.some((c:any) => c.maps)) {
                 const mapChunk = groundingMetadata.groundingChunks.find((c:any) => c.maps);
                 if (mapChunk?.maps?.title) {
                     semanticShapeRef.current = 'map';
                 }
            }
        }
        
        // Calculate source count from grounding metadata
        const currentSourceCount = groundingMetadata?.groundingChunks?.length || 0;
        
        // Aggregate from all transcript items for cumulative count
        const allSources = new Set<string>();
        transcriptRef.current.forEach(item => {
            item.groundingMetadata?.groundingChunks?.forEach(chunk => {
                const uri = chunk.web?.uri || chunk.maps?.uri;
                if (uri) allSources.add(uri);
            });
        });
        const cumulativeSourceCount = allSources.size;
        
        // Use cumulative count if available, otherwise current
        const sourceCount = cumulativeSourceCount > 0 ? cumulativeSourceCount : currentSourceCount;
        
        if (sourceCount > 0) {
            setVisualState(prev => ({ ...prev, sourceCount }));
        }
        
        // Calculate reasoning complexity from agent metadata or transcript item
        const latestItem = transcriptRef.current[transcriptRef.current.length - 1];
        const reasoning = agentMetadata?.reasoning || latestItem?.reasoning;
        
        if (reasoning) {
            const reasoningComplexity = calculateReasoningComplexity(reasoning);
            if (reasoningComplexity > 0) {
                setVisualState(prev => ({ 
                    ...prev, 
                    reasoningComplexity 
                }));
            }
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
                    status: isFinal ? 'complete' : 'streaming',
                    ...(groundingMetadata && { groundingMetadata })
                }];
            }
        });
    }, [setTranscript, setVisualState, semanticShapeRef]);

    // Keep ref updated for stable callback
    useEffect(() => {
        handleTranscriptUpdateRef.current = handleTranscriptUpdate;
    }, [handleTranscriptUpdate]);

    // Voice ↔ Agents unification
    const handleSendMessageRef = useRef<
        ((text: string, file?: { mimeType: string; data: string; type?: string; url?: string; name?: string }, opts?: any) => Promise<void>) | null
    >(null);
    const lastVoiceAgentTurnRef = useRef<{ text: string; at: number } | null>(null);
    const lastSendRef = useRef<{ key: string; at: number } | null>(null);
    const inFlightSendKeysRef = useRef<Set<string>>(new Set());

    const buildVoiceHistoryOverride = useCallback((finalText: string): TranscriptItem[] => {
        const now = new Date();
        const cleaned = (finalText || '').trim();
        const history = [...(transcriptRef.current || [])];
        const last = history[history.length - 1];

        if (last && last.role === 'user') {
            // If we have an in-progress user transcript, finalize it.
            if (!last.isFinal) {
                history[history.length - 1] = {
                    ...last,
                    text: cleaned || last.text,
                    isFinal: true,
                    status: 'complete',
                    timestamp: last.timestamp || now
                };
                return history;
            }
            // If last user message already matches, reuse.
            if ((last.text || '').trim() === cleaned) {
                return history;
            }
        }

        // Otherwise, append a synthetic final user message for the agent turn.
        if (cleaned) {
            history.push({
                id: `voice-${Date.now()}`,
                role: 'user',
                text: cleaned,
                timestamp: now,
                isFinal: true,
                status: 'complete'
            });
        }

        return history;
    }, []);

    // 8. Gemini Live Service Hook (now uses the pre-defined handleTranscriptUpdate)
    const { 
        connectionState, 
        handleConnect, 
        handleDisconnect, 
        handleSendRealtimeInput, 
        handleSendContextUpdate 
    } = useGeminiLive({
        sessionId,
        userProfile: null,
        researchResultRef,
        transcriptRef,
        unifiedContext,
        isWebcamActive,
        setActiveRoute,
        setIsChatVisible,
        setVisualState,
        handleVolumeChange,
        handleTranscript: (text, isUser, isFinal, grounding, agent) => {
             logger.debug('[App] handleTranscript called', { text: text?.substring(0, 50), isUser, isFinal, hasRef: !!handleTranscriptUpdateRef.current });
             const agentsForVoice = connectionState === LiveConnectionState.CONNECTED;

             // When using agents for voice responses, ignore Live-model output transcripts.
             if (agentsForVoice && !isUser) return;

             // Use ref to always get latest function
             if (handleTranscriptUpdateRef.current) {
                 handleTranscriptUpdateRef.current(text, isUser, isFinal, grounding, agent);
             } else {
                 logger.warn('[App] handleTranscriptUpdateRef.current is null!');
             }

             // Route final user voice transcripts to the agent orchestrator.
             if (agentsForVoice && isUser && isFinal) {
                 const cleaned = (text || '').trim();
                 if (!cleaned) return;

                 const now = Date.now();
                 const last = lastVoiceAgentTurnRef.current;
                 if (last && last.text === cleaned && now - last.at < 1500) return;
                 lastVoiceAgentTurnRef.current = { text: cleaned, at: now };

                 const historyOverride = buildVoiceHistoryOverride(cleaned);
                 void handleSendMessageRef.current?.(cleaned, undefined as any, {
                     skipUserAppend: true,
                     historyOverride,
                     timestampOverride: new Date(),
                     skipResearch: true
                 });
             }
        },
        handleToolCall,
        intelligenceContextRef,
        liveServiceRef
    });

    // Mute Live-model audio output when routing voice through agents + TTS.
    useEffect(() => {
        const agentsForVoice = connectionState === LiveConnectionState.CONNECTED;
        liveServiceRef.current?.setOutputMuted?.(agentsForVoice);
        if (!agentsForVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
    }, [connectionState, liveServiceRef]);

    // 9. Lead Research Hook
    const { 
        userProfile, 
        showTerms, 
        setShowTerms, 
        handleTermsComplete,
        handleStartChatRequest,
        performResearch,
        isResearching
    } = useLeadResearch({
        services: { researchServiceRef, liveServiceRef },
        setTranscript,
        setIsWebcamActive,
        connectionState,
        onVoiceConnect: handleConnect,
        setView,
        researchResultRef,
        intelligenceContextRef
    });

    // Sync research state to visual state
    useEffect(() => {
        setVisualState(prev => ({ 
            ...prev, 
            researchActive: isResearching 
        }));
    }, [isResearching, setVisualState]);

    // Per-turn thinking state (separate from lead research)
    const [isThinking, setIsThinking] = useState(false);
    const toolsForMessageRef = useRef<Array<any>>([]);
    const toolIndexByIdRef = useRef<Record<string, number>>({});

    // Log connection state changes
    useEffect(() => {
        logger.debug('[App] Connection state changed', {
            connectionState,
            hasLiveService: !!liveServiceRef.current,
            isSessionReady: liveServiceRef.current?.getIsSessionReady?.() ?? false,
            connectionId: liveServiceRef.current?.getConnectionId?.() ?? null,
            transcriptLength: transcript.length
        });
    }, [connectionState, transcript.length]);

    // 10. Screen Share Hook
    const screenShare = useScreenShare({
        sessionId,
        enableAutoCapture: true,
        captureInterval: 4000,
        ...(liveServiceRef.current?.getConnectionId && liveServiceRef.current.getConnectionId() 
            ? { voiceConnectionId: liveServiceRef.current.getConnectionId()! } 
            : {}),
        sendRealtimeInput: handleSendRealtimeInput,
        sendContextUpdate: handleSendContextUpdate,
        onAnalysis: (analysis) => logger.debug('[App] Screen share analysis:', { analysis })
    });

    // Location state (for UI indicator)
    const [locationData, setLocationData] = useState<{ latitude: number; longitude: number; city?: string } | null>(null);
    useEffect(() => {
        void unifiedContext.ensureLocation().then(loc => {
            if (loc) setLocationData(loc);
        });
    }, []);

    const speakAgentOutput = useCallback((rawText: string) => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
        const cleaned = (rawText || '')
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
            .replace(/\s+/g, ' ')
            .trim();
        if (!cleaned) return;

        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(cleaned);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        window.speechSynthesis.speak(utterance);
    }, []);

    // 11. Handle Send Message
    const handleSendMessage = useCallback(async (
        text: string,
        file?: { mimeType: string, data: string, type?: string, url?: string, name?: string },
        opts?: { skipUserAppend?: boolean; historyOverride?: TranscriptItem[]; timestampOverride?: Date; skipResearch?: boolean }
    ) => {
        // Guard against accidental double-submits (e.g., Enter + click, or duplicated handlers)
        const dedupeKey = `${(text || '').trim()}|${file?.mimeType || ''}|${file?.data?.length || 0}`;
        const nowMs = Date.now();
        const lastSend = lastSendRef.current;
        if (lastSend && lastSend.key === dedupeKey && nowMs - lastSend.at < 800) {
            logger.warn('[App] Dropping duplicate send', { dedupeKey });
            return;
        }
        lastSendRef.current = { key: dedupeKey, at: nowMs };

        // ... (Logic from previous App.tsx)
        const targetShape = detectVisualIntent(text)?.shape;
        if (targetShape) {
            semanticShapeRef.current = targetShape;
             setVisualState(prev => ({
                ...prev,
                shape: targetShape,
                mode: 'thinking',
                ...(textContentRef.current && { textContent: textContentRef.current }),
                ...(weatherDataRef.current && { weatherData: weatherDataRef.current }),
                ...(chartDataRef.current && { chartData: chartDataRef.current }),
                ...(mapDataRef.current && { mapData: mapDataRef.current })
            }));
        }

        const skipUserAppend = opts?.skipUserAppend === true;
        const userTimestamp = opts?.timestampOverride ?? new Date();

        const isImage = file?.mimeType.startsWith('image/');
        const userItem: TranscriptItem = {
            id: Date.now().toString(),
            role: 'user',
            text: text,
            timestamp: userTimestamp,
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

        if (!skipUserAppend) {
            setTranscript(prev => [...prev, userItem]);
        }

        if (sessionId) {
            await persistMessageToServer(sessionId, 'user', text, userTimestamp, file);
        }

        // Background research should NOT run on every turn.
        // Only trigger when the user explicitly asks for it or provides an email to enrich.
        if (!opts?.skipResearch) {
            const explicitRequest =
                /\b(research|look up|lookup|find out|background check|what did you find|tell me about|who is|enrich)\b/i.test(text);
            const containsEmail =
                /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/.test(text);
            if (explicitRequest || containsEmail) {
                void performResearch(text);
            }
        }

        const shouldUseVoice = connectionState === LiveConnectionState.CONNECTED && liveServiceRef.current;

        // If voice is connected, keep sending realtime media (audio/video/images) through the Live WebSocket.
        // Text chat should still route through the agent orchestrator via AIBrainService so agents remain active.
        if (shouldUseVoice) {
            setBackendStatus({
                mode: 'voice',
                message: file
                    ? (isLiveRealtimeMediaMime(file.mimeType)
                        ? 'Voice connected: media sent via Live WebSocket'
                        : 'Voice connected: file routed to agents (not sent to Live)')
                    : 'Voice connected',
                severity: 'info'
            });
            if (file && isLiveRealtimeMediaMime(file.mimeType)) {
                liveServiceRef.current?.sendRealtimeMedia(file);
            }
        }

        if (aiBrainRef.current) {
            if (inFlightSendKeysRef.current.has(dedupeKey)) {
                logger.warn('[App] Dropping duplicate in-flight send', { dedupeKey });
                return;
            }
            inFlightSendKeysRef.current.add(dedupeKey);

            try {
                abortControllerRef.current = new AbortController();
                setBackendStatus({ mode: 'agents', message: 'Routing via Multi-Agent...', severity: 'info' });

                const loadingId = `assistant-${Date.now()}-${Math.random().toString(16).slice(2)}`;
                // Do not toggle lead-research UI for normal agent turns.
                // isResearching is reserved for background/manual lead research only.
                setIsThinking(true);
                toolsForMessageRef.current = [];
                toolIndexByIdRef.current = {};
                
                // Clear Glass Box UI state for new message
                setActiveTools([]);
                setCurrentReasoning('');
                
                setTranscript(prev => [...prev, {
                    id: loadingId,
                    role: 'model',
                    text: '',
                    timestamp: new Date(),
                    isFinal: false,
                    status: 'streaming'
                }]);

                const baseHistory = opts?.historyOverride ?? transcriptRef.current;
                const currentHistory = skipUserAppend ? baseHistory : [...baseHistory, userItem];
                
                // Context sync
                const location = await unifiedContext.ensureLocation();
                 if (liveServiceRef.current && location) liveServiceRef.current.setLocation(location);

                const unifiedSnapshot = unifiedContext.getSnapshot();
                const mergedIntelligencePayload: any = {
                    ...(unifiedSnapshot.intelligenceContext || {}),
                    ...(intelligenceContextRef.current || {}),
                    ...(location ? { location } : {})
                };
                // Normalize for API validation (requires at least email or name when sending a context object)
                if (!mergedIntelligencePayload.name && mergedIntelligencePayload.person?.fullName) {
                    mergedIntelligencePayload.name = mergedIntelligencePayload.person.fullName;
                }
                const finalIntelligencePayload =
                    (typeof mergedIntelligencePayload.email === 'string' && mergedIntelligencePayload.email.trim()) ||
                    (typeof mergedIntelligencePayload.name === 'string' && mergedIntelligencePayload.name.trim())
                        ? mergedIntelligencePayload
                        : undefined;

                const messages = AIBrainService.transcriptToMessages(currentHistory);
                const lastMsg = messages[messages.length - 1];

                if (file && lastMsg) {
                    const isImage = file.mimeType?.startsWith('image/') || file.type === 'image'
                    // Type assertion: attachments array type only has mimeType/data, but we need type/url/name for UI
                    lastMsg.attachments = [{ 
                        mimeType: file.mimeType, 
                        data: file.data,
                        ...(file.type || isImage ? { type: (file.type || 'image') as 'image' | 'file' } : {}),
                        ...(file.url || file.data ? { url: file.url || `data:${file.mimeType};base64,${file.data}` } : {}),
                        ...(file.name ? { name: file.name } : {})
                    } as any];
                } else if (isWebcamActive && latestWebcamFrameRef.current && lastMsg) {
                     lastMsg.attachments = [{ 
                        mimeType: 'image/jpeg', 
                        data: latestWebcamFrameRef.current,
                        type: 'image',
                        url: `data:image/jpeg;base64,${latestWebcamFrameRef.current}`,
                        name: 'Webcam Frame'
                    } as any];
                }

                // Try streaming first, fallback to non-streaming on error
                let agentResponse: AgentResponse;
                try {
                    agentResponse = await aiBrainRef.current.chatStream(messages, {
                        conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
                        ...(finalIntelligencePayload ? { intelligenceContext: finalIntelligencePayload } : {}),
                        onChunk: (accumulatedText: string) => {
                            // Update transcript with accumulated text as it streams
                            if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
                            
                            // Use ref to get latest reasoning (avoids stale closure)
                            const reasoningSnapshot = currentReasoningRef.current;
                            
                            setTranscript(prev => {
                                const updated = [...prev];
                                const loadingIndex = updated.findIndex(item => item.id === loadingId);
                                
                                if (loadingIndex >= 0 && updated[loadingIndex]) {
                                    const existingItem = updated[loadingIndex];
                                    updated[loadingIndex] = {
                                        id: existingItem.id,
                                        role: existingItem.role,
                                        text: accumulatedText,
                                        timestamp: existingItem.timestamp,
                                        isFinal: false,
                                        status: 'streaming',
                                        ...(existingItem.attachment && { attachment: existingItem.attachment }),
                                        // Include reasoning if we have it from metadata (use latest from ref)
                                        ...(reasoningSnapshot && reasoningSnapshot.trim() && { reasoning: reasoningSnapshot }),
                                        ...(existingItem.processingTime && { processingTime: existingItem.processingTime }),
                                        ...(existingItem.error && { error: existingItem.error }),
                                        ...(existingItem.contextSources && { contextSources: existingItem.contextSources })
                                    };
                                } else {
                                    // If loading item was removed, add it back
                                    const newItem: TranscriptItem = {
                                        id: loadingId,
                                        role: 'model',
                                        text: accumulatedText,
                                        timestamp: new Date(),
                                        isFinal: false,
                                        status: 'streaming',
                                        ...(reasoningSnapshot && reasoningSnapshot.trim() && { reasoning: reasoningSnapshot })
                                    };
                                    updated.push(newItem);
                                }
                                return updated;
                            });
                        },
                        onMetadata: (metadata) => {
                            // Glass Box UI: Handle streaming metadata (tool calls, reasoning, thinking)
                            if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
                            
                            console.log('[App] onMetadata received', { 
                                type: metadata.type, 
                                hasToolCall: !!metadata.toolCall,
                                hasReasoning: !!metadata.reasoning,
                                hasMessage: !!metadata.message,
                                metadata 
                            });
                            
                            // Handle tool calls - check multiple possible structures
                            const toolCall = metadata.toolCall || (metadata.type === 'tool_call' ? metadata : null);
                            if (toolCall && (metadata.type === 'tool_call' || toolCall.name || toolCall.toolCallId)) {
                                const toolName = toolCall.name || toolCall.toolName || 'unknown';
                                const toolId = toolCall.id || toolCall.toolCallId || `tool-${Date.now()}`;
                                const toolArgs = toolCall.args || toolCall.input || {};
                                
                                console.log('[App] Processing tool call', { toolName, toolId, toolArgs });
                                
                                setActiveTools(prev => {
                                    const existing = prev.find(t => t.id === toolId);
                                    if (existing) {
                                        return prev.map(t => 
                                            t.id === toolId 
                                                ? { ...t, status: 'running' as const, input: toolArgs }
                                                : t
                                        );
                                    }
                                    return [...prev, {
                                        id: toolId,
                                        name: toolName,
                                        status: 'running' as const,
                                        startTime: Date.now(),
                                        input: toolArgs
                                    }];
                                });

                                // Track tool call for this message
                                {
                                    const existingIdx = toolIndexByIdRef.current[String(toolId)];
                                    const startedAt = Date.now();
                                    if (typeof existingIdx === 'number' && toolsForMessageRef.current[existingIdx]) {
                                        toolsForMessageRef.current[existingIdx] = {
                                            ...toolsForMessageRef.current[existingIdx],
                                            name: toolName,
                                            type: 'call',
                                            state: 'running',
                                            input: toolArgs,
                                            startedAt: toolsForMessageRef.current[existingIdx].startedAt || startedAt
                                        };
                                    } else {
                                        toolIndexByIdRef.current[String(toolId)] = toolsForMessageRef.current.length;
                                        toolsForMessageRef.current.push({
                                            name: toolName,
                                            type: 'call',
                                            state: 'running',
                                            input: toolArgs,
                                            startedAt
                                        });
                                    }
                                }
                            }
                            
                            // Handle tool results - check multiple possible structures
                            const toolResult = metadata.toolResult || (metadata.type === 'tool_result' ? metadata : null);
                            if (toolResult && (metadata.type === 'tool_result' || toolResult.result !== undefined)) {
                                const resultId = toolResult.id || toolResult.toolCallId || toolResult.toolCall?.id;
                                if (resultId) {
                                    console.log('[App] Processing tool result', { resultId, hasError: !!toolResult.error });
                                    setActiveTools(prev => prev.map(t => 
                                        t.id === resultId 
                                            ? { 
                                                ...t, 
                                                status: toolResult.error ? 'error' as const : 'complete' as const,
                                                endTime: Date.now(),
                                                output: toolResult.result || toolResult.output,
                                                error: toolResult.error
                                            }
                                            : t
                                    ));

                                    // Update matching tool entry for this message
                                    {
                                        const now = Date.now();
                                        const idx = toolIndexByIdRef.current[String(resultId)];
                                        if (typeof idx === 'number' && toolsForMessageRef.current[idx]) {
                                            toolsForMessageRef.current[idx] = {
                                                ...toolsForMessageRef.current[idx],
                                                name:
                                                    toolsForMessageRef.current[idx].name ||
                                                    toolResult.name ||
                                                    toolResult.toolName ||
                                                    toolResult.toolCall?.name ||
                                                    'unknown',
                                                state: toolResult.error ? 'error' : 'complete',
                                                output: toolResult.result || toolResult.output,
                                                error: toolResult.error,
                                                finishedAt: now
                                            };
                                        } else {
                                            toolIndexByIdRef.current[String(resultId)] = toolsForMessageRef.current.length;
                                            toolsForMessageRef.current.push({
                                                name: toolResult.name || toolResult.toolName || toolResult.toolCall?.name || 'unknown',
                                                type: 'result',
                                                state: toolResult.error ? 'error' : 'complete',
                                                output: toolResult.result || toolResult.output,
                                                error: toolResult.error,
                                                finishedAt: now
                                            });
                                        }
                                    }
                                }
                            }
                            
	                            // Handle reasoning - check multiple possible structures
	                            const reasoningText = metadata.reasoning || metadata.delta || metadata.text || '';
	                            if (reasoningText && (metadata.type === 'reasoning' || metadata.type === 'reasoning-delta')) {
                                console.log('[App] Processing reasoning', { length: reasoningText.length });
                                setCurrentReasoning(prev => {
                                    const updated = prev + reasoningText;
                                    currentReasoningRef.current = updated; // Update ref immediately
                                    // Also update transcript item with reasoning in real-time
                                    setTranscript(prevTranscript => {
                                        const updatedTranscript = [...prevTranscript];
                                        const loadingIndex = updatedTranscript.findIndex(item => item.id === loadingId.toString());
                                        if (loadingIndex >= 0 && updatedTranscript[loadingIndex]) {
                                            updatedTranscript[loadingIndex] = {
                                                ...updatedTranscript[loadingIndex],
                                                reasoning: updated
                                            };
                                        }
                                        return updatedTranscript;
                                    });
                                    return updated;
                                });
                                // Do not toggle lead-research UI during normal agent reasoning.
	                            }
	                            
	                            // Handle grounding metadata (citations/sources) emitted at end of streaming generation
	                            if (metadata.groundingMetadata?.groundingChunks) {
	                                const gm = metadata.groundingMetadata;
	                                setTranscript(prevTranscript => {
	                                    const updatedTranscript = [...prevTranscript];
	                                    const loadingIndex = updatedTranscript.findIndex(item => item.id === loadingId.toString());
	                                    if (loadingIndex >= 0 && updatedTranscript[loadingIndex]) {
	                                        updatedTranscript[loadingIndex] = {
	                                            ...updatedTranscript[loadingIndex],
	                                            groundingMetadata: gm
	                                        };
	                                    }
	                                    return updatedTranscript;
	                                });
	                            }
	                            
	                            if (metadata.type === 'reasoning_start' || metadata.type === 'reasoning-start') {
                                console.log('[App] Reasoning started');
                                setCurrentReasoning('');
                                currentReasoningRef.current = ''; // Update ref immediately
                                // Do not toggle lead-research UI during normal agent reasoning.
                            }
                            
                            // Handle thinking states
                            if (metadata.type === 'thinking' || metadata.message || metadata.type === 'meta') {
                                if (metadata.message || metadata.reasoning) {
                                    console.log('[App] Processing thinking state');
                                    // Do not toggle lead-research UI during normal agent reasoning.
                                }
                            }
                        }
                    });
                } catch (streamError) {
                    // Fallback to non-streaming on streaming error
                    console.warn('[App] Streaming failed, falling back to non-streaming:', streamError);
                    setBackendStatus({ mode: 'agents', message: 'Streaming unavailable, using standard response', severity: 'warn' });
                    
                    agentResponse = await aiBrainRef.current.chat(messages, {
                        conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
                        ...(finalIntelligencePayload ? { intelligenceContext: finalIntelligencePayload } : {})
                    });
                }

                if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;

                if (!agentResponse.success) {
                    setTranscript(prev => prev.filter(item => item.id !== loadingId));
                    showToast(agentResponse.error || 'Agent Error', 'error');
                     setBackendStatus({ mode: 'agents', message: 'Agent backend error', severity: 'error' });
                     setIsThinking(false);
                     abortControllerRef.current = null;
                     // Fallback logic could go here, omitting for brevity in this step, can be added if needed
                } else {
                    setBackendStatus({ mode: 'agents', message: `Agent: ${agentResponse.agent}`, severity: 'info' });
                    
                    // Save reasoning to transcript before clearing state
                    const finalReasoning = typeof currentReasoning === 'string' && currentReasoning.trim() 
                        ? currentReasoning.trim() 
                        : (typeof agentResponse.metadata?.reasoning === 'string' ? agentResponse.metadata.reasoning : undefined);

                    // Persist conversation flow updates from agents (SSOT via UnifiedContext)
                    const nextFlow =
                        (agentResponse.metadata as any)?.enhancedConversationFlow ||
                        (agentResponse.metadata as any)?.conversationFlow;
                    if (nextFlow) {
                        conversationFlowRef.current = nextFlow;
                        unifiedContext.setConversationFlow(nextFlow);
                    }
                    
                    // Clear Glass Box UI state when response completes
                    setActiveTools([]);
                    setCurrentReasoning('');
                    // Do not clear lead-research state here; it's managed by useLeadResearch.
                    setIsThinking(false);

	                    const groundingMetadata = agentResponse.metadata?.groundingMetadata as any;
	                    const chainOfThought = agentResponse.metadata?.chainOfThought as any;
	                    const maybeCity = (location as any)?.city as string | undefined;
	                    const maybeCountry = (location as any)?.country as string | undefined;
	                    const contextSources = buildContextSources({
	                        company: finalIntelligencePayload?.company,
                        person: finalIntelligencePayload?.person,
                        ...(maybeCity ? { location: { city: maybeCity, ...(maybeCountry ? { country: maybeCountry } : {}) } } : {}),
                        hasConversation: currentHistory.length > 1
                    });
                    
                    setTranscript(prev => {
                        const updated = [...prev];
                        const idx = updated.findIndex(item => item.id === loadingId);
                        const base = idx >= 0 && updated[idx] ? updated[idx] : undefined;
	                        const finalItem: TranscriptItem = {
	                            id: loadingId,
	                            role: 'model',
	                            text: agentResponse.output || base?.text || '',
	                            timestamp: base?.timestamp || new Date(),
	                            isFinal: true,
	                            status: 'complete',
	                            ...(chainOfThought?.steps && Array.isArray(chainOfThought.steps) && chainOfThought.steps.length > 0
	                                ? { chainOfThought }
	                                : {}),
	                            ...(finalReasoning && { reasoning: finalReasoning }),
	                            ...(groundingMetadata && { groundingMetadata }),
	                            ...(contextSources.length > 0 && { contextSources }),
	                            ...(toolsForMessageRef.current.length > 0 && { tools: toolsForMessageRef.current })
	                        };
                        if (idx >= 0) updated[idx] = finalItem;
                        else updated.push(finalItem);
                        return updated;
                    });
                    persistMessageToServer(sessionId, 'model', agentResponse.output || '', new Date());
                    abortControllerRef.current = null;

                    // If voice is connected, speak the agent response (Live-model audio is muted).
                    if (shouldUseVoice && agentResponse.output) {
                        speakAgentOutput(agentResponse.output);
                    }
                }

            } catch (e: any) {
                console.error("Chat error", e);
                showToast(e.message, 'error');
                setIsThinking(false);
            } finally {
                inFlightSendKeysRef.current.delete(dedupeKey);
            }
        }
    }, [connectionState, sessionId, setBackendStatus, showToast, aiBrainRef, persistMessageToServer, liveServiceRef, setVisualState, setTranscript, isWebcamActive, speakAgentOutput, performResearch]);

    useEffect(() => {
        handleSendMessageRef.current = handleSendMessage;
    }, [handleSendMessage]);

    // 12. PDF Generation Handlers
    const handleGeneratePDF = useCallback(() => {
        try {
            const pdfDataUrl = generatePDF({
                transcript,
                userProfile,
                researchContext: researchResultRef.current
            });
            if (!pdfDataUrl) {
                showToast('PDF generation failed. Please try again.', 'error');
            }
        } catch (err) {
            console.error('PDF generation failed:', err);
            showToast('Failed to generate PDF. Please try again.', 'error');
        }
    }, [transcript, userProfile, showToast]);

    const handleEmailPDF = useCallback(async () => {
        if (!userProfile?.email) {
            showToast('No email address available. Please provide your email first.', 'error');
            return;
        }
        try {
            const pdfDataUrl = generatePDF({
                transcript,
                userProfile,
                researchContext: researchResultRef.current
            });
            if (!pdfDataUrl) {
                showToast('PDF generation failed. Please try again.', 'error');
                return;
            }
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
                showToast(`PDF sent to ${userProfile.email}`, 'success');
            } else {
                const error = await response.json();
                showToast(`Failed to send email: ${error.message || 'Unknown error'}`, 'error');
            }
        } catch (err) {
            console.error('Failed to send PDF email:', err);
            showToast('Failed to send email. Please try downloading the PDF instead.', 'error');
        }
    }, [transcript, userProfile, sessionId, showToast]);

    // Store the latest report data for download
    const latestReportDataRef = useRef<{ htmlContent: string; reportName: string } | null>(null);

    const handleGenerateDiscoveryReport = useCallback(() => {
        try {
            const reportData = buildDiscoveryReportFromClient({
                sessionId,
                transcript,
                userProfile,
                researchContext: researchResultRef.current,
                voiceMinutes: 0, // TODO: Track voice stats if needed
                screenMinutes: screenShare.isActive ? 5 : 0,
                filesUploaded: transcript.filter(t => t.attachment?.type === 'file').length
            });
            const htmlContent = generateDiscoveryReportHTMLClient(reportData);
            const reportItem = createDiscoveryReportTranscriptItem(reportData, htmlContent);
            
            // Store report data for download
            latestReportDataRef.current = {
                htmlContent,
                reportName: reportItem.attachment?.name || 'AI Insights Report'
            };
            
            setTranscript(prev => [...prev, reportItem]);
            showToast('AI Insights Report generated! Review your insights below.', 'success');
        } catch (err) {
            console.error('Failed to generate insights report:', err);
            showToast('Failed to generate AI Insights Report. Please try again.', 'error');
        }
    }, [sessionId, transcript, userProfile, screenShare.isActive, setTranscript, showToast]);

    const handleGenerateExecutiveMemo = useCallback(() => {
        // Send a message to the agent asking it to generate an executive memo
        // The agent will use the generate_executive_memo tool with appropriate parameters
        const message = "Generate an executive memo for the decision maker based on our conversation. Please identify the key objection (budget, timing, or security) and the appropriate target audience (CFO, CEO, or CTO).";
        handleSendMessage(message);
        showToast('Requesting executive memo... The agent will generate it based on our conversation.', 'info');
    }, [handleSendMessage, showToast]);

    const handleDownloadDiscoveryReport = useCallback(() => {
        if (!latestReportDataRef.current) {
            showToast('No report available to download. Please generate a report first.', 'error');
            return;
        }

        try {
            const { htmlContent, reportName } = latestReportDataRef.current;

            // Create a complete HTML document with the report content
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${reportName}</title>
                    <style>
                        body {
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            margin: 0;
                            padding: 20px;
                            background: white;
                        }
                        @media print {
                            body { margin: 0; padding: 0; }
                        }
                    </style>
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
                </head>
                <body>${htmlContent}</body>
                </html>
            `;

            // Create a blob with the HTML content
            const blob = new Blob([fullHtml], { type: 'text/html' });
            const url = URL.createObjectURL(blob);

            // Create a temporary download link
            const link = document.createElement('a');
            link.href = url;
            link.download = `${reportName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Clean up the blob URL
            URL.revokeObjectURL(url);

            showToast('Report downloaded successfully!', 'success');
        } catch (err) {
            console.error('Failed to download report:', err);
            showToast('Failed to download report. Please try again.', 'error');
        }
    }, [showToast]);

    // 13. Local AI Actions
    const [localAiCaps, setLocalAiCaps] = useState<ChromeAiCapabilities>({ hasModel: false, hasSummarizer: false, hasRewriter: false, status: 'unsupported' });
    
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
            logger.debug("Local AI unavailable, no cloud fallback available for edit.");
            return text;
        } catch (e) {
            console.error("Edit action failed", e);
            return text;
        }
    }, [localAiCaps]);

    // 14. Stop Generation Handler
    const handleStopGeneration = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
    }, []);

    // Local AI
    useEffect(() => {
        const checkLocalAi = async () => {
            const caps = await chromeAiRef.current.getCapabilities();
            setLocalAiCaps(caps);
        };
        void checkLocalAi();
    }, []);

    // Throttle webcam frame logging (avoid spam)
    const webcamFrameLogRef = useRef<number>(0);
    
    // 15. Webcam Frame Handler (must be at top level, not in JSX)
    const handleSendVideoFrame = useCallback((base64: string) => {
        latestWebcamFrameRef.current = base64;
        
        // Log every frame received from webcam (throttled to avoid spam)
        const now = Date.now();
        if (!webcamFrameLogRef.current || now - webcamFrameLogRef.current > 2000) {
            logger.debug('[App] Webcam frame received from WebcamPreview', {
                size: base64.length,
                hasLiveService: !!liveServiceRef.current,
                connectionState,
                isWebcamActive
            });
            webcamFrameLogRef.current = now;
        }
        
        // Send frame if service exists and is connected (even if session not ready - will queue)
        if (liveServiceRef.current && (connectionState === LiveConnectionState.CONNECTED || connectionState === LiveConnectionState.CONNECTING)) {
            try {
                liveServiceRef.current.sendRealtimeMedia({ mimeType: 'image/jpeg', data: base64 });
                const isQueued = !liveServiceRef.current.getIsSessionReady();
                logger.debug('[App] Webcam frame sent to Live API', { 
                    size: base64.length,
                    queued: isQueued,
                    connectionState,
                    sessionReady: liveServiceRef.current.getIsSessionReady()
                });
                // Log when actually sent (not queued) to verify connection
                if (!isQueued) {
                    logger.debug('[App] Webcam frame sent to Live API (not queued)', {
                        size: base64.length,
                        connectionState
                    });
                } else {
                    logger.debug('[App] Webcam frame queued (session not ready)', {
                        size: base64.length,
                        connectionState
                    });
                }
            } catch (err) {
                console.error('[App] Failed to send webcam frame to Live API:', err);
            }
        } else {
            // Log why frame is not being sent
            if (!liveServiceRef.current) {
                logger.debug('[App] Webcam frame not sent: liveServiceRef.current is null');
            } else if (connectionState !== LiveConnectionState.CONNECTED && connectionState !== LiveConnectionState.CONNECTING) {
                logger.debug('[App] Webcam frame not sent: invalid connectionState', { connectionState });
            }
            
            // Auto-connect if webcam is active but disconnected
            if (isWebcamActive && connectionState === LiveConnectionState.DISCONNECTED) {
                logger.debug('[App] Webcam active but Live API disconnected, attempting connection');
                void handleConnect();
            }
        }
    }, [connectionState, isWebcamActive, handleConnect]);

    // Render
    if (view === 'landing') return (
                <LandingPage 
                    onStartChat={(startVoice) => handleStartChatRequest(startVoice)}
                    onSectionChange={(shape) => setVisualState(prev => ({ ...prev, shape }))}
                    onAdminAccess={() => setView('admin')}
                />
            );
    if (view === 'admin') return (
                <AdminDashboard 
                    researchService={researchServiceRef.current}
                    onClose={() => setView('landing')}
                />
            );



    return (
        <div className={`relative w-full h-full overflow-hidden ${isDarkMode ? 'bg-black' : 'bg-gray-50'}`}>
            <BrowserCompatibility />
            <AntigravityCanvas
               visualState={visualState}
               chatWidth={isChatVisible ? chatWidth : 0}
               userProfile={userProfile}
            />
            {showTerms && (
                <TermsOverlay 
                   onComplete={handleTermsComplete}
                   onCancel={() => setShowTerms(false)}
                />
            )}

            {/* HEADER: Logo, Status Pills, Open Chat Button */}
            <header className="fixed top-0 left-0 w-full p-4 md:p-6 flex flex-row justify-between items-center z-50 pointer-events-auto gap-2 md:gap-0">
                <div className="flex items-center gap-3">
                    {/* Back to Home Button */}
                    <button
                        type="button"
                        onClick={() => setView('landing')}
                        className="mr-2 p-2 rounded-full hover:bg-white/20 transition-colors group/home"
                        title="Back to Home"
                    >
                        <span className={`font-matrix font-bold tracking-tighter text-lg transition-colors ${isDarkMode ? 'text-white group-hover/home:text-orange-400' : 'text-black group-hover/home:text-orange-700'}`}>F.B/c</span>
                    </button>

                    {/* System Status Pill */}
                    <div className="relative group">
                        <div className={`flex items-center gap-2 px-3 py-1.5 backdrop-blur-md rounded-full border shadow-sm transition-all duration-300 ${isDarkMode ? 'bg-white/10 border-white/10 hover:bg-white/20' : 'bg-white/30 border-white/30 hover:bg-white/50'}`}>
                            <div className={`w-1.5 h-1.5 rounded-full transition-colors duration-500 ${activeRoute.color} ${connectionState === LiveConnectionState.CONNECTED ? 'animate-pulse' : ''}`} />
                            <span className={`text-[10px] font-mono font-medium tracking-[0.2em] uppercase ${isDarkMode ? 'text-white/60' : 'text-black/60'}`}>
                                {activeRoute.label}
                            </span>
                        </div>
                        {/* Tooltip */}
                        <div className={`absolute top-full mt-2 left-0 w-56 p-3 backdrop-blur-md rounded-lg border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                            <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                {activeRoute.description}
                            </p>
                        </div>
                    </div>

                    {/* Backend Route Status */}
                    <div className="relative group">
                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-300 ${
                            backendStatus.severity === 'error'
                                ? 'bg-rose-500/10 border-rose-400/40 text-rose-100'
                                : backendStatus.severity === 'warn'
                                    ? 'bg-amber-500/10 border-amber-400/40 text-amber-100'
                                    : isDarkMode
                                        ? 'bg-emerald-500/10 border-emerald-400/40 text-emerald-100'
                                        : 'bg-emerald-100 border-emerald-200 text-emerald-800'
                        }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                                backendStatus.severity === 'error' ? 'bg-rose-400' 
                                : backendStatus.severity === 'warn' ? 'bg-amber-400' 
                                : 'bg-emerald-400'
                            }`} />
                            <span className="text-[10px] font-mono font-medium tracking-[0.2em] uppercase">
                                {backendStatus.mode === 'agents' ? 'Agents' 
                                 : backendStatus.mode === 'fallback' ? 'Fallback'
                                 : backendStatus.mode === 'voice' ? 'Voice'
                                 : 'Idle'}
                            </span>
                        </div>
                        <div className={`absolute top-full mt-2 left-0 w-72 p-3 backdrop-blur-md rounded-lg border shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 transform translate-y-2 group-hover:translate-y-0 duration-200 ${isDarkMode ? 'bg-black/90 border-white/10' : 'bg-white/90 border-black/5'}`}>
                            <p className={`text-[10px] leading-relaxed font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                                {backendStatus.message}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Open Chat Button (when chat is hidden) */}
                {!isChatVisible && (
                    <div className="animate-fade-in-up">
                        <button
                            type="button"
                            onClick={() => setIsChatVisible(true)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all hover:scale-105 ${isDarkMode ? 'bg-white text-slate-900' : 'bg-slate-900 text-white'}`}
                        >
                            <span className="text-xs font-bold uppercase tracking-wider">Open Chat</span>
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                            </svg>
                        </button>
                    </div>
                )}
            </header>

            {isChatVisible && (
                <MultimodalChat
                    items={transcript}
                    onSendMessage={handleSendMessage}
                    onSendVideoFrame={handleSendVideoFrame}
                    
                    // Connection
                    connectionState={connectionState}
                    onConnect={handleConnect}
                    onDisconnect={handleDisconnect}
                    
                    // Voice & Webcam
                    isWebcamActive={isWebcamActive}
                    onWebcamChange={setIsWebcamActive}
                    
                    // Screen Share
                    isScreenShareActive={screenShare.isActive}
                    isScreenShareInitializing={screenShare.isInitializing}
                    onScreenShareToggle={() => void screenShare.toggleScreenShare()}
                    screenShareStream={screenShare.stream}
                    screenShareError={screenShare.error}
                    
                    // UI State
                    visible={isChatVisible}
                    onToggleVisibility={setIsChatVisible}
                    isDarkMode={isDarkMode}
                    onToggleTheme={toggleTheme}
                    
                    // Location indicator
                    isLocationShared={!!locationData}
                    locationData={locationData}

                    // Context
                    userEmail={userProfile?.email}
                    userName={userProfile?.name}
                    
                    // Research
                    isResearching={isResearching}
                    isThinking={isThinking}
                    
                    // Glass Box UI: Active tools
                    activeTools={activeTools}
                    
                    // Agent mode
                    agentMode={visualState.mode}
                    
                    // Features
                    localAiAvailable={localAiCaps.hasModel || !!process.env.API_KEY}
                    onLocalAction={handleLocalAction}
                    onStopGeneration={handleStopGeneration}
                    onGeneratePDF={handleGeneratePDF}
                    onEmailPDF={handleEmailPDF}
                    onGenerateDiscoveryReport={handleGenerateDiscoveryReport}
                    onDownloadDiscoveryReport={handleDownloadDiscoveryReport}
                    onEmailDiscoveryReport={handleEmailPDF} // Reuse email PDF handler for now
                    onGenerateExecutiveMemo={handleGenerateExecutiveMemo}
                    onWidthChange={setChatWidth}
                    onVisibilityChange={setIsChatVisible}
                />
            )}
        </div>
    );
};

export default App;
