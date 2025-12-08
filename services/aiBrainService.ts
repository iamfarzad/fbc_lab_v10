import { TranscriptItem } from 'types';
import { unifiedContext } from './unifiedContext';
import { logger } from 'src/lib/logger'

interface AIBrainResponse {
    success: boolean;
    text?: string;
    error?: string;
    data?: any;
}

export interface AgentResponse {
    success: boolean;
    output?: string;
    agent?: string;
    model?: string;
    metadata?: {
        stage?: string;
        conversationFlow?: any;
        error?: string;
        [key: string]: unknown;
    };
    error?: string;
}

export class AIBrainService {
    private baseUrl: string;
    private sessionId: string;

    constructor(sessionId?: string) {
        this.baseUrl = this.determineBaseUrl();
        this.sessionId = sessionId || `session-${Date.now()}`;
    }

    setSessionId(sessionId: string): void {
        this.sessionId = sessionId;
    }

    getSessionId(): string {
        return this.sessionId;
    }

    private determineBaseUrl(): string {
        const metaEnv = (globalThis as any).import?.meta?.env;

        if (metaEnv) {
            // In development allow overriding with VITE_AGENT_API_URL
            if (metaEnv.DEV) {
                const custom = metaEnv.VITE_AGENT_API_URL as string | undefined;
                if (custom) {
                    return custom.replace(/\/api\/chat$/, '');
                }
                return 'http://localhost:3002';
            }

            // In production tests, prefer relative path so fetch hits proxy
            if (metaEnv.PROD) {
                return '';
            }
        }

        // 1. Use explicit env var if available (e.g. in Vercel)
        if (process.env.NEXT_PUBLIC_API_URL) {
            return process.env.NEXT_PUBLIC_API_URL;
        }

        // 2. In browser, use relative path (proxy) or absolute URL based on window
        if (typeof window !== 'undefined') {
            // const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'; // Not used
            // If local, assume API is on port 3002 (as per your setup)
            // But if we are using a proxy in vite.config, relative path is better
            // Let's stick to relative path '/api' which works if proxy is set up or if served from same origin
            return '';
        }

        // 3. Fallback for server-side rendering (SSR)
        return 'http://localhost:3002';
    }

