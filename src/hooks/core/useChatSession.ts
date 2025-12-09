import { useState, useEffect, useCallback, useRef } from 'react';
import { TranscriptItem, LiveConnectionState } from '../../../types';
import { unifiedContext } from '../../../services/unifiedContext';

interface UseChatSessionProps {
    connectionState: LiveConnectionState;
}

interface BackendStatus {
    mode: 'idle' | 'agents' | 'fallback' | 'voice';
    message: string;
    severity: 'info' | 'warn' | 'error';
}

export function useChatSession({ connectionState }: UseChatSessionProps) {
    const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
    
    // Internal ref for transcript to avoid stale closures if needed
    const transcriptRef = useRef<TranscriptItem[]>([]);

    const [backendStatus, setBackendStatus] = useState<BackendStatus>({
        mode: 'idle',
        message: 'Ready - waiting for input',
        severity: 'info'
    });

    // Sync transcript ref + shared context
    useEffect(() => {
        transcriptRef.current = transcript;
        unifiedContext.setTranscript(transcript);
    }, [transcript]);

    // Update backend status based on connection state
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

    return {
        transcript,
        setTranscript,
        transcriptRef,
        backendStatus,
        setBackendStatus,
        persistMessageToServer
    };
}
