import { useRef, useState, useCallback, useEffect } from 'react';
import { GeminiLiveService } from '../../../services/geminiLiveService';
import { LiveConnectionState, VisualState } from '../../../types';
import { GEMINI_MODELS } from 'src/config/constants';
import { ModelRoute } from '../../logic/smartRouting';
import { Tool, Type } from '@google/genai';
import { logger } from 'src/lib/logger-client';
import { useToast } from '../../../context/ToastContext';

// Import Types needed
import { UserProfile } from '../../hooks/business/useLeadResearch'; // Import from where we defined it

interface UseGeminiLiveProps {
    sessionId: string;
    userProfile: UserProfile | null;
    researchResultRef: React.MutableRefObject<any>;
    transcriptRef: React.MutableRefObject<any[]>;
    unifiedContext: any;
    isWebcamActive: boolean;
    setActiveRoute: (route: ModelRoute) => void;
    setIsChatVisible: (visible: boolean) => void;
    setVisualState: React.Dispatch<React.SetStateAction<VisualState>>;
    handleVolumeChange: (input: number, output: number) => void;
    handleTranscript: (text: string, isUser: boolean, isFinal: boolean, grounding: any, agent: any) => void;
    handleToolCall: (calls: any[]) => Promise<any[]>;
    intelligenceContextRef: React.MutableRefObject<any>; // For context sync
}

export function useGeminiLive({

    userProfile,
    researchResultRef,
    transcriptRef,
    unifiedContext,
    isWebcamActive,
    setActiveRoute,
    setIsChatVisible,
    setVisualState,
    handleVolumeChange,
    handleTranscript,
    handleToolCall,
    intelligenceContextRef,
    liveServiceRef // External Ref
}: UseGeminiLiveProps & { liveServiceRef: React.MutableRefObject<GeminiLiveService | null> }) {
    const { showToast } = useToast();
    // Removed internal liveServiceRef definition
    const [connectionState, setConnectionState] = useState<LiveConnectionState>(LiveConnectionState.DISCONNECTED);
    
    // Auto-connect recursion guard
    const webcamConnectAttemptedRef = useRef(false);

    const handleConnect = useCallback(async () => {
        // Guard: If already connected, skip recreation
        if (liveServiceRef.current && connectionState === LiveConnectionState.CONNECTED) {
            logger.debug('[App] LiveService already connected, skipping recreation');
            return;
        }

        // Live voice connects to our WebSocket server which handles credentials server-side.
        // Do not gate voice behind a client-side API key.

        const liveModelId = GEMINI_MODELS.DEFAULT_VOICE;
        setActiveRoute({
            id: liveModelId,
            label: 'LIVE UPLINK',
            description: 'Real-time audio/visual stream active.',
            color: 'bg-orange-500'
        });

        // Keep chat visible during voice mode so transcripts are visible
        // setIsChatVisible(false); // REMOVED: Transcripts need to be visible

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

        // NOTE: Voice system instructions are server-managed (server/live-api/config-builder.ts).
        // Keep this client-side instruction minimal to avoid unverified personalization.
        if (userProfile) {
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
            apiKey: '',
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

        // Sync research context only to the Live service (agents get context via AIBrainService).
        if (researchResultRef.current && liveServiceRef.current) {
            liveServiceRef.current.setResearchContext(researchResultRef.current);
        }

        try {
            await liveServiceRef.current.connect();

            if (transcriptRef.current.length > 0) {
                // Wait for session to actually be ready
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

    }, [handleVolumeChange, handleTranscript, handleToolCall, userProfile, intelligenceContextRef, unifiedContext, transcriptRef, researchResultRef, setActiveRoute, setVisualState, setIsChatVisible, connectionState, showToast]);

    // Critical Fix: Manual Ref management to avoid useEffect dependency cycles
    const handleConnectRef = useRef(handleConnect);
    useEffect(() => {
        handleConnectRef.current = handleConnect;
    }, [handleConnect]);

    // Isolate Webcam auto-connect logic
    useEffect(() => {
        if (isWebcamActive && 
            connectionState !== LiveConnectionState.CONNECTED && 
            connectionState !== LiveConnectionState.CONNECTING &&
            !webcamConnectAttemptedRef.current) {
            
            webcamConnectAttemptedRef.current = true;
            logger.debug('[App] Webcam activated, connecting to Live API for multimodal conversation');
            
            void handleConnectRef.current().finally(() => {
                setTimeout(() => {
                    webcamConnectAttemptedRef.current = false;
                }, 2000);
            });
        } else if (connectionState === LiveConnectionState.CONNECTED) {
            webcamConnectAttemptedRef.current = false;
        }
    }, [isWebcamActive, connectionState]);

    const handleDisconnect = useCallback(() => {
        void liveServiceRef.current?.disconnect();
        setActiveRoute({
            id: GEMINI_MODELS.DEFAULT_CHAT,
            label: 'READY',
            description: 'System ready.',
            color: 'bg-gray-400'
        });
        setIsChatVisible(true);
    }, [setActiveRoute, setIsChatVisible]);

    // Callbacks for ScreenShare
    // CRITICAL FIX: Allow CONNECTING state so frames can be queued (same as webcam)
    const handleSendRealtimeInput = useCallback((chunks: Array<{ mimeType: string; data: string }>) => {
        if (liveServiceRef.current && (connectionState === LiveConnectionState.CONNECTED || connectionState === LiveConnectionState.CONNECTING)) {
            chunks.forEach(chunk => {
                // sendRealtimeMedia will queue if session not ready, or send immediately if ready
                liveServiceRef.current?.sendRealtimeMedia(chunk);
            });
        } else {
            logger.debug('[useGeminiLive] Screen share frame dropped - not connected', { connectionState });
        }
    }, [connectionState]);

    const handleSendContextUpdate = useCallback((update: { sessionId?: string | null; modality: 'screen' | 'webcam' | 'intelligence'; analysis?: string; imageData?: string; capturedAt?: number; metadata?: Record<string, unknown> }) => {
        // CRITICAL FIX: Allow CONNECTING state so context updates can be queued
        if (liveServiceRef.current && (connectionState === LiveConnectionState.CONNECTED || connectionState === LiveConnectionState.CONNECTING) && update.analysis) {
            const contextUpdate: any = {
                modality: update.modality,
                analysis: update.analysis,
            };
            if (update.sessionId) contextUpdate.sessionId = update.sessionId;
            if (update.imageData) contextUpdate.imageData = update.imageData;
            if (update.capturedAt) contextUpdate.capturedAt = update.capturedAt;
            if (update.metadata) contextUpdate.metadata = update.metadata;
            
            liveServiceRef.current.sendContextUpdate(contextUpdate);
        } else {
            // Log dropped context updates for debugging (matching handleSendRealtimeInput behavior)
            logger.debug('[useGeminiLive] Context update dropped', {
                connectionState,
                hasLiveService: !!liveServiceRef.current,
                hasAnalysis: !!update.analysis,
                modality: update.modality,
                reason: !liveServiceRef.current 
                    ? 'no live service' 
                    : (connectionState !== LiveConnectionState.CONNECTED && connectionState !== LiveConnectionState.CONNECTING)
                    ? 'not connected'
                    : !update.analysis
                    ? 'no analysis'
                    : 'unknown'
            });
        }
    }, [connectionState]);

    return {
        liveServiceRef,
        connectionState,
        setConnectionState,
        handleConnect,
        handleDisconnect,
        handleSendRealtimeInput,
        handleSendContextUpdate
    };
}
