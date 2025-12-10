


import { GoogleGenAI, Type } from '@google/genai';
import type { Content, Part, Tool } from '@google/genai';
import { TranscriptItem, ResearchResult } from 'types';
import { GEMINI_MODELS } from 'src/config/constants';
import { unifiedContext } from './unifiedContext';
import { detectAndAnalyzeUrls } from '../src/core/utils/url-analysis.js';

export class StandardChatService {
    private ai: GoogleGenAI;
    private defaultModel: string;
    private researchContext: ResearchResult | null = null;
    private location: { latitude: number; longitude: number } | null = null;

    constructor(apiKey: string, defaultModel: string = GEMINI_MODELS.DEFAULT_CHAT) {
        this.ai = new GoogleGenAI({ apiKey });
        this.defaultModel = defaultModel;
    }

    /**
     * Set research context for personalized responses
     */
    setResearchContext(research: ResearchResult | null) {
        this.researchContext = research;
    }

    /**
     * Set user location for location-aware queries
     */
    setLocation(location: { latitude: number; longitude: number }) {
        this.location = location;
    }

    /**
     * Get cached location or resolve via UnifiedContext/geolocation.
     * Exposed for tests via casting to any.
     */
    async getLocation(): Promise<{ latitude: number; longitude: number } | undefined> {
        if (this.location) return this.location;

        // Attempt to resolve via browser geolocation; do not depend on shared state to avoid stale data
        if (typeof navigator === 'undefined' || !navigator.geolocation) return undefined;

        return await new Promise(resolve => {
            const timeout = setTimeout(() => resolve(undefined), 1000);

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    clearTimeout(timeout);
                    const loc = {
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    };
                    this.location = loc;
                    unifiedContext.setLocation(loc);
                    resolve(loc);
                },
                () => {
                    clearTimeout(timeout);
                    resolve(undefined);
                },
                { timeout: 1000 }
            );
        });
    }

    /**
     * Performs a fast, stateless action like rewriting or proofreading using Flash.
     */
    async performQuickAction(text: string, action: 'rewrite' | 'proofread'): Promise<string> {
        try {
            const modelId = GEMINI_MODELS.DEFAULT_FAST; // Use Flash Lite for speed/cost
            let prompt = "";
            let systemInstruction = "You are a helpful writing assistant.";

            const snapshot = unifiedContext.getSnapshot();
            const activeResearch = this.researchContext || snapshot.researchContext;
            if (activeResearch) {
                const rc = activeResearch;
                systemInstruction += ` Context: The user is writing to ${rc.person.fullName} (${rc.role}) at ${rc.company.name}.`;
            }

            if (action === 'rewrite') {
                prompt = `Rewrite the following text to be more professional, clear, and concise. Maintain the original meaning.\n\nText: "${text}"`;
            } else {
                prompt = `Proofread the following text. Fix grammar, spelling, and punctuation errors. Return ONLY the corrected text.\n\nText: "${text}"`;
            }

            const response = await this.ai.models.generateContent({
                model: modelId,
                contents: prompt,
                config: { systemInstruction }
            });

            return response.text || text;
        } catch (e) {
            console.error("Quick action failed", e);
            return text;
        }
    }

    async sendMessage(
        history: TranscriptItem[],
        message: string,
        attachment?: { mimeType: string, data: string },
        modelOverride?: string
    ): Promise<{ text: string, reasoning?: string, groundingMetadata?: unknown, toolCalls?: unknown[] }> {
        // Define variables at function scope so error handler can access them
        const activeModel: string = modelOverride || this.defaultModel;
        let historyContent: Content[] = [];
        let chatConfig: any = {};
        let supportsTools = false;

        try {
            const validRoles = ['user', 'model'];

            // 1. Process History:
            const previousItems = history.slice(0, -1);
            const relevantItems = previousItems.slice(-20);

            historyContent = [];
            let currentContent: Content | null = null;

            for (const item of relevantItems) {
                if (!validRoles.includes(item.role)) continue;
                // Skip system messages in chat history
                if (item.text.startsWith('[System:')) continue;

                const parts: Part[] = [];
                if (item.text) parts.push({ text: item.text });
                if (item.attachment?.data && item.attachment?.mimeType) {
                    parts.push({
                        inlineData: {
                            mimeType: item.attachment.mimeType,
                            data: item.attachment.data
                        }
                    });
                }

                if (parts.length === 0) continue;

                if (currentContent && currentContent.role === item.role && currentContent.parts) {
                    currentContent.parts.push(...parts);
                } else {
                    if (currentContent) historyContent.push(currentContent);
                    currentContent = { role: item.role, parts };
                }
            }
            if (currentContent) historyContent.push(currentContent);

            // 2. Get Context from UnifiedContext
            const unifiedSnapshot = unifiedContext.getSnapshot();
            const location = await this.getLocation();

            const now = new Date();
            const timeContext = `Current Date: ${now.toLocaleDateString()} | Current Time: ${now.toLocaleTimeString()} | Timezone: ${Intl.DateTimeFormat().resolvedOptions().timeZone}`;

            // 3. System Instructions & Tools Configuration
            const contextBlockParts: string[] = [
                `TIME CONTEXT: ${timeContext}`
            ];

            // INJECT RESEARCH CONTEXT (from instance or snapshot)
            const activeResearch = this.researchContext || unifiedSnapshot.researchContext;
            if (activeResearch) {
                const rc = activeResearch;
                contextBlockParts.push(
                    `[CONTEXT: You know about this person]`,
                    `Person: ${rc.person.fullName} (${rc.role})`,
                    `Company: ${rc.company.name} (${rc.company.industry || 'Industry unknown'})`,
                    `Summary: ${rc.company.summary || 'N/A'}`,
                    `Use this context to ask relevant questions (discovery-focused).`
                );
            }

            // Determine if Tools are supported by the model
            const isFlashModel = activeModel.includes('flash') || activeModel.includes(GEMINI_MODELS.FLASH_2025_09) || activeModel.includes('2.0-flash');

            // Only stable (non-preview) Pro models support tools
            // Preview models like gemini-3-pro-preview don't support function calling
            const isStableProModel = activeModel.includes('gemini-pro') && 
                                     !activeModel.includes('preview') && 
                                     !activeModel.includes('flash') &&
                                     !isFlashModel;

            // Enable tools only for stable Pro models
            supportsTools = isStableProModel;

            let systemInstruction = ''

            // Build base config
            chatConfig = {
                temperature: 1.0,
                systemInstruction,
                maxOutputTokens: 32768,
                thinkingConfig: activeModel.includes('flash') ? undefined : {
                    thinkingBudget: 16384
                }
            };

            // Add tools if model supports them (for real-time data, search, location)
            if (supportsTools) {
                const dashboardTool = {
                    functionDeclarations: [{
                        name: "update_dashboard",
                        description: "Updates the AI dashboard visual state. Call this when the user asks about a route, distance, weather, or specific data to visualize it on screen.",
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                shape: {
                                    type: Type.STRING,
                                    enum: ["orb", "chart", "map", "weather", "face", "brain", "clock", "code", "text", "dna", "shield", "hourglass", "planet", "constellation", "scanner", "vortex", "fireworks", "lightning", "flower"],
                                    description: "The visual shape. Use 'map' for routes/distances, 'planet' for solar system."
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
                };

                const tools: Tool[] = [{ googleSearch: {} }, dashboardTool];

                // Add code execution for non-flash Pro models
                if (!activeModel.includes('flash')) {
                    tools.push({ codeExecution: {} });
                    systemInstruction += " Use the 'codeExecution' tool to solve math problems.";
                }

                // Try to add tools - but handle gracefully if API rejects them
                chatConfig.tools = tools;
            }

            // Use instance location or fallback to snapshot
            const activeLocation = this.location || location;
            if (activeLocation) {
                const lat = activeLocation.latitude.toFixed(4);
                const lng = activeLocation.longitude.toFixed(4);
                contextBlockParts.push(`User location: Lat ${lat}, Long ${lng} (use for local queries).`);
            }

            // Add URL analysis if URLs are detected in the message
            const intelligenceContext = unifiedSnapshot.intelligenceContext;
            const urlContext = await detectAndAnalyzeUrls(message, intelligenceContext);
            if (urlContext) {
                contextBlockParts.push(`URL ANALYSIS:\n${urlContext}`);
            }

            const contextBlock = contextBlockParts.join('\n');

            let instructionBlock =
                "You are F.B/c AI, an advanced autonomous research agent for Farzad Bayat Consulting. " +
                "You possess 'System 2' deep thinking capabilities. " +
                "Do not just answer questions; research them using Google Search, plan your response, and synthesize information. ";

            if (supportsTools) {
                const dashboardTool = {
                    functionDeclarations: [{
                        name: "update_dashboard",
                        description: "Updates the AI dashboard visual state. Call this when the user asks about a route, distance, weather, or specific data to visualize it on screen.",
                        parameters: {
                            type: Type.OBJECT,
                            properties: {
                                shape: {
                                    type: Type.STRING,
                                    enum: ["orb", "chart", "map", "weather", "face", "brain", "clock", "code", "text", "dna", "shield", "hourglass", "planet", "constellation", "scanner", "vortex", "fireworks", "lightning", "flower"],
                                    description: "The visual shape. Use 'map' for routes/distances, 'planet' for solar system."
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
                };

                const tools: Tool[] = [{ googleSearch: {} }, dashboardTool];

                // Add code execution for non-flash Pro models
                if (!activeModel.includes('flash')) {
                    tools.push({ codeExecution: {} });
                    instructionBlock += " Use the 'codeExecution' tool to solve math problems.";
                }

                // Try to add tools - but handle gracefully if API rejects them
                chatConfig.tools = tools;
            }

            instructionBlock +=
                " If the user provides an image, analyze it deeply. " +
                "If discussing data (weather, stocks), provide specific values (e.g., '24°C', '+5%') to trigger UI visualizations. " +
                "Treat text, images, and any media as a single stream—synthesize them together. " +
                "CRITICAL: If there is a central concept, single keyword, or big idea you want to visualize on the screen, enclose it in double asterisks (e.g. **SYNERGY** or **ENTROPY**). Do this only for the most important word.";

            // Update chatConfig.systemInstruction with the final end-anchored structure
            chatConfig.systemInstruction = `${contextBlock}

INSTRUCTIONS:
${instructionBlock}`;

            // Add media_resolution for multimodal attachments
            if (attachment) {
                chatConfig.media_resolution = 'media_resolution_low';
            }

            // 4. Initialize Chat
            const chat = this.ai.chats.create({
                model: activeModel,
                history: historyContent,
                config: chatConfig
            });

            // 5. Send Message
            const currentParts: Part[] = [];

            if (attachment) {
                currentParts.push({
                    inlineData: {
                        mimeType: attachment.mimeType,
                        data: attachment.data
                    }
                });
            }

            if (typeof message === 'string' && message.trim()) {
                currentParts.push({ text: message });
            } else if (attachment) {
                currentParts.push({ text: "Please analyze this content deeply." });
            }

            const response = await chat.sendMessage({ message: currentParts });

            // 6. Construct Response from all Parts (Text + Executable Code + Function Calls)
            let fullText = "";
            let reasoningText: string | undefined;
            const toolCalls: unknown[] = [];

            const candidate = response.candidates?.[0];
            if (candidate && candidate.content && candidate.content.parts) {
                for (const part of candidate.content.parts) {
                    // Accumulate thought parts if they appear multiple times
                    if (part.thought) {
                        reasoningText = (reasoningText || "") + part.text;
                        continue;
                    }

                    if (part.text) {
                        fullText += part.text;
                    } else if (part.executableCode) {
                        // Render code execution block
                        const lang = (part.executableCode.language || 'text').toLowerCase();
                        const code = part.executableCode.code;
                        fullText += `\n\`\`\`${lang}\n${code}\n\`\`\`\n`;
                    } else if (part.codeExecutionResult) {
                        // Render result block
                        const output = part.codeExecutionResult.output;
                        fullText += `\n\`\`\`\nOutput:\n${output}\n\`\`\`\n`;
                    } else if (part.functionCall) {
                        toolCalls.push(part.functionCall);
                    }
                }
            } else {
                fullText = response.text || "";
            }

            const groundingMetadata = candidate?.groundingMetadata;

            return {
                text: fullText,
                ...(reasoningText ? { reasoning: reasoningText } : {}),
                ...(groundingMetadata ? { groundingMetadata } : {}),
                ...(toolCalls.length > 0 ? { toolCalls } : {})
            };

        } catch (error: any) {
            console.error("Standard Chat Error:", error);

            // Catch Network Error specifically
            if (error instanceof Error && (error.message.includes('Network error') || error.message.includes('fetch failed'))) {
                throw new Error("Network error. Please check your internet connection or API key.");
            }

            // If tools are unsupported, retry without tools
            const errorMessage = error?.message || error?.error?.message || '';
            const isToolError = errorMessage.includes('Tool use with function calling is unsupported') ||
                errorMessage.includes('function calling is unsupported') ||
                (error?.error?.code === 400 && errorMessage.includes('tool'));

            if (isToolError && supportsTools) {
                console.warn(`Model ${activeModel} does not support tools, retrying without tools...`);

                // Retry without tools
                const retryConfig = { ...chatConfig };
                delete retryConfig.tools;
                // Ensure media_resolution is preserved for attachments
                if (attachment && !retryConfig.media_resolution) {
                    retryConfig.media_resolution = 'media_resolution_low';
                }

                const retryChat = this.ai.chats.create({
                    model: activeModel,
                    history: historyContent,
                    config: retryConfig
                });

                const currentParts: Part[] = [];
                if (attachment) {
                    currentParts.push({
                        inlineData: {
                            mimeType: attachment.mimeType,
                            data: attachment.data
                        }
                    });
                }
                if (message.trim()) {
                    currentParts.push({ text: message });
                } else if (attachment) {
                    currentParts.push({ text: "Please analyze this content deeply." });
                }

                const retryResponse = await retryChat.sendMessage({ message: currentParts });

                // Process retry response
                let fullText = "";
                let reasoningText: string | undefined;
                const candidate = retryResponse.candidates?.[0];

                if (candidate && candidate.content && candidate.content.parts) {
                    for (const part of candidate.content.parts) {
                        if (part.thought) {
                            reasoningText = (reasoningText || "") + part.text;
                            continue;
                        }
                        if (part.text) {
                            fullText += part.text;
                        }
                    }
                } else {
                    fullText = retryResponse.text || "";
                }

                return {
                    text: fullText,
                    ...(reasoningText && { reasoning: reasoningText }),
                    ...(candidate?.groundingMetadata && { groundingMetadata: candidate.groundingMetadata })
                };
            }

            throw error;
        }
    }
}