    /**
     * Sends a message to the server-side AI Brain API.
     * This API orchestrates the multi-agent system.
     */
    async sendMessage(
        message: string,
        history: TranscriptItem[],
        attachment?: { mimeType: string; data: string }
    ): Promise<AIBrainResponse> {
        try {
            const snapshot = unifiedContext.getSnapshot();

            // Prepare payload
            const payload = {
                message,
                history: history.map(item => ({
                    role: item.role,
                    content: item.text,
                    // Only include attachment if it exists
                    ...(item.attachment ? { attachment: item.attachment } : {})
                })),
                sessionId: snapshot.sessionId,
                // Inject context from UnifiedContext
                context: {
                    research: snapshot.researchContext,
                    location: snapshot.location,
                    conversationFlow: snapshot.conversationFlow,
                    intelligence: snapshot.intelligenceContext
                },
                // Include current attachment for this turn
                ...(attachment ? { attachment } : {})
            };

            const url = `${this.baseUrl}/api/chat`;
            logger.debug('[AIBrainService] Sending request to:', { url });

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `Server error: ${response.status}`;
                let errorDetails;
                
                // Try to parse as JSON first
                try {
                    const errorJson = JSON.parse(errorText);
                    errorMsg = errorJson.error || errorJson.message || errorMsg;
                    errorDetails = errorJson.details;
                } catch {
                    // Not JSON - might be HTML or plain text
                    // Try to extract error from HTML if it's an error page
                    if (errorText.includes('<title>') || errorText.includes('Error')) {
                        // Extract text content from HTML body
                        const textMatch = errorText.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
                        if (textMatch && textMatch[1]) {
                            // Strip HTML tags and limit length
                            errorMsg = textMatch[1].replace(/<[^>]+>/g, '').trim().substring(0, 200);
                        }
                    } else {
                        // Plain text error
                        errorMsg = errorText.substring(0, 200);
                    }
                    console.error('[AIBrainService] Non-JSON error response:', {
                        status: response.status,
                        contentType: response.headers.get('content-type'),
                        preview: errorText.substring(0, 500)
                    });
                }
                
                return {
                    success: false,
                    error: errorMsg,
                    ...(errorDetails && { details: errorDetails })
                };
            }

            const data = (await response.json() || {}) as any;
            return {
                success: true,
                text: data.text || data.message, // Handle different response formats
                data: data
            };

        } catch (error: any) {
            // Detect connection refused / network errors
            const errorMsg = error?.message || '';
            const isConnectionRefused = 
                errorMsg.includes('ECONNREFUSED') || 
                errorMsg.includes('Failed to fetch') ||
                errorMsg.includes('NetworkError') ||
                error?.code === 'ECONNREFUSED';

            if (isConnectionRefused) {
                const isDev = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                
                const helpMessage = isDev 
                    ? 'API server not running. Start it with: pnpm dev:api:3002'
                    : 'Unable to connect to API server. Please try again later.';
                
                console.error('[AIBrainService] Connection error:', { isDev, originalError: errorMsg });
                return {
                    success: false,
                    error: helpMessage
                };
            }

            console.error('[AIBrainService] Error:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    /**
     * Persists a message to the server database/memory without triggering a response.
     */
    async persistMessage(
        role: 'user' | 'model',
        content: string,
        attachment?: { mimeType: string; data: string }
    ): Promise<boolean> {
        try {
            const snapshot = unifiedContext.getSnapshot();
            const url = `${this.baseUrl}/api/chat/persist-message`;

            await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionId: snapshot.sessionId,
                    role,
                    content,
                    attachment
                })
            });
            return true;
        } catch (e) {
            console.warn('[AIBrainService] Failed to persist message:', e);
            return false;
        }
    }

    /**
     * Chat method that matches the expected interface from App.tsx
     * Sends messages to the agent API and returns AgentResponse
     */
    async chat(
        messages: Array<{ role: string; content: string; attachments?: Array<{ mimeType: string; data: string }> }>,
        options?: {
            conversationFlow?: any;
            intelligenceContext?: any;
        }
    ): Promise<AgentResponse> {
        try {
            // const snapshot = unifiedContext.getSnapshot(); // Not used
            const url = `${this.baseUrl}/api/chat`;

            const payload = {
                messages,
                sessionId: this.sessionId,
                ...(options?.conversationFlow && { conversationFlow: options.conversationFlow }),
                ...(options?.intelligenceContext && { intelligenceContext: options.intelligenceContext })
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                let errorMsg = `Server error: ${response.status}`;
                let errorDetails;
                try {
                    // Try to parse as JSON first
                    if (errorText.trim().startsWith('{') || errorText.trim().startsWith('[')) {
                        const errorJson = JSON.parse(errorText);
                        errorMsg = errorJson.error || errorJson.message || errorMsg;
                        errorDetails = errorJson.details;
                        console.error('[AIBrainService] Server returned error:', { 
                            status: response.status, 
                            message: errorMsg, 
                            details: errorDetails,
                            fullError: errorJson
                        });
                    } else {
                        // Not JSON, use text as message
                        errorMsg = errorText || errorMsg;
                        console.error('[AIBrainService] Server returned non-JSON error:', { 
                            status: response.status, 
                            message: errorText.substring(0, 200) // Limit length
                        });
                    }
                } catch (parseError) {
                    // If parsing fails, use the text response or a generic message
                    errorMsg = errorText && errorText.length < 500 ? errorText : `Server error: ${response.status}`;
                    console.error('[AIBrainService] Failed to parse error response:', { 
                        status: response.status,
                        errorText: errorText.substring(0, 200),
                        parseError: parseError instanceof Error ? parseError.message : String(parseError)
                    });
                }
                return {
                    success: false,
                    error: errorMsg,
                    ...(errorDetails && { details: errorDetails })
                };
            }

            const data = await response.json();
            return {
                success: data.success !== false,
                output: data.output || data.text || data.message,
                agent: data.agent,
                model: data.model,
                metadata: data.metadata
            };
        } catch (error: any) {
            // Detect connection refused / network errors
            const errorMsg = error?.message || '';
            const isConnectionRefused = 
                errorMsg.includes('ECONNREFUSED') || 
                errorMsg.includes('Failed to fetch') ||
                errorMsg.includes('NetworkError') ||
                error?.code === 'ECONNREFUSED';

            if (isConnectionRefused) {
                const isDev = typeof window !== 'undefined' && 
                    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
                
                const helpMessage = isDev 
                    ? 'API server not running. Start it with: pnpm dev:api:3002'
                    : 'Unable to connect to API server. Please try again later.';
                
                console.error('[AIBrainService] Connection error in chat:', { isDev, originalError: errorMsg });
                return {
                    success: false,
                    error: helpMessage
                };
            }

            console.error('[AIBrainService] Error in chat:', error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred'
            };
        }
    }

    /**
     * Convert transcript history to messages format expected by the API
     */
    static transcriptToMessages(transcript: TranscriptItem[]): Array<{ role: string; content: string; attachments?: Array<{ mimeType: string; data: string }> }> {
        return transcript
            .filter(item => item.text?.trim() || item.attachment)
            .map(item => {
                const msg: { role: string; content: string; attachments?: Array<{ mimeType: string; data: string }> } = {
                    // Preserve 'model' role as expected by downstream tests/orchestrator
                    role: item.role === 'user' ? 'user' : 'model',
                    content: item.text || '', // Ensure content is never undefined
                };

                if (item.attachment?.data && item.attachment?.mimeType) {
                    msg.attachments = [{
                        mimeType: item.attachment.mimeType,
                        data: item.attachment.data
                    }];
                }

                return msg;
            });
    }
}
