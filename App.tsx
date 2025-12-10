import React, { useState, useEffect, useRef, useCallback } from 'react';
import AntigravityCanvas from './components/AntigravityCanvas';
import MultimodalChat from './components/MultimodalChat';
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

export const App: React.FC = () => {
    const { showToast } = useToast();
    
    // 1. Routing & View State
    const { view, setView } = useAppRouting();

    // 2. Session & Service Registry
    const [sessionId] = useState<string>(`session-${Date.now()}`);
    const { standardChatRef, researchServiceRef, aiBrainRef } = useServiceRegistry(sessionId);

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
             // Use ref to always get latest function
             if (handleTranscriptUpdateRef.current) {
                 handleTranscriptUpdateRef.current(text, isUser, isFinal, grounding, agent);
             } else {
                 logger.warn('[App] handleTranscriptUpdateRef.current is null!');
             }
        },
        handleToolCall,
        standardChatRef,
        intelligenceContextRef,
        liveServiceRef
    });

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
        services: { standardChatRef, researchServiceRef, liveServiceRef },
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

    // 11. Handle Send Message
    const handleSendMessage = useCallback(async (text: string, file?: { mimeType: string, data: string }) => {
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

        if (sessionId) {
            await persistMessageToServer(sessionId, 'user', text, userItem.timestamp, file);
        }

        // Detect research intent in message
        void performResearch(text);

        const shouldUseVoice = connectionState === LiveConnectionState.CONNECTED && liveServiceRef.current;

        if (shouldUseVoice) {
            setBackendStatus({
                mode: 'voice',
                message: file ? 'Voice + media sent via Live WebSocket' : 'Voice message sent via Live WebSocket',
                severity: 'info'
            });
            if (file) {
                 liveServiceRef.current?.sendRealtimeMedia(file);
                 // CRITICAL FIX: Removed sendText() calls - Live API's sendRealtimeInput() only accepts audio/video
                 // Sending text via sendRealtimeInput causes error 1007 "Request contains an invalid argument"
                 // Text should be included in systemInstruction during session setup, not sent as realtime input
                 // if (!text.trim()) {
                 //     liveServiceRef.current?.sendText("Analyze this image.");  // ❌ DISABLED - causes 1007
                 // }
            }
            // CRITICAL FIX: Removed sendText() - text cannot be sent via sendRealtimeInput
            // if (text.trim()) {
            //     liveServiceRef.current?.sendText(text);  // ❌ DISABLED - causes 1007
            // }
        } else if (aiBrainRef.current) {
            const storedKey = localStorage.getItem('fbc_api_key');
            const apiKey = storedKey || process.env.API_KEY;
            if (!apiKey || apiKey.includes('INSERT_API_KEY')) {
                 showToast("API Key not configured.", 'error');
                 return;
            }

            try {
                abortControllerRef.current = new AbortController();
                setBackendStatus({ mode: 'agents', message: 'Routing via Multi-Agent...', severity: 'info' });

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
                
                // Context sync
                const location = await unifiedContext.ensureLocation();
                 if (standardChatRef.current && location) standardChatRef.current.setLocation(location);
                 if (liveServiceRef.current && location) liveServiceRef.current.setLocation(location);

                const unifiedSnapshot = unifiedContext.getSnapshot();
                const researchData = unifiedSnapshot.researchContext || intelligenceContextRef.current?.research;
                const intelligencePayload = {
                    ...(unifiedSnapshot.intelligenceContext || {}),
                    ...(intelligenceContextRef.current || {}),
                    ...(researchData?.company ? { company: researchData.company } : {}),
                    ...(researchData?.person ? { person: researchData.person } : {}),
                    ...(researchData?.strategic ? { strategic: researchData.strategic } : {}),
                    ...(researchData ? { research: researchData } : {}),
                    ...(location ? { location } : {})
                };

                const messages = AIBrainService.transcriptToMessages(currentHistory);
                const lastMsg = messages[messages.length - 1];

                if (file && lastMsg) {
                    lastMsg.attachments = [{ 
                        type: file.type === 'image' ? 'image' : 'file',
                        mimeType: file.mimeType, 
                        data: file.data,
                        url: file.url || (file.data ? `data:${file.mimeType};base64,${file.data}` : undefined),
                        name: file.name
                    }];
                } else if (isWebcamActive && latestWebcamFrameRef.current && lastMsg) {
                     lastMsg.attachments = [{ 
                        type: 'image',
                        mimeType: 'image/jpeg', 
                        data: latestWebcamFrameRef.current,
                        url: `data:image/jpeg;base64,${latestWebcamFrameRef.current}`,
                        name: 'Webcam Frame'
                    }];
                }

                // Try streaming first, fallback to non-streaming on error
                let agentResponse: AgentResponse;
                try {
                    agentResponse = await aiBrainRef.current.chatStream(messages, {
                        conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
                        intelligenceContext: intelligencePayload,
                        onChunk: (accumulatedText: string) => {
                            // Update transcript with accumulated text as it streams
                            if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
                            
                            setTranscript(prev => {
                                const updated = [...prev];
                                const loadingIndex = updated.findIndex(item => item.id === loadingId.toString());
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
                                        ...(existingItem.reasoning && { reasoning: existingItem.reasoning }),
                                        ...(existingItem.processingTime && { processingTime: existingItem.processingTime }),
                                        ...(existingItem.error && { error: existingItem.error }),
                                        ...(existingItem.contextSources && { contextSources: existingItem.contextSources })
                                    };
                                } else {
                                    // If loading item was removed, add it back
                                    const newItem: TranscriptItem = {
                                        id: loadingId.toString(),
                                        role: 'model',
                                        text: accumulatedText,
                                        timestamp: new Date(),
                                        isFinal: false,
                                        status: 'streaming'
                                    };
                                    updated.push(newItem);
                                }
                                return updated;
                            });
                        }
                    });
                } catch (streamError) {
                    // Fallback to non-streaming on streaming error
                    console.warn('[App] Streaming failed, falling back to non-streaming:', streamError);
                    setBackendStatus({ mode: 'agents', message: 'Streaming unavailable, using standard response', severity: 'warn' });
                    
                    agentResponse = await aiBrainRef.current.chat(messages, {
                        conversationFlow: conversationFlowRef.current || unifiedSnapshot.conversationFlow,
                        intelligenceContext: intelligencePayload
                    });
                }

                if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;

                if (!agentResponse.success) {
                    setTranscript(prev => prev.filter(item => item.id !== loadingId.toString()));
                    showToast(agentResponse.error || 'Agent Error', 'error');
                     setBackendStatus({ mode: 'fallback', message: 'Fallback to StandardChat', severity: 'warn' });
                     // Fallback logic could go here, omitting for brevity in this step, can be added if needed
                } else {
                    setBackendStatus({ mode: 'agents', message: `Agent: ${agentResponse.agent}`, severity: 'info' });
                    setTranscript(prev => {
                        const filtered = prev.filter(item => item.id !== loadingId.toString());
                        return [...filtered, {
                            id: Date.now().toString(),
                            role: 'model',
                            text: agentResponse.output || '',
                            timestamp: new Date(),
                            isFinal: true,
                            status: 'complete'
                        }];
                    });
                    persistMessageToServer(sessionId, 'model', agentResponse.output || '', new Date());
                }

            } catch (e: any) {
                console.error("Chat error", e);
                showToast(e.message, 'error');
            }
        }
    }, [connectionState, sessionId, setBackendStatus, showToast, aiBrainRef, persistMessageToServer, liveServiceRef, standardChatRef, setVisualState, setTranscript, isWebcamActive]);

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

    const handleDownloadDiscoveryReport = useCallback(() => {
        if (!latestReportDataRef.current) {
            showToast('No report available to download. Please generate a report first.', 'error');
            return;
        }

        try {
            const { htmlContent, reportName } = latestReportDataRef.current;
            
            // Create a temporary window with the HTML content
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                showToast('Please allow popups to download the PDF.', 'error');
                return;
            }

            // Write HTML with print styles
            printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${reportName}</title>
                    <style>
                        @media print {
                            @page { margin: 0; }
                            body { margin: 0; }
                        }
                        body {
                            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            padding: 20px;
                            max-width: 800px;
                            margin: 0 auto;
                        }
                    </style>
                </head>
                <body>${htmlContent}</body>
                </html>
            `);
            printWindow.document.close();

            // Wait for content to load, then trigger print
            setTimeout(() => {
                printWindow.print();
                // Close window after print dialog
                setTimeout(() => {
                    printWindow.close();
                }, 100);
            }, 500);
        } catch (err) {
            console.error('Failed to download report:', err);
            showToast('Failed to download PDF. Please try again.', 'error');
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
            console.log('📹 [App] Webcam frame received from WebcamPreview', {
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
                    console.log('✅ [App] Webcam frame SENT to Live API (not queued)', {
                        size: base64.length,
                        connectionState
                    });
                } else {
                    console.log('⏳ [App] Webcam frame QUEUED (session not ready)', {
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
                console.warn('⚠️ [App] Webcam frame NOT sent: liveServiceRef.current is null');
            } else if (connectionState !== LiveConnectionState.CONNECTED && connectionState !== LiveConnectionState.CONNECTING) {
                console.warn('⚠️ [App] Webcam frame NOT sent: connectionState is', connectionState);
            }
            
            // Auto-connect if webcam is active but disconnected
            if (isWebcamActive && connectionState === LiveConnectionState.DISCONNECTED) {
                console.log('🔄 [App] Webcam active but Live API disconnected, attempting connection');
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
        <div className={`relative w-full h-full overflow-hidden ${isDarkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
            <BrowserCompatibility />
            <AntigravityCanvas 
               visualState={visualState}
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
                        <span className={`font-bold tracking-tighter text-lg transition-colors ${isDarkMode ? 'text-white group-hover/home:text-orange-400' : 'text-black group-hover/home:text-orange-700'}`}>F.B/c</span>
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
                />
            )}
        </div>
    );
};

export default App;
